export type AdminCatalogUnitType =
  | 'G'
  | 'KG'
  | 'ML'
  | 'L'
  | 'PIECE'
  | 'PACK'
  | 'DOZEN';

export const ADMIN_CATALOG_UNIT_OPTIONS: {
  value: AdminCatalogUnitType;
  label: string;
}[] = [
  { value: 'G', label: 'Grams (g)' },
  { value: 'KG', label: 'Kilograms (kg)' },
  { value: 'ML', label: 'Millilitres (ml)' },
  { value: 'L', label: 'Litres (L)' },
  { value: 'PIECE', label: 'Piece(s) (pc / pcs)' },
  { value: 'PACK', label: 'Pack(s)' },
  { value: 'DOZEN', label: 'Dozen' },
];

export interface AdminCatalogCategoryDto {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  description: string;
  iconEmoji: string;
  active: boolean;
  productCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
}

export interface AdminCatalogProductDto {
  id: string;
  sku: string;
  categoryId: string;
  category: string;
  categoryActive: boolean;
  name: string;
  brand: string;
  unitValue: number;
  unitType: AdminCatalogUnitType;
  unit: string;
  mrp: number;
  image: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  storesListingCount: number;
  minVendorPrice: number | null;
  maxVendorPrice: number | null;
  vendorPriceRangeLabel: string;
}

export interface AdminCatalogSnapshotDto {
  categories: AdminCatalogCategoryDto[];
  products: AdminCatalogProductDto[];
}

export interface AdminMasterProductInput {
  name: string;
  brand?: string;
  categoryId: string;
  unitValue: number;
  unitType: AdminCatalogUnitType;
  mrp: number;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
}

export type AdminCatalogMutationResult =
  | {
      success: true;
      product: AdminCatalogProductDto;
      snapshot: AdminCatalogSnapshotDto;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };
