import { UserRole } from '@/generated/prisma/enums';
import { sanitizeInternalRedirect } from '@/lib/auth/url';

/**
 * Internal request header stamped by proxy.ts on every matched request.
 * Overwritten unconditionally in proxy.ts so client-sent headers cannot spoof it.
 */
export const PROXIED_PATHNAME_HEADER = 'x-vyaparhub-pathname';

/**
 * Returns the authoritative home portal path for an active VyaparHub role.
 */
export function getRolePortalPath(role: UserRole): string {
  switch (role) {
    case UserRole.CUSTOMER:
      return '/';
    case UserRole.VENDOR:
      return '/vendor';
    case UserRole.ADMIN:
      return '/admin';
    default:
      return '/login';
  }
}

/**
 * Checks whether a pathname is the public/guest vendor registration route.
 */
export function isVendorRegistrationPath(pathname: string): boolean {
  return pathname === '/vendor/register' || pathname.startsWith('/vendor/register/');
}

/**
 * Checks whether a pathname belongs to the protected Vendor Portal (excluding /vendor/register).
 */
export function isVendorPortalPath(pathname: string): boolean {
  if (isVendorRegistrationPath(pathname)) {
    return false;
  }
  return pathname === '/vendor' || pathname.startsWith('/vendor/');
}

/**
 * Checks whether a pathname belongs to the protected Admin Console.
 */
export function isAdminPortalPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * Checks whether a pathname is a protected customer account/order/checkout route.
 * Public marketplace browsing routes (/, /stores, /products, /cart) remain public.
 */
export function isCustomerProtectedPath(pathname: string): boolean {
  return (
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/orders' ||
    pathname.startsWith('/orders/') ||
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/')
  );
}

/**
 * Checks whether a pathname is the unified login route.
 */
export function isLoginPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/');
}

/**
 * Checks whether a pathname is a customer or vendor registration route.
 */
export function isRegistrationPath(pathname: string): boolean {
  return (
    pathname === '/register' ||
    pathname.startsWith('/register/') ||
    isVendorRegistrationPath(pathname)
  );
}

/**
 * Checks whether a pathname is a guest-only authentication route
 * (/login, /register, /vendor/register) where already-authenticated active
 * users should be redirected to their authoritative portal.
 */
export function isGuestOnlyAuthPath(pathname: string): boolean {
  return isLoginPath(pathname) || isRegistrationPath(pathname);
}

/**
 * Returns the single authoritative UserRole required for a protected route,
 * or null if the route is not role-protected.
 */
export function getRequiredRoleForProtectedPath(
  pathname: string
): UserRole | null {
  if (isVendorPortalPath(pathname)) {
    return UserRole.VENDOR;
  }
  if (isAdminPortalPath(pathname)) {
    return UserRole.ADMIN;
  }
  if (isCustomerProtectedPath(pathname)) {
    return UserRole.CUSTOMER;
  }
  return null;
}

/**
 * Checks whether a pathname requires an authenticated session.
 */
export function isProtectedRoutePath(pathname: string): boolean {
  return getRequiredRoleForProtectedPath(pathname) !== null;
}

/**
 * Determines whether a sanitized internal path is permitted as a post-login destination
 * for the given authoritative PostgreSQL role.
 */
export function isPathAllowedForRole(path: string, role: UserRole): boolean {
  let pathname = path;
  try {
    pathname = new URL(path, 'http://localhost').pathname;
  } catch {
    return false;
  }

  // Never bounce a newly authenticated user back onto auth/recovery endpoints
  const authFlowPrefixes = [
    '/login',
    '/register',
    '/vendor/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/auth',
  ];
  if (
    authFlowPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return false;
  }

  const vendorPortal = isVendorPortalPath(pathname);
  const adminPortal = isAdminPortalPath(pathname);
  const customerProtected = isCustomerProtectedPath(pathname);

  switch (role) {
    case UserRole.CUSTOMER:
      return !vendorPortal && !adminPortal;
    case UserRole.VENDOR:
      return vendorPortal && !adminPortal && !customerProtected;
    case UserRole.ADMIN:
      return adminPortal && !vendorPortal && !customerProtected;
    default:
      return false;
  }
}

/**
 * Resolves a safe, role-appropriate post-login redirect target.
 * Honors an internal `next` destination only when sanitized and permitted for `role`;
 * otherwise falls back to the role's authoritative portal home.
 */
export function resolvePostLoginRedirect(
  role: UserRole,
  rawNext?: string | null
): string {
  const defaultDestination = getRolePortalPath(role);
  if (!rawNext) {
    return defaultDestination;
  }

  const sanitized = sanitizeInternalRedirect(rawNext, defaultDestination);
  if (sanitized === defaultDestination) {
    return defaultDestination;
  }

  return isPathAllowedForRole(sanitized, role) ? sanitized : defaultDestination;
}
