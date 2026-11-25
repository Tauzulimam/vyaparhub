import { prisma } from '@/lib/prisma';
import { UserRole, AccountStatus, VerificationStatus } from '@/generated/prisma/enums';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { normalizeIndianPhone, normalizeEmail } from '@/lib/auth/validation';

export class DuplicateEmailError extends Error {
  constructor(message = 'An account with this email address already exists.') {
    super(message);
    this.name = 'DuplicateEmailError';
  }
}

export class DuplicatePhoneError extends Error {
  constructor(message = 'An account with this mobile number already exists.') {
    super(message);
    this.name = 'DuplicatePhoneError';
  }
}

export class AccountRoleConflictError extends Error {
  constructor(message = 'An account with this identity already exists with a different role.') {
    super(message);
    this.name = 'AccountRoleConflictError';
  }
}

export interface CustomerProvisioningInput {
  authUserId: string;
  email: string;
  phone: string;
  fullName: string;
}

export interface VendorProvisioningInput {
  authUserId: string;
  businessEmail: string;
  registeredMobile: string;
  ownerName: string;
}

/**
 * Idempotently provisions a VyaparHub User (CUSTOMER role) and CustomerProfile.
 * Executes atomically in a Prisma transaction.
 *
 * Safe for retries, partial-recovery, and concurrent requests:
 * 1. Primary lookup is always by `authUserId`.
 * 2. If User exists but CustomerProfile is missing, it creates the CustomerProfile.
 * 3. If User already exists with CustomerProfile, it returns the existing record idempotently.
 * 4. Checks for conflicts on unique email/phone against other users.
 * 5. Translates Prisma P2002 unique constraint violations into specific domain errors.
 */
export async function provisionCustomerAccount({
  authUserId,
  email,
  phone,
  fullName,
}: CustomerProvisioningInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Primary lookup by authUserId (Supabase Auth identity)
      const existingUserByAuth = await tx.user.findUnique({
        where: { authUserId },
        include: { customerProfile: true },
      });

      if (existingUserByAuth) {
        // Audit protection: NEVER convert VENDOR or ADMIN app accounts to CUSTOMER
        if (existingUserByAuth.role !== UserRole.CUSTOMER) {
          throw new AccountRoleConflictError(
            `Account with this identity already exists with role ${existingUserByAuth.role}. Role conversion is not permitted.`
          );
        }

        // Handle partial provisioning: user exists, but customer profile was not created
        if (!existingUserByAuth.customerProfile) {
          const profile = await tx.customerProfile.create({
            data: {
              userId: existingUserByAuth.id,
              fullName,
            },
          });
          return { user: existingUserByAuth, customerProfile: profile };
        }

        // Already completely provisioned
        return {
          user: existingUserByAuth,
          customerProfile: existingUserByAuth.customerProfile,
        };
      }

      // 2. Conflict check: prevent conflicting email or phone belonging to a different authUserId
      const conflictingUser = await tx.user.findFirst({
        where: {
          OR: [{ email }, { phone }],
        },
      });

      if (conflictingUser) {
        if (conflictingUser.email === email) {
          throw new DuplicateEmailError();
        }
        if (conflictingUser.phone === phone) {
          throw new DuplicatePhoneError();
        }
      }

      // 3. Atomically create User and CustomerProfile
      const user = await tx.user.create({
        data: {
          authUserId,
          email,
          phone,
          role: UserRole.CUSTOMER,
          accountStatus: AccountStatus.ACTIVE,
          customerProfile: {
            create: {
              fullName,
            },
          },
        },
        include: {
          customerProfile: true,
        },
      });

      return {
        user,
        customerProfile: user.customerProfile!,
      };
    });
  } catch (error: unknown) {
    // Translate Prisma unique constraint violations (P2002)
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const prismaError = error as { code: string; meta?: { target?: string[] }; message?: string };
      if (prismaError.code === 'P2002') {
        const target = prismaError.meta?.target || [];
        const errorMsg = String(prismaError.message || '');

        if (target.includes('email') || errorMsg.includes('users_email_key')) {
          throw new DuplicateEmailError();
        }
        if (target.includes('phone') || errorMsg.includes('users_phone_key')) {
          throw new DuplicatePhoneError();
        }
        if (target.includes('authUserId') || errorMsg.includes('users_authUserId_key')) {
          // Concurrently provisioned: retrieve existing records idempotently
          const existing = await prisma.user.findUnique({
            where: { authUserId },
            include: { customerProfile: true },
          });
          if (existing && existing.customerProfile) {
            return { user: existing, customerProfile: existing.customerProfile };
          }
        }
      }
    }

    throw error;
  }
}

/**
 * Idempotently provisions a VyaparHub User (VENDOR role) and VendorProfile.
 * Executes atomically in a Prisma transaction.
 *
 * Safe for retries, partial-recovery, and concurrent requests:
 * 1. Primary lookup is always by `authUserId`.
 * 2. If User exists with VENDOR role but VendorProfile is missing, it creates the VendorProfile.
 * 3. Never converts an existing CUSTOMER or ADMIN account into VENDOR.
 * 4. Checks for conflicts on unique email/phone against other users.
 * 5. Translates Prisma P2002 unique constraint violations into specific domain errors.
 * 6. Sets verificationStatus = PENDING. Does NOT create stores or collect GSTIN.
 */
export async function provisionVendorAccount({
  authUserId,
  businessEmail,
  registeredMobile,
  ownerName,
}: VendorProvisioningInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Primary lookup by authUserId (Supabase Auth identity)
      const existingUserByAuth = await tx.user.findUnique({
        where: { authUserId },
        include: { vendorProfile: true, customerProfile: true },
      });

      if (existingUserByAuth) {
        // Audit protection: NEVER convert CUSTOMER or ADMIN app accounts to VENDOR
        if (existingUserByAuth.role !== UserRole.VENDOR) {
          throw new AccountRoleConflictError(
            `Account with this identity already exists with role ${existingUserByAuth.role}. Role conversion is not permitted.`
          );
        }

        // Handle partial provisioning: user exists with VENDOR role, but vendor profile was not created
        if (!existingUserByAuth.vendorProfile) {
          const profile = await tx.vendorProfile.create({
            data: {
              userId: existingUserByAuth.id,
              ownerName,
              registeredMobile,
              businessEmail,
              verificationStatus: VerificationStatus.PENDING,
            },
          });
          return { user: existingUserByAuth, vendorProfile: profile };
        }

        // Already completely provisioned
        return {
          user: existingUserByAuth,
          vendorProfile: existingUserByAuth.vendorProfile,
        };
      }

      // 2. Conflict check: prevent conflicting email or phone belonging to a different authUserId
      const conflictingUser = await tx.user.findFirst({
        where: {
          OR: [{ email: businessEmail }, { phone: registeredMobile }],
        },
      });

      if (conflictingUser) {
        if (conflictingUser.email === businessEmail) {
          throw new DuplicateEmailError('An account with this business email already exists.');
        }
        if (conflictingUser.phone === registeredMobile) {
          throw new DuplicatePhoneError('An account with this mobile number already exists.');
        }
      }

      // 3. Atomically create User and VendorProfile
      const user = await tx.user.create({
        data: {
          authUserId,
          email: businessEmail,
          phone: registeredMobile,
          role: UserRole.VENDOR,
          accountStatus: AccountStatus.ACTIVE,
          vendorProfile: {
            create: {
              ownerName,
              registeredMobile,
              businessEmail,
              verificationStatus: VerificationStatus.PENDING,
            },
          },
        },
        include: {
          vendorProfile: true,
        },
      });

      return {
        user,
        vendorProfile: user.vendorProfile!,
      };
    });
  } catch (error: unknown) {
    if (
      error instanceof DuplicateEmailError ||
      error instanceof DuplicatePhoneError ||
      error instanceof AccountRoleConflictError
    ) {
      throw error;
    }

    // Translate Prisma unique constraint violations (P2002)
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const prismaError = error as { code: string; meta?: { target?: string[] }; message?: string };
      if (prismaError.code === 'P2002') {
        const target = prismaError.meta?.target || [];
        const errorMsg = String(prismaError.message || '');

        if (target.includes('email') || errorMsg.includes('users_email_key')) {
          throw new DuplicateEmailError('An account with this business email already exists.');
        }
        if (target.includes('phone') || errorMsg.includes('users_phone_key')) {
          throw new DuplicatePhoneError('An account with this mobile number already exists.');
        }
        if (target.includes('authUserId') || errorMsg.includes('users_authUserId_key')) {
          // Concurrently provisioned: retrieve existing records idempotently
          const existing = await prisma.user.findUnique({
            where: { authUserId },
            include: { vendorProfile: true },
          });
          if (existing && existing.vendorProfile) {
            return { user: existing, vendorProfile: existing.vendorProfile };
          }
        }
      }
    }

    throw error;
  }
}

/**
 * Shared helper for auth callback: ensures the authenticated Supabase user
 * has an active application record (CUSTOMER or VENDOR) in PostgreSQL.
 *
 * Security & Integrity guarantees:
 * 1. If user already exists in PostgreSQL:
 *    - Role is strictly respected; never converts roles.
 *    - If CUSTOMER and customerProfile is missing, completes customer profile.
 *    - If VENDOR and vendorProfile is missing, completes vendor profile.
 * 2. If user does NOT exist in PostgreSQL (e.g. initial Prisma provisioning failed):
 *    - Extracts metadata: detects VENDOR by `owner_name` or CUSTOMER by `full_name`.
 *    - Never trusts role from metadata; server strictly assigns role based on validated schema fields.
 *    - Re-validates email and canonical phone (+91XXXXXXXXXX).
 *    - If required data is missing/invalid or conflict occurs, returns null safely.
 */
export async function ensureAccountProvisioned(supabaseUser: SupabaseUser) {
  const authUserId = supabaseUser.id;
  const email = normalizeEmail(supabaseUser.email || '');

  // 1. Verify if user already exists in PostgreSQL
  const existingUser = await prisma.user.findUnique({
    where: { authUserId },
    include: { customerProfile: true, vendorProfile: true },
  });

  if (existingUser) {
    if (existingUser.role === UserRole.CUSTOMER) {
      if (!existingUser.customerProfile) {
        const rawName =
          typeof supabaseUser.user_metadata?.full_name === 'string'
            ? supabaseUser.user_metadata.full_name.trim()
            : '';
        const fullName =
          rawName.length >= 2 && rawName.length <= 100 && !/[\u0000-\u001F\u007F]/.test(rawName)
            ? rawName
            : 'Customer';

        const customerProfile = await prisma.customerProfile.create({
          data: {
            userId: existingUser.id,
            fullName,
          },
        });
        return { user: existingUser, customerProfile, vendorProfile: null };
      }
      return { user: existingUser, customerProfile: existingUser.customerProfile, vendorProfile: null };
    }

    if (existingUser.role === UserRole.VENDOR) {
      if (!existingUser.vendorProfile) {
        const rawOwner =
          typeof supabaseUser.user_metadata?.owner_name === 'string'
            ? supabaseUser.user_metadata.owner_name.trim()
            : '';
        const ownerName =
          rawOwner.length >= 2 && rawOwner.length <= 100 && !/[\u0000-\u001F\u007F]/.test(rawOwner)
            ? rawOwner
            : 'Merchant';

        const rawPhone =
          typeof supabaseUser.user_metadata?.phone === 'string'
            ? supabaseUser.user_metadata.phone
            : existingUser.phone;
        const phoneValidation = normalizeIndianPhone(rawPhone);
        const registeredMobile = phoneValidation.canonicalPhone || existingUser.phone;

        const vendorProfile = await prisma.vendorProfile.create({
          data: {
            userId: existingUser.id,
            ownerName,
            registeredMobile,
            businessEmail: existingUser.email,
            verificationStatus: VerificationStatus.PENDING,
          },
        });
        return { user: existingUser, customerProfile: null, vendorProfile };
      }
      return { user: existingUser, customerProfile: null, vendorProfile: existingUser.vendorProfile };
    }

    return {
      user: existingUser,
      customerProfile: existingUser.customerProfile,
      vendorProfile: existingUser.vendorProfile,
    };
  }

  // 2. Recovery provisioning for missing application records
  if (!email || email.length > 255) {
    console.warn(`[Auth Recovery] Invalid or missing email for auth user ${authUserId}. Cannot safely recover.`);
    return null;
  }

  const rawPhone =
    typeof supabaseUser.user_metadata?.phone === 'string' ? supabaseUser.user_metadata.phone : '';
  const phoneValidation = normalizeIndianPhone(rawPhone);
  if (!phoneValidation.valid || !phoneValidation.canonicalPhone) {
    console.warn(
      `[Auth Recovery] Invalid or missing canonical phone in metadata for auth user ${authUserId}. Cannot safely recover.`
    );
    return null;
  }

  // 2a. Vendor recovery detection: presence of owner_name in metadata
  const rawOwnerName =
    typeof supabaseUser.user_metadata?.owner_name === 'string'
      ? supabaseUser.user_metadata.owner_name.trim()
      : '';
  if (
    rawOwnerName &&
    rawOwnerName.length >= 2 &&
    rawOwnerName.length <= 100 &&
    !/[\u0000-\u001F\u007F]/.test(rawOwnerName)
  ) {
    try {
      return await provisionVendorAccount({
        authUserId,
        businessEmail: email,
        registeredMobile: phoneValidation.canonicalPhone,
        ownerName: rawOwnerName,
      });
    } catch (err) {
      console.error(`[Auth Recovery] Failed to recover vendor account for auth user ${authUserId}:`, err);
      return null;
    }
  }

  // 2b. Customer recovery detection: presence of full_name in metadata
  const rawFullName =
    typeof supabaseUser.user_metadata?.full_name === 'string'
      ? supabaseUser.user_metadata.full_name.trim()
      : '';
  if (
    rawFullName &&
    rawFullName.length >= 2 &&
    rawFullName.length <= 100 &&
    !/[\u0000-\u001F\u007F]/.test(rawFullName)
  ) {
    try {
      return await provisionCustomerAccount({
        authUserId,
        email,
        phone: phoneValidation.canonicalPhone,
        fullName: rawFullName,
      });
    } catch (err) {
      console.error(`[Auth Recovery] Failed to recover customer account for auth user ${authUserId}:`, err);
      return null;
    }
  }

  console.warn(`[Auth Recovery] Unable to determine account type for recovery for auth user ${authUserId}.`);
  return null;
}

/**
 * Backward-compatible alias for ensureAccountProvisioned.
 */
export const ensureCustomerAccountProvisioned = ensureAccountProvisioned;

