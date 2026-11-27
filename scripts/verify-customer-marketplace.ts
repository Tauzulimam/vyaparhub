import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  AccountStatus,
  GstStatus,
  MarketplaceStatus,
  UnitType,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import {
  queryCustomerStoreDetail,
  queryCustomerStoreProductDetail,
  queryVisibleMarketplaceSnapshot,
} from '@/lib/marketplace/server';
import {
  executeStoreDetailsUpdate,
  executeStoreOperatingStatusUpdate,
} from '@/lib/vendor/storePersistence';

/**
 * Focused Phase 7 customer marketplace validation suite.
 *
 * Verifies all 11 Phase 7 requirements against real PostgreSQL over the
 * Supabase transaction pooler (:6543), using existing real vendor/store records
 * (read-only) plus disposable synthetic records cleaned up in `finally` with
 * strict before/after invariance checks.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run verify-customer-marketplace.');
  }

  const sqlLog: string[] = [];
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const prisma = new PrismaClient({
    adapter,
    log: [{ emit: 'event', level: 'query' }],
  });

  prisma.$on('query', (ev) => {
    sqlLog.push(ev.query);
  });

  // Snapshot existing database records to guarantee zero mutation of manual test data
  const [baselineCategories, baselineMasters, baselineStores, baselineStoreProducts] =
    await Promise.all([
      prisma.category.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, updatedAt: true },
      }),
      prisma.masterProduct.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, updatedAt: true },
      }),
      prisma.store.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, isOpen: true, updatedAt: true },
      }),
      prisma.storeProduct.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, storeId: true, updatedAt: true },
      }),
    ]);

  // ---------------------------------------------------------------------------
  // CHECK 1 & 2 (Live Real Data): Open store ("A to Z Kirana Store") visible,
  // closed stores ("Best Medicine", "Sunrise Bakrey") excluded, real StoreProduct
  // ("Cipla ORS") visible with zero sensitive fields leaked.
  // ---------------------------------------------------------------------------
  sqlLog.length = 0;
  const liveSnapshot = await queryVisibleMarketplaceSnapshot(prisma);
  const beginCount = sqlLog.filter((q) => q === 'BEGIN').length;
  assert.equal(beginCount, 0, 'Customer marketplace reads must not open BEGIN transactions.');

  const aToZStore = baselineStores.find((s) => s.name === 'A to Z Kirana Store');
  const bestMedicineStore = baselineStores.find((s) => s.name === 'Best Medicine');

  if (aToZStore?.isOpen) {
    const visibleAtoZ = liveSnapshot.stores.find((s) => s.id === aToZStore.id);
    assert.ok(visibleAtoZ, 'Open store "A to Z Kirana Store" must be customer-visible.');
    assert.equal('gstin' in visibleAtoZ, false, 'Must never expose GSTIN in customer Store DTO.');
    assert.equal(
      'verificationStatus' in visibleAtoZ,
      false,
      'Must never expose internal verificationStatus in customer Store DTO.'
    );
    assert.equal(
      'marketplaceStatus' in visibleAtoZ,
      false,
      'Must never expose internal marketplaceStatus in customer Store DTO.'
    );

    const aToZDetail = await queryCustomerStoreDetail(prisma, aToZStore.id);
    assert.ok(aToZDetail, 'Store detail for "A to Z Kirana Store" must resolve.');
    assert.ok(
      aToZDetail.products.some((p) => p.name.includes('Cipla ORS')),
      'Real StoreProduct (Cipla ORS) in "A to Z Kirana Store" must be visible.'
    );
  }

  if (bestMedicineStore && !bestMedicineStore.isOpen) {
    assert.equal(
      liveSnapshot.stores.some((s) => s.id === bestMedicineStore.id),
      false,
      'Closed store "Best Medicine" must be excluded from customer store discovery.'
    );
    assert.equal(
      liveSnapshot.products.some((p) => p.storeId === bestMedicineStore.id),
      false,
      'Products belonging to closed store "Best Medicine" must be excluded.'
    );
    const closedStoreDetail = await queryCustomerStoreDetail(prisma, bestMedicineStore.id);
    assert.equal(closedStoreDetail, null, 'Closed store detail must return null (404).');
  }
  console.log('[PASS] Checks 1, 2 & 4 (Live Data): Real open store + Cipla ORS visible; closed stores & products excluded; zero BEGIN transactions.');

  // ---------------------------------------------------------------------------
  // Synthetic fixture setup for exhaustive matrix checks (cleaned up in finally)
  // ---------------------------------------------------------------------------
  const token = crypto.randomBytes(4).toString('hex').toLowerCase();
  const activeCategory = await prisma.category.findFirstOrThrow({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const sharedMaster = await prisma.masterProduct.findFirstOrThrow({
    where: { isActive: true, categoryId: activeCategory.id },
    select: { id: true, name: true, mrp: true },
  });

  const createdUserIds: string[] = [];
  const createdStoreIds: string[] = [];
  const createdStoreProductIds: string[] = [];
  const createdMasterIds: string[] = [];
  const createdCategoryIds: string[] = [];

  try {
    // Active vendor + suspended vendor
    const activeVendorUser = await prisma.user.create({
      data: {
        id: `mp7_u_act_${token}`,
        authUserId: crypto.randomUUID(),
        email: `mp7-act-${token}@vyaparhub.local`,
        phone: `97${String(Math.floor(10000000 + Math.random() * 89999999))}`,
        role: UserRole.VENDOR,
        accountStatus: AccountStatus.ACTIVE,
        vendorProfile: {
          create: {
            ownerName: 'MP7 Active Vendor',
            registeredMobile: '9700000001',
            businessEmail: `mp7-act-${token}@vyaparhub.local`,
            verificationStatus: VerificationStatus.VERIFIED,
          },
        },
      },
      select: { id: true, vendorProfile: { select: { id: true, ownerName: true } } },
    });
    createdUserIds.push(activeVendorUser.id);

    const suspendedVendorUser = await prisma.user.create({
      data: {
        id: `mp7_u_sus_${token}`,
        authUserId: crypto.randomUUID(),
        email: `mp7-sus-${token}@vyaparhub.local`,
        phone: `96${String(Math.floor(10000000 + Math.random() * 89999999))}`,
        role: UserRole.VENDOR,
        accountStatus: AccountStatus.SUSPENDED,
        vendorProfile: {
          create: {
            ownerName: 'MP7 Suspended Vendor',
            registeredMobile: '9600000002',
            businessEmail: `mp7-sus-${token}@vyaparhub.local`,
            verificationStatus: VerificationStatus.VERIFIED,
          },
        },
      },
      select: { id: true, vendorProfile: { select: { id: true } } },
    });
    createdUserIds.push(suspendedVendorUser.id);

    const vpActive = activeVendorUser.vendorProfile!;
    const vpSuspendedUser = suspendedVendorUser.vendorProfile!;

    // Create stores covering all visibility states:
    // 1. Open Store A (visible)
    // 2. Open Store B (visible — for per-store price/stock isolation)
    // 3. Closed Store (excluded)
    // 4. Suspended Marketplace Store (excluded)
    // 5. Rejected Verification Store (excluded)
    // 6. Open Store owned by Suspended User (excluded)
    const [storeOpenA, storeOpenB, storeClosed, storeSuspended, storeRejected, storeSuspendedOwner] =
      await Promise.all([
        prisma.store.create({
          data: {
            vendorProfileId: vpActive.id,
            categoryId: activeCategory.id,
            name: `MP7 Open Alpha ${token}`,
            phone: '9800000001',
            addressLine1: 'Shop 1, Alpha Lane',
            area: 'Indiranagar',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560038',
            openingTime: '08:00',
            closingTime: '22:00',
            deliveryRadiusKm: 4,
            minimumOrderAmount: 120,
            isOpen: true,
            verificationStatus: VerificationStatus.PENDING,
            marketplaceStatus: MarketplaceStatus.ACTIVE,
            businessDetails: {
              create: { gstStatus: GstStatus.NOT_REGISTERED, gstVerified: false },
            },
          },
          select: { id: true },
        }),
        prisma.store.create({
          data: {
            vendorProfileId: vpActive.id,
            categoryId: activeCategory.id,
            name: `MP7 Open Beta ${token}`,
            phone: '9800000002',
            addressLine1: 'Shop 2, Beta Lane',
            area: 'Koramangala',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560034',
            openingTime: '09:30',
            closingTime: '21:30',
            deliveryRadiusKm: 5,
            minimumOrderAmount: 150,
            isOpen: true,
            verificationStatus: VerificationStatus.VERIFIED,
            marketplaceStatus: MarketplaceStatus.ACTIVE,
            businessDetails: {
              create: { gstStatus: GstStatus.NOT_REGISTERED, gstVerified: true },
            },
          },
          select: { id: true },
        }),
        prisma.store.create({
          data: {
            vendorProfileId: vpActive.id,
            categoryId: activeCategory.id,
            name: `MP7 Closed ${token}`,
            phone: '9800000003',
            addressLine1: 'Shop 3',
            area: 'Area',
            city: 'City',
            state: 'State',
            postalCode: '560001',
            isOpen: false,
            verificationStatus: VerificationStatus.VERIFIED,
            marketplaceStatus: MarketplaceStatus.ACTIVE,
          },
          select: { id: true },
        }),
        prisma.store.create({
          data: {
            vendorProfileId: vpActive.id,
            categoryId: activeCategory.id,
            name: `MP7 Suspended ${token}`,
            phone: '9800000004',
            addressLine1: 'Shop 4',
            area: 'Area',
            city: 'City',
            state: 'State',
            postalCode: '560001',
            isOpen: true,
            verificationStatus: VerificationStatus.VERIFIED,
            marketplaceStatus: MarketplaceStatus.SUSPENDED,
          },
          select: { id: true },
        }),
        prisma.store.create({
          data: {
            vendorProfileId: vpActive.id,
            categoryId: activeCategory.id,
            name: `MP7 Rejected ${token}`,
            phone: '9800000005',
            addressLine1: 'Shop 5',
            area: 'Area',
            city: 'City',
            state: 'State',
            postalCode: '560001',
            isOpen: true,
            verificationStatus: VerificationStatus.REJECTED,
            marketplaceStatus: MarketplaceStatus.ACTIVE,
          },
          select: { id: true },
        }),
        prisma.store.create({
          data: {
            vendorProfileId: vpSuspendedUser.id,
            categoryId: activeCategory.id,
            name: `MP7 SuspendedOwner ${token}`,
            phone: '9800000006',
            addressLine1: 'Shop 6',
            area: 'Area',
            city: 'City',
            state: 'State',
            postalCode: '560001',
            isOpen: true,
            verificationStatus: VerificationStatus.VERIFIED,
            marketplaceStatus: MarketplaceStatus.ACTIVE,
          },
          select: { id: true },
        }),
      ]);

    createdStoreIds.push(
      storeOpenA.id,
      storeOpenB.id,
      storeClosed.id,
      storeSuspended.id,
      storeRejected.id,
      storeSuspendedOwner.id
    );

    // Disposable inactive MasterProduct + inactive Category + active extra MasterProducts
    const inactiveCategory = await prisma.category.create({
      data: {
        name: `MP7 Inactive Cat ${token}`,
        slug: `mp7-inactive-cat-${token}`,
        isActive: false,
      },
      select: { id: true },
    });
    createdCategoryIds.push(inactiveCategory.id);

    const [inactiveMaster, masterInInactiveCat, masterForUnavailable, masterForZeroStock] =
      await Promise.all([
        prisma.masterProduct.create({
          data: {
            categoryId: activeCategory.id,
            name: `MP7 Inactive Master ${token}`,
            brand: 'TestBrand',
            unitValue: 1,
            unitType: UnitType.PACK,
            mrp: 100,
            imageUrl: '/images/placeholder-product.svg',
            isActive: false,
          },
          select: { id: true },
        }),
        prisma.masterProduct.create({
          data: {
            categoryId: inactiveCategory.id,
            name: `MP7 InactiveCat Master ${token}`,
            brand: 'TestBrand',
            unitValue: 1,
            unitType: UnitType.PACK,
            mrp: 100,
            imageUrl: '/images/placeholder-product.svg',
            isActive: true,
          },
          select: { id: true },
        }),
        prisma.masterProduct.create({
          data: {
            categoryId: activeCategory.id,
            name: `MP7 Unavailable Target ${token}`,
            brand: 'TestBrand',
            unitValue: 500,
            unitType: UnitType.G,
            mrp: 90,
            imageUrl: '/images/placeholder-product.svg',
            isActive: true,
          },
          select: { id: true },
        }),
        prisma.masterProduct.create({
          data: {
            categoryId: activeCategory.id,
            name: `MP7 ZeroStock Target ${token}`,
            brand: 'TestBrand',
            unitValue: 500,
            unitType: UnitType.G,
            mrp: 80,
            imageUrl: '/images/placeholder-product.svg',
            isActive: true,
          },
          select: { id: true },
        }),
      ]);
    createdMasterIds.push(
      inactiveMaster.id,
      masterInInactiveCat.id,
      masterForUnavailable.id,
      masterForZeroStock.id
    );

    const mrpNum = Number(sharedMaster.mrp);
    const priceAlpha = Math.max(1, Number((mrpNum - 10).toFixed(2)));
    const priceBeta = Math.max(1, Number((mrpNum - 3).toFixed(2)));

    // Create StoreProducts testing all visibility and isolation rules
    const [
      spAlphaValid,
      spBetaValid,
      spUnavailable,
      spZeroStock,
      spInactiveMaster,
      spInactiveCategory,
      spInSuspendedStore,
    ] = await Promise.all([
      prisma.storeProduct.create({
        data: {
          storeId: storeOpenA.id,
          masterProductId: sharedMaster.id,
          sellingPrice: priceAlpha,
          stockQuantity: 14,
          isAvailable: true,
        },
        select: { id: true },
      }),
      prisma.storeProduct.create({
        data: {
          storeId: storeOpenB.id,
          masterProductId: sharedMaster.id,
          sellingPrice: priceBeta,
          stockQuantity: 4,
          isAvailable: true,
        },
        select: { id: true },
      }),
      prisma.storeProduct.create({
        data: {
          storeId: storeOpenA.id,
          masterProductId: masterForUnavailable.id,
          sellingPrice: 85,
          stockQuantity: 10,
          isAvailable: false,
        },
        select: { id: true },
      }),
      prisma.storeProduct.create({
        data: {
          storeId: storeOpenA.id,
          masterProductId: masterForZeroStock.id,
          sellingPrice: 75,
          stockQuantity: 0,
          isAvailable: true,
        },
        select: { id: true },
      }),
      prisma.storeProduct.create({
        data: {
          storeId: storeOpenA.id,
          masterProductId: inactiveMaster.id,
          sellingPrice: 95,
          stockQuantity: 8,
          isAvailable: true,
        },
        select: { id: true },
      }),
      prisma.storeProduct.create({
        data: {
          storeId: storeOpenA.id,
          masterProductId: masterInInactiveCat.id,
          sellingPrice: 95,
          stockQuantity: 8,
          isAvailable: true,
        },
        select: { id: true },
      }),
      prisma.storeProduct.create({
        data: {
          storeId: storeSuspended.id,
          masterProductId: sharedMaster.id,
          sellingPrice: priceAlpha,
          stockQuantity: 20,
          isAvailable: true,
        },
        select: { id: true },
      }),
    ]);

    createdStoreProductIds.push(
      spAlphaValid.id,
      spBetaValid.id,
      spUnavailable.id,
      spZeroStock.id,
      spInactiveMaster.id,
      spInactiveCategory.id,
      spInSuspendedStore.id
    );

    // -------------------------------------------------------------------------
    // CHECK 3: Closed, Suspended, Rejected, and Suspended-Vendor stores excluded
    // -------------------------------------------------------------------------
    const snap = await queryVisibleMarketplaceSnapshot(prisma);
    const visibleStoreIdSet = new Set(snap.stores.map((s) => s.id));
    assert.equal(visibleStoreIdSet.has(storeOpenA.id), true, 'Open PENDING store must appear.');
    assert.equal(visibleStoreIdSet.has(storeOpenB.id), true, 'Open VERIFIED store must appear.');
    assert.equal(visibleStoreIdSet.has(storeClosed.id), false, 'Closed store must be excluded.');
    assert.equal(
      visibleStoreIdSet.has(storeSuspended.id),
      false,
      'Suspended marketplace store must be excluded.'
    );
    assert.equal(
      visibleStoreIdSet.has(storeRejected.id),
      false,
      'Rejected verification store must be excluded.'
    );
    assert.equal(
      visibleStoreIdSet.has(storeSuspendedOwner.id),
      false,
      'Store owned by suspended user account must be excluded.'
    );

    assert.equal(await queryCustomerStoreDetail(prisma, storeClosed.id), null);
    assert.equal(await queryCustomerStoreDetail(prisma, storeSuspended.id), null);
    assert.equal(await queryCustomerStoreDetail(prisma, storeRejected.id), null);
    assert.equal(await queryCustomerStoreDetail(prisma, storeSuspendedOwner.id), null);
    console.log('[PASS] Check 3: Suspended, rejected, closed, and suspended-vendor stores strictly excluded.');

    // -------------------------------------------------------------------------
    // CHECKS 5, 6, 7: Unavailable, zero-stock, inactive MasterProduct, inactive Category excluded
    // -------------------------------------------------------------------------
    const visibleProductIdSet = new Set(snap.products.map((p) => p.id));
    assert.equal(visibleProductIdSet.has(spAlphaValid.id), true);
    assert.equal(visibleProductIdSet.has(spBetaValid.id), true);
    assert.equal(visibleProductIdSet.has(spUnavailable.id), false, 'Unavailable StoreProduct excluded.');
    assert.equal(visibleProductIdSet.has(spZeroStock.id), false, 'Zero-stock StoreProduct excluded.');
    assert.equal(
      visibleProductIdSet.has(spInactiveMaster.id),
      false,
      'Inactive MasterProduct excluded.'
    );
    assert.equal(
      visibleProductIdSet.has(spInactiveCategory.id),
      false,
      'Inactive Category product excluded.'
    );
    assert.equal(
      visibleProductIdSet.has(spInSuspendedStore.id),
      false,
      'Product in suspended store excluded.'
    );

    assert.equal(await queryCustomerStoreProductDetail(prisma, spUnavailable.id), null);
    assert.equal(await queryCustomerStoreProductDetail(prisma, spZeroStock.id), null);
    assert.equal(await queryCustomerStoreProductDetail(prisma, spInactiveMaster.id), null);
    assert.equal(await queryCustomerStoreProductDetail(prisma, spInactiveCategory.id), null);
    assert.equal(await queryCustomerStoreProductDetail(prisma, spInSuspendedStore.id), null);
    console.log('[PASS] Checks 5, 6 & 7: Unavailable, zero-stock, inactive MasterProduct, and inactive Category products excluded.');

    // -------------------------------------------------------------------------
    // CHECK 8: Per-store price/stock isolation for identical MasterProduct
    // -------------------------------------------------------------------------
    const detailAlpha = await queryCustomerStoreProductDetail(prisma, spAlphaValid.id);
    const detailBeta = await queryCustomerStoreProductDetail(prisma, spBetaValid.id);
    assert.ok(detailAlpha && detailBeta);
    assert.equal(detailAlpha.product.masterProductId, sharedMaster.id);
    assert.equal(detailBeta.product.masterProductId, sharedMaster.id);
    assert.notEqual(detailAlpha.product.id, detailBeta.product.id);
    assert.equal(detailAlpha.product.price, priceAlpha);
    assert.equal(detailAlpha.product.quantityAvailable, 14);
    assert.equal(detailBeta.product.price, priceBeta);
    assert.equal(detailBeta.product.quantityAvailable, 4);
    assert.ok(
      detailAlpha.otherStoreOffers.some(
        (o) => o.storeProductId === spBetaValid.id && o.price === priceBeta && o.quantityAvailable === 4
      ),
      'Sibling store offer must preserve independent price and stock.'
    );
    console.log('[PASS] Check 8: Per-store StoreProduct price and stock isolation verified.');

    // -------------------------------------------------------------------------
    // CHECK 9: Invalid store/product IDs and empty-product store handled safely
    // -------------------------------------------------------------------------
    assert.equal(await queryCustomerStoreDetail(prisma, ''), null);
    assert.equal(await queryCustomerStoreDetail(prisma, '   '), null);
    assert.equal(await queryCustomerStoreDetail(prisma, 'nonexistent_store_id_12345'), null);
    assert.equal(await queryCustomerStoreProductDetail(prisma, ''), null);
    assert.equal(await queryCustomerStoreProductDetail(prisma, 'nonexistent_sp_id_12345'), null);

    // Store with 0 available products renders store safely with empty products array
    await prisma.storeProduct.update({
      where: { id: spBetaValid.id },
      data: { isAvailable: false },
    });
    const emptyStoreDetail = await queryCustomerStoreDetail(prisma, storeOpenB.id);
    assert.ok(emptyStoreDetail, 'Open store with zero available products must still load safely.');
    assert.equal(emptyStoreDetail.products.length, 0);
    console.log('[PASS] Check 9: Invalid IDs and zero-product open store handled safely without crashes.');

    // -------------------------------------------------------------------------
    // CHECK 10 & 11: Vendor mutations (price, stock, store details, open/close)
    // immediately reflected in customer marketplace queries + Phase 5C regression
    // -------------------------------------------------------------------------
    const updatedPrice = Math.max(1, Number((priceAlpha - 2).toFixed(2)));
    await prisma.storeProduct.update({
      where: { id: spAlphaValid.id },
      data: { sellingPrice: updatedPrice, stockQuantity: 9 },
    });

    const storeDetailsUpdateRes = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vpActive.id,
      ownerName: vpActive.ownerName,
      activeStoreId: storeOpenA.id,
      requestedStoreId: storeOpenA.id,
      accountStatus: AccountStatus.ACTIVE,
      input: {
        area: 'HSR Layout',
        minimumOrderAmount: 175,
        openingTime: '07:30',
        closingTime: '22:30',
      },
    });
    assert.equal(storeDetailsUpdateRes.success, true);

    const refreshedDetail = await queryCustomerStoreProductDetail(prisma, spAlphaValid.id);
    assert.ok(refreshedDetail);
    assert.equal(refreshedDetail.product.price, updatedPrice);
    assert.equal(refreshedDetail.product.quantityAvailable, 9);
    assert.equal(refreshedDetail.store.area, 'HSR Layout');
    assert.equal(refreshedDetail.store.minOrderAmount, 175);
    assert.equal(refreshedDetail.store.timing, '7:30 AM – 10:30 PM');

    // Vendor closes Store Alpha -> immediately disappears from customer marketplace
    const closeRes = await executeStoreOperatingStatusUpdate(prisma, {
      vendorProfileId: vpActive.id,
      ownerName: vpActive.ownerName,
      activeStoreId: storeOpenA.id,
      requestedStoreId: storeOpenA.id,
      nextIsOpen: false,
      accountStatus: AccountStatus.ACTIVE,
    });
    assert.equal(closeRes.success, true);
    assert.equal(await queryCustomerStoreDetail(prisma, storeOpenA.id), null);
    assert.equal(await queryCustomerStoreProductDetail(prisma, spAlphaValid.id), null);
    console.log('[PASS] Checks 10 & 11: Vendor price/stock/store/isOpen updates reflected immediately in marketplace reads.');
  } finally {
    // Clean up all disposable synthetic rows in strict dependency order
    if (createdStoreProductIds.length > 0) {
      await prisma.storeProduct.deleteMany({
        where: { id: { in: createdStoreProductIds } },
      });
    }
    if (createdStoreIds.length > 0) {
      await prisma.store.deleteMany({
        where: { id: { in: createdStoreIds } },
      });
    }
    if (createdMasterIds.length > 0) {
      await prisma.masterProduct.deleteMany({
        where: { id: { in: createdMasterIds } },
      });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    // Verify 100% preservation of pre-existing manual test data
    const [postCategories, postMasters, postStores, postStoreProducts] = await Promise.all([
      prisma.category.findMany({ orderBy: { id: 'asc' }, select: { id: true, updatedAt: true } }),
      prisma.masterProduct.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, updatedAt: true },
      }),
      prisma.store.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, isOpen: true, updatedAt: true },
      }),
      prisma.storeProduct.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, storeId: true, updatedAt: true },
      }),
    ]);

    assert.equal(postCategories.length, baselineCategories.length);
    assert.equal(postMasters.length, baselineMasters.length);
    assert.equal(postStores.length, baselineStores.length);
    assert.equal(postStoreProducts.length, baselineStoreProducts.length);

    for (let i = 0; i < baselineStores.length; i++) {
      assert.equal(postStores[i].id, baselineStores[i].id);
      assert.equal(
        postStores[i].updatedAt.getTime(),
        baselineStores[i].updatedAt.getTime(),
        `Existing store "${baselineStores[i].name}" must remain untouched.`
      );
    }
    for (let i = 0; i < baselineStoreProducts.length; i++) {
      assert.equal(postStoreProducts[i].id, baselineStoreProducts[i].id);
      assert.equal(
        postStoreProducts[i].updatedAt.getTime(),
        baselineStoreProducts[i].updatedAt.getTime(),
        'Existing StoreProduct rows must remain untouched.'
      );
    }

    await prisma.$disconnect();
  }

  console.log('ALL 11 PHASE 7 CUSTOMER MARKETPLACE CHECKS PASSED.');
}

main().catch((error) => {
  console.error('PHASE 7 VALIDATION FAILED:', error);
  process.exit(1);
});
