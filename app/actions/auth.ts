'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import {
  validateCustomerRegistration,
  RegisterCustomerInput,
  RegisterActionResult,
  validateVendorRegistration,
  RegisterVendorInput,
  RegisterVendorActionResult,
  validateLoginInput,
  LoginInput,
  LoginActionResult,
  validateForgotPasswordInput,
  ForgotPasswordInput,
  ForgotPasswordActionResult,
  validateResetPasswordInput,
  ResetPasswordInput,
  ResetPasswordActionResult,
} from '@/lib/auth/validation';
import {
  provisionCustomerAccount,
  provisionVendorAccount,
  DuplicateEmailError,
  DuplicatePhoneError,
  AccountRoleConflictError,
} from '@/lib/auth/provisioning';
import { getSiteUrl } from '@/lib/auth/url';
import { resolvePostLoginRedirect } from '@/lib/auth/routes';
import { UserRole, AccountStatus } from '@/generated/prisma/enums';

/**
 * Server action to register a new CUSTOMER.
 *
 * Enforces:
 * 1. Strict server-side validation & canonical formatting (+91XXXXXXXXXX, lowercase email).
 * 2. Pre-check in PostgreSQL for duplicate email or mobile number.
 * 3. Secure emailRedirectTo resolution from trusted application configuration (getSiteUrl).
 * 4. Supabase Auth signup with email verification redirect to /auth/callback.
 * 5. Hardcoded server assignment of role = CUSTOMER and accountStatus = ACTIVE.
 * 6. Idempotent transactional application provisioning in Prisma.
 * 7. Safe error reporting without leaking passwords, tokens, or raw database internals.
 */
export async function registerCustomerAction(
  input: RegisterCustomerInput
): Promise<RegisterActionResult> {
  // 0. Prevent account creation while already authenticated
  try {
    const existingClient = await createClient();
    const {
      data: { user: activeSessionUser },
    } = await existingClient.auth.getUser();
    if (activeSessionUser) {
      return {
        success: false,
        errors: {
          general:
            'You are already signed in. Please log out before registering a new account.',
        },
      };
    }
  } catch {
    // Proceed if no active session exists
  }

  // 1. Server-side validation
  const validation = validateCustomerRegistration(input);
  if (!validation.isValid || !validation.validatedData) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const { fullName, email, canonicalPhone, password } = validation.validatedData;

  // 2. Pre-check database for duplicate email or mobile number
  try {
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      return {
        success: false,
        errors: {
          email: 'An account with this email address already exists.',
        },
      };
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: canonicalPhone },
      select: { id: true },
    });
    if (existingPhone) {
      return {
        success: false,
        errors: {
          phone: 'An account with this mobile number already exists.',
        },
      };
    }
  } catch (dbErr) {
    console.error('Database pre-check error during registration:', dbErr);
    return {
      success: false,
      errors: {
        general: 'Unable to process registration at this time. Please try again.',
      },
    };
  }

  // 3. Resolve trusted email redirect URL (avoids Host Header Poisoning)
  const siteUrl = getSiteUrl();
  const emailRedirectTo = `${siteUrl}/auth/callback`;

  // 4. Supabase Auth signup
  let authUserId: string;
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
          phone: canonicalPhone,
        },
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (
        msg.includes('already registered') ||
        msg.includes('user already exists') ||
        msg.includes('unique constraint')
      ) {
        return {
          success: false,
          errors: {
            email: 'An account with this email address already exists.',
          },
        };
      }
      if (msg.includes('rate limit') || authError.status === 429) {
        return {
          success: false,
          errors: {
            general: 'Too many registration attempts. Please wait a few moments and try again.',
          },
        };
      }
      return {
        success: false,
        errors: {
          general: 'Registration failed. Please check your details and try again.',
        },
      };
    }

    if (!authData.user) {
      return {
        success: false,
        errors: {
          general: 'Unable to initiate account registration. Please try again.',
        },
      };
    }

    // Supabase anti-enumeration: when email confirmation is active and user already exists,
    // identities array is returned empty.
    if (authData.user.identities && authData.user.identities.length === 0) {
      return {
        success: false,
        errors: {
          email: 'An account with this email address already exists.',
        },
      };
    }

    authUserId = authData.user.id;
  } catch (authErr) {
    console.error('Supabase signup error:', authErr);
    return {
      success: false,
      errors: {
        general: 'Authentication service is temporarily unavailable. Please try again.',
      },
    };
  }

  // 5. Application account provisioning (Prisma transaction)
  try {
    await provisionCustomerAccount({
      authUserId,
      email,
      phone: canonicalPhone,
      fullName,
    });
  } catch (provisionErr: unknown) {
    const errorName = provisionErr instanceof Error ? provisionErr.name : String(provisionErr);
    console.error('Prisma account provisioning failed for authUserId:', authUserId, errorName);

    if (provisionErr instanceof DuplicateEmailError) {
      return {
        success: false,
        errors: {
          email: 'An account with this email address already exists.',
        },
      };
    }
    if (provisionErr instanceof DuplicatePhoneError) {
      return {
        success: false,
        errors: {
          phone: 'An account with this mobile number already exists.',
        },
      };
    }
    if (provisionErr instanceof AccountRoleConflictError) {
      return {
        success: false,
        errors: {
          general: 'An account with these credentials already exists with a different role.',
        },
      };
    }

    // If application provisioning fails after Supabase Auth signup:
    // We do NOT pretend registration succeeded and do NOT grant portal access.
    // Auth cleanup requires service-role credentials (which are strictly forbidden).
    // The account remains in Supabase Auth and can be recovered idempotently upon email confirmation/login.
    return {
      success: false,
      errors: {
        general:
          'Your account credentials were created, but application profile setup could not be completed. Please try signing in or contact support.',
      },
    };
  }

  // 6. Registration succeeded
  return {
    success: true,
    email,
  };
}

/**
 * Server action to register a new VENDOR.
 *
 * Enforces:
 * 1. Strict server-side validation & canonical formatting (+91XXXXXXXXXX, lowercase email).
 * 2. Pre-check in PostgreSQL for duplicate business email or registered mobile number.
 * 3. Secure emailRedirectTo resolution with ?next=/vendor.
 * 4. Supabase Auth signup with email verification; metadata holds only owner_name and phone.
 * 5. Hardcoded server assignment of role = VENDOR and accountStatus = ACTIVE.
 * 6. Idempotent transactional application provisioning in Prisma (vendor_profiles with verificationStatus = PENDING).
 * 7. Never creates store or collects GSTIN at registration.
 * 8. Safe error reporting without leaking passwords, tokens, or raw database internals.
 */
export async function registerVendorAction(
  input: RegisterVendorInput
): Promise<RegisterVendorActionResult> {
  // 0. Prevent account creation while already authenticated
  try {
    const existingClient = await createClient();
    const {
      data: { user: activeSessionUser },
    } = await existingClient.auth.getUser();
    if (activeSessionUser) {
      return {
        success: false,
        errors: {
          general:
            'You are already signed in. Please log out before registering a new account.',
        },
      };
    }
  } catch {
    // Proceed if no active session exists
  }

  // 1. Server-side validation
  const validation = validateVendorRegistration(input);
  if (!validation.isValid || !validation.validatedData) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const { ownerName, businessEmail, canonicalMobile, password } = validation.validatedData;

  // 2. Pre-check database for duplicate business email or mobile number
  try {
    const existingEmail = await prisma.user.findUnique({
      where: { email: businessEmail },
      select: { id: true },
    });
    if (existingEmail) {
      return {
        success: false,
        errors: {
          businessEmail: 'An account with this business email already exists.',
        },
      };
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: canonicalMobile },
      select: { id: true },
    });
    if (existingPhone) {
      return {
        success: false,
        errors: {
          registeredMobile: 'An account with this mobile number already exists.',
        },
      };
    }
  } catch (dbErr) {
    console.error('Database pre-check error during vendor registration:', dbErr);
    return {
      success: false,
      errors: {
        general: 'Unable to process registration at this time. Please try again.',
      },
    };
  }

  // 3. Resolve trusted email redirect URL (avoids Host Header Poisoning)
  const siteUrl = getSiteUrl();
  const emailRedirectTo = `${siteUrl}/auth/callback?next=/vendor`;

  // 4. Supabase Auth signup
  let authUserId: string;
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: businessEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          owner_name: ownerName,
          phone: canonicalMobile,
        },
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (
        msg.includes('already registered') ||
        msg.includes('user already exists') ||
        msg.includes('unique constraint')
      ) {
        return {
          success: false,
          errors: {
            businessEmail: 'An account with this business email already exists.',
          },
        };
      }
      if (msg.includes('rate limit') || authError.status === 429) {
        return {
          success: false,
          errors: {
            general: 'Too many registration attempts. Please wait a few moments and try again.',
          },
        };
      }
      return {
        success: false,
        errors: {
          general: 'Registration failed. Please check your details and try again.',
        },
      };
    }

    if (!authData.user) {
      return {
        success: false,
        errors: {
          general: 'Unable to initiate account registration. Please try again.',
        },
      };
    }

    // Supabase anti-enumeration check
    if (authData.user.identities && authData.user.identities.length === 0) {
      return {
        success: false,
        errors: {
          businessEmail: 'An account with this business email already exists.',
        },
      };
    }

    authUserId = authData.user.id;
  } catch (authErr) {
    console.error('Supabase signup error during vendor registration:', authErr);
    return {
      success: false,
      errors: {
        general: 'Authentication service is temporarily unavailable. Please try again.',
      },
    };
  }

  // 5. Application account provisioning (Prisma transaction)
  try {
    await provisionVendorAccount({
      authUserId,
      businessEmail,
      registeredMobile: canonicalMobile,
      ownerName,
    });
  } catch (provisionErr: unknown) {
    const errorName = provisionErr instanceof Error ? provisionErr.name : String(provisionErr);
    console.error('Prisma vendor provisioning failed for authUserId:', authUserId, errorName);

    if (provisionErr instanceof DuplicateEmailError) {
      return {
        success: false,
        errors: {
          businessEmail: 'An account with this business email already exists.',
        },
      };
    }
    if (provisionErr instanceof DuplicatePhoneError) {
      return {
        success: false,
        errors: {
          registeredMobile: 'An account with this mobile number already exists.',
        },
      };
    }
    if (provisionErr instanceof AccountRoleConflictError) {
      return {
        success: false,
        errors: {
          general: 'An account with these credentials already exists with a different role.',
        },
      };
    }

    return {
      success: false,
      errors: {
        general:
          'Your account credentials were created, but vendor profile setup could not be completed. Please try signing in or contact support.',
      },
    };
  }

  // 6. Registration succeeded
  return {
    success: true,
    email: businessEmail,
  };
}

/**
 * Server action for common login (CUSTOMER, VENDOR, ADMIN).
 *
 * Enforces:
 * 1. Strict server-side validation of credentials.
 * 2. Supabase Auth authentication via signInWithPassword.
 * 3. Authoritative role & status verification via PostgreSQL `users` table.
 * 4. Sign-out & access denial if account is SUSPENDED, inactive, or unprovisioned.
 * 5. Strict role-based redirects:
 *    - CUSTOMER -> '/'
 *    - VENDOR -> '/vendor'
 *    - ADMIN -> '/admin'
 * 6. Never logs passwords or exposes raw internals/secrets.
 */
export async function loginAction(input: LoginInput): Promise<LoginActionResult> {
  // 1. Validate inputs
  const validation = validateLoginInput(input);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const { normalizedEmail: email } = validation;
  const password = input.password;

  // 2. Authenticate with Supabase Auth
  let authUserId: string;
  const supabase = await createClient();

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        return {
          success: false,
          errors: {
            general:
              'Please verify your email address before signing in. Check your inbox for the confirmation link.',
          },
        };
      }
      if (msg.includes('invalid login credentials')) {
        return {
          success: false,
          errors: {
            general: 'Invalid email or password. Please try again.',
          },
        };
      }
      if (authError.status === 429 || msg.includes('rate limit')) {
        return {
          success: false,
          errors: {
            general: 'Too many login attempts. Please wait a few moments and try again.',
          },
        };
      }
      return {
        success: false,
        errors: {
          general: 'Unable to sign in. Please check your credentials and try again.',
        },
      };
    }

    if (!authData.user) {
      return {
        success: false,
        errors: {
          general: 'Sign in failed. Please try again.',
        },
      };
    }

    authUserId = authData.user.id;
  } catch (err) {
    console.error('Supabase signInWithPassword unexpected failure:', err);
    return {
      success: false,
      errors: {
        general: 'Authentication service is temporarily unavailable. Please try again.',
      },
    };
  }

  // 3. Authoritative PostgreSQL Application User Lookup
  let appUser;
  try {
    appUser = await prisma.user.findUnique({
      where: { authUserId },
      select: {
        id: true,
        role: true,
        accountStatus: true,
      },
    });
  } catch (dbErr) {
    console.error('PostgreSQL user lookup failed during login for authUserId:', authUserId, dbErr);
    await supabase.auth.signOut();
    return {
      success: false,
      errors: {
        general: 'Unable to complete sign in. Please try again later.',
      },
    };
  }

  // 4. Verify Application Record Existence
  if (!appUser) {
    await supabase.auth.signOut();
    return {
      success: false,
      errors: {
        general:
          'Your account credentials are valid, but application profile setup is incomplete. Please contact support.',
      },
    };
  }

  // 5. Account Status Enforcement
  if (appUser.accountStatus === AccountStatus.SUSPENDED) {
    await supabase.auth.signOut();
    return {
      success: false,
      errors: {
        general: 'Your account has been suspended. Please contact customer support.',
      },
    };
  }

  if (appUser.accountStatus !== AccountStatus.ACTIVE) {
    await supabase.auth.signOut();
    return {
      success: false,
      errors: {
        general: 'Your account is not active. Please contact customer support.',
      },
    };
  }

  // 6. Role Authorization & Redirect Resolution
  if (
    appUser.role !== UserRole.CUSTOMER &&
    appUser.role !== UserRole.VENDOR &&
    appUser.role !== UserRole.ADMIN
  ) {
    await supabase.auth.signOut();
    return {
      success: false,
      errors: {
        general: 'Invalid account configuration. Please contact customer support.',
      },
    };
  }

  const redirectTo = resolvePostLoginRedirect(appUser.role, input.next);
  revalidatePath('/', 'layout');

  return {
    success: true,
    redirectTo,
  };
}

/**
 * Server action to log out the currently authenticated user.
 *
 * Enforces:
 * 1. Server-side session revocation via Supabase Auth signOut().
 * 2. Supabase SSR cookie clearance handled through setAll() in createClient.
 * 3. Router cache revalidation to prevent stale customer session state.
 * 4. Safe error handling without leaking tokens, cookies, or internal details.
 * 5. Safe redirection to /login.
 */
export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase signOut error:', error.message);
    }
  } catch (err) {
    console.error('Unexpected error during logoutAction:', err);
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Server action to request a password reset email.
 *
 * Privacy & Anti-Enumeration:
 * 1. Validates syntactic email format.
 * 2. Never queries PostgreSQL or inspects Supabase responses to reveal account existence.
 * 3. Returns the identical generic success confirmation for all valid email inputs.
 * 4. Safe error handling: never exposes tokens, cookies, or internal errors.
 */
export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ForgotPasswordActionResult> {
  // 1. Syntactic validation
  const validation = validateForgotPasswordInput(input);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const { normalizedEmail } = validation;
  const siteUrl = getSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      // Handle rate limits gracefully
      if (error.status === 429 || msg.includes('rate limit')) {
        return {
          success: false,
          errors: {
            general: 'Too many reset attempts. Please wait a few moments and try again.',
          },
        };
      }
      // Anti-enumeration: log server-side for diagnostics, but do not leak error to client
      console.warn('Supabase resetPasswordForEmail notice:', error.message);
    }
  } catch (err) {
    // Anti-enumeration: log server-side, but do not leak to client
    console.error('Unexpected error during forgotPasswordAction:', err);
  }

  // Generic anti-enumeration response for all valid email requests
  return {
    success: true,
    message: "If an account exists for this email, we've sent password reset instructions.",
  };
}

/**
 * Server action to update user password using an active recovery session.
 *
 * Security guarantees:
 * 1. Validates password constraints (8-128 chars, confirm match).
 * 2. Identity is verified exclusively via the authenticated Supabase recovery session (getUser()).
 *    Never trusts client-supplied user ID, email, or token parameters.
 * 3. Does not alter PostgreSQL records, roles, or account status.
 * 4. Revokes the recovery session via signOut() after password update, preventing replay
 *    and requiring normal re-authentication with the new password.
 * 5. Safe error handling: expired/invalid sessions fail gracefully with clear recovery instructions.
 */
export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ResetPasswordActionResult> {
  // 1. Validate inputs
  const validation = validateResetPasswordInput(input);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  try {
    const supabase = await createClient();

    // 2. Verify active recovery/auth session exists
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        errors: {
          general:
            'Your password reset session is invalid or has expired. Please request a new reset link.',
        },
      };
    }

    // 3. Update Supabase Auth password credential
    const { error: updateError } = await supabase.auth.updateUser({
      password: input.password,
    });

    if (updateError) {
      const msg = updateError.message.toLowerCase();
      if (updateError.status === 429 || msg.includes('rate limit')) {
        return {
          success: false,
          errors: {
            general: 'Too many attempts. Please wait a few moments and try again.',
          },
        };
      }
      if (msg.includes('same password') || msg.includes('should be different')) {
        return {
          success: false,
          errors: {
            password: 'New password must be different from your previous password.',
          },
        };
      }
      if (msg.includes('expired') || msg.includes('session')) {
        return {
          success: false,
          errors: {
            general:
              'Your password reset link has expired. Please request a new reset link.',
          },
        };
      }

      console.error('Supabase updateUser password failure:', updateError.message);
      return {
        success: false,
        errors: {
          general: 'Unable to update password. Please try again or request a new reset link.',
        },
      };
    }

    // 4. Invalidate/sign out recovery session to enforce clean normal login
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn('Sign-out after password reset had a minor issue:', signOutErr);
    }

    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Password changed successfully. You can now sign in with your new password.',
    };
  } catch (err) {
    console.error('Unexpected error during resetPasswordAction:', err);
    return {
      success: false,
      errors: {
        general: 'An unexpected error occurred. Please try again or request a new reset link.',
      },
    };
  }
}

