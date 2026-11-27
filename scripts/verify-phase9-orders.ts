import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  AccountStatus,
  GstStatus,
  MarketplaceStatus,
  OrderActorType,
  OrderStatus,
  UnitType,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import {
  executeAddToCart,
  executeCreateCustomerAddress,
  executeDeleteCustomerAddress,
  executeUpdateCustomerAddress,
  queryCustomerCart,
  queryCustomerOrderDetail,
  queryCustomerOrders,
} from '@/lib/cart/persistence';
import {
  executePlaceCustomerOrder,
  executeVendorOrderStatusTransition,
  queryVendorStoreOrders,
} from '@/lib/orders/persistence';

/**
 * Focused Phase 9 end-to-end automated validation suite covering all 28 required
 * scenarios against live Supabase PostgreSQL (:6543):
 *  1. Valid COD order placement
 *  2. Order created for correct CustomerProfile
 *  3. Order assigned to correct Store
 *  4. Unique real orderNumber generated (VYP-YYYY-XXXXXX)
 *  5. OrderItems snapshot correctly
 *  6. OrderAddress snapshot correctly
 *  7. Initial OrderStatusHistory created
 *  8. Inventory deducted correctly
 *  9. Inventory cannot become negative (including true Promise.all concurrent oversale race)
 * 10. Cart cleared after success
 * 11. Customer order read returns new order
 * 12. Another customer cannot read it
 * 13. Correct vendor/store receives order
 * 14. Another vendor/store cannot access/update it (both cross-vendor & multi-store isolation)
 * 15. PLACED -> ACCEPTED succeeds
 * 16. ACCEPTED -> PREPARING succeeds
 * 17. PREPARING -> READY_FOR_PICKUP succeeds
 * 18. Invalid / skipped / backward / non-vendor transitions rejected
 * 19. Each transition appends OrderStatusHistory
 * 20. Customer reads updated status & timeline
 * 21. Stale price (expectedSubtotal drift) blocks placement
 * 22. Insufficient stock blocks placement
 * 23. Closed / ineligible store blocks placement
 * 24. Foreign Address ID blocked
 * 25. Failed placement leaves zero partial Order / OrderItem / inventory mutations & preserves Cart
 * 26. Historical OrderItem price & Order total unaffected by later StoreProduct price change
 * 27. Historical OrderAddress unaffected by later customer Address edit or deletion
 * 28. Duplicate / double submission protection (both simultaneous Promise.all & sequential repeat)
 *
 * Cleans up ONLY its disposable synthetic rows in `finally` and verifies 100% invariance
 * on all pre-existing manual demo stores, products ("A to Z Kirana Store", "Cipla ORS"),
 * and orders.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run verify-phase9-orders.');
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 6,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const prisma = new PrismaClient({ adapter, errorFormat: 'minimal' });

  // Clean up any leftover synthetic P9_* rows from an interrupted prior test run
  const staleStores = await prisma.store.findMany({
    where: { name: { startsWith: 'P9 ' } },
    select: { id: true },
  });
  const staleStoreIds = staleStores.map((s) => s.id);
  if (staleStoreIds.length > 0) {
    const staleOrders = await prisma.order.findMany({
      where: { storeId: { in: staleStoreIds } },
      select: { id: true },
    });
    const staleOrderIds = staleOrders.map((o) => o.id);
    if (staleOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: staleOrderIds } } });
      await prisma.orderAddress.deleteMany({ where: { orderId: { in: staleOrderIds } } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: staleOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: staleOrderIds } } });
    }
    const staleSps = await prisma.storeProduct.findMany({
      where: { storeId: { in: staleStoreIds } },
      select: { id: true },
    });
    if (staleSps.length > 0) {
      await prisma.cartItem.deleteMany({
        where: { storeProductId: { in: staleSps.map((sp) => sp.id) } },
      });
      await prisma.storeProduct.deleteMany({
        where: { id: { in: staleSps.map((sp) => sp.id) } },
      });
    }
    await prisma.cart.deleteMany({ where: { storeId: { in: staleStoreIds } } });
    await prisma.store.deleteMany({ where: { id: { in: staleStoreIds } } });
  }
  await prisma.masterProduct.deleteMany({ where: { name: { startsWith: 'P9 ' } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: 'p9_' } } });

  // Snapshot existing manual test data to assert zero permanent changes
  const [baselineStores, baselineStoreProducts, baselineOrderIds] = await Promise.all([
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
    prisma.order.findMany({
      orderBy: { id: 'asc' },
      select: { id: true },
    }),
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
    // Provision two disposable CUSTOMER accounts + two disposable VENDOR accounts
    const [custUserA, custUserB, vendorUser1, vendorUser2] = await Promise.all([
      prisma.user.create({
        data: {
          id: `p9_ca_${token}`,
          authUserId: crypto.randomUUID(),
          email: `p9-cust-a-${token}@vyaparhub.local`,
          phone: `96${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.CUSTOMER,
          accountStatus: AccountStatus.ACTIVE,
          customerProfile: {
            create: { fullName: 'Phase 9 Customer Alpha' },
          },
        },
        select: { id: true, customerProfile: { select: { id: true } } },
      }),
      prisma.user.create({
        data: {
          id: `p9_cb_${token}`,
          authUserId: crypto.randomUUID(),
          email: `p9-cust-b-${token}@vyaparhub.local`,
          phone: `97${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.CUSTOMER,
          accountStatus: AccountStatus.ACTIVE,
          customerProfile: {
            create: { fullName: 'Phase 9 Customer Beta' },
          },
        },
        select: { id: true, customerProfile: { select: { id: true } } },
      }),
      prisma.user.create({
        data: {
          id: `p9_v1_${token}`,
          authUserId: crypto.randomUUID(),
          email: `p9-vendor-1-${token}@vyaparhub.local`,
          phone: `98${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.VENDOR,
          accountStatus: AccountStatus.ACTIVE,
          vendorProfile: {
            create: {
              ownerName: 'Phase 9 Vendor One',
              registeredMobile: '9811122233',
              businessEmail: `p9-v1-biz-${token}@vyaparhub.local`,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
        },
        select: { id: true, vendorProfile: { select: { id: true } } },
      }),
      prisma.user.create({
        data: {
          id: `p9_v2_${token}`,
          authUserId: crypto.randomUUID(),
          email: `p9-vendor-2-${token}@vyaparhub.local`,
          phone: `99${String(Math.floor(10000000 + Math.random() * 89999999))}`,
          role: UserRole.VENDOR,
          accountStatus: AccountStatus.ACTIVE,
          vendorProfile: {
            create: {
              ownerName: 'Phase 9 Vendor Two',
              registeredMobile: '9911122233',
              businessEmail: `p9-v2-biz-${token}@vyaparhub.local`,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
        },
        select: { id: true, vendorProfile: { select: { id: true } } },
      }),
    ]);

    createdUserIds.push(custUserA.id, custUserB.id, vendorUser1.id, vendorUser2.id);
    const cpAlpha = custUserA.customerProfile!.id;
    const cpBeta = custUserB.customerProfile!.id;
    const vpOne = vendorUser1.vendorProfile!.id;
    const vpTwo = vendorUser2.vendorProfile!.id;

    // Vendor One owns Store 1A and Store 1B (multi-store isolation); Vendor Two owns Store 2
    const [store1A, store1B, store2] = await Promise.all([
      prisma.store.create({
        data: {
          vendorProfileId: vpOne,
          categoryId: activeCategory.id,
          name: `P9 Kirana Store 1A ${token}`,
          phone: '9800090001',
          addressLine1: 'Shop 1, Main Road',
          area: 'Gumpa',
          city: 'Bidar',
          state: 'Karnataka',
          postalCode: '585401',
          openingTime: '08:00',
          closingTime: '22:00',
          deliveryRadiusKm: 4,
          minimumOrderAmount: 100,
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
          vendorProfileId: vpOne,
          categoryId: activeCategory.id,
          name: `P9 Pharmacy Store 1B ${token}`,
          phone: '9800090002',
          addressLine1: 'Shop 2, Main Road',
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
        select: { id: true, name: true },
      }),
      prisma.store.create({
        data: {
          vendorProfileId: vpTwo,
          categoryId: activeCategory.id,
          name: `P9 Rival Store 2 ${token}`,
          phone: '9800090003',
          addressLine1: 'Shop 9, Market Rd',
          area: 'Gandhi Gunj',
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
        select: { id: true, name: true },
      }),
    ]);
    createdStoreIds.push(store1A.id, store1B.id, store2.id);

    const [masterOrs, masterBread] = await Promise.all([
      prisma.masterProduct.create({
        data: {
          categoryId: activeCategory.id,
          name: `P9 ORS Electrolyte ${token}`,
          brand: 'CiplaTest',
          unitValue: 200,
          unitType: UnitType.ML,
          mrp: 40,
          imageUrl: '/images/placeholder-product.svg',
          isActive: true,
        },
        select: { id: true, name: true },
      }),
      prisma.masterProduct.create({
        data: {
          categoryId: activeCategory.id,
          name: `P9 Whole Wheat Bread ${token}`,
          brand: 'SunriseTest',
          unitValue: 1,
          unitType: UnitType.PACK,
          mrp: 50,
          imageUrl: '/images/placeholder-product.svg',
          isActive: true,
        },
        select: { id: true, name: true },
      }),
    ]);
    createdMasterIds.push(masterOrs.id, masterBread.id);

    // StoreProducts in Store 1A:
    // - spOrs: ₹35, stock = 5
    // - spBread: ₹45, stock = 2 (will be used for concurrent final-stock race!)
    const [spOrs, spBread] = await Promise.all([
      prisma.storeProduct.create({
        data: {
          storeId: store1A.id,
          masterProductId: masterOrs.id,
          sellingPrice: 35,
          stockQuantity: 5,
          isAvailable: true,
        },
        select: { id: true },
      }),
      prisma.storeProduct.create({
        data: {
          storeId: store1A.id,
          masterProductId: masterBread.id,
          sellingPrice: 45,
          stockQuantity: 2,
          isAvailable: true,
        },
        select: { id: true },
      }),
    ]);
    createdStoreProductIds.push(spOrs.id, spBread.id);

    // Addresses for Customer Alpha and Customer Beta
    const [addrAlphaRes, addrBetaRes] = await Promise.all([
      executeCreateCustomerAddress(prisma, cpAlpha, {
        tag: 'Home',
        recipientName: 'Alpha Recipient',
        phone: '9876500001',
        addressLine1: 'House 10, Ring Road',
        landmark: 'Near Bus Stand',
        area: 'Gumpa',
        city: 'Bidar',
        state: 'Karnataka',
        postalCode: '585401',
        isDefault: true,
      }),
      executeCreateCustomerAddress(prisma, cpBeta, {
        tag: 'Home',
        recipientName: 'Beta Recipient',
        phone: '9876500002',
        addressLine1: 'House 22, Market Street',
        area: 'Gandhi Gunj',
        city: 'Bidar',
        state: 'Karnataka',
        postalCode: '585401',
        isDefault: true,
      }),
    ]);
    assert.equal(addrAlphaRes.success, true);
    assert.equal(addrBetaRes.success, true);

    // -------------------------------------------------------------------------
    // Checks 21, 22, 23, 24, 25 — Failure paths leave ZERO partial Order / inventory mutations
    // -------------------------------------------------------------------------
    const addOrsRes = await executeAddToCart(prisma, {
      customerProfileId: cpAlpha,
      storeProductId: spOrs.id,
      quantityToAdd: 2, // 2 * ₹35 = ₹70
    });
    assert.equal(addOrsRes.success, true);
    assert.equal(addOrsRes.cart.subtotal, 70);

    // 24. Foreign Address ID (owned by Customer Beta) blocked
    const foreignAddrAttempt = await executePlaceCustomerOrder(prisma, {
      customerUserId: custUserA.id,
      customerProfileId: cpAlpha,
      addressId: addrBetaRes.address.id,
      expectedSubtotal: 70,
    });
    assert.equal(foreignAddrAttempt.success, false);
    assert.equal(foreignAddrAttempt.code, 'ADDRESS_UNAUTHORIZED');

    // 21. Stale expectedSubtotal blocked
    const stalePriceAttempt = await executePlaceCustomerOrder(prisma, {
      customerUserId: custUserA.id,
      customerProfileId: cpAlpha,
      addressId: addrAlphaRes.address.id,
      expectedSubtotal: 60, // stale! Live is ₹70
    });
    assert.equal(stalePriceAttempt.success, false);
    assert.equal(stalePriceAttempt.code, 'PRICE_CHANGED');

    // 22. Insufficient stock blocked (vendor temporarily drops stock from 5 -> 1 while 2 in cart)
    await prisma.storeProduct.update({
      where: { id: spOrs.id },
      data: { stockQuantity: 1 },
    });
    const lowStockAttempt = await executePlaceCustomerOrder(prisma, {
      customerUserId: custUserA.id,
      customerProfileId: cpAlpha,
      addressId: addrAlphaRes.address.id,
      expectedSubtotal: 70,
    });
    assert.equal(lowStockAttempt.success, false);
    assert.equal(lowStockAttempt.code, 'INSUFFICIENT_STOCK');

    // Restore stock to 5, then close store -> 23. Closed store blocked
    await prisma.storeProduct.update({
      where: { id: spOrs.id },
      data: { stockQuantity: 5 },
    });
    await prisma.store.update({
      where: { id: store1A.id },
      data: { isOpen: false },
    });
    const closedStoreAttempt = await executePlaceCustomerOrder(prisma, {
      customerUserId: custUserA.id,
      customerProfileId: cpAlpha,
      addressId: addrAlphaRes.address.id,
      expectedSubtotal: 70,
    });
    assert.equal(closedStoreAttempt.success, false);
    assert.equal(closedStoreAttempt.code, 'STORE_INELIGIBLE');

    // Reopen Store 1A and verify 25: zero orders created & stock/cart 100% untouched
    await prisma.store.update({
      where: { id: store1A.id },
      data: { isOpen: true },
    });
    const ordersAfterFailures = await prisma.order.count({
      where: { customerProfileId: cpAlpha },
    });
    assert.equal(ordersAfterFailures, 0, 'Failed placements must create zero Order rows.');
    const spOrsBeforePlace = await prisma.storeProduct.findUniqueOrThrow({
      where: { id: spOrs.id },
      select: { stockQuantity: true },
    });
    assert.equal(spOrsBeforePlace.stockQuantity, 5, 'Failed placements must not deduct stock.');
    const preservedCartBeforePlace = await queryCustomerCart(prisma, cpAlpha);
    assert.equal(preservedCartBeforePlace.itemCount, 2, 'Failed placements must preserve Cart.');
    console.log('[PASS] Checks 21–25: Stale price, insufficient stock, closed store, and foreign address safely blocked with zero partial mutations.');

    // -------------------------------------------------------------------------
    // Checks 1–8, 10, 28 — Valid COD Order Placement + Simultaneous Double-Submit Protection
    // -------------------------------------------------------------------------
    // Fire TWO simultaneous place-order calls for the exact same cart (double-click simulation)
    const [simAttempt1, simAttempt2] = await Promise.all([
      executePlaceCustomerOrder(prisma, {
        customerUserId: custUserA.id,
        customerProfileId: cpAlpha,
        addressId: addrAlphaRes.address.id,
        expectedSubtotal: 70,
        customerNote: 'Ring bell once',
      }),
      executePlaceCustomerOrder(prisma, {
        customerUserId: custUserA.id,
        customerProfileId: cpAlpha,
        addressId: addrAlphaRes.address.id,
        expectedSubtotal: 70,
        customerNote: 'Ring bell once',
      }),
    ]);

    const successes = [simAttempt1, simAttempt2].filter((r) => r.success);
    const failures = [simAttempt1, simAttempt2].filter((r) => !r.success);
    assert.equal(successes.length, 1, 'Simultaneous double-click must create ONLY ONE order.');
    assert.equal(failures.length, 1, 'Second concurrent submission must fail safely.');

    const placedRes = successes[0];
    assert.equal(placedRes.success, true);
    createdOrderIds.push(placedRes.orderId);

    // Sequential repeat submission after cart cleared must fail with EMPTY_CART
    const repeatAfterSuccess = await executePlaceCustomerOrder(prisma, {
      customerUserId: custUserA.id,
      customerProfileId: cpAlpha,
      addressId: addrAlphaRes.address.id,
      expectedSubtotal: 70,
    });
    assert.equal(repeatAfterSuccess.success, false);
    assert.equal(repeatAfterSuccess.code, 'EMPTY_CART');

    // Verify Order Number format VYP-YYYY-XXXXXX
    assert.match(
      placedRes.orderNumber,
      /^VYP-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/,
      `Order number ${placedRes.orderNumber} must match VYP-YYYY-XXXXXX`
    );
    assert.equal(placedRes.totalAmount, 70);

    // Verify DB Order, OrderItem, OrderAddress, OrderStatusHistory, Inventory deduction & Cart cleared
    const [dbOrder, dbItems, dbAddr, dbHistory, spOrsAfter, cartAfter] = await Promise.all([
      prisma.order.findUniqueOrThrow({
        where: { id: placedRes.orderId },
        select: {
          id: true,
          orderNumber: true,
          customerProfileId: true,
          storeId: true,
          storeNameSnapshot: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          subtotal: true,
          totalAmount: true,
        },
      }),
      prisma.orderItem.findMany({
        where: { orderId: placedRes.orderId },
        select: {
          masterProductId: true,
          storeProductId: true,
          productNameSnapshot: true,
          brandSnapshot: true,
          unitSnapshot: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
        },
      }),
      prisma.orderAddress.findUniqueOrThrow({
        where: { orderId: placedRes.orderId },
        select: {
          recipientName: true,
          phone: true,
          addressLine1: true,
          landmark: true,
          area: true,
          city: true,
          state: true,
          postalCode: true,
        },
      }),
      prisma.orderStatusHistory.findMany({
        where: { orderId: placedRes.orderId },
        orderBy: { createdAt: 'asc' },
        select: {
          status: true,
          changedByType: true,
          changedById: true,
          note: true,
        },
      }),
      prisma.storeProduct.findUniqueOrThrow({
        where: { id: spOrs.id },
        select: { stockQuantity: true, isAvailable: true },
      }),
      queryCustomerCart(prisma, cpAlpha),
    ]);

    assert.equal(dbOrder.customerProfileId, cpAlpha);
    assert.equal(dbOrder.storeId, store1A.id);
    assert.equal(dbOrder.storeNameSnapshot, store1A.name);
    assert.equal(dbOrder.status, OrderStatus.PLACED);
    assert.equal(Number(dbOrder.subtotal), 70);
    assert.equal(Number(dbOrder.totalAmount), 70);

    assert.equal(dbItems.length, 1);
    assert.equal(dbItems[0].masterProductId, masterOrs.id);
    assert.equal(dbItems[0].storeProductId, spOrs.id);
    assert.equal(dbItems[0].productNameSnapshot, masterOrs.name);
    assert.equal(dbItems[0].brandSnapshot, 'CiplaTest');
    assert.equal(dbItems[0].unitSnapshot, '200 ml');
    assert.equal(Number(dbItems[0].unitPrice), 35);
    assert.equal(dbItems[0].quantity, 2);
    assert.equal(Number(dbItems[0].lineTotal), 70);

    assert.equal(dbAddr.recipientName, 'Alpha Recipient');
    assert.equal(dbAddr.area, 'Gumpa');
    assert.equal(dbAddr.city, 'Bidar');
    assert.equal(dbAddr.postalCode, '585401');

    assert.equal(dbHistory.length, 1);
    assert.equal(dbHistory[0].status, OrderStatus.PLACED);
    assert.equal(dbHistory[0].changedByType, OrderActorType.CUSTOMER);
    assert.equal(dbHistory[0].changedById, custUserA.id);

    // Stock deducted 5 - 2 = 3 (only once despite double-submit!)
    assert.equal(spOrsAfter.stockQuantity, 3);
    assert.equal(spOrsAfter.isAvailable, true);

    // Cart completely cleared
    assert.equal(cartAfter.cartId, null);
    assert.equal(cartAfter.itemCount, 0);
    assert.equal(cartAfter.items.length, 0);
    console.log('[PASS] Checks 1–8, 10, 28: Atomic COD order placement, snapshots, stock deduction, cart clear, and double-submit protection verified.');

    // -------------------------------------------------------------------------
    // Check 9 — Concurrent Final-Stock Oversale Race (stock = 2, two customers order 2)
    // -------------------------------------------------------------------------
    await Promise.all([
      executeAddToCart(prisma, {
        customerProfileId: cpAlpha,
        storeProductId: spBread.id,
        quantityToAdd: 2, // all 2 remaining units!
      }),
      executeAddToCart(prisma, {
        customerProfileId: cpBeta,
        storeProductId: spBread.id,
        quantityToAdd: 2, // all 2 remaining units!
      }),
    ]);

    const [raceAlpha, raceBeta] = await Promise.all([
      executePlaceCustomerOrder(prisma, {
        customerUserId: custUserA.id,
        customerProfileId: cpAlpha,
        addressId: addrAlphaRes.address.id,
        expectedSubtotal: 90,
      }),
      executePlaceCustomerOrder(prisma, {
        customerUserId: custUserB.id,
        customerProfileId: cpBeta,
        addressId: addrBetaRes.address.id,
        expectedSubtotal: 90,
      }),
    ]);

    const raceWinners = [raceAlpha, raceBeta].filter((r) => r.success);
    const raceLosers = [raceAlpha, raceBeta].filter((r) => !r.success);
    assert.equal(raceWinners.length, 1, 'Exactly ONE customer may win the final 2 units of stock.');
    assert.equal(raceLosers.length, 1, 'The losing concurrent customer must be blocked from overselling.');
    if (raceWinners[0].success) {
      createdOrderIds.push(raceWinners[0].orderId);
    }

    const spBreadAfterRace = await prisma.storeProduct.findUniqueOrThrow({
      where: { id: spBread.id },
      select: { stockQuantity: true, isAvailable: true },
    });
    assert.equal(spBreadAfterRace.stockQuantity, 0, 'Final stock must be 0, never negative.');
    assert.equal(spBreadAfterRace.isAvailable, false, 'Zero-stock product must be marked unavailable.');

    // Losing customer's cart must still contain their 2 items so they can adjust/remove
    const loserProfileId = !raceAlpha.success ? cpAlpha : cpBeta;
    const loserCart = await queryCustomerCart(prisma, loserProfileId);
    assert.equal(loserCart.items.length, 1, 'Losing customer cart must remain intact.');
    assert.equal(loserCart.canCheckout, false);
    console.log('[PASS] Check 9: Concurrent final-stock oversale race prevented; stock = 0 (never negative) and losing cart preserved.');

    // -------------------------------------------------------------------------
    // Checks 11–20 — Customer Ownership, Vendor Multi-Store Isolation & Status Lifecycle
    // -------------------------------------------------------------------------
    // 11 & 12. Customer Alpha reads their order; Customer Beta cannot read Alpha's order
    const alphaOrders = await queryCustomerOrders(prisma, cpAlpha);
    assert.ok(alphaOrders.some((o) => o.id === placedRes.orderId));

    const betaReadAlphaOrder = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpBeta,
      orderIdOrNumber: placedRes.orderId,
    });
    assert.equal(betaReadAlphaOrder, null, 'Another customer must NOT read Alpha order.');

    // 13 & 14. Vendor One (Store 1A) sees the order; Store 1B (same vendor!) and Vendor Two (Store 2) do NOT
    const [store1AOrders, store1BOrders, store2Orders, unownedQuery] = await Promise.all([
      queryVendorStoreOrders(prisma, { vendorProfileId: vpOne, storeId: store1A.id }),
      queryVendorStoreOrders(prisma, { vendorProfileId: vpOne, storeId: store1B.id }),
      queryVendorStoreOrders(prisma, { vendorProfileId: vpTwo, storeId: store2.id }),
      queryVendorStoreOrders(prisma, { vendorProfileId: vpTwo, storeId: store1A.id }),
    ]);
    assert.ok(store1AOrders.some((o) => o.id === placedRes.orderId));
    assert.equal(store1BOrders.length, 0, 'Multi-store isolation: Store 1B must see 0 orders.');
    assert.equal(store2Orders.length, 0, 'Vendor Two must see 0 orders.');
    assert.equal(unownedQuery.length, 0, 'Vendor Two querying Store 1A must return empty.');

    // Cross-vendor & wrong-active-store & customer-actor transition attempts MUST fail
    const wrongVendorTransition = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser2.id,
      vendorProfileId: vpTwo,
      activeStoreId: store2.id,
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.ACCEPTED,
    });
    assert.equal(wrongVendorTransition.success, false);

    const wrongActiveStoreTransition = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser1.id,
      vendorProfileId: vpOne,
      activeStoreId: store1B.id, // Same vendor, wrong active store!
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.ACCEPTED,
    });
    assert.equal(wrongActiveStoreTransition.success, false);

    const customerActorTransition = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: custUserA.id, // Customer trying to act as vendor!
      vendorProfileId: vpOne,
      activeStoreId: store1A.id,
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.ACCEPTED,
    });
    assert.equal(customerActorTransition.success, false);

    // 18. Skipping states (PLACED -> PREPARING, PLACED -> READY_FOR_PICKUP, arbitrary string) rejected
    const skipToPreparing = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser1.id,
      vendorProfileId: vpOne,
      activeStoreId: store1A.id,
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.PREPARING,
    });
    assert.equal(skipToPreparing.success, false);
    assert.equal(skipToPreparing.code, 'INVALID_TRANSITION');

    const arbitraryStatus = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser1.id,
      vendorProfileId: vpOne,
      activeStoreId: store1A.id,
      orderId: placedRes.orderId,
      requestedNextStatus: 'BOGUS_STATUS',
    });
    assert.equal(arbitraryStatus.success, false);
    assert.equal(arbitraryStatus.code, 'INVALID_STATUS_VALUE');

    // 15. PLACED -> ACCEPTED succeeds
    const stepAccept = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser1.id,
      vendorProfileId: vpOne,
      activeStoreId: store1A.id,
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.ACCEPTED,
    });
    assert.equal(stepAccept.success, true);
    assert.equal(stepAccept.order.status, 'ACCEPTED');

    // Backward transition (ACCEPTED -> PLACED) rejected
    const backwardAttempt = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser1.id,
      vendorProfileId: vpOne,
      activeStoreId: store1A.id,
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.PLACED,
    });
    assert.equal(backwardAttempt.success, false);

    // 16. ACCEPTED -> PREPARING succeeds
    const stepPrep = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser1.id,
      vendorProfileId: vpOne,
      activeStoreId: store1A.id,
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.PREPARING,
    });
    assert.equal(stepPrep.success, true);
    assert.equal(stepPrep.order.status, 'PREPARING');

    // 17. PREPARING -> READY_FOR_PICKUP succeeds
    const stepReady = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser1.id,
      vendorProfileId: vpOne,
      activeStoreId: store1A.id,
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.READY_FOR_PICKUP,
    });
    assert.equal(stepReady.success, true);
    assert.equal(stepReady.order.status, 'READY_FOR_PICKUP');

    // Advancing past READY_FOR_PICKUP by vendor (e.g. DELIVERED) rejected
    const pastReadyAttempt = await executeVendorOrderStatusTransition(prisma, {
      vendorUserId: vendorUser1.id,
      vendorProfileId: vpOne,
      activeStoreId: store1A.id,
      orderId: placedRes.orderId,
      requestedNextStatus: OrderStatus.DELIVERED,
    });
    assert.equal(pastReadyAttempt.success, false);

    // 19 & 20. Customer reads updated READY_FOR_PICKUP status & all 4 OrderStatusHistory entries
    const updatedCustomerDetail = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpAlpha,
      orderIdOrNumber: placedRes.orderId,
    });
    assert.ok(updatedCustomerDetail);
    assert.equal(updatedCustomerDetail.status, 'READY_FOR_PICKUP');
    assert.equal(updatedCustomerDetail.statusHistory.length, 4);
    assert.deepEqual(
      updatedCustomerDetail.statusHistory.map((h) => h.status),
      ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP']
    );
    console.log('[PASS] Checks 11–20: Vendor multi-store isolation, forward-only status lifecycle, history audit trail, and live customer status reflection verified.');

    // -------------------------------------------------------------------------
    // Checks 26 & 27 — Historical OrderItem & OrderAddress Immutability
    // -------------------------------------------------------------------------
    // 26. Vendor changes StoreProduct sellingPrice from ₹35 -> ₹39
    await prisma.storeProduct.update({
      where: { id: spOrs.id },
      data: { sellingPrice: 39 },
    });

    // 27. Customer edits AND deletes their saved Address
    const editedAddr = await executeUpdateCustomerAddress(
      prisma,
      cpAlpha,
      addrAlphaRes.address.id,
      {
        tag: 'Work',
        recipientName: 'Changed Name Later',
        phone: '9123456789',
        addressLine1: 'New Office Building 99',
        area: 'Naubad',
        city: 'Bidar',
        state: 'Karnataka',
        postalCode: '585402',
        isDefault: true,
      }
    );
    assert.equal(editedAddr.success, true);
    const deletedAddr = await executeDeleteCustomerAddress(
      prisma,
      cpAlpha,
      addrAlphaRes.address.id
    );
    assert.equal(deletedAddr.success, true);

    // Reload OrderDetail -> historical price (₹35 / ₹70) and address ("Alpha Recipient", "Gumpa", "585401") MUST be untouched!
    const immutableOrderCheck = await queryCustomerOrderDetail(prisma, {
      customerProfileId: cpAlpha,
      orderIdOrNumber: placedRes.orderId,
    });
    assert.ok(immutableOrderCheck);
    assert.equal(immutableOrderCheck.items[0].unitPrice, 35);
    assert.equal(immutableOrderCheck.items[0].lineTotal, 70);
    assert.equal(immutableOrderCheck.totalAmount, 70);
    assert.equal(immutableOrderCheck.deliveryAddress?.recipientName, 'Alpha Recipient');
    assert.equal(immutableOrderCheck.deliveryAddress?.area, 'Gumpa');
    assert.equal(immutableOrderCheck.deliveryAddress?.postalCode, '585401');
    console.log('[PASS] Checks 26 & 27: Historical OrderItem prices and OrderAddress snapshot remain immutable after catalog price change and customer address edit/deletion.');
  } finally {
    // Clean up ONLY synthetic test rows in strict foreign-key dependency order
    const syntheticOrders =
      createdOrderIds.length > 0 || createdStoreIds.length > 0
        ? await prisma.order.findMany({
            where: {
              OR: [
                ...(createdOrderIds.length > 0 ? [{ id: { in: createdOrderIds } }] : []),
                ...(createdStoreIds.length > 0 ? [{ storeId: { in: createdStoreIds } }] : []),
              ],
            },
            select: { id: true },
          })
        : [];
    const allSyntheticOrderIds = syntheticOrders.map((o) => o.id);

    if (allSyntheticOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: allSyntheticOrderIds } },
      });
      await prisma.orderAddress.deleteMany({
        where: { orderId: { in: allSyntheticOrderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: allSyntheticOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: allSyntheticOrderIds } },
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

    // Verify 100% preservation of pre-existing stores, StoreProducts, and Orders
    const [postStores, postStoreProducts, postOrderIds] = await Promise.all([
      prisma.store.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, isOpen: true, updatedAt: true },
      }),
      prisma.storeProduct.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          sellingPrice: true,
          stockQuantity: true,
          isAvailable: true,
          updatedAt: true,
        },
      }),
      prisma.order.findMany({
        orderBy: { id: 'asc' },
        select: { id: true },
      }),
    ]);

    assert.deepEqual(
      postOrderIds.map((o) => o.id),
      baselineOrderIds.map((o) => o.id),
      'Synthetic test orders must be cleaned up completely.'
    );
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
        postStoreProducts[i].stockQuantity,
        baselineStoreProducts[i].stockQuantity,
        'Pre-existing StoreProduct stock must remain untouched.'
      );
      assert.equal(
        postStoreProducts[i].updatedAt.getTime(),
        baselineStoreProducts[i].updatedAt.getTime(),
        'Pre-existing StoreProduct rows must remain untouched.'
      );
    }

    await prisma.$disconnect();
  }

  console.log('ALL 28 PHASE 9 ORDER PLACEMENT, INVENTORY & VENDOR LIFECYCLE CHECKS PASSED.');
}

main().catch((error) => {
  console.error('PHASE 9 VALIDATION FAILED:', error);
  process.exit(1);
});
