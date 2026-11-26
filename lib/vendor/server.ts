import { connection } from 'next/server';
import { cookies } from 'next/headers';
import {
  GstStatus,
  MarketplaceStatus,
  UnitType,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import { requirePortalAccess } from '@/lib/auth/guards';
import type {
  CategoryOptionDto,
  MasterProduct,
  StoreProduct,
  VendorProfileDto,
  VendorStoreInfo,
} from '@/types/vendor';

export const ACTIVE_STORE_COOKIE = 'vh_active_store_id';
const DEFAULT_PRODUCT_IMAGE = '/images/placeholder-product.svg';

export function toNumericValue(
  value: { toNumber?: () => number } | number | string
): number {
  if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

export function formatMasterProductUnit(
  unitValue: { toNumber?: () => number } | number | string,
  unitType: UnitType
): string {
  const num = Number(toNumericValue(unitValue).toFixed(3));
  switch (unitType) {
    case UnitType.G:
      return `${num} g`;
    case UnitType.KG:
      return `${num} kg`;
    case UnitType.ML:
      return `${num} ml`;
    case UnitType.L:
      return `${num} L`;
    case UnitType.PIECE:
      return `${num} ${num === 1 ? 'pc' : 'pcs'}`;
    case UnitType.PACK:
      return `${num} ${num === 1 ? 'pack' : 'packs'}`;
    case UnitType.DOZEN:
      return `${num} dozen`;
    default:
      return `${num}`;
  }
}

export interface MasterProductRecordShape {
  id: string;
  categoryId: string;
  name: string;
  brand: string | null;
  unitValue: { toNumber?: () => number } | number | string;
  unitType: UnitType;
  mrp: { toNumber?: () => number } | number | string;
  imageUrl: string;
  description: string | null;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface StoreProductRecordShape {
  id: string;
  storeId: string;
  masterProductId: string;
  sellingPrice: { toNumber?: () => number } | number | string;
  stockQuantity: number;
  isAvailable: boolean;
  masterProduct: MasterProductRecordShape;
}

export function mapMasterProductToDto(record: MasterProductRecordShape): MasterProduct {
  const unitVal = Number(toNumericValue(record.unitValue).toFixed(3));
  const mrpNum = Number(toNumericValue(record.mrp).toFixed(2));
  return {
    id: record.id,
    name: record.name,
    brand: record.brand ?? '',
    category: record.category.name,
    categoryId: record.categoryId,
    description: record.description ?? '',
    unit: formatMasterProductUnit(unitVal, record.unitType),
    unitValue: unitVal,
    unitType: record.unitType,
    mrp: mrpNum,
    image: record.imageUrl || DEFAULT_PRODUCT_IMAGE,
    active: record.isActive,
  };
}

export function mapStoreProductToDto(record: StoreProductRecordShape): StoreProduct {
  const sellingPriceNum = Number(toNumericValue(record.sellingPrice).toFixed(2));
  return {
    id: record.id,
    storeId: record.storeId,
    masterProductId: record.masterProductId,
    sellingPrice: sellingPriceNum,
    quantity: record.stockQuantity,
    available: record.isAvailable && record.stockQuantity > 0,
    masterProduct: mapMasterProductToDto(record.masterProduct),
  };
}

export const MASTER_PRODUCT_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  brand: true,
  unitValue: true,
  unitType: true,
  mrp: true,
  imageUrl: true,
  description: true,
  isActive: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

export const STORE_PRODUCT_SELECT = {
  id: true,
  storeId: true,
  masterProductId: true,
  sellingPrice: true,
  stockQuantity: true,
  isAvailable: true,
  masterProduct: {
    select: MASTER_PRODUCT_SELECT,
  },
} as const;

/**
 * Resolves the authenticated vendor and their authoritative VendorProfile from PostgreSQL.
 * Fails closed if the user is not authenticated as VENDOR or lacks a VendorProfile.
 */
export async function getAuthenticatedVendorProfile() {
  await connection();
  const user = await requirePortalAccess([UserRole.VENDOR]);

  const { prisma } = await import('@/lib/prisma');
  const userWithProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      authUserId: true,
      email: true,
      phone: true,
      role: true,
      accountStatus: true,
      vendorProfile: {
        select: {
          id: true,
          userId: true,
          ownerName: true,
          registeredMobile: true,
          businessEmail: true,
          verificationStatus: true,
          verifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!userWithProfile || !userWithProfile.vendorProfile) {
    throw new Error('Vendor profile not found for authenticated user');
  }

  const profileDto: VendorProfileDto = {
    id: userWithProfile.vendorProfile.id,
    userId: userWithProfile.vendorProfile.userId,
    ownerName: userWithProfile.vendorProfile.ownerName,
    registeredMobile: userWithProfile.vendorProfile.registeredMobile,
    businessEmail: userWithProfile.vendorProfile.businessEmail,
    verificationStatus: userWithProfile.vendorProfile.verificationStatus,
    verifiedAt: userWithProfile.vendorProfile.verifiedAt?.toISOString() ?? null,
  };

  return {
    user,
    vendorProfile: profileDto,
  };
}

/**
 * Maps a Prisma Store + Category + BusinessDetails record into the application VendorStoreInfo format.
 */
export function mapStoreToVendorStoreInfo(
  store: {
    id: string;
    vendorProfileId: string;
    categoryId: string;
    name: string;
    description: string | null;
    phone: string;
    email: string | null;
    addressLine1: string;
    addressLine2: string | null;
    area: string;
    city: string;
    state: string;
    postalCode: string;
    openingTime: string | null;
    closingTime: string | null;
    deliveryRadiusKm: { toNumber?: () => number } | number;
    minimumOrderAmount: { toNumber?: () => number } | number;
    isOpen: boolean;
    verificationStatus: VerificationStatus;
    marketplaceStatus: MarketplaceStatus;
    category: {
      id: string;
      name: string;
      slug: string;
    };
    businessDetails: {
      id: string;
      gstStatus: GstStatus;
      gstin: string | null;
      legalBusinessName: string | null;
      gstVerified: boolean;
    } | null;
  },
  ownerName: string
): VendorStoreInfo {
  const radiusNum = typeof store.deliveryRadiusKm === 'object' && store.deliveryRadiusKm && 'toNumber' in store.deliveryRadiusKm
    ? (store.deliveryRadiusKm as { toNumber: () => number }).toNumber()
    : Number(store.deliveryRadiusKm);

  const minOrderNum = typeof store.minimumOrderAmount === 'object' && store.minimumOrderAmount && 'toNumber' in store.minimumOrderAmount
    ? (store.minimumOrderAmount as { toNumber: () => number }).toNumber()
    : Number(store.minimumOrderAmount);

  const formattedAddress = [
    store.addressLine1,
    store.addressLine2,
    store.area,
    store.city,
    `${store.state} - ${store.postalCode}`,
  ]
    .filter(Boolean)
    .join(', ');

  const gstStatus: 'REGISTERED' | 'NOT_REGISTERED' =
    store.businessDetails?.gstStatus === GstStatus.REGISTERED ? 'REGISTERED' : 'NOT_REGISTERED';

  return {
    id: store.id,
    name: store.name,
    ownerName,
    category: store.category.name,
    description: store.description ?? '',
    address: formattedAddress,
    phone: store.phone,
    email: store.email ?? '',
    openTime: store.openingTime ?? '09:00',
    closeTime: store.closingTime ?? '21:00',
    deliveryRadiusKm: radiusNum,
    minOrderAmount: minOrderNum,
    acceptingOrders: store.isOpen && store.marketplaceStatus === MarketplaceStatus.ACTIVE,
    isOpen: store.isOpen,
    codEnabled: true,
    gstStatus,
    gstin: store.businessDetails?.gstin ?? undefined,
    gstVerified: store.businessDetails?.gstVerified ?? false,
    verificationStatus: store.verificationStatus,
    marketplaceStatus: store.marketplaceStatus,
    addressLine1: store.addressLine1,
    addressLine2: store.addressLine2 ?? '',
    area: store.area,
    city: store.city,
    state: store.state,
    postalCode: store.postalCode,
    categoryId: store.categoryId,
  };
}

/**
 * Retrieves all stores belonging to the authenticated vendor from PostgreSQL.
 * Strict ownership check: scoped directly by authenticated vendorProfile.id.
 */
export async function getAuthenticatedVendorStores(): Promise<VendorStoreInfo[]> {
  const { vendorProfile } = await getAuthenticatedVendorProfile();
  const { prisma } = await import('@/lib/prisma');

  const stores = await prisma.store.findMany({
    where: { vendorProfileId: vendorProfile.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      vendorProfileId: true,
      categoryId: true,
      name: true,
      description: true,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      area: true,
      city: true,
      state: true,
      postalCode: true,
      openingTime: true,
      closingTime: true,
      deliveryRadiusKm: true,
      minimumOrderAmount: true,
      isOpen: true,
      verificationStatus: true,
      marketplaceStatus: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      businessDetails: {
        select: {
          id: true,
          gstStatus: true,
          gstin: true,
          legalBusinessName: true,
          gstVerified: true,
        },
      },
    },
  });

  return stores.map((s) => mapStoreToVendorStoreInfo(s, vendorProfile.ownerName));
}

/**
 * Retrieves a single store owned by the authenticated vendor by its ID.
 * Returns null if not found or if the store does not belong to this vendor.
 */
export async function getAuthenticatedVendorStore(storeId: string): Promise<VendorStoreInfo | null> {
  const { vendorProfile } = await getAuthenticatedVendorProfile();
  const { prisma } = await import('@/lib/prisma');

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      vendorProfileId: vendorProfile.id,
    },
    select: {
      id: true,
      vendorProfileId: true,
      categoryId: true,
      name: true,
      description: true,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      area: true,
      city: true,
      state: true,
      postalCode: true,
      openingTime: true,
      closingTime: true,
      deliveryRadiusKm: true,
      minimumOrderAmount: true,
      isOpen: true,
      verificationStatus: true,
      marketplaceStatus: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      businessDetails: {
        select: {
          id: true,
          gstStatus: true,
          gstin: true,
          legalBusinessName: true,
          gstVerified: true,
        },
      },
    },
  });

  if (!store) {
    return null;
  }

  return mapStoreToVendorStoreInfo(store, vendorProfile.ownerName);
}

/**
 * Retrieves all active categories from PostgreSQL for selection during store creation.
 */
export async function getActiveCategories(): Promise<CategoryOptionDto[]> {
  await connection();
  const { prisma } = await import('@/lib/prisma');

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { name: 'asc' },
  });

  return categories;
}

/**
 * Resolves the authenticated vendor's currently active owned Store on the server.
 * Uses the active-store cookie only if it matches a store owned by this vendorProfile;
 * otherwise falls back to the vendor's first owned store, or null if the vendor owns zero stores.
 */
export async function resolveAuthenticatedActiveStore(
  existingVendorProfile?: VendorProfileDto
): Promise<{ vendorProfile: VendorProfileDto; activeStore: { id: string; name: string } | null }> {
  await connection();
  const vendorProfile =
    existingVendorProfile ?? (await getAuthenticatedVendorProfile()).vendorProfile;
  const { prisma } = await import('@/lib/prisma');

  const ownedStores = await prisma.store.findMany({
    where: { vendorProfileId: vendorProfile.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });

  if (ownedStores.length === 0) {
    return { vendorProfile, activeStore: null };
  }

  const cookieStore = await cookies();
  const activeCookieVal = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;
  const matched = activeCookieVal
    ? ownedStores.find((s) => s.id === activeCookieVal)
    : undefined;

  return {
    vendorProfile,
    activeStore: matched ?? ownedStores[0],
  };
}

/**
 * Retrieves active platform-owned MasterProduct records (read-only for vendors).
 * Loads only active MasterProducts belonging to active Categories.
 */
export async function getActiveMasterCatalog(): Promise<MasterProduct[]> {
  await connection();
  await getAuthenticatedVendorProfile();
  const { prisma } = await import('@/lib/prisma');

  const records = await prisma.masterProduct.findMany({
    where: {
      isActive: true,
      category: { isActive: true },
    },
    select: MASTER_PRODUCT_SELECT,
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  return records.map(mapMasterProductToDto);
}

/**
 * Retrieves StoreProduct inventory records strictly for a specific owned Store.
 * Fails closed (returns empty array) if the store does not belong to the authenticated vendor.
 */
export async function getAuthenticatedStoreProducts(storeId: string): Promise<StoreProduct[]> {
  await connection();
  const { vendorProfile } = await getAuthenticatedVendorProfile();
  const { prisma } = await import('@/lib/prisma');

  const ownedStore = await prisma.store.findFirst({
    where: {
      id: storeId,
      vendorProfileId: vendorProfile.id,
    },
    select: { id: true },
  });

  if (!ownedStore) {
    return [];
  }

  const records = await prisma.storeProduct.findMany({
    where: {
      storeId: ownedStore.id,
      store: { vendorProfileId: vendorProfile.id },
    },
    select: STORE_PRODUCT_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  return records.map(mapStoreProductToDto);
}

/**
 * Retrieves StoreProduct inventory records belonging ONLY to the current active owned Store.
 */
export async function getAuthenticatedActiveStoreProducts(): Promise<{
  activeStoreId: string | null;
  products: StoreProduct[];
}> {
  const { vendorProfile, activeStore } = await resolveAuthenticatedActiveStore();
  if (!activeStore) {
    return { activeStoreId: null, products: [] };
  }

  const { prisma } = await import('@/lib/prisma');
  const records = await prisma.storeProduct.findMany({
    where: {
      storeId: activeStore.id,
      store: { vendorProfileId: vendorProfile.id },
    },
    select: STORE_PRODUCT_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  return {
    activeStoreId: activeStore.id,
    products: records.map(mapStoreProductToDto),
  };
}

/**
 * Combined retrieval for the VendorLayout Server Component:
 * - Authenticated VendorProfile
 * - Authenticated Vendor's Stores
 * - Currently Active Store ID (resolved from cookie or fallback)
 * - Available Categories
 * - Active Platform Master Catalog
 * - StoreProducts belonging strictly to this vendor's owned stores
 */
export async function getAuthenticatedVendorData() {
  await connection();
  const { user, vendorProfile } = await getAuthenticatedVendorProfile();
  const { prisma } = await import('@/lib/prisma');

  const [storeRecords, categories, masterRecords, storeProductRecords, cookieStore] =
    await Promise.all([
      prisma.store.findMany({
        where: { vendorProfileId: vendorProfile.id },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          vendorProfileId: true,
          categoryId: true,
          name: true,
          description: true,
          phone: true,
          email: true,
          addressLine1: true,
          addressLine2: true,
          area: true,
          city: true,
          state: true,
          postalCode: true,
          openingTime: true,
          closingTime: true,
          deliveryRadiusKm: true,
          minimumOrderAmount: true,
          isOpen: true,
          verificationStatus: true,
          marketplaceStatus: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          businessDetails: {
            select: {
              id: true,
              gstStatus: true,
              gstin: true,
              legalBusinessName: true,
              gstVerified: true,
            },
          },
        },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.masterProduct.findMany({
        where: {
          isActive: true,
          category: { isActive: true },
        },
        select: MASTER_PRODUCT_SELECT,
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      }),
      prisma.storeProduct.findMany({
        where: {
          store: { vendorProfileId: vendorProfile.id },
        },
        select: STORE_PRODUCT_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      cookies(),
    ]);

  const stores = storeRecords.map((s) => mapStoreToVendorStoreInfo(s, vendorProfile.ownerName));
  const masterCatalog = masterRecords.map(mapMasterProductToDto);
  const storeProducts = storeProductRecords.map(mapStoreProductToDto);

  const activeCookieVal = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;

  let activeStoreId: string | null = null;
  if (activeCookieVal && stores.some((s) => s.id === activeCookieVal)) {
    activeStoreId = activeCookieVal;
  } else if (stores.length > 0) {
    activeStoreId = stores[0].id;
  }

  return {
    user,
    vendorProfile,
    stores,
    activeStoreId,
    categories,
    masterCatalog,
    storeProducts,
  };
}
