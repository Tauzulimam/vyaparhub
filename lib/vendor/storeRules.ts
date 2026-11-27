import type { GstStatus, UpdateStoreDetailsInput } from '@/types/vendor';

export const STORE_GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const STORE_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const STORE_PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const STORE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const STORE_INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export const MIN_DELIVERY_RADIUS_KM = 1;
export const MAX_DELIVERY_RADIUS_KM = 10;
export const MAX_MIN_ORDER_AMOUNT = 100_000;

const FORBIDDEN_ADMIN_KEYS = [
  'verificationStatus',
  'marketplaceStatus',
  'gstVerified',
  'gstVerifiedAt',
  'vendorProfileId',
  'verifiedAt',
  'accountStatus',
  'role',
] as const;

export interface ExistingStoreValidationContext {
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | string;
  marketplaceStatus: 'ACTIVE' | 'SUSPENDED' | string;
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | string;
  openingTime: string | null;
  closingTime: string | null;
  latitude: number | null;
  longitude: number | null;
  gstStatus: GstStatus;
  gstin: string | null;
  legalBusinessName: string | null;
  gstVerified: boolean;
}

export interface ValidatedStoreUpdatePlan {
  storeData: Record<string, unknown>;
  businessDetailsData: {
    gstStatus: GstStatus;
    gstin: string | null;
    legalBusinessName: string | null;
  } | null;
  requestedCategoryId?: string;
}

export type StoreValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; error: string; fieldErrors?: Record<string, string> };

function hasAtMostDecimals(num: number, decimals: number): boolean {
  const factor = 10 ** decimals;
  return Math.abs(Math.round(num * factor) - num * factor) <= 1e-6;
}

/**
 * Enforces eligibility rules for Store.isOpen transitions.
 * - Suspended accounts or suspended marketplace stores cannot open.
 * - Rejected verification stores cannot open.
 * - Closing (isOpen = false) is always permitted for an owned active store,
 *   keeping vendor operational closure distinct from admin suspension.
 */
export function validateStoreOperatingTransition(
  nextIsOpen: unknown,
  ctx: Pick<
    ExistingStoreValidationContext,
    'marketplaceStatus' | 'verificationStatus' | 'accountStatus'
  >
): StoreValidationResult<boolean> {
  if (typeof nextIsOpen !== 'boolean') {
    return { valid: false, error: 'Invalid operating status value.' };
  }

  if (ctx.accountStatus && ctx.accountStatus !== 'ACTIVE') {
    return {
      valid: false,
      error: 'Your vendor account is not active and cannot modify store operating status.',
    };
  }

  if (nextIsOpen) {
    if (ctx.marketplaceStatus !== 'ACTIVE') {
      return {
        valid: false,
        error:
          'This store is currently suspended by VyaparHub administration and cannot be opened.',
      };
    }

    if (ctx.verificationStatus === 'REJECTED') {
      return {
        valid: false,
        error:
          'This store cannot be opened because its business verification was rejected.',
      };
    }
  }

  return { valid: true, value: nextIsOpen };
}

/**
 * Validates all fields in an UpdateStoreDetailsInput payload against:
 * 1. Forbidden admin-controlled fields (defense against tampered requests)
 * 2. Verification-sensitive locking (Store.verificationStatus === 'VERIFIED' and gstVerified)
 * 3. Schema constraints & business rules for contact, location, coordinates, hours, delivery, and GST
 */
export function validateStoreUpdatePayload(
  rawInput: UpdateStoreDetailsInput & Record<string, unknown>,
  ctx: ExistingStoreValidationContext
): StoreValidationResult<ValidatedStoreUpdatePlan> {
  if (!rawInput || typeof rawInput !== 'object') {
    return { valid: false, error: 'Invalid store update payload.' };
  }

  // 1. Reject any attempt to supply admin-controlled verification or status fields
  for (const key of FORBIDDEN_ADMIN_KEYS) {
    if (key in rawInput && rawInput[key] !== undefined) {
      return {
        valid: false,
        error: `Unauthorized attempt to modify protected field "${key}".`,
      };
    }
  }

  const isStoreVerified = ctx.verificationStatus === 'VERIFIED';
  const isBusinessLocked = ctx.gstVerified || isStoreVerified;

  // 2. Enforce verification-sensitive locking on store identity fields
  const touchesStoreIdentity =
    rawInput.name !== undefined ||
    rawInput.phone !== undefined ||
    rawInput.categoryId !== undefined;

  if (touchesStoreIdentity && isStoreVerified) {
    return {
      valid: false,
      error:
        'Verified store identity fields (store name, contact phone, and category) are locked and cannot be edited.',
    };
  }

  // 3. Enforce verification-sensitive locking on business / GST fields
  const touchesBusinessDetails =
    rawInput.gstStatus !== undefined ||
    rawInput.gstin !== undefined ||
    rawInput.legalBusinessName !== undefined;

  if (touchesBusinessDetails && isBusinessLocked) {
    return {
      valid: false,
      error:
        'Verified business and GST details are locked and cannot be modified.',
    };
  }

  const fieldErrors: Record<string, string> = {};
  const storeData: Record<string, unknown> = {};
  let requestedCategoryId: string | undefined;

  // Identity fields (when store is not yet VERIFIED)
  if (rawInput.name !== undefined) {
    const name = typeof rawInput.name === 'string' ? rawInput.name.trim() : '';
    if (name.length < 2 || name.length > 100) {
      fieldErrors.name = 'Store name must be between 2 and 100 characters.';
    } else {
      storeData.name = name;
    }
  }

  if (rawInput.phone !== undefined) {
    const rawPhone = typeof rawInput.phone === 'string' ? rawInput.phone.trim() : '';
    const digits = rawPhone.replace(/\D/g, '');
    const normalized =
      digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (normalized.length < 10 || normalized.length > 12) {
      fieldErrors.phone = 'Enter a valid 10-digit contact phone number.';
    } else {
      storeData.phone = normalized;
    }
  }

  if (rawInput.categoryId !== undefined) {
    const catId = typeof rawInput.categoryId === 'string' ? rawInput.categoryId.trim() : '';
    if (!catId) {
      fieldErrors.categoryId = 'Please select a valid store category.';
    } else {
      requestedCategoryId = catId;
    }
  }

  // Operational & contact fields
  if (rawInput.description !== undefined) {
    if (typeof rawInput.description !== 'string') {
      fieldErrors.description = 'Invalid store description.';
    } else {
      const desc = rawInput.description.trim();
      if (desc.length > 500) {
        fieldErrors.description = 'Description cannot exceed 500 characters.';
      } else {
        storeData.description = desc || null;
      }
    }
  }

  if (rawInput.email !== undefined) {
    if (typeof rawInput.email !== 'string') {
      fieldErrors.email = 'Invalid email address.';
    } else {
      const email = rawInput.email.trim().toLowerCase();
      if (email !== '' && !STORE_EMAIL_REGEX.test(email)) {
        fieldErrors.email = 'Enter a valid support/notification email address.';
      } else {
        storeData.email = email || null;
      }
    }
  }

  // Location fields
  if (rawInput.addressLine1 !== undefined) {
    const line1 = typeof rawInput.addressLine1 === 'string' ? rawInput.addressLine1.trim() : '';
    if (line1.length < 3 || line1.length > 200) {
      fieldErrors.addressLine1 = 'Shop/building/street address must be between 3 and 200 characters.';
    } else {
      storeData.addressLine1 = line1;
    }
  }

  if (rawInput.addressLine2 !== undefined) {
    if (typeof rawInput.addressLine2 !== 'string') {
      fieldErrors.addressLine2 = 'Invalid secondary address line.';
    } else {
      const line2 = rawInput.addressLine2.trim();
      if (line2.length > 200) {
        fieldErrors.addressLine2 = 'Secondary address line cannot exceed 200 characters.';
      } else {
        storeData.addressLine2 = line2 || null;
      }
    }
  }

  if (rawInput.area !== undefined) {
    const area = typeof rawInput.area === 'string' ? rawInput.area.trim() : '';
    if (area.length < 2 || area.length > 100) {
      fieldErrors.area = 'Area or locality is required (at least 2 characters).';
    } else {
      storeData.area = area;
    }
  }

  if (rawInput.city !== undefined) {
    const city = typeof rawInput.city === 'string' ? rawInput.city.trim() : '';
    if (city.length < 2 || city.length > 80) {
      fieldErrors.city = 'City is required (at least 2 characters).';
    } else {
      storeData.city = city;
    }
  }

  if (rawInput.state !== undefined) {
    const state = typeof rawInput.state === 'string' ? rawInput.state.trim() : '';
    if (state.length < 2 || state.length > 80) {
      fieldErrors.state = 'State is required (at least 2 characters).';
    } else {
      storeData.state = state;
    }
  }

  if (rawInput.postalCode !== undefined) {
    const pin = typeof rawInput.postalCode === 'string' ? rawInput.postalCode.trim() : '';
    if (!STORE_PINCODE_REGEX.test(pin)) {
      fieldErrors.postalCode = 'Enter a valid 6-digit Indian PIN code (e.g. 122001).';
    } else {
      storeData.postalCode = pin;
    }
  }

  // Coordinates (optional pair: both null or both valid numbers in range)
  const latProvided = rawInput.latitude !== undefined;
  const lngProvided = rawInput.longitude !== undefined;
  if (latProvided || lngProvided) {
    const nextLat = rawInput.latitude !== undefined ? rawInput.latitude : ctx.latitude;
    const nextLng = rawInput.longitude !== undefined ? rawInput.longitude : ctx.longitude;

    if ((nextLat === null) !== (nextLng === null)) {
      fieldErrors.coordinates =
        'Provide both latitude and longitude together, or leave both blank.';
    } else if (nextLat !== null && nextLng !== null) {
      const validLat =
        typeof nextLat === 'number' &&
        Number.isFinite(nextLat) &&
        nextLat >= -90 &&
        nextLat <= 90 &&
        hasAtMostDecimals(nextLat, 6);
      const validLng =
        typeof nextLng === 'number' &&
        Number.isFinite(nextLng) &&
        nextLng >= -180 &&
        nextLng <= 180 &&
        hasAtMostDecimals(nextLng, 6);

      if (!validLat) {
        fieldErrors.latitude = 'Latitude must be between -90 and 90 (up to 6 decimal places).';
      }
      if (!validLng) {
        fieldErrors.longitude = 'Longitude must be between -180 and 180 (up to 6 decimal places).';
      }
      if (validLat && validLng) {
        storeData.latitude = Number(nextLat.toFixed(6));
        storeData.longitude = Number(nextLng.toFixed(6));
      }
    } else {
      storeData.latitude = null;
      storeData.longitude = null;
    }
  }

  // Operating hours
  const hoursProvided = rawInput.openingTime !== undefined || rawInput.closingTime !== undefined;
  if (hoursProvided) {
    const nextOpen =
      rawInput.openingTime !== undefined
        ? typeof rawInput.openingTime === 'string'
          ? rawInput.openingTime.trim()
          : ''
        : ctx.openingTime ?? '09:00';
    const nextClose =
      rawInput.closingTime !== undefined
        ? typeof rawInput.closingTime === 'string'
          ? rawInput.closingTime.trim()
          : ''
        : ctx.closingTime ?? '21:00';

    if (!STORE_TIME_REGEX.test(nextOpen)) {
      fieldErrors.openingTime = 'Opening time must be in valid 24-hour HH:mm format.';
    }
    if (!STORE_TIME_REGEX.test(nextClose)) {
      fieldErrors.closingTime = 'Closing time must be in valid 24-hour HH:mm format.';
    }
    if (!fieldErrors.openingTime && !fieldErrors.closingTime && nextOpen >= nextClose) {
      fieldErrors.hours = 'Closing time must be strictly after opening time.';
    }
    if (!fieldErrors.openingTime && !fieldErrors.closingTime && !fieldErrors.hours) {
      storeData.openingTime = nextOpen;
      storeData.closingTime = nextClose;
    }
  }

  // Delivery settings
  if (rawInput.deliveryRadiusKm !== undefined) {
    const radius = rawInput.deliveryRadiusKm;
    if (
      typeof radius !== 'number' ||
      !Number.isFinite(radius) ||
      radius < MIN_DELIVERY_RADIUS_KM ||
      radius > MAX_DELIVERY_RADIUS_KM ||
      !hasAtMostDecimals(radius, 2)
    ) {
      fieldErrors.deliveryRadiusKm = `Delivery radius must be between ${MIN_DELIVERY_RADIUS_KM} and ${MAX_DELIVERY_RADIUS_KM} km.`;
    } else {
      storeData.deliveryRadiusKm = Math.round(radius * 100) / 100;
    }
  }

  if (rawInput.minimumOrderAmount !== undefined) {
    const minOrder = rawInput.minimumOrderAmount;
    if (
      typeof minOrder !== 'number' ||
      !Number.isFinite(minOrder) ||
      minOrder < 0 ||
      minOrder > MAX_MIN_ORDER_AMOUNT ||
      !hasAtMostDecimals(minOrder, 2)
    ) {
      fieldErrors.minimumOrderAmount = `Minimum order amount must be between ₹0 and ₹${MAX_MIN_ORDER_AMOUNT.toLocaleString('en-IN')}.`;
    } else {
      storeData.minimumOrderAmount = Math.round(minOrder * 100) / 100;
    }
  }

  // StoreBusinessDetails (when unverified)
  let businessDetailsData: ValidatedStoreUpdatePlan['businessDetailsData'] = null;
  if (touchesBusinessDetails) {
    const nextGstStatus: GstStatus | null =
      rawInput.gstStatus !== undefined
        ? rawInput.gstStatus === 'REGISTERED'
          ? 'REGISTERED'
          : rawInput.gstStatus === 'NOT_REGISTERED'
          ? 'NOT_REGISTERED'
          : null
        : ctx.gstStatus;

    if (!nextGstStatus) {
      fieldErrors.gstStatus = 'Invalid GST registration status.';
    } else {
      let nextGstin: string | null = null;
      if (nextGstStatus === 'REGISTERED') {
        const candidate =
          rawInput.gstin !== undefined
            ? typeof rawInput.gstin === 'string'
              ? rawInput.gstin.trim().toUpperCase()
              : ''
            : ctx.gstin?.trim().toUpperCase() ?? '';
        if (!candidate) {
          fieldErrors.gstin = 'GSTIN is required for GST-registered stores.';
        } else if (!STORE_GSTIN_REGEX.test(candidate)) {
          fieldErrors.gstin = 'Enter a valid 15-character GSTIN (e.g. 06ABCDE1234F1Z5).';
        } else {
          nextGstin = candidate;
        }
      } else {
        // NOT_REGISTERED must store null GSTIN (enforces DB presence constraint)
        nextGstin = null;
      }

      let nextLegalName: string | null = ctx.legalBusinessName;
      if (rawInput.legalBusinessName !== undefined) {
        if (rawInput.legalBusinessName === null) {
          nextLegalName = null;
        } else if (typeof rawInput.legalBusinessName !== 'string') {
          fieldErrors.legalBusinessName = 'Invalid legal business name.';
        } else {
          const trimmedLegal = rawInput.legalBusinessName.trim();
          if (trimmedLegal !== '' && (trimmedLegal.length < 2 || trimmedLegal.length > 150)) {
            fieldErrors.legalBusinessName =
              'Legal business name must be between 2 and 150 characters.';
          } else {
            nextLegalName = trimmedLegal || null;
          }
        }
      }

      if (!fieldErrors.gstStatus && !fieldErrors.gstin && !fieldErrors.legalBusinessName) {
        businessDetailsData = {
          gstStatus: nextGstStatus,
          gstin: nextGstin,
          legalBusinessName: nextLegalName,
        };
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstMessage = Object.values(fieldErrors)[0];
    return {
      valid: false,
      error: firstMessage || 'Validation failed. Please review the highlighted fields.',
      fieldErrors,
    };
  }

  return {
    valid: true,
    value: {
      storeData,
      businessDetailsData,
      requestedCategoryId,
    },
  };
}
