'use server';

import { revalidatePath } from 'next/cache';
import {
  executeCreateMasterProduct,
  executeSetMasterProductActiveStatus,
  executeUpdateMasterProduct,
} from '@/lib/admin/catalog/persistence';
import { resolveAuthenticatedAdminForAction } from '@/lib/admin/catalog/server';
import type {
  AdminCatalogMutationResult,
  AdminMasterProductInput,
} from '@/lib/admin/catalog/types';

function revalidateCatalogConsumerRoutes() {
  revalidatePath('/admin/catalog');
  revalidatePath('/vendor', 'layout');
  revalidatePath('/vendor/catalog');
  revalidatePath('/vendor/inventory');
  revalidatePath('/');
  revalidatePath('/stores');
  revalidatePath('/products');
  revalidatePath('/cart');
  revalidatePath('/checkout');
}

/**
 * Creates a new real PostgreSQL `MasterProduct` entry (Admin only).
 */
export async function createMasterProductAction(
  input: AdminMasterProductInput
): Promise<AdminCatalogMutationResult> {
  try {
    const auth = await resolveAuthenticatedAdminForAction();
    if (!auth.ok) {
      return {
        success: false,
        error: auth.error,
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeCreateMasterProduct(prisma, input);

    if (result.success) {
      revalidateCatalogConsumerRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to create master product:', error);
    return {
      success: false,
      error: 'Could not create master product right now. Please try again.',
    };
  }
}

/**
 * Updates an existing PostgreSQL `MasterProduct` entry without altering vendor
 * store prices or inventory quantities (Admin only).
 */
export async function updateMasterProductAction(
  masterProductId: string,
  input: AdminMasterProductInput
): Promise<AdminCatalogMutationResult> {
  try {
    const auth = await resolveAuthenticatedAdminForAction();
    if (!auth.ok) {
      return {
        success: false,
        error: auth.error,
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeUpdateMasterProduct(prisma, masterProductId, input);

    if (result.success) {
      revalidateCatalogConsumerRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to update master product:', error);
    return {
      success: false,
      error: 'Could not save master product changes right now. Please try again.',
    };
  }
}

/**
 * Activates or deactivates (`MasterProduct.isActive`) an existing PostgreSQL
 * `MasterProduct` entry (Admin only).
 */
export async function setMasterProductActiveStatusAction(
  masterProductId: string,
  nextIsActive: boolean
): Promise<AdminCatalogMutationResult> {
  try {
    const auth = await resolveAuthenticatedAdminForAction();
    if (!auth.ok) {
      return {
        success: false,
        error: auth.error,
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeSetMasterProductActiveStatus(
      prisma,
      masterProductId,
      nextIsActive
    );

    if (result.success) {
      revalidateCatalogConsumerRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to toggle master product status:', error);
    return {
      success: false,
      error: 'Could not update master product status right now. Please try again.',
    };
  }
}
