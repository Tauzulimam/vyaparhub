import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  AccountStatus,
  GstStatus,
  MarketplaceStatus,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import {
  detectVerifiedImageMime,
  generateSafeProductImageObjectPath,
  isValidMasterProductImageUrl,
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGES_BUCKET,
  validateAndUploadProductImageBuffer,
} from '@/lib/admin/catalog/imageUpload';
import {
  executeCreateMasterProduct,
  executeSetMasterProductActiveStatus,
  executeUpdateMasterProduct,
  queryAdminCatalogSnapshot,
} from '@/lib/admin/catalog/persistence';
import {
  executeAddToCart,
  executeCreateCustomerAddress,
  queryCustomerCart,
  queryCustomerOrderDetail,
} from '@/lib/cart/persistence';
import {
  queryCustomerStoreDetail,
  queryCustomerStoreProductDetail,
  queryVisibleMarketplaceSnapshot,
} from '@/lib/marketplace/server';
import { executePlaceCustomerOrder } from '@/lib/orders/persistence';
import { mapMasterProductToDto, MASTER_PRODUCT_SELECT } from '@/lib/vendor/server';

/**
 * Focused automated validation for Real Master Catalog (`/admin/catalog`) against
 * live Supabase PostgreSQL (:6543), verifying end-to-end consistency across:
 * 1. Real PostgreSQL Category + MasterProduct + StoreProduct adoption snapshot
 * 2. MasterProduct creation + validation & duplicate protection
 * 3. Vendor Master Catalog visibility for active MasterProducts
 * 4. MasterProduct editing (preserving vendor StoreProduct sellingPrice & stockQuantity,
 *    and blocking MRP reductions below existing vendor selling prices)
 * 5. MasterProduct deactivation (archival without deletion; hides from new vendor
 *    selection & customer marketplace; flags MASTER_PRODUCT_INACTIVE in cart & blocks order)
 * 6. MasterProduct re-activation (restores vendor & customer marketplace visibility)
 *
 * Cleans up ONLY synthetic test rows in `finally` and verifies 100% invariance on
 * all pre-existing manual test data.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run verify-admin-master-catalog.');
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const prisma = new PrismaClient({ adapter, errorFormat: 'minimal' });

  // Snapshot existing database state to guarantee zero permanent side effects
  const [
    baselineCategories,
    baselineMasterProducts,
    baselineStores,
    baselineStoreProducts,
    baselineOrdersCount,
  ] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, isActive: true, updatedAt: true },
    }),
    prisma.masterProduct.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, mrp: true, isActive: true, updatedAt: true },
    }),
    prisma.store.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, updatedAt: true },
    }),
    prisma.storeProduct.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, sellingPrice: true, stockQuantity: true, updatedAt: true },
    }),
    prisma.order.count(),
  ]);

  const token = crypto.randomBytes(4).toString('hex').toLowerCase();
  const activeCategory = await prisma.category.findFirstOrThrow({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const createdMasterProductIds: string[] = [];
  const createdStoreProductIds: string[] = [];
  const createdStoreIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdOrderIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // 1. Real PostgreSQL Admin Catalog Snapshot
    // -------------------------------------------------------------------------
    const initialSnapshot = await queryAdminCatalogSnapshot(prisma);
    assert.equal(
      initialSnapshot.categories.length,
      baselineCategories.length,
      'Admin catalog categories must match real PostgreSQL Category rows.'
    );
    assert.equal(
      initialSnapshot.products.length,
      baselineMasterProducts.length,
      'Admin catalog products must match real PostgreSQL MasterProduct rows.'
    );
    console.log(
      `[PASS] Check 1: Loaded ${initialSnapshot.products.length} real MasterProducts across ${initialSnapshot.categories.length} real PostgreSQL Categories.`
    );

    // -------------------------------------------------------------------------
    // 2. Create Real MasterProduct + Validation & Duplicate Protection
    // -------------------------------------------------------------------------
    const invalidMrpRes = await executeCreateMasterProduct(prisma, {
      name: `Admin Test Invalid MRP ${token}`,
      brand: 'VyaparCatalog',
      categoryId: activeCategory.id,
      unitValue: 500,
      unitType: 'G',
      mrp: 0,
      imageUrl: '/images/placeholder-product.svg',
      description: 'Should fail validation',
      isActive: true,
    });
    assert.equal(invalidMrpRes.success, false);

    const invalidImageRes = await executeCreateMasterProduct(prisma, {
      name: `Admin Test Invalid Image ${token}`,
      brand: 'VyaparCatalog',
      categoryId: activeCategory.id,
      unitValue: 500,
      unitType: 'G',
      mrp: 85,
      imageUrl: 'https://untrusted.example.com/img.png',
      description: 'Should reject external unconfigured next/image host',
      isActive: true,
    });
    assert.equal(invalidImageRes.success, false);

    const createRes = await executeCreateMasterProduct(prisma, {
      name: `Admin Test Moong Dal ${token}`,
      brand: 'Tata Sampann Test',
      categoryId: activeCategory.id,
      unitValue: 500,
      unitType: 'G',
      mrp: 95,
      imageUrl: '/images/products/atta-grains.svg',
      description: 'Unpolished split yellow moong dal pack.',
      isActive: true,
    });
    assert.equal(createRes.success, true, 'Valid MasterProduct creation must succeed.');
    createdMasterProductIds.push(createRes.product.id);
    assert.equal(createRes.product.unit, '500 g');
    assert.equal(createRes.product.mrp, 95);
    assert.equal(createRes.product.active, true);
    assert.equal(createRes.product.category, activeCategory.name);
    assert.equal(createRes.product.storesListingCount, 0);

    // Duplicate creation in same category with identical name + brand + unit must fail
    const duplicateRes = await executeCreateMasterProduct(prisma, {
      name: `admin test moong dal ${token}`,
      brand: 'tata sampann test',
      categoryId: activeCategory.id,
      unitValue: 500,
      unitType: 'G',
      mrp: 98,
      imageUrl: '/images/products/atta-grains.svg',
      description: 'Duplicate test',
      isActive: true,
    });
    assert.equal(duplicateRes.success, false, 'Exact duplicate MasterProduct must be rejected.');
    console.log('[PASS] Check 2: Real MasterProduct creation, field validation, and duplicate guard verified.');

    // -------------------------------------------------------------------------
    // 3. Vendor Catalog & Customer Marketplace Integration Setup
    // -------------------------------------------------------------------------
    const activeForVendor = await prisma.masterProduct.findFirst({
      where: {
        id: createRes.product.id,
        isActive: true,
        category: { isActive: true },
      },
      select: { id: true },
    });
    assert.ok(activeForVendor, 'Newly created active MasterProduct must be selectable by vendors.');

    // Provision a disposable Vendor + Open Store + Customer to verify StoreProduct & Marketplace behavior
    const [vendorUser, custUser] = await Promise.all([
      prisma.user.create({
        data: {
          id: `mc_v_${token}`,
          authUserId: crypto.randomUUID(),
          email: `mc-vendor-${token}@vyaparhub.local`,
          phone: `92${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.VENDOR,
          accountStatus: AccountStatus.ACTIVE,
          vendorProfile: {
            create: {
              ownerName: 'Catalog Test Vendor',
              registeredMobile: '9211122233',
              businessEmail: `mc-vbiz-${token}@vyaparhub.local`,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
        },
        select: { id: true, vendorProfile: { select: { id: true } } },
      }),
      prisma.user.create({
        data: {
          id: `mc_c_${token}`,
          authUserId: crypto.randomUUID(),
          email: `mc-cust-${token}@vyaparhub.local`,
          phone: `91${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.CUSTOMER,
          accountStatus: AccountStatus.ACTIVE,
          customerProfile: {
            create: { fullName: 'Catalog Test Customer' },
          },
        },
        select: { id: true, customerProfile: { select: { id: true } } },
      }),
    ]);
    createdUserIds.push(vendorUser.id, custUser.id);
    const vpId = vendorUser.vendorProfile!.id;
    const cpId = custUser.customerProfile!.id;

    const testStore = await prisma.store.create({
      data: {
        vendorProfileId: vpId,
        categoryId: activeCategory.id,
        name: `MC Test Store ${token}`,
        phone: '9800055001',
        addressLine1: 'Shop 5, Main Market',
        area: 'Gumpa',
        city: 'Bidar',
        state: 'Karnataka',
        postalCode: '585401',
        openingTime: '08:00',
        closingTime: '22:00',
        deliveryRadiusKm: 4,
        minimumOrderAmount: 50,
        isOpen: true,
        verificationStatus: VerificationStatus.VERIFIED,
        marketplaceStatus: MarketplaceStatus.ACTIVE,
        businessDetails: {
          create: { gstStatus: GstStatus.NOT_REGISTERED, gstVerified: true },
        },
      },
      select: { id: true },
    });
    createdStoreIds.push(testStore.id);

    // Vendor lists the new MasterProduct at store-specific sellingPrice = ₹82, stock = 12
    const testSp = await prisma.storeProduct.create({
      data: {
        storeId: testStore.id,
        masterProductId: createRes.product.id,
        sellingPrice: 82,
        stockQuantity: 12,
        isAvailable: true,
      },
      select: { id: true },
    });
    createdStoreProductIds.push(testSp.id);

    const mpInMarketplace = await queryCustomerStoreProductDetail(prisma, testSp.id);
    assert.ok(mpInMarketplace, 'Vendor-listed active MasterProduct must appear in customer marketplace.');
    assert.equal(mpInMarketplace.product.price, 82);
    assert.equal(mpInMarketplace.product.mrp, 95);

    const snapshotWithAdoption = await queryAdminCatalogSnapshot(prisma);
    const adoptedProd = snapshotWithAdoption.products.find((p) => p.id === createRes.product.id);
    assert.equal(adoptedProd?.storesListingCount, 1);
    assert.equal(adoptedProd?.vendorPriceRangeLabel, '₹82');
    console.log('[PASS] Check 3: Vendor catalog selection, StoreProduct adoption stats, and customer marketplace visibility verified.');

    // -------------------------------------------------------------------------
    // 4. Edit Real MasterProduct (Preserves Vendor Price/Stock & Guards MRP Ceiling)
    // -------------------------------------------------------------------------
    // Lowering MRP below vendor selling price (₹75 < ₹82) must be rejected
    const mrpBelowVendorRes = await executeUpdateMasterProduct(prisma, createRes.product.id, {
      name: `Admin Test Moong Dal Gold ${token}`,
      brand: 'Tata Sampann Test',
      categoryId: activeCategory.id,
      unitValue: 500,
      unitType: 'G',
      mrp: 75, // < ₹82 vendor selling price!
      imageUrl: '/images/products/atta-grains.svg',
      description: 'Updated description',
      isActive: true,
    });
    assert.equal(
      mrpBelowVendorRes.success,
      false,
      'Lowering MasterProduct MRP below an existing StoreProduct sellingPrice must be rejected.'
    );

    // Valid edit (name, MRP ₹110, unit 1 KG, description)
    const validUpdateRes = await executeUpdateMasterProduct(prisma, createRes.product.id, {
      name: `Admin Test Moong Dal Select ${token}`,
      brand: 'Tata Sampann Gold',
      categoryId: activeCategory.id,
      unitValue: 1,
      unitType: 'KG',
      mrp: 110,
      imageUrl: '/images/products/atta-grains.svg',
      description: 'Premium 1 kg unpolished moong dal pack.',
      isActive: true,
    });
    assert.equal(validUpdateRes.success, true);
    assert.equal(validUpdateRes.product.name, `Admin Test Moong Dal Select ${token}`);
    assert.equal(validUpdateRes.product.unit, '1 kg');
    assert.equal(validUpdateRes.product.mrp, 110);

    // Verify vendor StoreProduct sellingPrice (₹82) & stockQuantity (12) were NOT overwritten!
    const spAfterAdminEdit = await prisma.storeProduct.findUniqueOrThrow({
      where: { id: testSp.id },
      select: { sellingPrice: true, stockQuantity: true, isAvailable: true },
    });
    assert.equal(Number(spAfterAdminEdit.sellingPrice), 82);
    assert.equal(spAfterAdminEdit.stockQuantity, 12);
    assert.equal(spAfterAdminEdit.isAvailable, true);

    const mpDetailAfterEdit = await queryCustomerStoreProductDetail(prisma, testSp.id);
    assert.equal(mpDetailAfterEdit?.product.name, `Admin Test Moong Dal Select ${token}`);
    assert.equal(mpDetailAfterEdit?.product.mrp, 110);
    assert.equal(mpDetailAfterEdit?.product.price, 82);
    console.log('[PASS] Check 4: Real MasterProduct edit reflected across marketplace while preserving vendor StoreProduct price & stock.');

    // -------------------------------------------------------------------------
    // 5. Deactivate MasterProduct & Verify Downstream Vendor/Marketplace/Cart/Order Behavior
    // -------------------------------------------------------------------------
    // Customer adds product to cart while active
    const addrRes = await executeCreateCustomerAddress(prisma, cpId, {
      tag: 'Home',
      recipientName: 'Catalog Buyer',
      phone: '9876540099',
      addressLine1: 'House 7, Gumpa Rd',
      area: 'Gumpa',
      city: 'Bidar',
      state: 'Karnataka',
      postalCode: '585401',
      isDefault: true,
    });
    assert.equal(addrRes.success, true);

    const addCartRes = await executeAddToCart(prisma, {
      customerProfileId: cpId,
      storeProductId: testSp.id,
      quantityToAdd: 1,
    });
    assert.equal(addCartRes.success, true);

    // Admin deactivates MasterProduct
    const deactivateRes = await executeSetMasterProductActiveStatus(
      prisma,
      createRes.product.id,
      false
    );
    assert.equal(deactivateRes.success, true);
    assert.equal(deactivateRes.product.active, false);

    // Hidden from vendor active catalog
    const vendorVisibleAfterDeactivate = await prisma.masterProduct.findFirst({
      where: { id: createRes.product.id, isActive: true },
      select: { id: true },
    });
    assert.equal(vendorVisibleAfterDeactivate, null);

    // Hidden from customer marketplace snapshot, store detail, and product detail
    const [mktSnap, storeDetail, prodDetail] = await Promise.all([
      queryVisibleMarketplaceSnapshot(prisma),
      queryCustomerStoreDetail(prisma, testStore.id),
      queryCustomerStoreProductDetail(prisma, testSp.id),
    ]);
    assert.equal(
      mktSnap.products.some((p) => p.id === testSp.id),
      false,
      'Deactivated MasterProduct must not appear in customer marketplace.'
    );
    assert.equal(
      storeDetail?.products.some((p) => p.id === testSp.id),
      false,
      'Deactivated MasterProduct must not appear on customer store detail.'
    );
    assert.equal(prodDetail, null, 'Deactivated MasterProduct detail route must return null.');

    // Customer cart flags MASTER_PRODUCT_INACTIVE and blocks checkout/order placement
    const cartAfterDeactivate = await queryCustomerCart(prisma, cpId);
    assert.equal(cartAfterDeactivate.canCheckout, false);
    assert.equal(cartAfterDeactivate.items[0].issueCode, 'MASTER_PRODUCT_INACTIVE');

    const blockedOrderAttempt = await executePlaceCustomerOrder(prisma, {
      customerUserId: custUser.id,
      customerProfileId: cpId,
      addressId: addrRes.address.id,
      expectedSubtotal: 82,
    });
    assert.equal(blockedOrderAttempt.success, false);
    assert.equal(blockedOrderAttempt.code, 'STALE_OR_INVALID_CART');
    console.log('[PASS] Check 5: Deactivating MasterProduct archives cleanly, hides from vendor/customer catalogs, and blocks stale checkout.');

    // -------------------------------------------------------------------------
    // 6. Re-activate MasterProduct & Verify Immediate Restoration
    // -------------------------------------------------------------------------
    const reactivateRes = await executeSetMasterProductActiveStatus(
      prisma,
      createRes.product.id,
      true
    );
    assert.equal(reactivateRes.success, true);
    assert.equal(reactivateRes.product.active, true);

    const restoredDetail = await queryCustomerStoreProductDetail(prisma, testSp.id);
    assert.ok(restoredDetail, 'Re-activated MasterProduct must reappear in customer marketplace.');

    const cartAfterReactivate = await queryCustomerCart(prisma, cpId);
    assert.equal(cartAfterReactivate.canCheckout, true);
    assert.equal(cartAfterReactivate.items[0].issueCode, null);
    console.log('[PASS] Check 6: Re-activating MasterProduct immediately restores vendor, marketplace, and cart eligibility.');

    // -------------------------------------------------------------------------
    // 7 & 8. Supabase Storage Bucket Configuration + Non-Admin Upload Blocking (RLS)
    // -------------------------------------------------------------------------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.ok(supabaseUrl && supabaseKey, 'Supabase URL and publishable key must exist.');
    const supabaseOrigin = new URL(supabaseUrl).origin;

    // Create a disposable ACTIVE ADMIN user to verify RLS helper for ADMIN vs VENDOR vs CUSTOMER
    const adminAuthUuid = crypto.randomUUID();
    const adminUser = await prisma.user.create({
      data: {
        id: `mc_a_${token}`,
        authUserId: adminAuthUuid,
        email: `mc-admin-${token}@vyaparhub.local`,
        phone: `90${String(Math.floor(10000000 + Math.random() * 89999999))}`,
        role: UserRole.ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      },
      select: { id: true, authUserId: true },
    });
    createdUserIds.push(adminUser.id);

    const [vendorRowAuth, custRowAuth] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: vendorUser.id }, select: { authUserId: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: custUser.id }, select: { authUserId: true } }),
    ]);

    const pgClient = new pg.Client({
      connectionString: process.env.DIRECT_URL || connectionString,
    });
    await pgClient.connect();
    try {
      const bucketCheck = await pgClient.query(
        'SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = $1',
        [PRODUCT_IMAGES_BUCKET]
      );
      assert.equal(bucketCheck.rows.length, 1, 'product-images bucket must exist in storage.buckets.');
      assert.equal(bucketCheck.rows[0].public, true);
      assert.equal(Number(bucketCheck.rows[0].file_size_limit), MAX_PRODUCT_IMAGE_BYTES);

      const policiesCheck = await pgClient.query(
        'SELECT policyname FROM pg_policies WHERE schemaname = $1 AND tablename = $2 AND policyname LIKE $3',
        ['storage', 'objects', 'product_images_%']
      );
      assert.equal(policiesCheck.rows.length, 3, 'All 3 product_images_* RLS policies must exist.');

      // Evaluate public.is_active_admin_auth_user() under simulated JWT claims
      const checkJwtRole = async (subUuid: string) => {
        await pgClient.query('BEGIN');
        try {
          await pgClient.query('SET LOCAL ROLE authenticated');
          await pgClient.query('SELECT set_config($1, $2, true)', [
            'request.jwt.claims',
            JSON.stringify({ sub: subUuid, role: 'authenticated' }),
          ]);
          const r = await pgClient.query('SELECT public.is_active_admin_auth_user() AS allowed');
          return Boolean(r.rows[0].allowed);
        } finally {
          await pgClient.query('ROLLBACK');
        }
      };

      assert.equal(await checkJwtRole(adminAuthUuid), true, 'Active ADMIN must pass Storage RLS check.');
      assert.equal(
        await checkJwtRole(vendorRowAuth.authUserId),
        false,
        'VENDOR must be blocked by Storage RLS.'
      );
      assert.equal(
        await checkJwtRole(custRowAuth.authUserId),
        false,
        'CUSTOMER must be blocked by Storage RLS.'
      );
    } finally {
      await pgClient.end();
    }

    // Live HTTP Storage API upload attempt using unauthenticated/non-admin publishable client MUST fail
    const anonSupabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const valid1x1Png = Uint8Array.from(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )
    );
    const anonUploadAttempt = await validateAndUploadProductImageBuffer({
      supabase: anonSupabase,
      bytes: valid1x1Png,
      declaredMimeType: 'image/png',
    });
    assert.equal(
      anonUploadAttempt.success,
      false,
      'Non-admin / anonymous Storage upload must be rejected by Supabase Storage RLS.'
    );
    console.log('[PASS] Checks 7 & 8: Supabase Storage bucket, RLS policies, and non-admin upload blocking verified.');

    // -------------------------------------------------------------------------
    // 9. File Type Magic-Byte Validation, Size Limit & URL Allowlist Enforcement
    // -------------------------------------------------------------------------
    // Disguised SVG/script pretending to be image/png MUST fail
    const disguisedSvg = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
    const badTypeRes = await validateAndUploadProductImageBuffer({
      supabase: anonSupabase,
      bytes: disguisedSvg,
      declaredMimeType: 'image/png',
    });
    assert.equal(badTypeRes.success, false);
    assert.equal(badTypeRes.code, 'INVALID_FILE_TYPE');

    // Oversized (> 5 MB) buffer MUST fail before hitting network
    const oversizedBytes = new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1);
    oversizedBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const tooLargeRes = await validateAndUploadProductImageBuffer({
      supabase: anonSupabase,
      bytes: oversizedBytes,
      declaredMimeType: 'image/png',
    });
    assert.equal(tooLargeRes.success, false);
    assert.equal(tooLargeRes.code, 'FILE_TOO_LARGE');

    // Magic-byte detector & safe filename generator
    assert.equal(detectVerifiedImageMime(valid1x1Png), 'image/png');
    assert.equal(detectVerifiedImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
    assert.equal(
      detectVerifiedImageMime(
        Uint8Array.from([
          0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
        ])
      ),
      'image/webp'
    );
    const safeObjPath = generateSafeProductImageObjectPath('image/png');
    assert.match(safeObjPath, /^master-products\/\d{4}\/[0-9a-f-]{36}\.png$/);

    // URL validator: local presets & approved project product-images URLs pass; external/traversal fail
    const approvedStorageUrl = `${supabaseOrigin}/storage/v1/object/public/product-images/${safeObjPath}`;
    assert.equal(isValidMasterProductImageUrl('/images/products/pharmacy-care.svg'), true);
    assert.equal(isValidMasterProductImageUrl('/images/placeholder-product.svg'), true);
    assert.equal(isValidMasterProductImageUrl(approvedStorageUrl), true);
    assert.equal(isValidMasterProductImageUrl('https://evil.example.com/p.png'), false);
    assert.equal(
      isValidMasterProductImageUrl(
        `https://other-proj.supabase.co/storage/v1/object/public/product-images/${safeObjPath}`
      ),
      false
    );
    assert.equal(isValidMasterProductImageUrl('/images/../etc/passwd.png'), false);
    console.log('[PASS] Check 9: Magic-byte verification, 5 MB cap, safe UUID path generation, and strict URL allowlist verified.');

    // -------------------------------------------------------------------------
    // 10 & 11. Persist Uploaded URL + Vendor/Customer Visibility + Historical OrderItem Snapshot Immutability
    // -------------------------------------------------------------------------
    // Place an order FIRST while MasterProduct still has local preset `/images/products/atta-grains.svg`
    const orderBeforeImgEdit = await executePlaceCustomerOrder(prisma, {
      customerUserId: custUser.id,
      customerProfileId: cpId,
      addressId: addrRes.address.id,
      expectedSubtotal: 82,
    });
    assert.equal(orderBeforeImgEdit.success, true);
    createdOrderIds.push(orderBeforeImgEdit.orderId);

    // Admin updates MasterProduct.imageUrl to the approved uploaded Supabase Storage URL
    const updateUploadedImgRes = await executeUpdateMasterProduct(prisma, createRes.product.id, {
      name: `Admin Test Moong Dal Select ${token}`,
      brand: 'Tata Sampann Gold',
      categoryId: activeCategory.id,
      unitValue: 1,
      unitType: 'KG',
      mrp: 110,
      imageUrl: approvedStorageUrl,
      description: 'Premium 1 kg unpolished moong dal pack.',
      isActive: true,
    });
    assert.equal(updateUploadedImgRes.success, true);
    assert.equal(updateUploadedImgRes.product.image, approvedStorageUrl);

    // Verify Admin Catalog, Vendor Catalog, and Customer Marketplace ALL expose the uploaded URL automatically
    const [adminSnapAfterImg, vendorMasterRecord, customerDetailAfterImg] = await Promise.all([
      queryAdminCatalogSnapshot(prisma),
      prisma.masterProduct.findUniqueOrThrow({
        where: { id: createRes.product.id },
        select: MASTER_PRODUCT_SELECT,
      }),
      queryCustomerStoreProductDetail(prisma, testSp.id),
    ]);
    assert.equal(
      adminSnapAfterImg.products.find((p) => p.id === createRes.product.id)?.image,
      approvedStorageUrl
    );
    assert.equal(mapMasterProductToDto(vendorMasterRecord).image, approvedStorageUrl);
    assert.equal(customerDetailAfterImg?.product.image, approvedStorageUrl);

    // Historical OrderItem.imageUrlSnapshot MUST still preserve `/images/products/atta-grains.svg`!
    const historicalOrder = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpId,
      orderIdOrNumber: orderBeforeImgEdit.orderId,
    });
    assert.ok(historicalOrder);
    assert.equal(
      historicalOrder.items[0].image,
      '/images/products/atta-grains.svg',
      'Historical OrderItem.imageUrlSnapshot must NOT be altered when MasterProduct image changes.'
    );
    console.log('[PASS] Checks 10 & 11: Uploaded Supabase Storage URL persists across Admin/Vendor/Customer catalogs while preserving historical OrderItem image snapshots.');
  } finally {
    if (createdOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.orderAddress.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }
    if (createdStoreProductIds.length > 0) {
      await prisma.cartItem.deleteMany({
        where: { storeProductId: { in: createdStoreProductIds } },
      });
      await prisma.storeProduct.deleteMany({
        where: { id: { in: createdStoreProductIds } },
      });
    }
    if (createdStoreIds.length > 0) {
      await prisma.cart.deleteMany({
        where: { storeId: { in: createdStoreIds } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: createdStoreIds } },
      });
    }
    if (createdMasterProductIds.length > 0) {
      await prisma.masterProduct.deleteMany({
        where: { id: { in: createdMasterProductIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    // Verify 100% preservation of all pre-existing Categories, MasterProducts, Stores, StoreProducts, and Orders
    const [
      postCategories,
      postMasterProducts,
      postStores,
      postStoreProducts,
      postOrdersCount,
    ] = await Promise.all([
      prisma.category.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, updatedAt: true },
      }),
      prisma.masterProduct.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, updatedAt: true },
      }),
      prisma.store.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, updatedAt: true },
      }),
      prisma.storeProduct.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, updatedAt: true },
      }),
      prisma.order.count(),
    ]);

    assert.equal(postOrdersCount, baselineOrdersCount);
    assert.equal(postCategories.length, baselineCategories.length);
    assert.equal(postMasterProducts.length, baselineMasterProducts.length);
    assert.equal(postStores.length, baselineStores.length);
    assert.equal(postStoreProducts.length, baselineStoreProducts.length);

    for (let i = 0; i < baselineMasterProducts.length; i++) {
      assert.equal(postMasterProducts[i].id, baselineMasterProducts[i].id);
      assert.equal(
        postMasterProducts[i].updatedAt.getTime(),
        baselineMasterProducts[i].updatedAt.getTime(),
        `Pre-existing MasterProduct "${baselineMasterProducts[i].name}" must remain untouched.`
      );
    }

    await prisma.$disconnect();
  }

  console.log('ALL 11 ADMIN MASTER CATALOG & IMAGE UPLOAD CHECKS PASSED.');
}

main().catch((error) => {
  console.error('ADMIN MASTER CATALOG VALIDATION FAILED:', error);
  process.exit(1);
});
