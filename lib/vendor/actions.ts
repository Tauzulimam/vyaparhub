'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
  GstStatus,
  MarketplaceStatus,
  VerificationStatus,
} from '@/generated/prisma/enums';
import {
  ACTIVE_STORE_COOKIE,
  getAuthenticatedVendorProfile,
  mapStoreToVendorStoreInfo,
} from '@/lib/vendor/server';
import type {
  CreateStoreInput,
  UpdateStoreDetailsInput,
  VendorStoreInfo,
} from '@/types/vendor';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Creates a new store belonging strictly to the authenticated vendor's VendorProfile.
 * All ownership identifiers and default operational/verification states are established server-side.
 */
export async function createStoreAction(
  input: CreateStoreInput
): Promise<ActionResult<{ storeId: string; store: VendorStoreInfo }>> {
  try {
    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const fieldErrors: Record<string, string> = {};

    const name = input.name?.trim() || '';
    if (name.length < 2 || name.length > 100) {
      fieldErrors.name = 'Store name must be between 2 and 100 characters.';
    }

    const categoryId = input.categoryId?.trim() || '';
    if (!categoryId) {
      fieldErrors.categoryId = 'Please select a valid store category.';
    }

    const phone = input.phone?.trim() || '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      fieldErrors.phone = 'Enter a valid 10-digit phone number.';
    }

    const addressLine1 = input.addressLine1?.trim() || '';
    if (addressLine1.length < 3) {
      fieldErrors.addressLine1 = 'Shop/building address is required (at least 3 characters).';
    }

    const area = input.area?.trim() || '';
    if (area.length < 2) {
      fieldErrors.area = 'Area or locality is required.';
    }

    const city = input.city?.trim() || '';
    if (city.length < 2) {
      fieldErrors.city = 'City is required.';
    }

    const state = input.state?.trim() || '';
    if (state.length < 2) {
      fieldErrors.state = 'State is required.';
    }

    const postalCode = input.postalCode?.trim() || '';
    if (!PINCODE_REGEX.test(postalCode)) {
      fieldErrors.postalCode = 'Enter a valid 6-digit Indian PIN code (e.g. 122001).';
    }

    const openTime = input.openingTime?.trim() || '09:00';
    const closeTime = input.closingTime?.trim() || '21:00';
    if (!TIME_REGEX.test(openTime)) {
      fieldErrors.openTime = 'Opening time must be in HH:mm format.';
    }
    if (!TIME_REGEX.test(closeTime)) {
      fieldErrors.closeTime = 'Closing time must be in HH:mm format.';
    }
    if (openTime >= closeTime) {
      fieldErrors.hours = 'Closing time must be strictly after opening time.';
    }

    const deliveryRadiusKm = Number(input.deliveryRadiusKm);
    if (isNaN(deliveryRadiusKm) || deliveryRadiusKm < 1 || deliveryRadiusKm > 10) {
      fieldErrors.deliveryRadiusKm = 'Delivery radius must be between 1 and 10 km.';
    }

    const minimumOrderAmount = Number(input.minimumOrderAmount);
    if (isNaN(minimumOrderAmount) || minimumOrderAmount < 0) {
      fieldErrors.minimumOrderAmount = 'Minimum order amount cannot be negative.';
    }

    const gstStatus: GstStatus =
      input.gstStatus === 'REGISTERED' ? GstStatus.REGISTERED : GstStatus.NOT_REGISTERED;
    let cleanGstin: string | null = null;

    if (gstStatus === GstStatus.REGISTERED) {
      const g = input.gstin?.trim().toUpperCase() || '';
      if (!g) {
        fieldErrors.gstin = 'GSTIN is required for GST-registered stores.';
      } else if (!GSTIN_REGEX.test(g)) {
        fieldErrors.gstin = 'Enter a valid 15-character GSTIN (e.g. 06ABCDE1234F1Z5).';
      } else {
        cleanGstin = g;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, error: 'Validation failed. Please correct the highlighted errors.', fieldErrors };
    }

    const { prisma } = await import('@/lib/prisma');

    // Verify category exists and is active
    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id: categoryId }, { name: categoryId }],
        isActive: true,
      },
      select: { id: true },
    });

    if (!category) {
      return { success: false, error: 'The selected category is invalid or inactive.' };
    }

    // Execute atomic store + business details creation
    const newStore = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          vendorProfileId: vendorProfile.id,
          categoryId: category.id,
          name,
          description: input.description?.trim() || null,
          phone: cleanPhone,
          email: input.email?.trim() || null,
          addressLine1,
          addressLine2: input.addressLine2?.trim() || null,
          area,
          city,
          state,
          postalCode,
          openingTime: openTime,
          closingTime: closeTime,
          deliveryRadiusKm,
          minimumOrderAmount,
          isOpen: false, // SAFE ARCHITECTURAL DEFAULT: starts closed
          verificationStatus: VerificationStatus.PENDING, // SAFE DEFAULT: requires verification
          marketplaceStatus: MarketplaceStatus.ACTIVE,
          businessDetails: {
            create: {
              gstStatus,
              gstin: cleanGstin,
              legalBusinessName: null,
              gstVerified: false,
            },
          },
        },
        select: {
          id: true,
          vendorProfileId: true,
          categoryId: true,
          name: true,
          description: true,
          phone: true,
          email: true,
          addressLine1: true,
          addressLine2: true,
          area: true,
          city: true,
          state: true,
          postalCode: true,
          openingTime: true,
          closingTime: true,
          deliveryRadiusKm: true,
          minimumOrderAmount: true,
          isOpen: true,
          verificationStatus: true,
          marketplaceStatus: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          businessDetails: {
            select: {
              id: true,
              gstStatus: true,
              gstin: true,
              legalBusinessName: true,
              gstVerified: true,
            },
          },
        },
      });

      return store;
    });

    const createdStoreDto = mapStoreToVendorStoreInfo(newStore, vendorProfile.ownerName);

    // Set active store cookie to newly created store
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_STORE_COOKIE, newStore.id, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    revalidatePath('/vendor', 'layout');

    return {
      success: true,
      data: { storeId: createdStoreDto.id, store: createdStoreDto },
    };
  } catch (error: unknown) {
    console.error('Failed to create store:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while creating the store.',
    };
  }
}

/**
 * Updates the vendor-controlled operating status (isOpen: true / false).
 * Strict ownership check: verifies store belongs to the authenticated vendor.
 */
export async function updateStoreOperatingStatusAction(
  storeId: string,
  isOpen: boolean
): Promise<ActionResult<{ isOpen: boolean }>> {
  try {
    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { prisma } = await import('@/lib/prisma');

    // Strict ownership verification
    const existing = await prisma.store.findFirst({
      where: {
        id: storeId,
        vendorProfileId: vendorProfile.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: 'Store not found or you do not have permission to modify it.' };
    }

    await prisma.store.update({
      where: { id: storeId },
      data: { isOpen: Boolean(isOpen) },
    });

    revalidatePath('/vendor');
    revalidatePath('/vendor/store');

    return {
      success: true,
      data: { isOpen: Boolean(isOpen) },
    };
  } catch (error: unknown) {
    console.error('Failed to update store operating status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update store operating status.',
    };
  }
}

/**
 * Updates editable operational details for an authenticated vendor's store.
 * Verified business & tax identity details remain untouched.
 */
export async function updateStoreDetailsAction(
  storeId: string,
  input: UpdateStoreDetailsInput
): Promise<ActionResult<void>> {
  try {
    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { prisma } = await import('@/lib/prisma');

    // Strict ownership verification
    const existing = await prisma.store.findFirst({
      where: {
        id: storeId,
        vendorProfileId: vendorProfile.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: 'Store not found or unauthorized.' };
    }

    const dataToUpdate: Record<string, unknown> = {};

    if (input.description !== undefined) {
      dataToUpdate.description = input.description.trim() || null;
    }

    if (input.email !== undefined) {
      dataToUpdate.email = input.email.trim() || null;
    }

    if (input.addressLine1 !== undefined && input.addressLine1.trim().length >= 3) {
      dataToUpdate.addressLine1 = input.addressLine1.trim();
    }

    if (input.addressLine2 !== undefined) {
      dataToUpdate.addressLine2 = input.addressLine2.trim() || null;
    }

    if (input.area !== undefined && input.area.trim().length >= 2) {
      dataToUpdate.area = input.area.trim();
    }

    if (input.city !== undefined && input.city.trim().length >= 2) {
      dataToUpdate.city = input.city.trim();
    }

    if (input.state !== undefined && input.state.trim().length >= 2) {
      dataToUpdate.state = input.state.trim();
    }

    if (input.postalCode !== undefined && PINCODE_REGEX.test(input.postalCode.trim())) {
      dataToUpdate.postalCode = input.postalCode.trim();
    }

    if (input.openingTime !== undefined && TIME_REGEX.test(input.openingTime)) {
      dataToUpdate.openingTime = input.openingTime;
    }

    if (input.closingTime !== undefined && TIME_REGEX.test(input.closingTime)) {
      dataToUpdate.closingTime = input.closingTime;
    }

    if (input.deliveryRadiusKm !== undefined) {
      const radius = Number(input.deliveryRadiusKm);
      if (radius >= 1 && radius <= 10) {
        dataToUpdate.deliveryRadiusKm = radius;
      }
    }

    if (input.minimumOrderAmount !== undefined) {
      const minOrder = Number(input.minimumOrderAmount);
      if (minOrder >= 0) {
        dataToUpdate.minimumOrderAmount = minOrder;
      }
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.store.update({
        where: { id: storeId },
        data: dataToUpdate,
      });
    }

    revalidatePath('/vendor');
    revalidatePath('/vendor/store');

    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error('Failed to update store details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update store details.',
    };
  }
}

/**
 * Sets the active store cookie for the authenticated vendor.
 * Verifies store ownership before writing the cookie.
 */
export async function setActiveStoreCookieAction(
  storeId: string
): Promise<ActionResult<{ activeStoreId: string }>> {
  try {
    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { prisma } = await import('@/lib/prisma');

    // Strict ownership verification
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        vendorProfileId: vendorProfile.id,
      },
      select: { id: true },
    });

    if (!store) {
      return { success: false, error: 'Store not found or unauthorized.' };
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_STORE_COOKIE, store.id, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return { success: true, data: { activeStoreId: store.id } };
  } catch (error: unknown) {
    console.error('Failed to set active store cookie:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to switch active store.',
    };
  }
}
