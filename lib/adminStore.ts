'use client';

import { useSyncExternalStore } from 'react';
import { REFERENCE_TODAY } from '@/data/adminAnalyticsData';
import {
  type AdminCategoryRecord,
  type AdminMasterProductRecord,
  type AdminStoreMarketplaceStatus,
  type AdminStoreRecord,
  type AdminVendorAccountStatus,
  type AdminVendorRecord,
  type AdminVerificationStatus,
  INITIAL_ADMIN_CATEGORIES,
  INITIAL_ADMIN_MASTER_CATALOG,
  INITIAL_ADMIN_STORES,
  INITIAL_ADMIN_VENDORS,
} from '@/data/adminManagementData';

/**
 * Phase 2E in-memory reactive Admin Console store.
 * Keeps Vendor Management, Store Management, Master Product Catalog, and Category Management
 * 100% synchronized during client-side navigation. Resets cleanly on a full page refresh.
 */
interface AdminState {
  vendors: AdminVendorRecord[];
  stores: AdminStoreRecord[];
  catalogProducts: AdminMasterProductRecord[];
  categories: AdminCategoryRecord[];
}

let state: AdminState = {
  vendors: INITIAL_ADMIN_VENDORS,
  stores: INITIAL_ADMIN_STORES,
  catalogProducts: INITIAL_ADMIN_MASTER_CATALOG,
  categories: INITIAL_ADMIN_CATEGORIES,
};

const listeners = new Set<() => void>();

function setState(next: Partial<AdminState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

export interface MasterProductFormInput {
  name: string;
  brand: string;
  category: string;
  unit: string;
  mrp: number;
  image: string;
  description: string;
  active: boolean;
}

export interface CategoryFormInput {
  name: string;
  shortName: string;
  description: string;
  iconEmoji: string;
  active: boolean;
}

export const adminActions = {
  // -------------------------------------------------------------------------
  // VENDOR MANAGEMENT ACTIONS (MOCK)
  // -------------------------------------------------------------------------
  approveVendorVerification(vendorId: string) {
    setState({
      vendors: state.vendors.map((v) =>
        v.vendorId === vendorId
          ? {
              ...v,
              verificationStatus: 'VERIFIED' as AdminVerificationStatus,
              accountStatus: 'ACTIVE' as AdminVendorAccountStatus,
              lastReviewedOn: REFERENCE_TODAY,
              statusNote: 'Identity & business registration approved by Admin (Prototype Mock).',
            }
          : v
      ),
      stores: state.stores.map((s) =>
        s.vendorId === vendorId && s.verificationStatus === 'PENDING'
          ? {
              ...s,
              verificationStatus: 'VERIFIED' as AdminVerificationStatus,
              marketplaceStatus: 'ACTIVE' as AdminStoreMarketplaceStatus,
              statusNote: 'Store activated upon vendor verification approval (Prototype Mock).',
            }
          : s
      ),
    });
  },

  rejectVendorVerification(vendorId: string, reason?: string) {
    const cleanReason =
      reason?.trim() ||
      'Verification rejected: Submitted business license or identity document requires re-upload.';
    setState({
      vendors: state.vendors.map((v) =>
        v.vendorId === vendorId
          ? {
              ...v,
              verificationStatus: 'REJECTED' as AdminVerificationStatus,
              accountStatus: 'SUSPENDED' as AdminVendorAccountStatus,
              lastReviewedOn: REFERENCE_TODAY,
              statusNote: cleanReason,
            }
          : v
      ),
      stores: state.stores.map((s) =>
        s.vendorId === vendorId
          ? {
              ...s,
              verificationStatus: 'REJECTED' as AdminVerificationStatus,
              marketplaceStatus: 'REJECTED' as AdminStoreMarketplaceStatus,
              statusNote: cleanReason,
            }
          : s
      ),
    });
  },

  suspendVendor(vendorId: string, reason?: string) {
    const cleanReason =
      reason?.trim() ||
      'Vendor account temporarily suspended by Admin for marketplace compliance review.';
    setState({
      vendors: state.vendors.map((v) =>
        v.vendorId === vendorId
          ? {
              ...v,
              accountStatus: 'SUSPENDED' as AdminVendorAccountStatus,
              lastReviewedOn: REFERENCE_TODAY,
              statusNote: cleanReason,
            }
          : v
      ),
      stores: state.stores.map((s) =>
        s.vendorId === vendorId
          ? {
              ...s,
              marketplaceStatus: 'SUSPENDED' as AdminStoreMarketplaceStatus,
              statusNote: `Parent vendor account (${vendorId.toUpperCase()}) suspended: ${cleanReason}`,
            }
          : s
      ),
    });
  },

  restoreVendor(vendorId: string) {
    setState({
      vendors: state.vendors.map((v) =>
        v.vendorId === vendorId
          ? {
              ...v,
              verificationStatus: 'VERIFIED' as AdminVerificationStatus,
              accountStatus: 'ACTIVE' as AdminVendorAccountStatus,
              lastReviewedOn: REFERENCE_TODAY,
              statusNote: 'Vendor account restored to Active marketplace standing (Prototype Mock).',
            }
          : v
      ),
      stores: state.stores.map((s) =>
        s.vendorId === vendorId &&
        (s.marketplaceStatus === 'SUSPENDED' || s.marketplaceStatus === 'REJECTED')
          ? {
              ...s,
              verificationStatus: 'VERIFIED' as AdminVerificationStatus,
              marketplaceStatus: 'ACTIVE' as AdminStoreMarketplaceStatus,
              statusNote: 'Store restored alongside vendor account restoration (Prototype Mock).',
            }
          : s
      ),
    });
  },

  // -------------------------------------------------------------------------
  // STORE MANAGEMENT ACTIONS (MOCK)
  // Note: Store Open/Closed is strictly a vendor operational control and is NOT mutated here.
  // -------------------------------------------------------------------------
  verifyStore(storeId: string) {
    setState({
      stores: state.stores.map((s) =>
        s.storeId === storeId
          ? {
              ...s,
              verificationStatus: 'VERIFIED' as AdminVerificationStatus,
              marketplaceStatus: 'ACTIVE' as AdminStoreMarketplaceStatus,
              statusNote: 'Store verified and activated for customer marketplace discovery (Prototype Mock).',
            }
          : s
      ),
    });
  },

  rejectStoreVerification(storeId: string, reason?: string) {
    const cleanReason =
      reason?.trim() ||
      'Store verification rejected: Storefront address or trade license details could not be verified.';
    setState({
      stores: state.stores.map((s) =>
        s.storeId === storeId
          ? {
              ...s,
              verificationStatus: 'REJECTED' as AdminVerificationStatus,
              marketplaceStatus: 'REJECTED' as AdminStoreMarketplaceStatus,
              statusNote: cleanReason,
            }
          : s
      ),
    });
  },

  suspendStore(storeId: string, reason?: string) {
    const cleanReason =
      reason?.trim() ||
      'Store marketplace visibility suspended by Admin pending compliance or subscription review.';
    setState({
      stores: state.stores.map((s) =>
        s.storeId === storeId
          ? {
              ...s,
              marketplaceStatus: 'SUSPENDED' as AdminStoreMarketplaceStatus,
              statusNote: cleanReason,
            }
          : s
      ),
    });
  },

  restoreStore(storeId: string) {
    setState({
      stores: state.stores.map((s) =>
        s.storeId === storeId
          ? {
              ...s,
              verificationStatus: 'VERIFIED' as AdminVerificationStatus,
              marketplaceStatus: 'ACTIVE' as AdminStoreMarketplaceStatus,
              statusNote: 'Store marketplace listing restored to Active (Prototype Mock).',
            }
          : s
      ),
    });
  },

  // -------------------------------------------------------------------------
  // MASTER PRODUCT CATALOG ACTIONS (MOCK)
  // Note: Only modifies Master Product attributes; never overwrites vendor selling price/stock.
  // -------------------------------------------------------------------------
  addMasterProduct(input: MasterProductFormInput): AdminMasterProductRecord {
    const nextNumber = state.catalogProducts.length + 1;
    const newProd: AdminMasterProductRecord = {
      id: `mc-${nextNumber}`,
      sku: `VH-MC-${1000 + nextNumber}`,
      name: input.name.trim(),
      brand: input.brand.trim(),
      category: input.category,
      unit: input.unit.trim(),
      mrp: Number(input.mrp),
      image: input.image.trim() || '/images/placeholder-product.svg',
      description: input.description.trim(),
      active: input.active,
      createdAt: REFERENCE_TODAY,
      updatedAt: REFERENCE_TODAY,
      storesListingCount: 0,
      vendorPriceRangeLabel: 'Newly added — awaiting vendor selection',
    };
    setState({
      catalogProducts: [newProd, ...state.catalogProducts],
    });
    return newProd;
  },

  updateMasterProduct(id: string, input: MasterProductFormInput) {
    setState({
      catalogProducts: state.catalogProducts.map((p) =>
        p.id === id
          ? {
              ...p,
              name: input.name.trim(),
              brand: input.brand.trim(),
              category: input.category,
              unit: input.unit.trim(),
              mrp: Number(input.mrp),
              image: input.image.trim() || '/images/placeholder-product.svg',
              description: input.description.trim(),
              active: input.active,
              updatedAt: REFERENCE_TODAY,
            }
          : p
      ),
    });
  },

  toggleMasterProductStatus(id: string, nextActive: boolean) {
    setState({
      catalogProducts: state.catalogProducts.map((p) =>
        p.id === id
          ? {
              ...p,
              active: nextActive,
              updatedAt: REFERENCE_TODAY,
            }
          : p
      ),
    });
  },

  // -------------------------------------------------------------------------
  // CATEGORY MANAGEMENT ACTIONS (MOCK)
  // -------------------------------------------------------------------------
  addCategory(input: CategoryFormInput): AdminCategoryRecord {
    const cleanName = input.name.trim();
    const cleanShort = input.shortName.trim() || cleanName;
    const slug = cleanShort
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const newCat: AdminCategoryRecord = {
      id: `cat-${slug || Date.now()}`,
      name: cleanName,
      shortName: cleanShort,
      slug: slug || `category-${state.categories.length + 1}`,
      description: input.description.trim(),
      iconEmoji: input.iconEmoji.trim() || '📦',
      accentColor: '#166534',
      image: '/images/placeholder-category.svg',
      active: input.active,
      createdAt: REFERENCE_TODAY,
      updatedAt: REFERENCE_TODAY,
    };
    setState({
      categories: [...state.categories, newCat],
    });
    return newCat;
  },

  updateCategory(id: string, input: CategoryFormInput) {
    const existing = state.categories.find((c) => c.id === id);
    if (!existing) return;
    const oldName = existing.name;
    const newName = input.name.trim();
    const newShort = input.shortName.trim() || newName;

    setState({
      categories: state.categories.map((c) =>
        c.id === id
          ? {
              ...c,
              name: newName,
              shortName: newShort,
              description: input.description.trim(),
              iconEmoji: input.iconEmoji.trim() || c.iconEmoji,
              active: input.active,
              updatedAt: REFERENCE_TODAY,
            }
          : c
      ),
      // Keep master products & stores referencing this category consistent if name was edited
      catalogProducts:
        oldName !== newName
          ? state.catalogProducts.map((p) =>
              p.category === oldName ? { ...p, category: newName } : p
            )
          : state.catalogProducts,
      stores:
        oldName !== newName
          ? state.stores.map((s) =>
              s.category === oldName ? { ...s, category: newName } : s
            )
          : state.stores,
    });
  },

  toggleCategoryStatus(id: string, nextActive: boolean) {
    setState({
      categories: state.categories.map((c) =>
        c.id === id
          ? {
              ...c,
              active: nextActive,
              updatedAt: REFERENCE_TODAY,
            }
          : c
      ),
    });
  },
};

export interface EnrichedAdminVendor extends AdminVendorRecord {
  stores: AdminStoreRecord[];
  storeCount: number;
  gstRegistered: boolean;
  gstRegisteredStoreCount: number;
  activeSubCount: number;
  expiringSubCount: number;
  expiredSubCount: number;
  overallSubscriptionStatus: 'ALL_ACTIVE' | 'HAS_EXPIRING' | 'HAS_EXPIRED';
}

export interface EnrichedAdminCategory extends AdminCategoryRecord {
  productCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
  storeCount: number;
}

export function useAdminState() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const enrichedVendors: EnrichedAdminVendor[] = s.vendors.map((v) => {
    const vendorStores = s.stores.filter((st) => st.vendorId === v.vendorId);
    const gstRegisteredStoreCount = vendorStores.filter(
      (st) => st.gstRegistered
    ).length;
    const activeSubCount = vendorStores.filter(
      (st) => st.subscriptionStatus === 'ACTIVE'
    ).length;
    const expiringSubCount = vendorStores.filter(
      (st) => st.subscriptionStatus === 'EXPIRING_SOON'
    ).length;
    const expiredSubCount = vendorStores.filter(
      (st) => st.subscriptionStatus === 'EXPIRED'
    ).length;

    let overallSubscriptionStatus: EnrichedAdminVendor['overallSubscriptionStatus'] =
      'ALL_ACTIVE';
    if (expiredSubCount > 0) {
      overallSubscriptionStatus = 'HAS_EXPIRED';
    } else if (expiringSubCount > 0) {
      overallSubscriptionStatus = 'HAS_EXPIRING';
    }

    return {
      ...v,
      stores: vendorStores,
      storeCount: vendorStores.length,
      gstRegistered: gstRegisteredStoreCount > 0,
      gstRegisteredStoreCount,
      activeSubCount,
      expiringSubCount,
      expiredSubCount,
      overallSubscriptionStatus,
    };
  });

  const enrichedCategories: EnrichedAdminCategory[] = s.categories.map((c) => {
    const prods = s.catalogProducts.filter((p) => p.category === c.name);
    const activeProductCount = prods.filter((p) => p.active).length;
    const inactiveProductCount = prods.length - activeProductCount;
    const storeCount = s.stores.filter((st) => st.category === c.name).length;
    return {
      ...c,
      productCount: prods.length,
      activeProductCount,
      inactiveProductCount,
      storeCount,
    };
  });

  return {
    vendors: enrichedVendors,
    stores: s.stores,
    catalogProducts: s.catalogProducts,
    categories: enrichedCategories,
    actions: adminActions,
  };
}
