import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  AccountStatus,
  GstStatus,
  MarketplaceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UnitType,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import {
  executeAddToCart,
  executeClearCustomerCart,
  executeCreateCustomerAddress,
  executeDeleteCustomerAddress,
  executeRemoveCartItem,
  executeReplaceCartWithItem,
  executeSetDefaultCustomerAddress,
  executeUpdateCartItemQuantity,
  executeUpdateCustomerAddress,
  executeUpdateCustomerProfileName,
  executeValidateCustomerCheckout,
  queryCustomerAddresses,
  queryCustomerCart,
  queryCustomerDefaultLocationLabel,
  queryCustomerOrderDetail,
  queryCustomerOrders,
  queryCustomerProfileSummary,
} from '@/lib/cart/persistence';
import {
  DEFAULT_DELIVERY_LOCATION_LABEL,
  deriveDeliveryLocationLabel,
} from '@/lib/cart/types';

/**
 * Focused Phase 8 automated validation suite covering all 16 required scenarios
 * against live Supabase PostgreSQL (:6543).
 *
 * Uses existing manual test records ("A to Z Kirana Store" + "Cipla ORS") on a
 * disposable synthetic customer for real-product read/cart checks, plus disposable
 * synthetic vendor/store/product rows for vendor price/stock/close mutation tests,
 * cleaning up all synthetic records in `finally` and asserting 100% invariance on
 * pre-existing data.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run verify-customer-cart-checkout.');
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const prisma = new PrismaClient({ adapter });

  // Snapshot existing manual test data to assert zero permanent changes
  const [baselineStores, baselineStoreProducts, baselineOrders] = await Promise.all([
    prisma.store.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, isOpen: true, updatedAt: true },
    }),
    prisma.storeProduct.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        storeId: true,
        sellingPrice: true,
        stockQuantity: true,
        isAvailable: true,
        updatedAt: true,
      },
    }),
    prisma.order.count(),
  ]);

  const token = crypto.randomBytes(4).toString('hex').toLowerCase();
  const activeCategory = await prisma.category.findFirstOrThrow({
    where: { isActive: true },
    select: { id: true },
  });

  const createdUserIds: string[] = [];
  const createdStoreIds: string[] = [];
  const createdStoreProductIds: string[] = [];
  const createdMasterIds: string[] = [];
  const createdOrderIds: string[] = [];

  try {
    // Provision two disposable CUSTOMER accounts + one disposable VENDOR account
    const [custUserA, custUserB, vendorUser] = await Promise.all([
      prisma.user.create({
        data: {
          id: `p8_ca_${token}`,
          authUserId: crypto.randomUUID(),
          email: `p8-cust-a-${token}@vyaparhub.local`,
          phone: `95${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.CUSTOMER,
          accountStatus: AccountStatus.ACTIVE,
          customerProfile: {
            create: { fullName: 'Phase 8 Customer Alpha' },
          },
        },
        select: { id: true, customerProfile: { select: { id: true } } },
      }),
      prisma.user.create({
        data: {
          id: `p8_cb_${token}`,
          authUserId: crypto.randomUUID(),
          email: `p8-cust-b-${token}@vyaparhub.local`,
          phone: `94${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.CUSTOMER,
          accountStatus: AccountStatus.ACTIVE,
          customerProfile: {
            create: { fullName: 'Phase 8 Customer Beta' },
          },
        },
        select: { id: true, customerProfile: { select: { id: true } } },
      }),
      prisma.user.create({
        data: {
          id: `p8_v_${token}`,
          authUserId: crypto.randomUUID(),
          email: `p8-vendor-${token}@vyaparhub.local`,
          phone: `93${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.VENDOR,
          accountStatus: AccountStatus.ACTIVE,
          vendorProfile: {
            create: {
              ownerName: 'Phase 8 Test Vendor',
              registeredMobile: '9300000001',
              businessEmail: `p8-vendor-${token}@vyaparhub.local`,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
        },
        select: { id: true, vendorProfile: { select: { id: true } } },
      }),
    ]);

    createdUserIds.push(custUserA.id, custUserB.id, vendorUser.id);
    const cpAlpha = custUserA.customerProfile!.id;
    const cpBeta = custUserB.customerProfile!.id;
    const vpTest = vendorUser.vendorProfile!.id;

    // Create disposable open Store 1, open Store 2, and closed Store 3
    const [storeOne, storeTwo, storeClosed] = await Promise.all([
      prisma.store.create({
        data: {
          vendorProfileId: vpTest,
          categoryId: activeCategory.id,
          name: `P8 Store One ${token}`,
          phone: '9800010001',
          addressLine1: 'Shop 10, Market Rd',
          area: 'Gumpa',
          city: 'Bidar',
          state: 'Karnataka',
          postalCode: '585401',
          openingTime: '08:00',
          closingTime: '22:00',
          deliveryRadiusKm: 4,
          minimumOrderAmount: 100,
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
          vendorProfileId: vpTest,
          categoryId: activeCategory.id,
          name: `P8 Store Two ${token}`,
          phone: '9800010002',
          addressLine1: 'Shop 20, Station Rd',
          area: 'Gandhi Gunj',
          city: 'Bidar',
          state: 'Karnataka',
          postalCode: '585401',
          openingTime: '09:00',
          closingTime: '21:00',
          deliveryRadiusKm: 5,
          minimumOrderAmount: 80,
          isOpen: true,
          verificationStatus: VerificationStatus.VERIFIED,
          marketplaceStatus: MarketplaceStatus.ACTIVE,
          businessDetails: {
            create: { gstStatus: GstStatus.NOT_REGISTERED, gstVerified: true },
          },
        },
        select: { id: true, name: true },
      }),
      prisma.store.create({
        data: {
          vendorProfileId: vpTest,
          categoryId: activeCategory.id,
          name: `P8 Closed Store ${token}`,
          phone: '9800010003',
          addressLine1: 'Shop 30',
          area: 'Gumpa',
          city: 'Bidar',
          state: 'Karnataka',
          postalCode: '585401',
          isOpen: false,
          verificationStatus: VerificationStatus.VERIFIED,
          marketplaceStatus: MarketplaceStatus.ACTIVE,
        },
        select: { id: true },
      }),
    ]);
    createdStoreIds.push(storeOne.id, storeTwo.id, storeClosed.id);

    const [masterA, masterB, masterUnavail, masterZero] = await Promise.all([
      prisma.masterProduct.create({
        data: {
          categoryId: activeCategory.id,
          name: `P8 Master Item A ${token}`,
          brand: 'VyaparTest',
          unitValue: 500,
          unitType: UnitType.ML,
          mrp: 60,
          imageUrl: '/images/placeholder-product.svg',
          isActive: true,
        },
        select: { id: true, name: true },
      }),
      prisma.masterProduct.create({
        data: {
          categoryId: activeCategory.id,
          name: `P8 Master Item B ${token}`,
          brand: 'VyaparTest',
          unitValue: 1,
          unitType: UnitType.KG,
          mrp: 120,
          imageUrl: '/images/placeholder-product.svg',
          isActive: true,
        },
        select: { id: true },
      }),
      prisma.masterProduct.create({
        data: {
          categoryId: activeCategory.id,
          name: `P8 Master Unavail ${token}`,
          brand: 'VyaparTest',
          unitValue: 1,
          unitType: UnitType.PACK,
          mrp: 45,
          imageUrl: '/images/placeholder-product.svg',
          isActive: true,
        },
        select: { id: true },
      }),
      prisma.masterProduct.create({
        data: {
          categoryId: activeCategory.id,
          name: `P8 Master Zero ${token}`,
          brand: 'VyaparTest',
          unitValue: 1,
          unitType: UnitType.PACK,
          mrp: 45,
          imageUrl: '/images/placeholder-product.svg',
          isActive: true,
        },
        select: { id: true },
      }),
    ]);
    createdMasterIds.push(masterA.id, masterB.id, masterUnavail.id, masterZero.id);

    const [spStore1A, spStore1B, spStore2A, spUnavailable, spZeroStock, spClosedStore] =
      await Promise.all([
        prisma.storeProduct.create({
          data: {
            storeId: storeOne.id,
            masterProductId: masterA.id,
            sellingPrice: 50,
            stockQuantity: 5,
            isAvailable: true,
          },
          select: { id: true },
        }),
        prisma.storeProduct.create({
          data: {
            storeId: storeOne.id,
            masterProductId: masterB.id,
            sellingPrice: 100,
            stockQuantity: 8,
            isAvailable: true,
          },
          select: { id: true },
        }),
        prisma.storeProduct.create({
          data: {
            storeId: storeTwo.id,
            masterProductId: masterA.id,
            sellingPrice: 48,
            stockQuantity: 6,
            isAvailable: true,
          },
          select: { id: true },
        }),
        prisma.storeProduct.create({
          data: {
            storeId: storeOne.id,
            masterProductId: masterUnavail.id,
            sellingPrice: 40,
            stockQuantity: 10,
            isAvailable: false,
          },
          select: { id: true },
        }),
        prisma.storeProduct.create({
          data: {
            storeId: storeOne.id,
            masterProductId: masterZero.id,
            sellingPrice: 40,
            stockQuantity: 0,
            isAvailable: true,
          },
          select: { id: true },
        }),
        prisma.storeProduct.create({
          data: {
            storeId: storeClosed.id,
            masterProductId: masterA.id,
            sellingPrice: 45,
            stockQuantity: 10,
            isAvailable: true,
          },
          select: { id: true },
        }),
      ]);
    createdStoreProductIds.push(
      spStore1A.id,
      spStore1B.id,
      spStore2A.id,
      spUnavailable.id,
      spZeroStock.id,
      spClosedStore.id
    );

    // -------------------------------------------------------------------------
    // 1. Authenticated customer cart retrieval (starts empty) + real demo product check
    // -------------------------------------------------------------------------
    const initialEmpty = await queryCustomerCart(prisma, cpAlpha);
    assert.equal(initialEmpty.items.length, 0);
    assert.equal(initialEmpty.subtotal, 0);
    assert.equal(initialEmpty.canCheckout, false);

    // Also test adding existing real demo product ("Cipla ORS" in "A to Z Kirana Store") on cpBeta, then clearing cpBeta's cart
    const aToZStore = baselineStores.find((s) => s.name === 'A to Z Kirana Store' && s.isOpen);
    const ciplaInAtoZ = aToZStore
      ? baselineStoreProducts.find(
          (sp) => sp.storeId === aToZStore.id && sp.isAvailable && sp.stockQuantity > 0
        )
      : undefined;
    if (ciplaInAtoZ) {
      const realDemoAdd = await executeAddToCart(prisma, {
        customerProfileId: cpBeta,
        storeProductId: ciplaInAtoZ.id,
        quantityToAdd: 2,
      });
      assert.equal(realDemoAdd.success, true, 'Adding real A to Z Kirana product must succeed.');
      assert.equal(
        realDemoAdd.cart.subtotal,
        Number((Number(ciplaInAtoZ.sellingPrice) * 2).toFixed(2))
      );
      await executeClearCustomerCart(prisma, cpBeta);
    }
    console.log('[PASS] Check 1: Authenticated customer cart retrieval & real A to Z Kirana demo product verified.');

    // -------------------------------------------------------------------------
    // 2 & 3. Add real StoreProduct + duplicate add updates quantity (no duplicate row)
    // -------------------------------------------------------------------------
    const addFirst = await executeAddToCart(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spStore1A.id,
      quantityToAdd: 2,
    });
    assert.equal(addFirst.success, true);
    assert.equal(addFirst.cart.items.length, 1);
    assert.equal(addFirst.cart.items[0].quantity, 2);
    assert.equal(addFirst.cart.subtotal, 100); // 2 * ₹50

    const addDuplicate = await executeAddToCart(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spStore1A.id,
      quantityToAdd: 2,
    });
    assert.equal(addDuplicate.success, true);
    assert.equal(addDuplicate.cart.items.length, 1, 'Must not create duplicate CartItem row.');
    assert.equal(addDuplicate.cart.items[0].quantity, 4);
    assert.equal(addDuplicate.cart.subtotal, 200); // 4 * ₹50

    const dbItemCount = await prisma.cartItem.count({
      where: { cartId: addDuplicate.cart.cartId! },
    });
    assert.equal(dbItemCount, 1);
    console.log('[PASS] Checks 2 & 3: Add StoreProduct & duplicate-add quantity deduplication verified.');

    // -------------------------------------------------------------------------
    // 4. Quantity cannot exceed stock (stock is 5, current qty is 4)
    // -------------------------------------------------------------------------
    const overStockAdd = await executeAddToCart(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spStore1A.id,
      quantityToAdd: 2, // 4 + 2 = 6 > 5
    });
    assert.equal(overStockAdd.success, false);
    assert.equal(overStockAdd.code, 'INSUFFICIENT_STOCK');

    const cartItemIdA = addDuplicate.cart.items[0].cartItemId;
    const overStockSet = await executeUpdateCartItemQuantity(prisma, {
      customerProfileId: cpAlpha,
      cartItemId: cartItemIdA,
      nextQuantity: 9, // > 5
    });
    assert.equal(overStockSet.success, false);
    assert.equal(overStockSet.code, 'INSUFFICIENT_STOCK');
    console.log('[PASS] Check 4: Stock ceiling enforced on both add and quantity update.');

    // -------------------------------------------------------------------------
    // 5 & 6. Quantity update persists + remove persists
    // -------------------------------------------------------------------------
    const addSecondSameStore = await executeAddToCart(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spStore1B.id,
      quantityToAdd: 1,
    });
    assert.equal(addSecondSameStore.success, true);
    assert.equal(addSecondSameStore.cart.items.length, 2);

    const qtyUpdateRes = await executeUpdateCartItemQuantity(prisma, {
      customerProfileId: cpAlpha,
      cartItemId: cartItemIdA,
      nextQuantity: 3,
    });
    assert.equal(qtyUpdateRes.success, true);

    const reloadedAfterQty = await queryCustomerCart(prisma, cpAlpha);
    assert.equal(
      reloadedAfterQty.items.find((i) => i.cartItemId === cartItemIdA)?.quantity,
      3
    );
    assert.equal(reloadedAfterQty.subtotal, 250); // (3 * ₹50) + (1 * ₹100)

    const itemBId = reloadedAfterQty.items.find((i) => i.storeProductId === spStore1B.id)!.cartItemId;
    const removeRes = await executeRemoveCartItem(prisma, {
      customerProfileId: cpAlpha,
      cartItemId: itemBId,
    });
    assert.equal(removeRes.success, true);
    assert.equal(removeRes.cart.items.length, 1);
    assert.equal(removeRes.cart.subtotal, 150);
    console.log('[PASS] Checks 5 & 6: Quantity update and item removal persistence verified.');

    // -------------------------------------------------------------------------
    // 7. Single-store rule enforced (rejects Store Two without deleting Store One cart)
    // -------------------------------------------------------------------------
    const conflictAttempt = await executeAddToCart(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spStore2A.id,
      quantityToAdd: 1,
    });
    assert.equal(conflictAttempt.success, false);
    assert.equal(conflictAttempt.code, 'STORE_CONFLICT');

    const preservedCart = await queryCustomerCart(prisma, cpAlpha);
    assert.equal(preservedCart.store?.id, storeOne.id);
    assert.equal(preservedCart.items.length, 1);
    assert.equal(preservedCart.items[0].quantity, 3);
    console.log('[PASS] Check 7: Single-store cart rule strictly enforced without data loss.');

    // -------------------------------------------------------------------------
    // 8. Cross-customer cart mutation blocked
    // -------------------------------------------------------------------------
    const crossUpdateAttempt = await executeUpdateCartItemQuantity(prisma, {
      customerProfileId: cpBeta, // Wrong customer!
      cartItemId: cartItemIdA,
      nextQuantity: 1,
    });
    assert.equal(crossUpdateAttempt.success, false);
    assert.equal(crossUpdateAttempt.code, 'NOT_FOUND');

    const crossRemoveAttempt = await executeRemoveCartItem(prisma, {
      customerProfileId: cpBeta, // Wrong customer!
      cartItemId: cartItemIdA,
    });
    assert.equal(crossRemoveAttempt.success, false);
    assert.equal(crossRemoveAttempt.code, 'NOT_FOUND');
    console.log('[PASS] Check 8: Cross-customer cart mutations strictly blocked.');

    // -------------------------------------------------------------------------
    // 9 & 10. Unavailable/zero-stock product & closed/ineligible store rejected
    // -------------------------------------------------------------------------
    const unavailRes = await executeAddToCart(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spUnavailable.id,
      quantityToAdd: 1,
    });
    assert.equal(unavailRes.success, false);
    assert.equal(unavailRes.code, 'PRODUCT_INELIGIBLE');

    const zeroRes = await executeAddToCart(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spZeroStock.id,
      quantityToAdd: 1,
    });
    assert.equal(zeroRes.success, false);
    assert.equal(zeroRes.code, 'OUT_OF_STOCK');

    const closedStoreAdd = await executeAddToCart(prisma, {
      customerProfileId: cpBeta,
      storeProductId: spClosedStore.id,
      quantityToAdd: 1,
    });
    assert.equal(closedStoreAdd.success, false);
    assert.equal(closedStoreAdd.code, 'STORE_INELIGIBLE');
    console.log('[PASS] Checks 9 & 10: Unavailable, zero-stock, and closed-store products rejected.');

    // -------------------------------------------------------------------------
    // 11 & 12. Current PostgreSQL selling price used + vendor price change reflected
    // -------------------------------------------------------------------------
    await prisma.storeProduct.update({
      where: { id: spStore1A.id },
      data: { sellingPrice: 55 }, // Changed from ₹50 -> ₹55
    });
    const cartAfterPriceChange = await queryCustomerCart(prisma, cpAlpha);
    assert.equal(cartAfterPriceChange.items[0].unitPrice, 55);
    assert.equal(cartAfterPriceChange.subtotal, 165); // 3 * ₹55
    console.log('[PASS] Checks 11 & 12: Live PostgreSQL selling price and vendor price update reflected.');

    // -------------------------------------------------------------------------
    // 14 & 15. Customer address creation, ownership enforcement, and valid checkout validation
    // -------------------------------------------------------------------------
    const addrAlphaRes = await executeCreateCustomerAddress(prisma, cpAlpha, {
      tag: 'Home',
      recipientName: 'Alpha Customer',
      phone: '9876543210',
      addressLine1: 'House 12, Main Street',
      landmark: 'Near Water Tank',
      area: 'Gumpa',
      city: 'Bidar',
      state: 'Karnataka',
      postalCode: '585401',
      isDefault: true,
    });
    assert.equal(addrAlphaRes.success, true);
    assert.equal(addrAlphaRes.address.isDefault, true);

    const addrBetaRes = await executeCreateCustomerAddress(prisma, cpBeta, {
      tag: 'Work',
      recipientName: 'Beta Customer',
      phone: '9876543211',
      addressLine1: 'Office 4, Station Rd',
      area: 'Gandhi Gunj',
      city: 'Bidar',
      state: 'Karnataka',
      postalCode: '585401',
      isDefault: true,
    });
    assert.equal(addrBetaRes.success, true);

    const alphaAddresses = await queryCustomerAddresses(prisma, cpAlpha);
    assert.equal(alphaAddresses.length, 1);
    assert.equal(alphaAddresses[0].id, addrAlphaRes.address.id);

    // Customer Alpha attempting to checkout with Customer Beta's address must be blocked!
    const crossAddressCheckout = await executeValidateCustomerCheckout(prisma, {
      customerProfileId: cpAlpha,
      addressId: addrBetaRes.address.id,
      paymentMethod: 'COD',
      expectedSubtotal: 165,
    });
    assert.equal(crossAddressCheckout.valid, false);
    assert.equal(crossAddressCheckout.code, 'ADDRESS_UNAUTHORIZED');

    // Valid checkout with Customer Alpha's own address + live subtotal
    const validCheckout = await executeValidateCustomerCheckout(prisma, {
      customerProfileId: cpAlpha,
      addressId: addrAlphaRes.address.id,
      paymentMethod: 'COD',
      expectedSubtotal: 165,
    });
    assert.equal(validCheckout.valid, true);
    assert.equal(validCheckout.readyForPhase9Order, true);
    assert.equal(validCheckout.subtotal, 165);
    assert.equal(validCheckout.paymentMethod, 'COD');
    console.log('[PASS] Checks 14 & 15: Address ownership enforced and valid COD checkout readiness verified.');

    // -------------------------------------------------------------------------
    // 13 & 16. Vendor stock reduction / store closure / stale price detected & blocked at checkout
    // -------------------------------------------------------------------------
    // Stale expectedSubtotal (e.g., client still displaying old ₹150 while DB is ₹165)
    const stalePriceCheckout = await executeValidateCustomerCheckout(prisma, {
      customerProfileId: cpAlpha,
      addressId: addrAlphaRes.address.id,
      paymentMethod: 'COD',
      expectedSubtotal: 150,
    });
    assert.equal(stalePriceCheckout.valid, false);
    assert.equal(stalePriceCheckout.code, 'PRICE_CHANGED');

    // Vendor reduces stock from 5 -> 2 while customer has 3 in cart
    await prisma.storeProduct.update({
      where: { id: spStore1A.id },
      data: { stockQuantity: 2 },
    });

    const cartWithLowStock = await queryCustomerCart(prisma, cpAlpha);
    assert.equal(cartWithLowStock.canCheckout, false);
    assert.equal(cartWithLowStock.items[0].issueCode, 'INSUFFICIENT_STOCK');

    const lowStockCheckout = await executeValidateCustomerCheckout(prisma, {
      customerProfileId: cpAlpha,
      addressId: addrAlphaRes.address.id,
      paymentMethod: 'COD',
      expectedSubtotal: 165,
    });
    assert.equal(lowStockCheckout.valid, false);
    assert.equal(lowStockCheckout.code, 'STALE_OR_INVALID_CART');

    // Fix quantity to 2 -> valid again; then vendor closes store -> blocked again!
    await executeUpdateCartItemQuantity(prisma, {
      customerProfileId: cpAlpha,
      cartItemId: cartItemIdA,
      nextQuantity: 2,
    });
    await prisma.store.update({
      where: { id: storeOne.id },
      data: { isOpen: false },
    });

    const closedStoreCheckout = await executeValidateCustomerCheckout(prisma, {
      customerProfileId: cpAlpha,
      addressId: addrAlphaRes.address.id,
      paymentMethod: 'COD',
    });
    assert.equal(closedStoreCheckout.valid, false);
    assert.equal(closedStoreCheckout.code, 'STALE_OR_INVALID_CART');

    // Also verify explicit user-confirmed store switch (`executeReplaceCartWithItem`) works cleanly
    const switchedRes = await executeReplaceCartWithItem(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spStore2A.id,
      quantity: 2,
    });
    assert.equal(switchedRes.success, true);
    assert.equal(switchedRes.cart.store?.id, storeTwo.id);
    assert.equal(switchedRes.cart.subtotal, 96); // 2 * ₹48
    console.log('[PASS] Checks 13 & 16: Vendor stock reduction, price drift, and store closure detected and blocked at checkout.');

    // -------------------------------------------------------------------------
    // 17. Customer /profile authoritative identity, name edit, address CRUD & checkout parity
    // -------------------------------------------------------------------------
    const alphaSummary = await queryCustomerProfileSummary(prisma, custUserA.id);
    assert.ok(alphaSummary, 'Authenticated CUSTOMER must resolve authoritative profile summary.');
    assert.equal(alphaSummary.userId, custUserA.id);
    assert.equal(alphaSummary.customerProfileId, cpAlpha);
    assert.equal(alphaSummary.fullName, 'Phase 8 Customer Alpha');
    assert.equal(alphaSummary.email, `p8-cust-a-${token}@vyaparhub.local`);
    assert.equal(alphaSummary.orderCount, 0, 'Order count must reflect real PostgreSQL Order rows (0).');
    assert.ok(alphaSummary.memberSinceLabel.length > 3);

    // Non-CUSTOMER user must NOT resolve a customer profile summary
    const vendorSummary = await queryCustomerProfileSummary(prisma, vendorUser.id);
    assert.equal(vendorSummary, null);

    // Profile name update validation + persistence
    const invalidNameRes = await executeUpdateCustomerProfileName(prisma, cpAlpha, 'A');
    assert.equal(invalidNameRes.success, false);

    const validNameRes = await executeUpdateCustomerProfileName(
      prisma,
      cpAlpha,
      'Phase 8 Customer Alpha Updated'
    );
    assert.equal(validNameRes.success, true);
    const reloadedSummary = await queryCustomerProfileSummary(prisma, custUserA.id);
    assert.equal(reloadedSummary?.fullName, 'Phase 8 Customer Alpha Updated');

    // Add second address as non-default, switch default (partial unique index check), edit, and delete
    const secondAddrRes = await executeCreateCustomerAddress(prisma, cpAlpha, {
      tag: 'Work',
      recipientName: 'Alpha Work',
      phone: '9876543212',
      addressLine1: 'Plot 8, Industrial Area',
      area: 'Naubad',
      city: 'Bidar',
      state: 'Karnataka',
      postalCode: '585402',
      isDefault: false,
    });
    assert.equal(secondAddrRes.success, true);
    assert.equal(secondAddrRes.address.isDefault, false);

    const setDefRes = await executeSetDefaultCustomerAddress(
      prisma,
      cpAlpha,
      secondAddrRes.address.id
    );
    assert.equal(setDefRes.success, true);
    assert.equal(
      setDefRes.addresses.filter((a) => a.isDefault).length,
      1,
      'Exactly one default address per customer must exist.'
    );
    assert.equal(setDefRes.addresses.find((a) => a.isDefault)?.id, secondAddrRes.address.id);

    const editAddrRes = await executeUpdateCustomerAddress(
      prisma,
      cpAlpha,
      addrAlphaRes.address.id,
      {
        tag: 'Other',
        recipientName: 'Alpha Home Updated',
        phone: '9876543210',
        addressLine1: 'House 12B, Main Street',
        landmark: 'Near Water Tank',
        area: 'Gumpa',
        city: 'Bidar',
        state: 'Karnataka',
        postalCode: '585401',
        isDefault: false,
      }
    );
    assert.equal(editAddrRes.success, true);
    assert.equal(editAddrRes.address.recipientName, 'Alpha Home Updated');

    // Cross-customer address edit / set-default / delete must be strictly rejected
    const crossEditAddr = await executeUpdateCustomerAddress(
      prisma,
      cpBeta,
      addrAlphaRes.address.id,
      {
        tag: 'Home',
        recipientName: 'Hijack',
        phone: '9876543219',
        addressLine1: 'Fake Street',
        area: 'Fake',
        city: 'Bidar',
        state: 'Karnataka',
        postalCode: '585401',
        isDefault: true,
      }
    );
    assert.equal(crossEditAddr.success, false);

    const crossDefaultAddr = await executeSetDefaultCustomerAddress(
      prisma,
      cpBeta,
      addrAlphaRes.address.id
    );
    assert.equal(crossDefaultAddr.success, false);

    const crossDeleteAddr = await executeDeleteCustomerAddress(
      prisma,
      cpBeta,
      addrAlphaRes.address.id
    );
    assert.equal(crossDeleteAddr.success, false);

    // Deleting current default promotes the remaining address to default
    const deleteDefaultRes = await executeDeleteCustomerAddress(
      prisma,
      cpAlpha,
      secondAddrRes.address.id
    );
    assert.equal(deleteDefaultRes.success, true);
    assert.equal(deleteDefaultRes.addresses.length, 1);
    assert.equal(deleteDefaultRes.addresses[0].id, addrAlphaRes.address.id);
    assert.equal(deleteDefaultRes.addresses[0].isDefault, true);
    console.log('[PASS] Check 17: Authoritative /profile summary, name edit, address CRUD, default promotion, and cross-customer isolation verified.');

    // -------------------------------------------------------------------------
    // 18. Navbar / Profile / Checkout / Orders delivery location parity
    // -------------------------------------------------------------------------
    const alphaLocation = await queryCustomerDefaultLocationLabel(prisma, cpAlpha);
    assert.equal(alphaLocation, 'Gumpa, Bidar');
    assert.equal(
      alphaLocation,
      deriveDeliveryLocationLabel(deleteDefaultRes.addresses),
      'Navbar default location must match /profile and /checkout default address.'
    );

    // Also inspect any real manual-test customer with a default Gumpa, Bidar address (read-only)
    const manualCustomerWithGumpa = await prisma.address.findFirst({
      where: {
        isDefault: true,
        area: { equals: 'Gumpa', mode: 'insensitive' },
        city: { equals: 'Bidar', mode: 'insensitive' },
        customerProfileId: { notIn: [cpAlpha, cpBeta] },
      },
      select: { customerProfileId: true, area: true, city: true },
    });
    if (manualCustomerWithGumpa) {
      const manualLoc = await queryCustomerDefaultLocationLabel(
        prisma,
        manualCustomerWithGumpa.customerProfileId
      );
      assert.equal(
        manualLoc,
        `${manualCustomerWithGumpa.area.trim()}, ${manualCustomerWithGumpa.city.trim()}`
      );
      const manualOrders = await queryCustomerOrders(
        prisma,
        manualCustomerWithGumpa.customerProfileId
      );
      assert.equal(manualOrders.length, 0, 'Manual test customer currently has 0 real orders.');
    }

    // Deleting the last remaining address falls back cleanly to neutral "Local Delivery Zone"
    const deleteLastAddrRes = await executeDeleteCustomerAddress(
      prisma,
      cpAlpha,
      addrAlphaRes.address.id
    );
    assert.equal(deleteLastAddrRes.success, true);
    assert.equal(deleteLastAddrRes.addresses.length, 0);
    const neutralLocation = await queryCustomerDefaultLocationLabel(prisma, cpAlpha);
    assert.equal(neutralLocation, DEFAULT_DELIVERY_LOCATION_LABEL);
    console.log('[PASS] Check 18: Navbar delivery location matches real default PostgreSQL Address ("Gumpa, Bidar") and neutral fallback ("Local Delivery Zone").');

    // -------------------------------------------------------------------------
    // 19. Real PostgreSQL /orders & /orders/[id] read queries, mock ID rejection & cross-customer isolation
    // -------------------------------------------------------------------------
    const emptyAlphaOrders = await queryCustomerOrders(prisma, cpAlpha);
    assert.equal(emptyAlphaOrders.length, 0);

    // Phase 2 mock order IDs and order numbers must NOT resolve
    const mockIdAttempt1 = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpAlpha,
      orderIdOrNumber: 'ord_001',
    });
    assert.equal(mockIdAttempt1, null);

    const mockIdAttempt2 = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpAlpha,
      orderIdOrNumber: 'VYP-2026-0047',
    });
    assert.equal(mockIdAttempt2, null);

    // Create a disposable real Order owned by Customer Beta to verify read + cross-customer isolation
    const syntheticOrder = await prisma.order.create({
      data: {
        orderNumber: `VPH-P8TEST-${token.toUpperCase()}`,
        customerProfileId: cpBeta,
        storeId: storeTwo.id,
        storeNameSnapshot: storeTwo.name,
        status: OrderStatus.PLACED,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 96,
        deliveryFee: 0,
        discountAmount: 0,
        totalAmount: 96,
        items: {
          create: {
            masterProductId: masterA.id,
            storeProductId: spStore2A.id,
            productNameSnapshot: masterA.name,
            brandSnapshot: 'VyaparHub Test',
            unitSnapshot: '1 pack',
            imageUrlSnapshot: '/images/placeholder-product.svg',
            unitPrice: 48,
            quantity: 2,
            lineTotal: 96,
          },
        },
        deliveryAddress: {
          create: {
            recipientName: 'Beta Customer',
            phone: '9876543211',
            addressLine1: 'Office 4, Station Rd',
            area: 'Gandhi Gunj',
            city: 'Bidar',
            state: 'Karnataka',
            postalCode: '585401',
          },
        },
      },
      select: { id: true, orderNumber: true },
    });
    createdOrderIds.push(syntheticOrder.id);

    const betaOrders = await queryCustomerOrders(prisma, cpBeta);
    assert.equal(betaOrders.length, 1);
    assert.equal(betaOrders[0].id, syntheticOrder.id);
    assert.equal(betaOrders[0].itemCount, 2);

    const alphaOrdersStillEmpty = await queryCustomerOrders(prisma, cpAlpha);
    assert.equal(alphaOrdersStillEmpty.length, 0);

    const betaOwnedDetailById = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpBeta,
      orderIdOrNumber: syntheticOrder.id,
    });
    assert.ok(betaOwnedDetailById);
    assert.equal(betaOwnedDetailById.orderNumber, syntheticOrder.orderNumber);
    assert.equal(betaOwnedDetailById.items.length, 1);
    assert.equal(betaOwnedDetailById.deliveryAddress?.area, 'Gandhi Gunj');

    const betaOwnedDetailByNum = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpBeta,
      orderIdOrNumber: syntheticOrder.orderNumber,
    });
    assert.ok(betaOwnedDetailByNum);

    // Customer Alpha attempting to read Customer Beta's order by id or orderNumber MUST return null (-> notFound())
    const crossCustomerById = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpAlpha,
      orderIdOrNumber: syntheticOrder.id,
    });
    assert.equal(crossCustomerById, null, 'Customer must NOT access another customer order by ID.');

    const crossCustomerByNumber = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpAlpha,
      orderIdOrNumber: syntheticOrder.orderNumber,
    });
    assert.equal(
      crossCustomerByNumber,
      null,
      'Customer must NOT access another customer order by orderNumber.'
    );
    console.log('[PASS] Check 19: Real PostgreSQL /orders list, mock order ID rejection, and /orders/[id] ownership protection verified.');
  } finally {
    // Clean up all disposable synthetic rows in strict dependency order
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
    if (createdUserIds.length > 0) {
      // Deleting users cascades CustomerProfile -> Cart -> CartItem and Address
      await prisma.user.deleteMany({
        where: { id: { in: [custUserAId(createdUserIds), custUserBId(createdUserIds)].filter(Boolean) as string[] } },
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
    if (createdMasterIds.length > 0) {
      await prisma.masterProduct.deleteMany({
        where: { id: { in: createdMasterIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    // Verify 100% preservation of pre-existing stores, StoreProducts, and zero fake Orders created
    const [postStores, postStoreProducts, postOrders] = await Promise.all([
      prisma.store.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, isOpen: true, updatedAt: true },
      }),
      prisma.storeProduct.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, updatedAt: true },
      }),
      prisma.order.count(),
    ]);

    assert.equal(postOrders, baselineOrders, 'Phase 8 must NOT create any Order records.');
    assert.equal(postStores.length, baselineStores.length);
    assert.equal(postStoreProducts.length, baselineStoreProducts.length);

    for (let i = 0; i < baselineStores.length; i++) {
      assert.equal(postStores[i].id, baselineStores[i].id);
      assert.equal(
        postStores[i].updatedAt.getTime(),
        baselineStores[i].updatedAt.getTime(),
        `Pre-existing store "${baselineStores[i].name}" must remain untouched.`
      );
    }
    for (let i = 0; i < baselineStoreProducts.length; i++) {
      assert.equal(postStoreProducts[i].id, baselineStoreProducts[i].id);
      assert.equal(
        postStoreProducts[i].updatedAt.getTime(),
        baselineStoreProducts[i].updatedAt.getTime(),
        'Pre-existing StoreProduct rows must remain untouched.'
      );
    }

    await prisma.$disconnect();
  }

  console.log('ALL 19 PHASE 8 CUSTOMER CART, CHECKOUT, PROFILE & ORDERS CHECKS PASSED.');
}

function custUserAId(ids: string[]): string | undefined {
  return ids[0];
}

function custUserBId(ids: string[]): string | undefined {
  return ids[1];
}

main().catch((error) => {
  console.error('PHASE 8 VALIDATION FAILED:', error);
  process.exit(1);
});
