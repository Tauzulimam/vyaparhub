import { connection } from 'next/server';
import { AccountStatus, UserRole } from '@/generated/prisma/enums';
import { queryAdminCatalogSnapshot } from '@/lib/admin/catalog/persistence';
import type { AdminCatalogSnapshotDto } from '@/lib/admin/catalog/types';
import { resolveCurrentUser } from '@/lib/auth/current-user';
import { requirePortalAccess } from '@/lib/auth/guards';

/**
 * Non-redirecting admin session validator for Server Actions.
 * Strictly requires `UserRole.ADMIN` and `AccountStatus.ACTIVE`.
 */
export async function resolveAuthenticatedAdminForAction(): Promise<
  | { ok: true; adminUserId: string }
  | { ok: false; error: string }
> {
  await connection();
  const resolution = await resolveCurrentUser();

  if (resolution.status !== 'authenticated') {
    return {
      ok: false,
      error: 'Please sign in with an active administrator account.',
    };
  }

  if (
    resolution.user.role !== UserRole.ADMIN ||
    resolution.user.accountStatus !== AccountStatus.ACTIVE
  ) {
    return {
      ok: false,
      error: 'Only active platform administrators can modify the Master Product Catalog.',
    };
  }

  return {
    ok: true,
    adminUserId: resolution.user.id,
  };
}

/**
 * Protected Server Component loader for `/admin/catalog`.
 * Enforces `UserRole.ADMIN` portal access and loads real PostgreSQL `Category`,
 * `MasterProduct`, and vendor `StoreProduct` adoption counts.
 */
export async function getAdminCatalogPageServerData(): Promise<AdminCatalogSnapshotDto> {
  await connection();
  await requirePortalAccess([UserRole.ADMIN], '/login?next=%2Fadmin%2Fcatalog');

  const { prisma } = await import('@/lib/prisma');
  return queryAdminCatalogSnapshot(prisma);
}
