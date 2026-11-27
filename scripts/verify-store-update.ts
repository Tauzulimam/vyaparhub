import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  AccountStatus,
  GstStatus,
  MarketplaceStatus,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import {
  executeStoreDetailsUpdate,
  executeStoreOperatingStatusUpdate,
} from '@/lib/vendor/storePersistence';

/**
 * Focused Phase 5C regression suite exercising the exact Prisma persistence and
 * batch-transaction functions invoked by `updateStoreDetailsAction` and
 * `updateStoreOperatingStatusAction` over the real `DATABASE_URL` pooler.
 *
 * Creates only disposable synthetic vendor/store rows and removes them in `finally`,
 * verifying that pre-existing database rows remain 100% untouched.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run verify-store-update.');
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

  prisma.$on('query', (event) => {
    sqlLog.push(event.query);
  });

  // Snapshot pre-existing stores to verify zero side effects on real test data
  const baselineStores = await prisma.store.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true, updatedAt: true },
  });

  const activeCategory = await prisma.category.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  assert.ok(activeCategory, 'Expected at least one active category in PostgreSQL.');

  const runToken = crypto.randomBytes(4).toString('hex').toUpperCase();
  const syntheticUserId = `reg_u_${runToken.toLowerCase()}`;
  const syntheticAuthId = crypto.randomUUID();
  const syntheticPhone = `99${String(Math.floor(10000000 + Math.random() * 89999999))}`;
  // Valid 15-char GSTIN matching /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  const digits4 = String(Math.floor(1000 + Math.random() * 8999));
  const syntheticGstinA = `06ABCPV${digits4}R1Z5`;
  const syntheticGstinConflict = `07ABCPV${digits4}R1Z6`;

  let createdUserId: string | null = null;
  let storeOneId: string | null = null;
  let storeTwoId: string | null = null;

  try {
    // Provision disposable synthetic vendor + two stores
    const user = await prisma.user.create({
      data: {
        id: syntheticUserId,
        authUserId: syntheticAuthId,
        email: `regression-${runToken.toLowerCase()}@vyaparhub.local`,
        phone: syntheticPhone,
        role: UserRole.VENDOR,
        accountStatus: AccountStatus.ACTIVE,
        vendorProfile: {
          create: {
            ownerName: 'Regression Test Owner',
            registeredMobile: syntheticPhone,
            businessEmail: `regression-${runToken.toLowerCase()}@vyaparhub.local`,
            verificationStatus: VerificationStatus.PENDING,
          },
        },
      },
      select: {
        id: true,
        vendorProfile: { select: { id: true, ownerName: true } },
      },
    });
    createdUserId = user.id;
    const vendorProfile = user.vendorProfile!;

    const storeOne = await prisma.store.create({
      data: {
        vendorProfileId: vendorProfile.id,
        categoryId: activeCategory.id,
        name: 'Regression Store Alpha',
        phone: '9876543210',
        addressLine1: 'Plot 10, Old Road',
        area: 'Sector 10',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122001',
        openingTime: '09:00',
        closingTime: '21:00',
        deliveryRadiusKm: 4,
        minimumOrderAmount: 100,
        isOpen: false,
        verificationStatus: VerificationStatus.PENDING,
        marketplaceStatus: MarketplaceStatus.ACTIVE,
        businessDetails: {
          create: {
            gstStatus: GstStatus.NOT_REGISTERED,
            gstin: null,
            legalBusinessName: null,
            gstVerified: false,
          },
        },
      },
      select: { id: true },
    });
    storeOneId = storeOne.id;

    const storeTwo = await prisma.store.create({
      data: {
        vendorProfileId: vendorProfile.id,
        categoryId: activeCategory.id,
        name: 'Regression Store Beta',
        phone: '9876543211',
        addressLine1: 'Shop 5, Phase 2',
        area: 'DLF Phase 2',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122002',
        openingTime: '08:00',
        closingTime: '20:00',
        deliveryRadiusKm: 3,
        minimumOrderAmount: 50,
        isOpen: false,
        verificationStatus: VerificationStatus.PENDING,
        marketplaceStatus: MarketplaceStatus.ACTIVE,
        businessDetails: {
          create: {
            gstStatus: GstStatus.REGISTERED,
            gstin: syntheticGstinConflict,
            legalBusinessName: 'Beta Medicals Pvt Ltd',
            gstVerified: false,
          },
        },
      },
      select: { id: true, updatedAt: true },
    });
    storeTwoId = storeTwo.id;

    // -------------------------------------------------------------------------
    // TEST 1: Operational store update ("Save operational changes")
    // Must execute a single scalar UPDATE (no interactive BEGIN/COMMIT callback)
    // and finish in seconds, not minutes.
    // -------------------------------------------------------------------------
    sqlLog.length = 0;
    const tOpStart = Date.now();
    const opResult = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      accountStatus: AccountStatus.ACTIVE,
      input: {
        description: 'Daily kirana & fresh dairy essentials',
        email: 'alpha-support@vyaparhub.local',
        addressLine1: 'Shop 24, Main Market',
        addressLine2: 'Near Community Center',
        area: 'Sector 15',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122003',
        latitude: 28.459497,
        longitude: 77.026638,
        openingTime: '08:30',
        closingTime: '22:00',
        deliveryRadiusKm: 6.5,
        minimumOrderAmount: 199,
      },
    });
    const opElapsedMs = Date.now() - tOpStart;

    assert.equal(opResult.success, true, 'Operational store update must succeed.');
    assert.ok(
      opElapsedMs < 10_000,
      `Operational store update must finish quickly, took ${opElapsedMs}ms.`
    );
    const updateStatements = sqlLog.filter((q) => q.startsWith('UPDATE "public"."stores"'));
    assert.equal(updateStatements.length, 1, 'Expected exactly 1 UPDATE on stores.');
    // Ensure the write itself did not open a second BEGIN/COMMIT after the initial read
    const lastUpdateIdx = sqlLog.findIndex((q) => q.startsWith('UPDATE "public"."stores"'));
    assert.equal(
      sqlLog.slice(lastUpdateIdx + 1).length,
      0,
      'Expected zero follow-up queries or COMMIT roundtrips after scalar store UPDATE.'
    );
    assert.equal(opResult.data.store.addressLine1, 'Shop 24, Main Market');
    assert.equal(opResult.data.store.area, 'Sector 15');
    assert.equal(opResult.data.store.openTime, '08:30');
    assert.equal(opResult.data.store.closeTime, '22:00');
    assert.equal(opResult.data.store.deliveryRadiusKm, 6.5);
    assert.equal(opResult.data.store.minOrderAmount, 199);
    assert.equal(opResult.data.store.latitude, 28.459497);
    assert.equal(opResult.data.store.longitude, 77.026638);
    console.log(`[PASS] Test 1: Operational store update completed in ${opElapsedMs}ms (single SQL UPDATE).`);

    // -------------------------------------------------------------------------
    // TEST 2: Multi-store isolation (Store Beta untouched + mismatched activeStore rejected)
    // -------------------------------------------------------------------------
    const storeTwoReloaded = await prisma.store.findUniqueOrThrow({
      where: { id: storeTwo.id },
      select: { name: true, area: true, updatedAt: true },
    });
    assert.equal(storeTwoReloaded.area, 'DLF Phase 2');
    assert.equal(
      storeTwoReloaded.updatedAt.getTime(),
      storeTwo.updatedAt.getTime(),
      'Second store must remain completely untouched.'
    );

    const wrongActiveRes = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeTwo.id,
      accountStatus: AccountStatus.ACTIVE,
      input: { area: 'Tampered Area' },
    });
    assert.equal(wrongActiveRes.success, false, 'Non-active store mutation must fail closed.');
    console.log('[PASS] Test 2: Multi-store isolation and active-store boundary enforced.');

    // -------------------------------------------------------------------------
    // TEST 3: Combined Identity + StoreBusinessDetails batch transaction atomicity
    // -------------------------------------------------------------------------
    const tBizStart = Date.now();
    const bizResult = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      accountStatus: AccountStatus.ACTIVE,
      input: {
        name: 'Regression Store Alpha Prime',
        phone: '9811223344',
        gstStatus: 'REGISTERED',
        gstin: syntheticGstinA,
        legalBusinessName: 'Alpha Prime Kirana LLP',
      },
    });
    const bizElapsedMs = Date.now() - tBizStart;

    assert.equal(bizResult.success, true, 'Unverified identity + GST batch update must succeed.');
    assert.equal(bizResult.data.store.name, 'Regression Store Alpha Prime');
    assert.equal(bizResult.data.store.gstStatus, 'REGISTERED');
    assert.equal(bizResult.data.store.gstin, syntheticGstinA);
    assert.equal(bizResult.data.store.legalBusinessName, 'Alpha Prime Kirana LLP');
    assert.equal(bizResult.data.store.gstVerified, false);

    const businessRowCount = await prisma.storeBusinessDetails.count({
      where: { storeId: storeOne.id },
    });
    assert.equal(businessRowCount, 1, 'Must upsert without creating duplicate StoreBusinessDetails.');

    const conflictGstinRes = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      accountStatus: AccountStatus.ACTIVE,
      input: {
        name: 'Should Not Persist Name',
        gstStatus: 'REGISTERED',
        gstin: syntheticGstinConflict,
      },
    });
    assert.equal(conflictGstinRes.success, false, 'Conflicting GSTIN must be rejected.');
    const afterConflictStore = await prisma.store.findUniqueOrThrow({
      where: { id: storeOne.id },
      select: { name: true },
    });
    assert.equal(
      afterConflictStore.name,
      'Regression Store Alpha Prime',
      'Store name must not change when GSTIN validation fails.'
    );
    console.log(`[PASS] Test 3: Store + StoreBusinessDetails batch atomicity verified in ${bizElapsedMs}ms.`);

    // -------------------------------------------------------------------------
    // TEST 4: Operating status (isOpen) persistence + fail-closed governance
    // -------------------------------------------------------------------------
    const openRes = await executeStoreOperatingStatusUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      nextIsOpen: true,
      accountStatus: AccountStatus.ACTIVE,
    });
    assert.equal(openRes.success, true);
    assert.equal(openRes.data.isOpen, true);

    await prisma.store.update({
      where: { id: storeOne.id },
      data: { isOpen: false, marketplaceStatus: MarketplaceStatus.SUSPENDED },
    });

    const blockedOpenRes = await executeStoreOperatingStatusUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      nextIsOpen: true,
      accountStatus: AccountStatus.ACTIVE,
    });
    assert.equal(blockedOpenRes.success, false, 'Suspended store must fail closed when opening.');
    console.log('[PASS] Test 4: Store.isOpen persistence and suspended fail-closed rule verified.');

    // -------------------------------------------------------------------------
    // TEST 5: Verification-sensitive locking & forbidden admin field protection
    // -------------------------------------------------------------------------
    await prisma.store.update({
      where: { id: storeOne.id },
      data: {
        marketplaceStatus: MarketplaceStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });
    await prisma.storeBusinessDetails.update({
      where: { storeId: storeOne.id },
      data: { gstVerified: true, gstVerifiedAt: new Date() },
    });

    const lockedIdentityAttempt = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      accountStatus: AccountStatus.ACTIVE,
      input: { name: 'Illegal Rename After Verification' },
    });
    assert.equal(lockedIdentityAttempt.success, false, 'Verified store name must be locked.');

    const lockedGstAttempt = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      accountStatus: AccountStatus.ACTIVE,
      input: { gstStatus: 'NOT_REGISTERED' },
    });
    assert.equal(lockedGstAttempt.success, false, 'Verified GST details must be locked.');

    const tamperedAdminAttempt = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      accountStatus: AccountStatus.ACTIVE,
      input: {
        area: 'Sector 16',
        verificationStatus: 'PENDING',
      } as unknown as Parameters<typeof executeStoreDetailsUpdate>[1]['input'],
    });
    assert.equal(tamperedAdminAttempt.success, false, 'Forbidden admin fields must be rejected.');

    const allowedVerifiedOpUpdate = await executeStoreDetailsUpdate(prisma, {
      vendorProfileId: vendorProfile.id,
      ownerName: vendorProfile.ownerName,
      activeStoreId: storeOne.id,
      requestedStoreId: storeOne.id,
      accountStatus: AccountStatus.ACTIVE,
      input: {
        area: 'Sector 17 Updated',
        deliveryRadiusKm: 8,
      },
    });
    assert.equal(
      allowedVerifiedOpUpdate.success,
      true,
      'Operational fields must remain editable even after store/GST verification.'
    );
    assert.equal(allowedVerifiedOpUpdate.data.store.area, 'Sector 17 Updated');
    assert.equal(allowedVerifiedOpUpdate.data.store.deliveryRadiusKm, 8);
    assert.equal(allowedVerifiedOpUpdate.data.store.verificationStatus, 'VERIFIED');
    assert.equal(allowedVerifiedOpUpdate.data.store.gstVerified, true);
    console.log('[PASS] Test 5: Verification locking & admin-field tampering defenses verified.');
  } finally {
    // Clean up disposable synthetic records in dependency order
    if (storeOneId || storeTwoId) {
      await prisma.store.deleteMany({
        where: { id: { in: [storeOneId, storeTwoId].filter(Boolean) as string[] } },
      });
    }
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { id: createdUserId },
      });
    }

    const postStores = await prisma.store.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, updatedAt: true },
    });
    assert.equal(
      postStores.length,
      baselineStores.length,
      'Pre-existing store count must remain identical after regression cleanup.'
    );
    for (let i = 0; i < baselineStores.length; i++) {
      assert.equal(postStores[i].id, baselineStores[i].id);
      assert.equal(
        postStores[i].updatedAt.getTime(),
        baselineStores[i].updatedAt.getTime(),
        `Pre-existing store "${baselineStores[i].name}" must remain completely unmodified.`
      );
    }

    await prisma.$disconnect();
  }

  console.log('ALL PHASE 5C STORE UPDATE REGRESSION CHECKS PASSED.');
}

main().catch((error) => {
  console.error('PHASE 5C REGRESSION CHECK FAILED:', error);
  process.exit(1);
});
