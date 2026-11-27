import type { PrismaClient } from '@/generated/prisma/client';
import { GstStatus } from '@/generated/prisma/enums';
import {
  mapStoreToVendorStoreInfo,
  STORE_BUSINESS_DETAILS_SELECT,
  STORE_CATEGORY_SELECT,
  STORE_SCALAR_SELECT,
  STORE_SELECT,
  type StoreRecordShape,
  toNumericValue,
} from '@/lib/vendor/server';
import {
  validateStoreOperatingTransition,
  validateStoreUpdatePayload,
} from '@/lib/vendor/storeRules';
import type { UpdateStoreDetailsInput, VendorStoreInfo } from '@/types/vendor';

export type StorePersistenceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export interface ExecuteStoreOperatingStatusParams {
  vendorProfileId: string;
  ownerName: string;
  activeStoreId: string | null;
  requestedStoreId: string;
  nextIsOpen: boolean;
  accountStatus: string;
}

export interface ExecuteStoreDetailsUpdateParams {
  vendorProfileId: string;
  ownerName: string;
  activeStoreId: string | null;
  requestedStoreId: string;
  accountStatus: string;
  input: UpdateStoreDetailsInput;
}

/**
 * Executes an authoritative, single-statement Store.isOpen update without opening
 * an interactive multi-query transaction over the Supabase transaction pooler.
 */
export async function executeStoreOperatingStatusUpdate(
  prisma: PrismaClient,
  params: ExecuteStoreOperatingStatusParams
): Promise<StorePersistenceResult<{ isOpen: boolean; store: VendorStoreInfo }>> {
  const cleanId = params.requestedStoreId?.trim() || '';
  if (!cleanId) {
    return { success: false, error: 'Invalid store reference.' };
  }

  if (!params.activeStoreId || params.activeStoreId !== cleanId) {
    return {
      success: false,
      error: 'Store not found in your active session or you do not have permission to modify it.',
    };
  }

  const existing = await prisma.store.findFirst({
    where: {
      id: params.activeStoreId,
      vendorProfileId: params.vendorProfileId,
    },
    select: STORE_SELECT,
  });

  if (!existing) {
    return {
      success: false,
      error: 'Store not found or you do not have permission to modify it.',
    };
  }

  const transition = validateStoreOperatingTransition(params.nextIsOpen, {
    marketplaceStatus: existing.marketplaceStatus,
    verificationStatus: existing.verificationStatus,
    accountStatus: params.accountStatus,
  });

  if (!transition.valid) {
    return {
      success: false,
      error: transition.error,
    };
  }

  // Scalar-only select ensures Prisma 7 executes a single UPDATE ... RETURNING
  // statement with zero implicit BEGIN/COMMIT wrapper or relation follow-up queries.
  const updatedScalar = await prisma.store.update({
    where: {
      id: existing.id,
      vendorProfileId: params.vendorProfileId,
    },
    data: { isOpen: transition.value },
    select: STORE_SCALAR_SELECT,
  });

  const combinedRecord: StoreRecordShape = {
    ...updatedScalar,
    category: existing.category,
    businessDetails: existing.businessDetails,
  };

  return {
    success: true,
    data: {
      isOpen: updatedScalar.isOpen,
      store: mapStoreToVendorStoreInfo(combinedRecord, params.ownerName),
    },
  };
}

/**
 * Executes an authoritative store details and/or StoreBusinessDetails update:
 * - Operational updates (Store columns only) run as ONE single atomic SQL UPDATE ... RETURNING
 *   statement with zero interactive transaction callback or follow-up SELECT queries.
 * - Combined Store + StoreBusinessDetails updates run as a non-interactive Prisma batch
 *   transaction `prisma.$transaction([upsert, update])` with scalar RETURNING selects,
 *   preserving strict multi-table atomicity without holding interactive callback locks across JS roundtrips.
 */
export async function executeStoreDetailsUpdate(
  prisma: PrismaClient,
  params: ExecuteStoreDetailsUpdateParams
): Promise<StorePersistenceResult<{ store: VendorStoreInfo }>> {
  const cleanId = params.requestedStoreId?.trim() || '';
  if (!cleanId) {
    return { success: false, error: 'Invalid store reference.' };
  }

  if (params.accountStatus !== 'ACTIVE') {
    return { success: false, error: 'Your vendor account is not active.' };
  }

  if (!params.activeStoreId || params.activeStoreId !== cleanId) {
    return {
      success: false,
      error: 'Store not found in your active session or unauthorized.',
    };
  }

  const existing = await prisma.store.findFirst({
    where: {
      id: params.activeStoreId,
      vendorProfileId: params.vendorProfileId,
    },
    select: STORE_SELECT,
  });

  if (!existing) {
    return { success: false, error: 'Store not found or unauthorized.' };
  }

  const currentGstStatus =
    existing.businessDetails?.gstStatus === GstStatus.REGISTERED
      ? 'REGISTERED'
      : 'NOT_REGISTERED';

  const validation = validateStoreUpdatePayload(
    params.input as UpdateStoreDetailsInput & Record<string, unknown>,
    {
      verificationStatus: existing.verificationStatus,
      marketplaceStatus: existing.marketplaceStatus,
      accountStatus: params.accountStatus,
      openingTime: existing.openingTime,
      closingTime: existing.closingTime,
      latitude:
        existing.latitude !== null && existing.latitude !== undefined
          ? Number(toNumericValue(existing.latitude).toFixed(6))
          : null,
      longitude:
        existing.longitude !== null && existing.longitude !== undefined
          ? Number(toNumericValue(existing.longitude).toFixed(6))
          : null,
      gstStatus: currentGstStatus,
      gstin: existing.businessDetails?.gstin ?? null,
      legalBusinessName: existing.businessDetails?.legalBusinessName ?? null,
      gstVerified: existing.businessDetails?.gstVerified ?? false,
    }
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      fieldErrors: validation.fieldErrors,
    };
  }

  const { storeData, businessDetailsData, requestedCategoryId } = validation.value;
  let resolvedCategory = existing.category;

  if (requestedCategoryId !== undefined) {
    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id: requestedCategoryId }, { name: requestedCategoryId }],
        isActive: true,
      },
      select: STORE_CATEGORY_SELECT,
    });

    if (!category) {
      return {
        success: false,
        error: 'The selected store category is invalid or inactive.',
        fieldErrors: { categoryId: 'Please select an active store category.' },
      };
    }
    storeData.categoryId = category.id;
    resolvedCategory = category;
  }

  if (businessDetailsData?.gstin) {
    const conflictingGstin = await prisma.storeBusinessDetails.findFirst({
      where: {
        gstin: businessDetailsData.gstin,
        storeId: { not: existing.id },
      },
      select: { id: true },
    });

    if (conflictingGstin) {
      return {
        success: false,
        error: 'This GSTIN is already registered to another store.',
        fieldErrors: { gstin: 'This GSTIN is already registered to another store.' },
      };
    }
  }

  try {
    const hasStoreChanges = Object.keys(storeData).length > 0;
    let savedScalarStore: Omit<StoreRecordShape, 'category' | 'businessDetails'> = existing;
    let savedBusinessDetails: StoreRecordShape['businessDetails'] = existing.businessDetails;

    if (businessDetailsData !== null && hasStoreChanges) {
      const prismaGstStatus =
        businessDetailsData.gstStatus === 'REGISTERED'
          ? GstStatus.REGISTERED
          : GstStatus.NOT_REGISTERED;

      const [upsertedBusiness, updatedStore] = await prisma.$transaction([
        prisma.storeBusinessDetails.upsert({
          where: { storeId: existing.id },
          update: {
            gstStatus: prismaGstStatus,
            gstin: businessDetailsData.gstin,
            legalBusinessName: businessDetailsData.legalBusinessName,
          },
          create: {
            storeId: existing.id,
            gstStatus: prismaGstStatus,
            gstin: businessDetailsData.gstin,
            legalBusinessName: businessDetailsData.legalBusinessName,
            gstVerified: false,
          },
          select: STORE_BUSINESS_DETAILS_SELECT,
        }),
        prisma.store.update({
          where: {
            id: existing.id,
            vendorProfileId: params.vendorProfileId,
          },
          data: storeData,
          select: STORE_SCALAR_SELECT,
        }),
      ]);

      savedBusinessDetails = upsertedBusiness;
      savedScalarStore = updatedStore;
    } else if (businessDetailsData !== null) {
      const prismaGstStatus =
        businessDetailsData.gstStatus === 'REGISTERED'
          ? GstStatus.REGISTERED
          : GstStatus.NOT_REGISTERED;

      savedBusinessDetails = await prisma.storeBusinessDetails.upsert({
        where: { storeId: existing.id },
        update: {
          gstStatus: prismaGstStatus,
          gstin: businessDetailsData.gstin,
          legalBusinessName: businessDetailsData.legalBusinessName,
        },
        create: {
          storeId: existing.id,
          gstStatus: prismaGstStatus,
          gstin: businessDetailsData.gstin,
          legalBusinessName: businessDetailsData.legalBusinessName,
          gstVerified: false,
        },
        select: STORE_BUSINESS_DETAILS_SELECT,
      });
    } else if (hasStoreChanges) {
      savedScalarStore = await prisma.store.update({
        where: {
          id: existing.id,
          vendorProfileId: params.vendorProfileId,
        },
        data: storeData,
        select: STORE_SCALAR_SELECT,
      });
    }

    const updatedRecord: StoreRecordShape = {
      ...savedScalarStore,
      category: resolvedCategory,
      businessDetails: savedBusinessDetails,
    };

    return {
      success: true,
      data: {
        store: mapStoreToVendorStoreInfo(updatedRecord, params.ownerName),
      },
    };
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return {
        success: false,
        error: 'This GSTIN is already registered to another store.',
        fieldErrors: { gstin: 'This GSTIN is already registered to another store.' },
      };
    }
    throw error;
  }
}
