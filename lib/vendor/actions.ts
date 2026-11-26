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
  mapStoreProductToDto,
  mapStoreToVendorStoreInfo,
  resolveAuthenticatedActiveStore,
  STORE_PRODUCT_SELECT,
  toNumericValue,
} from '@/lib/vendor/server';
import {
  computeAddedStockState,
  computeCorrectedStockState,
  validateSellingPrice,
  validateWholeQuantity,
} from '@/lib/vendor/inventoryRules';
import type {
  CreateStoreInput,
  CreateStoreProductInput,
  StoreProduct,
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

/**
 * Adds an existing platform MasterProduct to the authenticated vendor's active owned Store.
 * Never trusts client-supplied store ownership or MasterProduct MRP/metadata.
 */
export async function createStoreProductAction(
  input: CreateStoreProductInput
): Promise<ActionResult<{ product: StoreProduct }>> {
  try {
    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { activeStore } = await resolveAuthenticatedActiveStore(vendorProfile);

    if (!activeStore) {
      return {
        success: false,
        error: 'Please register a store before adding products from the catalog.',
      };
    }

    if (
      input.expectedStoreId !== undefined &&
      input.expectedStoreId !== null &&
      input.expectedStoreId !== activeStore.id
    ) {
      return {
        success: false,
        error: 'Your active store changed in another session. Please refresh and try again.',
      };
    }

    const masterProductId = input.masterProductId?.trim() || '';
    if (!masterProductId) {
      return { success: false, error: 'Please select a valid catalog product.' };
    }

    const qtyCheck = validateWholeQuantity(input.stockQuantity, 0, 'Available quantity');
    if (!qtyCheck.valid) {
      return { success: false, error: qtyCheck.error };
    }

    const { prisma } = await import('@/lib/prisma');

    const masterProduct = await prisma.masterProduct.findFirst({
      where: {
        id: masterProductId,
        isActive: true,
        category: { isActive: true },
      },
      select: {
        id: true,
        mrp: true,
      },
    });

    if (!masterProduct) {
      return {
        success: false,
        error: 'Selected catalog product does not exist or is currently inactive.',
      };
    }

    const authoritativeMrp = toNumericValue(masterProduct.mrp);
    const priceCheck = validateSellingPrice(input.sellingPrice, authoritativeMrp);
    if (!priceCheck.valid) {
      return { success: false, error: priceCheck.error };
    }

    const existingListing = await prisma.storeProduct.findUnique({
      where: {
        storeId_masterProductId: {
          storeId: activeStore.id,
          masterProductId: masterProduct.id,
        },
      },
      select: { id: true },
    });

    if (existingListing) {
      return {
        success: false,
        error: 'This product is already listed in your active store.',
      };
    }

    const created = await prisma.storeProduct.create({
      data: {
        storeId: activeStore.id,
        masterProductId: masterProduct.id,
        sellingPrice: priceCheck.value,
        stockQuantity: qtyCheck.value,
        isAvailable: qtyCheck.value > 0,
      },
      select: STORE_PRODUCT_SELECT,
    });

    revalidatePath('/vendor', 'layout');

    return {
      success: true,
      data: { product: mapStoreProductToDto(created) },
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
        error: 'This product is already listed in your active store.',
      };
    }
    console.error('Failed to add catalog product to store:', error);
    return {
      success: false,
      error: 'Failed to add product to store. Please try again.',
    };
  }
}

/**
 * Normal restock flow: adds a positive whole-number quantity to an existing StoreProduct
 * belonging strictly to the authenticated vendor's active owned Store.
 */
export async function addStoreProductStockAction(
  storeProductId: string,
  quantityToAdd: number
): Promise<ActionResult<{ product: StoreProduct }>> {
  try {
    const cleanId = storeProductId?.trim() || '';
    if (!cleanId) {
      return { success: false, error: 'Invalid store product reference.' };
    }

    const qtyCheck = validateWholeQuantity(quantityToAdd, 1, 'Quantity to add');
    if (!qtyCheck.valid) {
      return { success: false, error: qtyCheck.error };
    }

    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { activeStore } = await resolveAuthenticatedActiveStore(vendorProfile);
    if (!activeStore) {
      return { success: false, error: 'No active store found for your account.' };
    }

    const { prisma } = await import('@/lib/prisma');

    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.storeProduct.findFirst({
        where: {
          id: cleanId,
          storeId: activeStore.id,
          store: { vendorProfileId: vendorProfile.id },
        },
        select: {
          id: true,
          stockQuantity: true,
          isAvailable: true,
        },
      });

      if (!existing) {
        return { ok: false as const, error: 'Inventory item not found in your active store or unauthorized.' };
      }

      const nextState = computeAddedStockState(
        existing.stockQuantity,
        existing.isAvailable,
        qtyCheck.value
      );
      if (!nextState.valid) {
        return { ok: false as const, error: nextState.error };
      }

      const updated = await tx.storeProduct.update({
        where: { id: existing.id },
        data: {
          stockQuantity: nextState.value.stockQuantity,
          isAvailable: nextState.value.isAvailable,
        },
        select: STORE_PRODUCT_SELECT,
      });

      return { ok: true as const, updated };
    });

    if (!outcome.ok) {
      return { success: false, error: outcome.error };
    }

    revalidatePath('/vendor', 'layout');

    return {
      success: true,
      data: { product: mapStoreProductToDto(outcome.updated) },
    };
  } catch (error: unknown) {
    console.error('Failed to add store product stock:', error);
    return {
      success: false,
      error: 'Failed to update stock. Please try again.',
    };
  }
}

/**
 * Explicit stock correction flow: sets exact non-negative whole-number stock quantity
 * for a StoreProduct in the authenticated vendor's active owned Store.
 * Setting quantity to 0 forces isAvailable = false (unavailable / out of stock).
 */
export async function setStoreProductStockAction(
  storeProductId: string,
  exactQuantity: number
): Promise<ActionResult<{ product: StoreProduct }>> {
  try {
    const cleanId = storeProductId?.trim() || '';
    if (!cleanId) {
      return { success: false, error: 'Invalid store product reference.' };
    }

    const qtyCheck = validateWholeQuantity(exactQuantity, 0, 'Stock quantity');
    if (!qtyCheck.valid) {
      return { success: false, error: qtyCheck.error };
    }

    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { activeStore } = await resolveAuthenticatedActiveStore(vendorProfile);
    if (!activeStore) {
      return { success: false, error: 'No active store found for your account.' };
    }

    const { prisma } = await import('@/lib/prisma');

    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.storeProduct.findFirst({
        where: {
          id: cleanId,
          storeId: activeStore.id,
          store: { vendorProfileId: vendorProfile.id },
        },
        select: {
          id: true,
          stockQuantity: true,
          isAvailable: true,
        },
      });

      if (!existing) {
        return { ok: false as const, error: 'Inventory item not found in your active store or unauthorized.' };
      }

      const nextState = computeCorrectedStockState(
        existing.stockQuantity,
        existing.isAvailable,
        qtyCheck.value
      );
      if (!nextState.valid) {
        return { ok: false as const, error: nextState.error };
      }

      const updated = await tx.storeProduct.update({
        where: { id: existing.id },
        data: {
          stockQuantity: nextState.value.stockQuantity,
          isAvailable: nextState.value.isAvailable,
        },
        select: STORE_PRODUCT_SELECT,
      });

      return { ok: true as const, updated };
    });

    if (!outcome.ok) {
      return { success: false, error: outcome.error };
    }

    revalidatePath('/vendor', 'layout');

    return {
      success: true,
      data: { product: mapStoreProductToDto(outcome.updated) },
    };
  } catch (error: unknown) {
    console.error('Failed to correct store product stock:', error);
    return {
      success: false,
      error: 'Failed to correct stock quantity. Please try again.',
    };
  }
}

/**
 * Updates store-specific selling price for a StoreProduct in the active owned Store.
 * Enforces positive monetary value and authoritative MasterProduct MRP ceiling.
 */
export async function updateStoreProductPriceAction(
  storeProductId: string,
  sellingPrice: number
): Promise<ActionResult<{ product: StoreProduct }>> {
  try {
    const cleanId = storeProductId?.trim() || '';
    if (!cleanId) {
      return { success: false, error: 'Invalid store product reference.' };
    }

    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { activeStore } = await resolveAuthenticatedActiveStore(vendorProfile);
    if (!activeStore) {
      return { success: false, error: 'No active store found for your account.' };
    }

    const { prisma } = await import('@/lib/prisma');

    const existing = await prisma.storeProduct.findFirst({
      where: {
        id: cleanId,
        storeId: activeStore.id,
        store: { vendorProfileId: vendorProfile.id },
      },
      select: {
        id: true,
        masterProduct: {
          select: { mrp: true },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Inventory item not found in your active store or unauthorized.',
      };
    }

    const authoritativeMrp = toNumericValue(existing.masterProduct.mrp);
    const priceCheck = validateSellingPrice(sellingPrice, authoritativeMrp);
    if (!priceCheck.valid) {
      return { success: false, error: priceCheck.error };
    }

    const updated = await prisma.storeProduct.update({
      where: { id: existing.id },
      data: { sellingPrice: priceCheck.value },
      select: STORE_PRODUCT_SELECT,
    });

    revalidatePath('/vendor', 'layout');

    return {
      success: true,
      data: { product: mapStoreProductToDto(updated) },
    };
  } catch (error: unknown) {
    console.error('Failed to update store product price:', error);
    return {
      success: false,
      error: 'Failed to update selling price. Please try again.',
    };
  }
}

/**
 * Toggles customer-facing availability for a StoreProduct in the active owned Store.
 * Out-of-stock products (stockQuantity <= 0) cannot be marked available.
 */
export async function updateStoreProductAvailabilityAction(
  storeProductId: string,
  isAvailable: boolean
): Promise<ActionResult<{ product: StoreProduct }>> {
  try {
    const cleanId = storeProductId?.trim() || '';
    if (!cleanId || typeof isAvailable !== 'boolean') {
      return { success: false, error: 'Invalid availability update request.' };
    }

    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { activeStore } = await resolveAuthenticatedActiveStore(vendorProfile);
    if (!activeStore) {
      return { success: false, error: 'No active store found for your account.' };
    }

    const { prisma } = await import('@/lib/prisma');

    const existing = await prisma.storeProduct.findFirst({
      where: {
        id: cleanId,
        storeId: activeStore.id,
        store: { vendorProfileId: vendorProfile.id },
      },
      select: {
        id: true,
        stockQuantity: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Inventory item not found in your active store or unauthorized.',
      };
    }

    if (isAvailable && existing.stockQuantity <= 0) {
      return {
        success: false,
        error: 'Cannot mark an out-of-stock product as available. Add stock first.',
      };
    }

    const updated = await prisma.storeProduct.update({
      where: { id: existing.id },
      data: { isAvailable },
      select: STORE_PRODUCT_SELECT,
    });

    revalidatePath('/vendor', 'layout');

    return {
      success: true,
      data: { product: mapStoreProductToDto(updated) },
    };
  } catch (error: unknown) {
    console.error('Failed to update store product availability:', error);
    return {
      success: false,
      error: 'Failed to update product availability. Please try again.',
    };
  }
}

/**
 * Removes an unreferenced StoreProduct from the authenticated vendor's active owned Store.
 * Preserves historical OrderItem integrity if the product has prior order history.
 */
export async function removeStoreProductAction(
  storeProductId: string
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    const cleanId = storeProductId?.trim() || '';
    if (!cleanId) {
      return { success: false, error: 'Invalid store product reference.' };
    }

    const { vendorProfile } = await getAuthenticatedVendorProfile();
    const { activeStore } = await resolveAuthenticatedActiveStore(vendorProfile);
    if (!activeStore) {
      return { success: false, error: 'No active store found for your account.' };
    }

    const { prisma } = await import('@/lib/prisma');

    const existing = await prisma.storeProduct.findFirst({
      where: {
        id: cleanId,
        storeId: activeStore.id,
        store: { vendorProfileId: vendorProfile.id },
      },
      select: {
        id: true,
        _count: {
          select: {
            orderItems: true,
            cartItems: true,
          },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Inventory item not found in your active store or unauthorized.',
      };
    }

    if (existing._count.orderItems > 0) {
      return {
        success: false,
        error:
          'Cannot remove a product linked to existing order history. Set stock to 0 or uncheck Available for sale instead.',
      };
    }

    await prisma.$transaction(async (tx) => {
      if (existing._count.cartItems > 0) {
        await tx.cartItem.deleteMany({
          where: { storeProductId: existing.id },
        });
      }
      await tx.storeProduct.delete({
        where: { id: existing.id },
      });
    });

    revalidatePath('/vendor', 'layout');

    return {
      success: true,
      data: { deletedId: existing.id },
    };
  } catch (error: unknown) {
    console.error('Failed to remove store product:', error);
    return {
      success: false,
      error: 'Failed to remove product from store inventory. Please try again.',
    };
  }
}
