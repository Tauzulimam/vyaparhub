import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { UserRole, VerificationStatus, MarketplaceStatus, GstStatus } from '@/generated/prisma/enums';
import { requirePortalAccess } from '@/lib/auth/guards';
import type {
  CategoryOptionDto,
  VendorProfileDto,
  VendorStoreInfo,
} from '@/types/vendor';

export const ACTIVE_STORE_COOKIE = 'vh_active_store_id';

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
 * Combined retrieval for the VendorLayout Server Component:
 * - Authenticated VendorProfile
 * - Authenticated Vendor's Stores
 * - Currently Active Store ID (resolved from cookie or fallback)
 * - Available Categories
 */
export async function getAuthenticatedVendorData() {
  await connection();
  const { user, vendorProfile } = await getAuthenticatedVendorProfile();
  const stores = await getAuthenticatedVendorStores();
  const categories = await getActiveCategories();

  const cookieStore = await cookies();
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
  };
}
