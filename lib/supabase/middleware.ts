import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AccountStatus, UserRole } from '@/generated/prisma/enums';
import {
  getRequiredRoleForProtectedPath,
  getRolePortalPath,
  isGuestOnlyAuthPath,
  isLoginPath,
  isProtectedRoutePath,
  PROXIED_PATHNAME_HEADER,
  resolvePostLoginRedirect,
} from '@/lib/auth/routes';
import { sanitizeInternalRedirect } from '@/lib/auth/url';

const VALID_ROLES = new Set<UserRole>([
  UserRole.CUSTOMER,
  UserRole.VENDOR,
  UserRole.ADMIN,
]);

function buildRedirectWithCookies(
  targetUrl: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(targetUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isNavigationOrPrefetch =
    request.method === 'GET' || request.method === 'HEAD';

  // Stamp verified request pathname on upstream request headers (unconditionally
  // overwriting any client-supplied value to prevent header spoofing).
  const initialHeaders = new Headers(request.headers);
  initialHeaders.set(PROXIED_PATHNAME_HEADER, pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: initialHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (isNavigationOrPrefetch && isProtectedRoutePath(pathname)) {
      return NextResponse.redirect(
        new URL('/login?error=missing_config', request.url)
      );
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        const updatedHeaders = new Headers(request.headers);
        updatedHeaders.set(PROXIED_PATHNAME_HEADER, pathname);

        supabaseResponse = NextResponse.next({
          request: {
            headers: updatedHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session tokens and verify Supabase identity.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow POST/Server Action invocations to execute their own server-side auth & responses
  // after session cookies have been refreshed.
  if (!isNavigationOrPrefetch) {
    return supabaseResponse;
  }

  const requiredRole = getRequiredRoleForProtectedPath(pathname);
  const guestOnlyAuth = isGuestOnlyAuthPath(pathname);

  if (!user) {
    if (requiredRole !== null) {
      const rawIntended = `${pathname}${request.nextUrl.search}`;
      const safeNext = sanitizeInternalRedirect(rawIntended, '/');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', safeNext);

      return buildRedirectWithCookies(loginUrl, supabaseResponse);
    }

    return supabaseResponse;
  }

  // Public marketplace & password recovery routes (/ , /stores, /products, /cart,
  // /forgot-password, /reset-password, /verify-email, /auth/*) require no role redirect.
  if (requiredRole === null && !guestOnlyAuth) {
    return supabaseResponse;
  }

  // Authoritative PostgreSQL role & account_status enforcement in Node.js Proxy
  // (executes before app-render and Instant Navigation dev-validation-worker so
  // unauthorized visits and <Link> prefetches redirect cleanly without throwing
  // NEXT_REDIRECT inside layout Suspense boundaries; Supabase user_metadata is never trusted).
  let appUser: {
    id: string;
    role: UserRole;
    accountStatus: AccountStatus;
  } | null = null;

  try {
    const { prisma } = await import('@/lib/prisma');
    appUser = await prisma.user.findUnique({
      where: { authUserId: user.id },
      select: {
        id: true,
        role: true,
        accountStatus: true,
      },
    });
  } catch (err) {
    console.error('Failed to resolve authoritative PostgreSQL user in proxy:', err);
    if (isLoginPath(pathname)) {
      return supabaseResponse;
    }
    return buildRedirectWithCookies(
      new URL('/login?error=session_error', request.url),
      supabaseResponse
    );
  }

  if (!appUser) {
    await supabase.auth.signOut();
    if (isLoginPath(pathname)) {
      return supabaseResponse;
    }
    return buildRedirectWithCookies(
      new URL('/login?error=account_setup_required', request.url),
      supabaseResponse
    );
  }

  if (appUser.accountStatus === AccountStatus.SUSPENDED) {
    await supabase.auth.signOut();
    if (isLoginPath(pathname)) {
      return supabaseResponse;
    }
    return buildRedirectWithCookies(
      new URL('/login?error=account_suspended', request.url),
      supabaseResponse
    );
  }

  if (
    appUser.accountStatus !== AccountStatus.ACTIVE ||
    !VALID_ROLES.has(appUser.role)
  ) {
    await supabase.auth.signOut();
    if (isLoginPath(pathname)) {
      return supabaseResponse;
    }
    return buildRedirectWithCookies(
      new URL('/login?error=account_inactive', request.url),
      supabaseResponse
    );
  }

  if (isLoginPath(pathname)) {
    const targetPath = resolvePostLoginRedirect(
      appUser.role,
      request.nextUrl.searchParams.get('next')
    );
    return buildRedirectWithCookies(
      new URL(targetPath, request.url),
      supabaseResponse
    );
  }

  if (guestOnlyAuth) {
    return buildRedirectWithCookies(
      new URL(getRolePortalPath(appUser.role), request.url),
      supabaseResponse
    );
  }

  if (requiredRole !== null && appUser.role !== requiredRole) {
    return buildRedirectWithCookies(
      new URL(getRolePortalPath(appUser.role), request.url),
      supabaseResponse
    );
  }

  return supabaseResponse;
}
