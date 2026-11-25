import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/generated/prisma/enums';
import {
  resolveCurrentUser,
  type AuthoritativeAppUser,
} from '@/lib/auth/current-user';
import {
  getRolePortalPath,
  isCustomerProtectedPath,
  isVendorPortalPath,
  isVendorRegistrationPath,
  PROXIED_PATHNAME_HEADER,
} from '@/lib/auth/routes';
import { sanitizeInternalRedirect } from '@/lib/auth/url';

/**
 * Revokes the current Supabase session server-side on best effort.
 * Inside Server Components, cookie mutations in `setAll` are caught safely while
 * Supabase Auth still revokes the session token on the auth server.
 */
async function bestEffortServerSignOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore RSC cookie write restriction; session revocation request still executes.
  }
}

/**
 * Enforces server-side authentication, ACTIVE account status, and role membership.
 *
 * - Logged-out -> redirects to `fallbackLoginPath` (defaults to `/login`)
 * - SUSPENDED -> revokes session & redirects to `/login?error=account_suspended`
 * - Inactive / invalid -> revokes session & redirects to `/login?error=account_inactive`
 * - Missing PostgreSQL user -> revokes session & redirects to `/login?error=account_setup_required`
 * - DB lookup error -> fails closed & redirects to `/login?error=session_error`
 * - Wrong role -> redirects to the user's authoritative portal (`/` | `/vendor` | `/admin`)
 */
export async function requirePortalAccess(
  allowedRoles: readonly UserRole[],
  fallbackLoginPath = '/login'
): Promise<AuthoritativeAppUser> {
  await connection();
  const resolution = await resolveCurrentUser();

  if (resolution.status === 'unauthenticated') {
    redirect(fallbackLoginPath);
  }

  if (resolution.status === 'suspended') {
    await bestEffortServerSignOut();
    redirect('/login?error=account_suspended');
  }

  if (resolution.status === 'inactive') {
    await bestEffortServerSignOut();
    redirect('/login?error=account_inactive');
  }

  if (resolution.status === 'missing_app_user') {
    await bestEffortServerSignOut();
    redirect('/login?error=account_setup_required');
  }

  if (resolution.status === 'error') {
    redirect('/login?error=session_error');
  }

  if (!allowedRoles.includes(resolution.user.role)) {
    redirect(getRolePortalPath(resolution.user.role));
  }

  return resolution.user;
}

/**
 * Enforces VENDOR portal access across `/vendor` and `/vendor/*` while permitting
 * `/vendor/register` to be handled by `RegistrationPageGuard`.
 * Fails closed (`requirePortalAccess`) if the pathname header is absent or non-registration.
 */
export async function guardVendorSubtree(): Promise<void> {
  await connection();
  const headerStore = await headers();
  const pathname = headerStore.get(PROXIED_PATHNAME_HEADER) ?? '';

  if (isVendorRegistrationPath(pathname)) {
    return;
  }

  const safeNext = isVendorPortalPath(pathname)
    ? sanitizeInternalRedirect(pathname, '/vendor')
    : '/vendor';

  await requirePortalAccess(
    [UserRole.VENDOR],
    `/login?next=${encodeURIComponent(safeNext)}`
  );
}

/**
 * Enforces CUSTOMER access across `/profile`, `/orders/*`, and `/checkout`,
 * preserving exact sub-route destinations (e.g. `/orders/[id]`) when available.
 */
export async function guardCustomerSubtree(
  fallbackLoginPath = '/login'
): Promise<void> {
  await connection();
  const headerStore = await headers();
  const pathname = headerStore.get(PROXIED_PATHNAME_HEADER) ?? '';

  const resolvedFallback = isCustomerProtectedPath(pathname)
    ? `/login?next=${encodeURIComponent(sanitizeInternalRedirect(pathname, '/'))}`
    : fallbackLoginPath;

  await requirePortalAccess([UserRole.CUSTOMER], resolvedFallback);
}

/**
 * Guard for `/login`:
 * - Redirects authenticated ACTIVE users to their authoritative portal (`/` | `/vendor` | `/admin`).
 * - For SUSPENDED, inactive, or missing-profile sessions, revokes the stale session and
 *   renders `/login` so error banners display cleanly without redirect loops.
 */
export async function redirectAuthenticatedFromLogin(): Promise<void> {
  await connection();
  const resolution = await resolveCurrentUser();

  if (resolution.status === 'authenticated') {
    redirect(getRolePortalPath(resolution.user.role));
  }

  if (
    resolution.status === 'suspended' ||
    resolution.status === 'inactive' ||
    resolution.status === 'missing_app_user'
  ) {
    await bestEffortServerSignOut();
  }
}

/**
 * Guard for `/register` and `/vendor/register`:
 * - Prevents already-authenticated users from creating another account.
 * - Redirects ACTIVE users to their authoritative portal (`/` | `/vendor` | `/admin`).
 * - Signs out and routes non-active/incomplete sessions safely to `/login`.
 */
export async function redirectAuthenticatedFromRegistration(): Promise<void> {
  await connection();
  const resolution = await resolveCurrentUser();

  if (resolution.status === 'authenticated') {
    redirect(getRolePortalPath(resolution.user.role));
  }

  if (resolution.status === 'suspended') {
    await bestEffortServerSignOut();
    redirect('/login?error=account_suspended');
  }

  if (resolution.status === 'inactive') {
    await bestEffortServerSignOut();
    redirect('/login?error=account_inactive');
  }

  if (resolution.status === 'missing_app_user') {
    await bestEffortServerSignOut();
    redirect('/login?error=account_setup_required');
  }

  if (resolution.status === 'error') {
    redirect('/login?error=session_error');
  }
}
