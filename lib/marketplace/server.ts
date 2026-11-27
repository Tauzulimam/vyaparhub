import { connection } from 'next/server';
import type { PrismaClient } from '@/generated/prisma/client';
import {
  AccountStatus,
  MarketplaceStatus,
  UnitType,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/enums';
import { formatMasterProductUnit, toNumericValue } from '@/lib/vendor/server';
import type { Category, Product, Store } from '@/types';

const DEFAULT_STORE_IMAGE = '/images/placeholder-store.svg';
const DEFAULT_PRODUCT_IMAGE = '/images/placeholder-product.svg';
const DEFAULT_CATEGORY_IMAGE = '/images/placeholder-category.svg';

const CATEGORY_IMAGE_BY_SLUG: Record<string, string> = {
  'grocery-staples': '/images/products/atta-grains.svg',
  'dairy-sweets': '/images/products/dairy-milk.svg',
  'bakery-confectionery': '/images/products/bakery-bread.svg',
  'pharmacy-wellness': '/images/products/pharmacy-care.svg',
  'stationery-books': '/images/products/stationery-supplies.svg',
  'electronics-mobile': '/images/products/electronics-accessories.svg',
  'pet-supplies': '/images/products/pet-nutrition.svg',
  'general-store': '/images/products/household-cleaning.svg',
};

/**
 * Authoritative customer-facing Store visibility predicate.
 *
 * Enforces:
 * - Store.isOpen === true
 * - Store.marketplaceStatus === ACTIVE
 * - Store.verificationStatus !== REJECTED
 *   (Deadline-safe Phase 7 rule: permits PENDING and VERIFIED stores so active
 *   test stores appear immediately; production hardening can tighten this single
 *   predicate to `VerificationStatus.VERIFIED`.)
 * - Store.category.isActive === true
 * - Owning VendorProfile.verificationStatus !== REJECTED
 * - Owning User.role === VENDOR and User.accountStatus === ACTIVE
 */
export const CUSTOMER_VISIBLE_STORE_WHERE = {
  isOpen: true,
  marketplaceStatus: MarketplaceStatus.ACTIVE,
  verificationStatus: { not: VerificationStatus.REJECTED },
  category: { isActive: true },
  vendorProfile: {
    verificationStatus: { not: VerificationStatus.REJECTED },
    user: {
      role: UserRole.VENDOR,
      accountStatus: AccountStatus.ACTIVE,
    },
  },
} as const;

/**
 * Customer-safe scalar Store fields.
 * Never selects GSTIN, StoreBusinessDetails, vendor personal contact details,
 * or internal verification/moderation fields.
 */
export const CUSTOMER_STORE_SCALAR_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
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
} as const;

const CUSTOMER_CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
} as const;

const CUSTOMER_STORE_PRODUCT_SCALAR_SELECT = {
  id: true,
  storeId: true,
  masterProductId: true,
  sellingPrice: true,
  stockQuantity: true,
  isAvailable: true,
} as const;

const CUSTOMER_MASTER_PRODUCT_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  brand: true,
  unitValue: true,
  unitType: true,
  mrp: true,
  imageUrl: true,
  description: true,
} as const;

interface RawCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface RawCustomerStoreRow {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  addressLine1: string;
  addressLine2: string | null;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  openingTime: string | null;
  closingTime: string | null;
  deliveryRadiusKm: { toNumber?: () => number } | number | string;
  minimumOrderAmount: { toNumber?: () => number } | number | string;
  isOpen: boolean;
}

interface RawCustomerStoreProductScalarRow {
  id: string;
  storeId: string;
  masterProductId: string;
  sellingPrice: { toNumber?: () => number } | number | string;
  stockQuantity: number;
  isAvailable: boolean;
}

interface RawCustomerMasterProductRow {
  id: string;
  categoryId: string;
  name: string;
  brand: string | null;
  unitValue: { toNumber?: () => number } | number | string;
  unitType: UnitType;
  mrp: { toNumber?: () => number } | number | string;
  imageUrl: string;
  description: string | null;
}

export interface CustomerMarketplaceSnapshot {
  categories: Category[];
  stores: Store[];
  products: Product[];
}

export interface CustomerStoreDetailResult {
  store: Store;
  products: Product[];
}

export interface OtherStoreOffer {
  storeProductId: string;
  storeId: string;
  storeName: string;
  area: string;
  city: string;
  price: number;
  mrp: number;
  quantityAvailable: number;
  minOrderAmount: number;
}

export interface CustomerProductDetailResult {
  product: Product;
  store: Store;
  otherStoreOffers: OtherStoreOffer[];
}

function formatClock12Hour(time24: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time24.trim());
  if (!match) return time24;
  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}

export function formatCustomerStoreHours(
  openingTime: string | null,
  closingTime: string | null
): string | undefined {
  if (!openingTime && !closingTime) return undefined;
  if (openingTime && closingTime) {
    return `${formatClock12Hour(openingTime)} – ${formatClock12Hour(closingTime)}`;
  }
  return openingTime ? `Opens ${formatClock12Hour(openingTime)}` : undefined;
}

function deriveDeliveryWindowLabel(radiusKm: number): string {
  if (radiusKm <= 2) return '15-25 mins';
  if (radiusKm <= 5) return '20-35 mins';
  return '30-45 mins';
}

function mapRawStoreToCustomerDto(
  row: RawCustomerStoreRow,
  category: RawCategoryRow | undefined,
  extraProductCategories: Iterable<string> = []
): Store {
  const radiusKm = Number(toNumericValue(row.deliveryRadiusKm).toFixed(2));
  const minOrder = Number(toNumericValue(row.minimumOrderAmount).toFixed(2));
  const categoryName = category?.name ?? 'Local Store';

  const fullAddress = [
    row.addressLine1,
    row.addressLine2,
    row.area,
    row.city,
    row.postalCode ? `${row.state} - ${row.postalCode}` : row.state,
  ]
    .filter(Boolean)
    .join(', ');

  const offeredSet = new Set<string>([categoryName]);
  for (const catName of extraProductCategories) {
    if (catName) offeredSet.add(catName);
  }

  return {
    id: row.id,
    name: row.name,
    category: categoryName,
    categorySlug: category?.slug,
    distanceKm: radiusKm,
    rating: 0,
    reviewCount: 0,
    deliveryTimeMin: deriveDeliveryWindowLabel(radiusKm),
    isOpen: row.isOpen,
    image: DEFAULT_STORE_IMAGE,
    address: fullAddress,
    area: row.area,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    deliveryRadiusKm: radiusKm,
    minOrderAmount: minOrder,
    openingTime: row.openingTime,
    closingTime: row.closingTime,
    timing: formatCustomerStoreHours(row.openingTime, row.closingTime),
    description:
      row.description?.trim() ||
      `Local ${categoryName.toLowerCase()} retailer serving ${row.area}, ${row.city}.`,
    categoriesOffered: Array.from(offeredSet),
  };
}

function mapScalarStoreProductToCustomerDto(
  row: RawCustomerStoreProductScalarRow,
  masterProduct: RawCustomerMasterProductRow,
  storeName: string,
  productCategory: RawCategoryRow
): Product {
  const sellingPrice = Number(toNumericValue(row.sellingPrice).toFixed(2));
  const mrp = Number(toNumericValue(masterProduct.mrp).toFixed(2));
  const unitVal = Number(toNumericValue(masterProduct.unitValue).toFixed(3));
  const inStock = row.isAvailable && row.stockQuantity > 0;

  return {
    id: row.id, // StoreProduct.id — preserves per-store commercial identity
    masterProductId: row.masterProductId,
    name: masterProduct.name,
    brand: masterProduct.brand ?? 'Generic',
    category: productCategory.name,
    categorySlug: productCategory.slug,
    unit: formatMasterProductUnit(unitVal, masterProduct.unitType),
    price: sellingPrice,
    mrp,
    image: masterProduct.imageUrl || DEFAULT_PRODUCT_IMAGE,
    storeId: row.storeId,
    storeName,
    inStock,
    quantityAvailable: row.stockQuantity,
    isPopular: true,
    isBuyAgain: true,
    description: masterProduct.description ?? undefined,
  };
}

/**
 * Pure Prisma read query returning active categories, customer-visible stores,
 * and customer-visible StoreProducts.
 *
 * Uses scalar-only `select` clauses so Prisma 7 executes standalone SQL `SELECT`
 * statements directly on the pool without opening implicit `BEGIN/COMMIT` transactions.
 */
export async function queryVisibleMarketplaceSnapshot(
  prisma: PrismaClient
): Promise<CustomerMarketplaceSnapshot> {
  const [categoryRows, storeRows] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: CUSTOMER_CATEGORY_SELECT,
    }),
    prisma.store.findMany({
      where: CUSTOMER_VISIBLE_STORE_WHERE,
      orderBy: { createdAt: 'asc' },
      select: CUSTOMER_STORE_SCALAR_SELECT,
    }),
  ]);

  const categoriesById = new Map<string, RawCategoryRow>();
  for (const cat of categoryRows) {
    categoriesById.set(cat.id, cat);
  }

  const visibleStoreIds = storeRows.map((s) => s.id);
  const activeCategoryIds = categoryRows.map((c) => c.id);

  const storeProductRows: RawCustomerStoreProductScalarRow[] =
    visibleStoreIds.length > 0 && activeCategoryIds.length > 0
      ? await prisma.storeProduct.findMany({
          where: {
            storeId: { in: visibleStoreIds },
            isAvailable: true,
            stockQuantity: { gt: 0 },
            masterProduct: {
              isActive: true,
              categoryId: { in: activeCategoryIds },
            },
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          select: CUSTOMER_STORE_PRODUCT_SCALAR_SELECT,
        })
      : [];

  const uniqueMasterIds = Array.from(
    new Set(storeProductRows.map((sp) => sp.masterProductId))
  );

  const masterRows: RawCustomerMasterProductRow[] =
    uniqueMasterIds.length > 0
      ? await prisma.masterProduct.findMany({
          where: {
            id: { in: uniqueMasterIds },
            isActive: true,
            categoryId: { in: activeCategoryIds },
          },
          select: CUSTOMER_MASTER_PRODUCT_SELECT,
        })
      : [];

  const mastersById = new Map<string, RawCustomerMasterProductRow>();
  for (const mp of masterRows) {
    mastersById.set(mp.id, mp);
  }

  const storeNameById = new Map<string, string>();
  for (const s of storeRows) {
    storeNameById.set(s.id, s.name);
  }

  const productCategoriesByStoreId = new Map<string, Set<string>>();
  const availableItemCountByCategoryId = new Map<string, number>();

  const products: Product[] = [];
  for (const sp of storeProductRows) {
    const storeName = storeNameById.get(sp.storeId);
    const master = mastersById.get(sp.masterProductId);
    if (!storeName || !master) continue;
    const prodCategory = categoriesById.get(master.categoryId);
    if (!prodCategory) continue;

    products.push(mapScalarStoreProductToCustomerDto(sp, master, storeName, prodCategory));

    availableItemCountByCategoryId.set(
      prodCategory.id,
      (availableItemCountByCategoryId.get(prodCategory.id) ?? 0) + 1
    );

    let setForStore = productCategoriesByStoreId.get(sp.storeId);
    if (!setForStore) {
      setForStore = new Set<string>();
      productCategoriesByStoreId.set(sp.storeId, setForStore);
    }
    setForStore.add(prodCategory.name);
  }

  const stores: Store[] = storeRows.map((s) =>
    mapRawStoreToCustomerDto(
      s,
      categoriesById.get(s.categoryId),
      productCategoriesByStoreId.get(s.id) ?? []
    )
  );

  const categories: Category[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    itemCount: availableItemCountByCategoryId.get(c.id) ?? 0,
    image: CATEGORY_IMAGE_BY_SLUG[c.slug] ?? DEFAULT_CATEGORY_IMAGE,
    description: c.description ?? undefined,
  }));

  return {
    categories,
    stores,
    products,
  };
}

/**
 * Pure Prisma read query for a single customer-visible Store and its available
 * in-stock StoreProducts. Returns null if the store does not exist or is not
 * eligible for customer visibility (closed, suspended, rejected, or inactive vendor).
 */
export async function queryCustomerStoreDetail(
  prisma: PrismaClient,
  storeId: string
): Promise<CustomerStoreDetailResult | null> {
  const cleanId = storeId?.trim() || '';
  if (!cleanId) {
    return null;
  }

  const [storeRow, categoryRows] = await Promise.all([
    prisma.store.findFirst({
      where: {
        id: cleanId,
        ...CUSTOMER_VISIBLE_STORE_WHERE,
      },
      select: CUSTOMER_STORE_SCALAR_SELECT,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: CUSTOMER_CATEGORY_SELECT,
    }),
  ]);

  if (!storeRow) {
    return null;
  }

  const categoriesById = new Map<string, RawCategoryRow>();
  for (const cat of categoryRows) {
    categoriesById.set(cat.id, cat);
  }

  const activeCategoryIds = categoryRows.map((c) => c.id);

  const storeProductRows: RawCustomerStoreProductScalarRow[] =
    activeCategoryIds.length > 0
      ? await prisma.storeProduct.findMany({
          where: {
            storeId: storeRow.id,
            isAvailable: true,
            stockQuantity: { gt: 0 },
            masterProduct: {
              isActive: true,
              categoryId: { in: activeCategoryIds },
            },
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          select: CUSTOMER_STORE_PRODUCT_SCALAR_SELECT,
        })
      : [];

  const uniqueMasterIds = Array.from(
    new Set(storeProductRows.map((sp) => sp.masterProductId))
  );

  const masterRows: RawCustomerMasterProductRow[] =
    uniqueMasterIds.length > 0
      ? await prisma.masterProduct.findMany({
          where: {
            id: { in: uniqueMasterIds },
            isActive: true,
            categoryId: { in: activeCategoryIds },
          },
          select: CUSTOMER_MASTER_PRODUCT_SELECT,
        })
      : [];

  const mastersById = new Map<string, RawCustomerMasterProductRow>();
  for (const mp of masterRows) {
    mastersById.set(mp.id, mp);
  }

  const offeredProductCategories = new Set<string>();
  const products: Product[] = [];

  for (const sp of storeProductRows) {
    const master = mastersById.get(sp.masterProductId);
    if (!master) continue;
    const prodCategory = categoriesById.get(master.categoryId);
    if (!prodCategory) continue;
    offeredProductCategories.add(prodCategory.name);
    products.push(mapScalarStoreProductToCustomerDto(sp, master, storeRow.name, prodCategory));
  }

  const store = mapRawStoreToCustomerDto(
    storeRow,
    categoriesById.get(storeRow.categoryId),
    offeredProductCategories
  );

  return {
    store,
    products,
  };
}

/**
 * Pure Prisma read query for a single customer-visible StoreProduct (keyed by
 * `StoreProduct.id` to preserve store-specific pricing, stock, and availability),
 * plus any other open customer-visible stores selling the same MasterProduct.
 *
 * Returns null if the StoreProduct does not exist, is unavailable, has 0 stock,
 * belongs to an inactive MasterProduct/Category, or belongs to a non-visible Store.
 */
export async function queryCustomerStoreProductDetail(
  prisma: PrismaClient,
  storeProductId: string
): Promise<CustomerProductDetailResult | null> {
  const cleanId = storeProductId?.trim() || '';
  if (!cleanId) {
    return null;
  }

  const [storeProductRow, categoryRows] = await Promise.all([
    prisma.storeProduct.findFirst({
      where: {
        id: cleanId,
        isAvailable: true,
        stockQuantity: { gt: 0 },
        masterProduct: {
          isActive: true,
          category: { isActive: true },
        },
        store: CUSTOMER_VISIBLE_STORE_WHERE,
      },
      select: CUSTOMER_STORE_PRODUCT_SCALAR_SELECT,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: CUSTOMER_CATEGORY_SELECT,
    }),
  ]);

  if (!storeProductRow) {
    return null;
  }

  const categoriesById = new Map<string, RawCategoryRow>();
  for (const cat of categoryRows) {
    categoriesById.set(cat.id, cat);
  }

  const [masterRow, storeRow, siblingStoreProductRows] = await Promise.all([
    prisma.masterProduct.findFirst({
      where: {
        id: storeProductRow.masterProductId,
        isActive: true,
        category: { isActive: true },
      },
      select: CUSTOMER_MASTER_PRODUCT_SELECT,
    }),
    prisma.store.findFirst({
      where: {
        id: storeProductRow.storeId,
        ...CUSTOMER_VISIBLE_STORE_WHERE,
      },
      select: CUSTOMER_STORE_SCALAR_SELECT,
    }),
    prisma.storeProduct.findMany({
      where: {
        masterProductId: storeProductRow.masterProductId,
        id: { not: storeProductRow.id },
        isAvailable: true,
        stockQuantity: { gt: 0 },
        store: CUSTOMER_VISIBLE_STORE_WHERE,
      },
      orderBy: { sellingPrice: 'asc' },
      select: CUSTOMER_STORE_PRODUCT_SCALAR_SELECT,
    }),
  ]);

  if (!masterRow || !storeRow) {
    return null;
  }

  const prodCategory = categoriesById.get(masterRow.categoryId);
  if (!prodCategory) {
    return null;
  }

  const siblingStoreIds = Array.from(
    new Set(siblingStoreProductRows.map((sib) => sib.storeId))
  );

  const siblingStores =
    siblingStoreIds.length > 0
      ? await prisma.store.findMany({
          where: {
            id: { in: siblingStoreIds },
            ...CUSTOMER_VISIBLE_STORE_WHERE,
          },
          select: {
            id: true,
            name: true,
            area: true,
            city: true,
            minimumOrderAmount: true,
          },
        })
      : [];

  const siblingStoresById = new Map(siblingStores.map((s) => [s.id, s]));

  const store = mapRawStoreToCustomerDto(
    storeRow,
    categoriesById.get(storeRow.categoryId),
    [prodCategory.name]
  );

  const product = mapScalarStoreProductToCustomerDto(
    storeProductRow,
    masterRow,
    storeRow.name,
    prodCategory
  );

  const mrpNum = Number(toNumericValue(masterRow.mrp).toFixed(2));
  const otherStoreOffers: OtherStoreOffer[] = [];
  for (const sib of siblingStoreProductRows) {
    const sibStore = siblingStoresById.get(sib.storeId);
    if (!sibStore) continue;
    otherStoreOffers.push({
      storeProductId: sib.id,
      storeId: sibStore.id,
      storeName: sibStore.name,
      area: sibStore.area,
      city: sibStore.city,
      price: Number(toNumericValue(sib.sellingPrice).toFixed(2)),
      mrp: mrpNum,
      quantityAvailable: sib.stockQuantity,
      minOrderAmount: Number(toNumericValue(sibStore.minimumOrderAmount).toFixed(2)),
    });
  }

  return {
    product,
    store,
    otherStoreOffers,
  };
}

/**
 * Request-time Server Component wrapper for `/`, `/stores`, and `/products`.
 */
export async function getCustomerMarketplaceData(): Promise<CustomerMarketplaceSnapshot> {
  await connection();
  const { prisma } = await import('@/lib/prisma');
  return queryVisibleMarketplaceSnapshot(prisma);
}

/**
 * Request-time Server Component wrapper for `/stores/[id]`.
 */
export async function getCustomerStoreDetail(
  storeId: string
): Promise<CustomerStoreDetailResult | null> {
  await connection();
  const { prisma } = await import('@/lib/prisma');
  return queryCustomerStoreDetail(prisma, storeId);
}

/**
 * Request-time Server Component wrapper for `/products/[id]`.
 */
export async function getCustomerStoreProductDetail(
  storeProductId: string
): Promise<CustomerProductDetailResult | null> {
  await connection();
  const { prisma } = await import('@/lib/prisma');
  return queryCustomerStoreProductDetail(prisma, storeProductId);
}
