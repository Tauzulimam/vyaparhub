import { cache } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AccountStatus, UserRole } from '@/generated/prisma/enums';

/**
 * Narrow, safe DTO representing the authoritative PostgreSQL application user.
 * Never exposes Supabase tokens, session secrets, or unverified user_metadata.
 */
export interface AuthoritativeAppUser {
  id: string;
  authUserId: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
}

export type CurrentUserResolution =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthoritativeAppUser }
  | { status: 'suspended'; user: AuthoritativeAppUser }
  | { status: 'inactive'; user: AuthoritativeAppUser }
  | { status: 'missing_app_user'; authUserId: string }
  | { status: 'error' };

const VALID_ROLES = new Set<UserRole>([
  UserRole.CUSTOMER,
  UserRole.VENDOR,
  UserRole.ADMIN,
]);

/**
 * Resolves the current authenticated user using:
 * 1. Supabase `auth.getUser()` to cryptographically verify session identity.
 * 2. PostgreSQL `users` lookup via Prisma keyed on `authUserId = user.id`.
 * 3. PostgreSQL `role` and `accountStatus` as the sole source of authorization truth.
 *
 * Memoized per React server render pass via `React.cache()`.
 */
export const resolveCurrentUser = cache(async (): Promise<CurrentUserResolution> => {
  // Explicitly defer execution to request time (RenderStage.Dynamic) under Next.js 16
  // Cache Components + Partial Prefetching so prerender/prefetch stages suspend cleanly
  // at the outer <Suspense> boundary before Supabase Auth or Prisma reads wall-clock time.
  await connection();

  let authUserId: string;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { status: 'unauthenticated' };
    }

    authUserId = user.id;
  } catch {
    return { status: 'unauthenticated' };
  }

  try {
    const { prisma } = await import('@/lib/prisma');
    const appUser = await prisma.user.findUnique({
      where: { authUserId },
      select: {
        id: true,
        authUserId: true,
        email: true,
        role: true,
        accountStatus: true,
      },
    });

    if (!appUser) {
      return { status: 'missing_app_user', authUserId };
    }

    if (appUser.accountStatus === AccountStatus.SUSPENDED) {
      return { status: 'suspended', user: appUser };
    }

    if (
      appUser.accountStatus !== AccountStatus.ACTIVE ||
      !VALID_ROLES.has(appUser.role)
    ) {
      return { status: 'inactive', user: appUser };
    }

    return {
      status: 'authenticated',
      user: appUser,
    };
  } catch (err) {
    console.error('Failed to resolve authoritative PostgreSQL user:', err);
    return { status: 'error' };
  }
});
