import type { PrismaClient } from '@/generated/prisma/client';
import { UnitType } from '@/generated/prisma/enums';
import { isValidMasterProductImageUrl } from '@/lib/admin/catalog/imageUpload';
import {
  type AdminCatalogCategoryDto,
  type AdminCatalogMutationResult,
  type AdminCatalogProductDto,
  type AdminCatalogSnapshotDto,
  type AdminCatalogUnitType,
  type AdminMasterProductInput,
} from '@/lib/admin/catalog/types';
import { formatMasterProductUnit, toNumericValue } from '@/lib/vendor/server';

const DEFAULT_PRODUCT_IMAGE = '/images/placeholder-product.svg';
const MAX_UNIT_VALUE = 100_000;
const MAX_MRP_VALUE = 99_999_999.99;

const CATEGORY_EMOJI_BY_SLUG: Record<string, string> = {
  'grocery-staples': '🌾',
  'dairy-sweets': '🥛',
  'bakery-confectionery': '🥖',
  'pharmacy-wellness': '💊',
  'stationery-books': '📚',
  'electronics-mobile': '🔌',
  'pet-supplies': '🐾',
  'general-store': '🧺',
};

const VALID_UNIT_TYPES = new Set<string>(Object.values(UnitType));

const MASTER_PRODUCT_SCALAR_SELECT = {
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
  createdAt: true,
  updatedAt: true,
} as const;

const CATEGORY_SCALAR_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isActive: true,
} as const;

function deriveShortCategoryName(name: string): string {
  const ampIdx = name.indexOf('&');
  if (ampIdx > 3 && name.length > 22) {
    return name.slice(0, ampIdx).trim();
  }
  return name;
}

function deriveProductSku(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = clean.slice(-6).padStart(6, '0');
  return `VH-MP-${suffix}`;
}

function formatDateIso(date: Date): string {
  return date.toISOString();
}

function formatVendorPriceRange(
  count: number,
  minPrice: number | null,
  maxPrice: number | null
): string {
  if (count === 0 || minPrice === null || maxPrice === null) {
    return 'No vendor listings yet';
  }
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  if (Math.abs(maxPrice - minPrice) < 0.009) {
    return fmt(minPrice);
  }
  return `${fmt(minPrice)} – ${fmt(maxPrice)}`;
}

interface ValidatedMasterProductPayload {
  name: string;
  brand: string | null;
  categoryId: string;
  unitValue: number;
  unitType: UnitType;
  mrp: number;
  imageUrl: string;
  description: string | null;
  isActive: boolean;
}

function validateMasterProductPayload(
  input: AdminMasterProductInput
):
  | { valid: true; value: ValidatedMasterProductPayload }
  | { valid: false; error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};

  const name = input.name?.trim() || '';
  if (name.length < 2 || name.length > 140) {
    fieldErrors.name = 'Master product name is required (2 to 140 characters).';
  }

  const rawBrand = input.brand?.trim() || '';
  if (rawBrand.length > 80) {
    fieldErrors.brand = 'Brand name cannot exceed 80 characters.';
  }
  const brand = rawBrand.length > 0 ? rawBrand : null;

  const categoryId = input.categoryId?.trim() || '';
  if (!categoryId) {
    fieldErrors.categoryId = 'Please select a database category.';
  }

  const rawUnitValue = Number(input.unitValue);
  if (!Number.isFinite(rawUnitValue) || rawUnitValue <= 0 || rawUnitValue > MAX_UNIT_VALUE) {
    fieldErrors.unitValue = 'Unit value must be greater than 0 (up to 100,000).';
  } else {
    const scaled = rawUnitValue * 1000;
    if (Math.abs(Math.round(scaled) - scaled) > 1e-6) {
      fieldErrors.unitValue = 'Unit value can have at most 3 decimal places.';
    }
  }
  const unitValue = Number.isFinite(rawUnitValue)
    ? Math.round(rawUnitValue * 1000) / 1000
    : 0;

  const rawUnitType = String(input.unitType || '').trim().toUpperCase();
  if (!VALID_UNIT_TYPES.has(rawUnitType)) {
    fieldErrors.unitType = 'Select a valid standardized unit type.';
  }

  const rawMrp = Number(input.mrp);
  if (!Number.isFinite(rawMrp) || rawMrp <= 0 || rawMrp > MAX_MRP_VALUE) {
    fieldErrors.mrp = 'Reference MRP must be greater than ₹0.';
  } else {
    const scaledMrp = rawMrp * 100;
    if (Math.abs(Math.round(scaledMrp) - scaledMrp) > 1e-6) {
      fieldErrors.mrp = 'Reference MRP can have at most 2 decimal places.';
    }
  }
  const mrp = Number.isFinite(rawMrp) ? Math.round(rawMrp * 100) / 100 : 0;

  const rawImage = input.imageUrl?.trim() || DEFAULT_PRODUCT_IMAGE;
  if (!isValidMasterProductImageUrl(rawImage)) {
    fieldErrors.imageUrl =
      'Product image must be either a built-in /images/... asset path or an uploaded VyaparHub product-images URL.';
  }

  const rawDescription = input.description?.trim() || '';
  if (rawDescription.length > 500) {
    fieldErrors.description = 'Description cannot exceed 500 characters.';
  }
  const description = rawDescription.length > 0 ? rawDescription : null;

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return {
      valid: false,
      error: firstError || 'Please correct the highlighted fields.',
      fieldErrors,
    };
  }

  return {
    valid: true,
    value: {
      name,
      brand,
      categoryId,
      unitValue,
      unitType: rawUnitType as UnitType,
      mrp,
      imageUrl: rawImage,
      description,
      isActive: Boolean(input.isActive),
    },
  };
}

/**
 * Loads the complete real PostgreSQL Master Catalog snapshot (`Category`, `MasterProduct`,
 * and read-only `StoreProduct` adoption statistics) using flat scalar queries.
 */
export async function queryAdminCatalogSnapshot(
  prisma: PrismaClient
): Promise<AdminCatalogSnapshotDto> {
  const [categoryRows, masterRows, storeProductRows] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: CATEGORY_SCALAR_SELECT,
    }),
    prisma.masterProduct.findMany({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: MASTER_PRODUCT_SCALAR_SELECT,
    }),
    prisma.storeProduct.findMany({
      select: {
        masterProductId: true,
        sellingPrice: true,
      },
    }),
  ]);

  const categoriesById = new Map(categoryRows.map((c) => [c.id, c]));

  const adoptionByMasterId = new Map<
    string,
    { count: number; minPrice: number | null; maxPrice: number | null }
  >();
  for (const sp of storeProductRows) {
    const price = Number(toNumericValue(sp.sellingPrice).toFixed(2));
    const current = adoptionByMasterId.get(sp.masterProductId);
    if (!current) {
      adoptionByMasterId.set(sp.masterProductId, {
        count: 1,
        minPrice: price,
        maxPrice: price,
      });
    } else {
      current.count += 1;
      current.minPrice = current.minPrice === null ? price : Math.min(current.minPrice, price);
      current.maxPrice = current.maxPrice === null ? price : Math.max(current.maxPrice, price);
    }
  }

  const productCountsByCatId = new Map<
    string,
    { total: number; active: number; inactive: number }
  >();

  const products: AdminCatalogProductDto[] = masterRows.map((mp) => {
    const cat = categoriesById.get(mp.categoryId);
    const catStats = productCountsByCatId.get(mp.categoryId) ?? {
      total: 0,
      active: 0,
      inactive: 0,
    };
    catStats.total += 1;
    if (mp.isActive) {
      catStats.active += 1;
    } else {
      catStats.inactive += 1;
    }
    productCountsByCatId.set(mp.categoryId, catStats);

    const unitVal = Number(toNumericValue(mp.unitValue).toFixed(3));
    const mrpVal = Number(toNumericValue(mp.mrp).toFixed(2));
    const adoption = adoptionByMasterId.get(mp.id) ?? {
      count: 0,
      minPrice: null,
      maxPrice: null,
    };

    return {
      id: mp.id,
      sku: deriveProductSku(mp.id),
      categoryId: mp.categoryId,
      category: cat?.name ?? 'Uncategorized',
      categoryActive: cat?.isActive ?? false,
      name: mp.name,
      brand: mp.brand ?? '',
      unitValue: unitVal,
      unitType: mp.unitType as AdminCatalogUnitType,
      unit: formatMasterProductUnit(unitVal, mp.unitType),
      mrp: mrpVal,
      image: mp.imageUrl || DEFAULT_PRODUCT_IMAGE,
      description: mp.description ?? '',
      active: mp.isActive,
      createdAt: formatDateIso(mp.createdAt),
      updatedAt: formatDateIso(mp.updatedAt),
      storesListingCount: adoption.count,
      minVendorPrice: adoption.minPrice,
      maxVendorPrice: adoption.maxPrice,
      vendorPriceRangeLabel: formatVendorPriceRange(
        adoption.count,
        adoption.minPrice,
        adoption.maxPrice
      ),
    };
  });

  const categories: AdminCatalogCategoryDto[] = categoryRows.map((c) => {
    const stats = productCountsByCatId.get(c.id) ?? {
      total: 0,
      active: 0,
      inactive: 0,
    };
    return {
      id: c.id,
      name: c.name,
      shortName: deriveShortCategoryName(c.name),
      slug: c.slug,
      description: c.description ?? '',
      iconEmoji: CATEGORY_EMOJI_BY_SLUG[c.slug] ?? '📦',
      active: c.isActive,
      productCount: stats.total,
      activeProductCount: stats.active,
      inactiveProductCount: stats.inactive,
    };
  });

  return {
    categories,
    products,
  };
}

/**
 * Creates a new PostgreSQL `MasterProduct` record.
 */
export async function executeCreateMasterProduct(
  prisma: PrismaClient,
  input: AdminMasterProductInput
): Promise<AdminCatalogMutationResult> {
  const parsed = validateMasterProductPayload(input);
  if (!parsed.valid) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const payload = parsed.value;

  const category = await prisma.category.findUnique({
    where: { id: payload.categoryId },
    select: CATEGORY_SCALAR_SELECT,
  });

  if (!category) {
    return {
      success: false,
      error: 'Selected category does not exist in PostgreSQL.',
      fieldErrors: { categoryId: 'Please select a valid category.' },
    };
  }

  if (payload.isActive && !category.isActive) {
    return {
      success: false,
      error: `Category "${category.name}" is inactive. Activate the category or create the product as Inactive.`,
      fieldErrors: { categoryId: 'Cannot create an active product in an inactive category.' },
    };
  }

  // Prevent exact duplicate SKU identity in the same category
  const duplicate = await prisma.masterProduct.findFirst({
    where: {
      categoryId: category.id,
      name: { equals: payload.name, mode: 'insensitive' },
      brand: payload.brand
        ? { equals: payload.brand, mode: 'insensitive' }
        : null,
      unitValue: payload.unitValue,
      unitType: payload.unitType,
    },
    select: { id: true, name: true },
  });

  if (duplicate) {
    return {
      success: false,
      error: `A master product matching "${payload.name}" (${formatMasterProductUnit(payload.unitValue, payload.unitType)}) already exists in ${category.name}.`,
      fieldErrors: { name: 'Duplicate master product specification in this category.' },
    };
  }

  const created = await prisma.masterProduct.create({
    data: {
      categoryId: category.id,
      name: payload.name,
      brand: payload.brand,
      unitValue: payload.unitValue,
      unitType: payload.unitType,
      mrp: payload.mrp,
      imageUrl: payload.imageUrl,
      description: payload.description,
      isActive: payload.isActive,
    },
    select: { id: true },
  });

  const snapshot = await queryAdminCatalogSnapshot(prisma);
  const product = snapshot.products.find((p) => p.id === created.id);
  if (!product) {
    return {
      success: false,
      error: 'Master product was created, but failed to reload catalog snapshot.',
    };
  }

  return {
    success: true,
    product,
    snapshot,
  };
}

/**
 * Updates an existing PostgreSQL `MasterProduct` record without modifying vendor
 * `StoreProduct.sellingPrice` or `StoreProduct.stockQuantity`.
 * Enforces `newMrp >= max(StoreProduct.sellingPrice)` so existing vendor store prices
 * never exceed the updated reference MRP.
 */
export async function executeUpdateMasterProduct(
  prisma: PrismaClient,
  masterProductId: string,
  input: AdminMasterProductInput
): Promise<AdminCatalogMutationResult> {
  const cleanId = masterProductId?.trim() || '';
  if (!cleanId) {
    return {
      success: false,
      error: 'Invalid master product reference.',
    };
  }

  const parsed = validateMasterProductPayload(input);
  if (!parsed.valid) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const payload = parsed.value;

  const [existing, category, existingStoreListings] = await Promise.all([
    prisma.masterProduct.findUnique({
      where: { id: cleanId },
      select: { id: true },
    }),
    prisma.category.findUnique({
      where: { id: payload.categoryId },
      select: CATEGORY_SCALAR_SELECT,
    }),
    prisma.storeProduct.findMany({
      where: { masterProductId: cleanId },
      select: { sellingPrice: true },
    }),
  ]);

  if (!existing) {
    return {
      success: false,
      error: 'Master product not found in PostgreSQL.',
    };
  }

  if (!category) {
    return {
      success: false,
      error: 'Selected category does not exist in PostgreSQL.',
      fieldErrors: { categoryId: 'Please select a valid category.' },
    };
  }

  if (payload.isActive && !category.isActive) {
    return {
      success: false,
      error: `Category "${category.name}" is inactive. Cannot keep master product Active under an inactive category.`,
      fieldErrors: { categoryId: 'Selected category is inactive.' },
    };
  }

  let maxVendorPrice = 0;
  for (const sp of existingStoreListings) {
    const spPrice = Number(toNumericValue(sp.sellingPrice).toFixed(2));
    if (spPrice > maxVendorPrice) {
      maxVendorPrice = spPrice;
    }
  }

  if (existingStoreListings.length > 0 && payload.mrp < maxVendorPrice - 1e-6) {
    return {
      success: false,
      error: `Reference MRP (₹${payload.mrp}) cannot be set lower than an existing vendor store selling price (₹${maxVendorPrice}).`,
      fieldErrors: {
        mrp: `Must be at least ₹${maxVendorPrice} (highest active store selling price).`,
      },
    };
  }

  const duplicate = await prisma.masterProduct.findFirst({
    where: {
      id: { not: existing.id },
      categoryId: category.id,
      name: { equals: payload.name, mode: 'insensitive' },
      brand: payload.brand
        ? { equals: payload.brand, mode: 'insensitive' }
        : null,
      unitValue: payload.unitValue,
      unitType: payload.unitType,
    },
    select: { id: true },
  });

  if (duplicate) {
    return {
      success: false,
      error: `Another master product in ${category.name} already uses "${payload.name}" (${formatMasterProductUnit(payload.unitValue, payload.unitType)}).`,
      fieldErrors: { name: 'Conflicts with an existing master product in this category.' },
    };
  }

  await prisma.masterProduct.update({
    where: { id: existing.id },
    data: {
      categoryId: category.id,
      name: payload.name,
      brand: payload.brand,
      unitValue: payload.unitValue,
      unitType: payload.unitType,
      mrp: payload.mrp,
      imageUrl: payload.imageUrl,
      description: payload.description,
      isActive: payload.isActive,
    },
    select: { id: true },
  });

  const snapshot = await queryAdminCatalogSnapshot(prisma);
  const product = snapshot.products.find((p) => p.id === existing.id);
  if (!product) {
    return {
      success: false,
      error: 'Master product updated, but failed to reload catalog snapshot.',
    };
  }

  return {
    success: true,
    product,
    snapshot,
  };
}

/**
 * Activates or deactivates (`MasterProduct.isActive`) a PostgreSQL MasterProduct.
 * Never physically deletes `MasterProduct` or vendor `StoreProduct` rows.
 */
export async function executeSetMasterProductActiveStatus(
  prisma: PrismaClient,
  masterProductId: string,
  nextIsActive: boolean
): Promise<AdminCatalogMutationResult> {
  const cleanId = masterProductId?.trim() || '';
  if (!cleanId) {
    return {
      success: false,
      error: 'Invalid master product reference.',
    };
  }

  const existing = await prisma.masterProduct.findUnique({
    where: { id: cleanId },
    select: {
      id: true,
      categoryId: true,
      name: true,
    },
  });

  if (!existing) {
    return {
      success: false,
      error: 'Master product not found in PostgreSQL.',
    };
  }

  if (nextIsActive) {
    const category = await prisma.category.findUnique({
      where: { id: existing.categoryId },
      select: { name: true, isActive: true },
    });
    if (!category || !category.isActive) {
      return {
        success: false,
        error: `Cannot activate "${existing.name}" while its category (${category?.name ?? 'Unknown'}) is inactive.`,
      };
    }
  }

  await prisma.masterProduct.update({
    where: { id: existing.id },
    data: { isActive: Boolean(nextIsActive) },
    select: { id: true },
  });

  const snapshot = await queryAdminCatalogSnapshot(prisma);
  const product = snapshot.products.find((p) => p.id === existing.id);
  if (!product) {
    return {
      success: false,
      error: 'Master product status updated, but failed to reload catalog snapshot.',
    };
  }

  return {
    success: true,
    product,
    snapshot,
  };
}
