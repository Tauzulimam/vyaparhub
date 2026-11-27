'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  createMasterProductAction,
  setMasterProductActiveStatusAction,
  updateMasterProductAction,
} from '@/lib/admin/catalog/actions';
import {
  ADMIN_CATALOG_UNIT_OPTIONS,
  type AdminCatalogCategoryDto,
  type AdminCatalogProductDto,
  type AdminCatalogSnapshotDto,
  type AdminCatalogUnitType,
} from '@/lib/admin/catalog/types';
import type { ProductImageUploadResult } from '@/lib/admin/catalog/imageUpload';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Icon } from '@/components/vendor/Icon';

type CatalogStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type CatalogViewMode = 'TABLE' | 'GRID';

const CATALOG_IMAGE_PRESETS: { label: string; path: string }[] = [
  {
    label: 'Grocery — Staples, Flour & Grains',
    path: '/images/products/atta-grains.svg',
  },
  {
    label: 'Grocery — Cooking Oil, Spices & Noodles',
    path: '/images/products/cooking-oil-spices.svg',
  },
  {
    label: 'Dairy — Fresh Milk Pouch / Bottle',
    path: '/images/products/dairy-milk.svg',
  },
  {
    label: 'Dairy — Paneer, Curd & Table Butter',
    path: '/images/products/dairy-paneer-curd.svg',
  },
  {
    label: 'Dairy — Farm Fresh Eggs Pack',
    path: '/images/products/farm-eggs.svg',
  },
  {
    label: 'Bakery — Bread, Toast & Biscuits',
    path: '/images/products/bakery-bread.svg',
  },
  {
    label: 'Pharmacy — Wellness, Antiseptic & ORS',
    path: '/images/products/pharmacy-care.svg',
  },
  {
    label: 'Stationery — Notebooks & Office Pens',
    path: '/images/products/stationery-supplies.svg',
  },
  {
    label: 'Electronics — Earphones, Cables & Bulbs',
    path: '/images/products/electronics-accessories.svg',
  },
  {
    label: 'Pet Care — Dog & Cat Nutrition',
    path: '/images/products/pet-nutrition.svg',
  },
  {
    label: 'Home & Hygiene — Detergent, Soap & Dishwash',
    path: '/images/products/household-cleaning.svg',
  },
  {
    label: 'Generic Fallback Product Placeholder',
    path: '/images/placeholder-product.svg',
  },
];

function formatCatalogCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCatalogDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function previewUnitLabel(unitValueRaw: string, unitType: AdminCatalogUnitType): string {
  const num = Number(unitValueRaw);
  if (!Number.isFinite(num) || num <= 0) {
    return '—';
  }
  const clean = Number(num.toFixed(3));
  switch (unitType) {
    case 'G':
      return `${clean} g`;
    case 'KG':
      return `${clean} kg`;
    case 'ML':
      return `${clean} ml`;
    case 'L':
      return `${clean} L`;
    case 'PIECE':
      return `${clean} ${clean === 1 ? 'pc' : 'pcs'}`;
    case 'PACK':
      return `${clean} ${clean === 1 ? 'pack' : 'packs'}`;
    case 'DOZEN':
      return `${clean} dozen`;
    default:
      return `${clean}`;
  }
}

type ImageUploadUiState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'uploaded'; imageUrl: string; message: string }
  | { status: 'invalid_file'; message: string }
  | { status: 'too_large'; message: string }
  | { status: 'failed'; message: string };

const MAX_CLIENT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_CLIENT_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

interface ProductFormState {
  name: string;
  brand: string;
  categoryId: string;
  unitValue: string;
  unitType: AdminCatalogUnitType;
  mrp: string;
  imageUrl: string;
  description: string;
  isActive: boolean;
}

interface AdminCatalogClientProps {
  initialSnapshot: AdminCatalogSnapshotDto;
}

function resolveInitialCategoryFilter(
  rawParam: string | null,
  categories: AdminCatalogCategoryDto[]
): string {
  if (!rawParam || rawParam === 'ALL') return 'ALL';
  const matched = categories.find(
    (c) =>
      c.id === rawParam ||
      c.slug.toLowerCase() === rawParam.toLowerCase() ||
      c.name.toLowerCase() === rawParam.toLowerCase()
  );
  return matched ? matched.id : 'ALL';
}

export default function AdminCatalogClient({
  initialSnapshot,
}: AdminCatalogClientProps) {
  const searchParams = useSearchParams();

  const [prevInitialSnapshot, setPrevInitialSnapshot] =
    useState<AdminCatalogSnapshotDto>(initialSnapshot);
  const [snapshot, setSnapshot] = useState<AdminCatalogSnapshotDto>(initialSnapshot);

  if (prevInitialSnapshot !== initialSnapshot) {
    setPrevInitialSnapshot(initialSnapshot);
    setSnapshot(initialSnapshot);
  }

  const { categories, products: catalogProducts } = snapshot;

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() =>
    resolveInitialCategoryFilter(searchParams.get('category'), categories)
  );
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>('ALL');
  const [viewMode, setViewMode] = useState<CatalogViewMode>('TABLE');

  const [detailProduct, setDetailProduct] = useState<AdminCatalogProductDto | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminCatalogProductDto | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] =
    useState<AdminCatalogProductDto | null>(null);

  const [feedbackBanner, setFeedbackBanner] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  const defaultCategoryId = useMemo(() => {
    return (
      categories.find((c) => c.active)?.id ||
      categories[0]?.id ||
      ''
    );
  }, [categories]);

  const [formState, setFormState] = useState<ProductFormState>({
    name: '',
    brand: '',
    categoryId: defaultCategoryId,
    unitValue: '500',
    unitType: 'G',
    mrp: '100',
    imageUrl: '/images/placeholder-product.svg',
    description: '',
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSavingForm, setIsSavingForm] = useState<boolean>(false);
  const [uploadUiState, setUploadUiState] = useState<ImageUploadUiState>({
    status: 'idle',
  });
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const total = catalogProducts.length;
    const active = catalogProducts.filter((p) => p.active).length;
    const inactive = total - active;
    const activeCategoriesCount = categories.filter((c) => c.active).length;
    const totalStoreListings = catalogProducts.reduce(
      (s, p) => s + p.storesListingCount,
      0
    );
    return {
      total,
      active,
      inactive,
      activeCategoriesCount,
      totalStoreListings,
    };
  }, [catalogProducts, categories]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogProducts.filter((p) => {
      if (statusFilter === 'ACTIVE' && !p.active) return false;
      if (statusFilter === 'INACTIVE' && p.active) return false;
      if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) {
        return false;
      }

      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchUnit = p.unit.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (
          !matchName &&
          !matchBrand &&
          !matchId &&
          !matchSku &&
          !matchUnit &&
          !matchCat
        ) {
          return false;
        }
      }

      return true;
    });
  }, [catalogProducts, statusFilter, selectedCategoryId, searchQuery]);

  const imageOptionsForModal = useMemo(() => {
    const current = formState.imageUrl.trim();
    if (!current || CATALOG_IMAGE_PRESETS.some((preset) => preset.path === current)) {
      return CATALOG_IMAGE_PRESETS;
    }
    const label = current.startsWith('https://')
      ? 'Uploaded Catalog Image (Supabase Storage)'
      : `Current Image (${current})`;
    return [{ label, path: current }, ...CATALOG_IMAGE_PRESETS];
  }, [formState.imageUrl]);

  const isUploadingImage = uploadUiState.status === 'uploading';
  const isModalBusy = isSavingForm || isUploadingImage;

  const openAddModal = () => {
    setEditingProduct(null);
    const chosenCatId =
      selectedCategoryId !== 'ALL' &&
      categories.some((c) => c.id === selectedCategoryId && c.active)
        ? selectedCategoryId
        : defaultCategoryId;

    setFormState({
      name: '',
      brand: '',
      categoryId: chosenCatId,
      unitValue: '500',
      unitType: 'G',
      mrp: '100',
      imageUrl: '/images/placeholder-product.svg',
      description: '',
      isActive: true,
    });
    setUploadUiState({ status: 'idle' });
    setFormError(null);
    setFieldErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: AdminCatalogProductDto) => {
    setIsAddModalOpen(false);
    setEditingProduct(product);
    setFormState({
      name: product.name,
      brand: product.brand,
      categoryId: product.categoryId,
      unitValue: String(product.unitValue),
      unitType: product.unitType,
      mrp: String(product.mrp),
      imageUrl: product.image,
      description: product.description,
      isActive: product.active,
    });
    setUploadUiState({ status: 'idle' });
    setFormError(null);
    setFieldErrors({});
  };

  const closeFormModal = () => {
    if (isModalBusy) return;
    setIsAddModalOpen(false);
    setEditingProduct(null);
    setUploadUiState({ status: 'idle' });
    setFormError(null);
    setFieldErrors({});
  };

  const handleImageFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    // Reset input value so re-selecting the same file triggers onChange again
    e.target.value = '';
    if (!file || isModalBusy) return;

    if (!ALLOWED_CLIENT_MIME_TYPES.has(file.type.toLowerCase())) {
      setUploadUiState({
        status: 'invalid_file',
        message: 'Invalid file format. Please choose a PNG, JPG/JPEG, or WEBP image.',
      });
      return;
    }

    if (file.size <= 0) {
      setUploadUiState({
        status: 'invalid_file',
        message: 'Selected image file is empty.',
      });
      return;
    }

    if (file.size > MAX_CLIENT_IMAGE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setUploadUiState({
        status: 'too_large',
        message: `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
      });
      return;
    }

    setUploadUiState({ status: 'uploading' });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.imageUrl;
      return next;
    });

    try {
      const body = new FormData();
      body.append('file', file);

      const response = await fetch('/api/admin/catalog/upload-image', {
        method: 'POST',
        body,
      });

      const result = (await response.json()) as ProductImageUploadResult;

      if (!response.ok || !result.success) {
        const code = !result.success ? result.code : 'UPLOAD_FAILED';
        const errMsg =
          !result.success && result.error
            ? result.error
            : 'Could not upload image. Please try again.';

        if (code === 'FILE_TOO_LARGE') {
          setUploadUiState({ status: 'too_large', message: errMsg });
        } else if (code === 'INVALID_FILE_TYPE' || code === 'MISSING_FILE') {
          setUploadUiState({ status: 'invalid_file', message: errMsg });
        } else {
          setUploadUiState({ status: 'failed', message: errMsg });
        }
        return;
      }

      setFormState((prev) => ({
        ...prev,
        imageUrl: result.imageUrl,
      }));
      setUploadUiState({
        status: 'uploaded',
        imageUrl: result.imageUrl,
        message: 'Image uploaded. Save the master product below to persist it.',
      });
    } catch {
      setUploadUiState({
        status: 'failed',
        message: 'Network error while uploading image. Please try again.',
      });
    }
  };

  const handleSaveMasterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isModalBusy) return;

    setFormError(null);
    setFieldErrors({});

    if (!formState.name.trim()) {
      setFormError('Master Product Name is required.');
      return;
    }
    if (!formState.categoryId) {
      setFormError('Please select a Master Category.');
      return;
    }

    const parsedUnitValue = Number(formState.unitValue);
    if (!Number.isFinite(parsedUnitValue) || parsedUnitValue <= 0) {
      setFormError('Unit value must be a positive number (e.g. 500, 1, 2).');
      return;
    }

    const parsedMrp = Number(formState.mrp);
    if (!Number.isFinite(parsedMrp) || parsedMrp <= 0) {
      setFormError('Reference MRP must be greater than ₹0.');
      return;
    }

    setIsSavingForm(true);
    const payload = {
      name: formState.name,
      brand: formState.brand,
      categoryId: formState.categoryId,
      unitValue: parsedUnitValue,
      unitType: formState.unitType,
      mrp: parsedMrp,
      imageUrl: formState.imageUrl,
      description: formState.description,
      isActive: formState.isActive,
    };

    const res = editingProduct
      ? await updateMasterProductAction(editingProduct.id, payload)
      : await createMasterProductAction(payload);

    setIsSavingForm(false);

    if (!res.success) {
      setFormError(res.error);
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      }
      return;
    }

    setSnapshot(res.snapshot);
    if (detailProduct && detailProduct.id === res.product.id) {
      setDetailProduct(res.product);
    }

    setFeedbackBanner({
      text: editingProduct
        ? `Saved changes to "${res.product.name}" (${res.product.sku}). Vendor store prices and stock quantities remain untouched.`
        : `Created master product "${res.product.name}" (${res.product.sku}) in ${res.product.category}.`,
    });

    setIsAddModalOpen(false);
    setEditingProduct(null);
  };

  const handleSetActiveStatus = async (
    product: AdminCatalogProductDto,
    nextActive: boolean
  ) => {
    if (togglingProductId) return;
    setTogglingProductId(product.id);
    setFeedbackBanner(null);

    const res = await setMasterProductActiveStatusAction(product.id, nextActive);
    setTogglingProductId(null);

    if (!res.success) {
      setFeedbackBanner({
        text: res.error,
        isError: true,
      });
      setDeactivateTarget(null);
      return;
    }

    setSnapshot(res.snapshot);
    if (detailProduct?.id === res.product.id) {
      setDetailProduct(res.product);
    }
    setDeactivateTarget(null);
    setFeedbackBanner({
      text: nextActive
        ? `Activated "${res.product.name}" (${res.product.sku}) in the Master Product Catalog.`
        : `Deactivated "${res.product.name}" (${res.product.sku}). Existing store listings and order history remain preserved.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] flex flex-col">
      <AdminHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:underline mb-2"
            >
              <Icon name="back" className="w-3.5 h-3.5" />
              <span>Back to Admin Analytics Dashboard</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#17201A]">
              Master Product Catalog Management
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1">
              Curate standardized PostgreSQL master product identities, brands, pack sizes, reference MRPs, and default images shared across all VyaparHub vendor stores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-end">
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534] transition-colors shadow-xs"
            >
              <Icon name="tag" className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Categories ({categories.length})</span>
            </Link>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#166534] text-white text-xs sm:text-sm font-bold hover:bg-[#14532D] transition-colors shadow-xs"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>Add Master Product</span>
            </button>
          </div>
        </div>

        {/* VyaparHub Master Catalog Architecture Callout */}
        <section
          aria-label="Master catalog governance boundary"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="catalog" className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-[#17201A]">
                VyaparHub Two-Tier Catalog Architecture
              </div>
              <p className="text-[#647067]">
                <strong className="text-[#166534]">Admin Controls:</strong>{' '}
                Master Product Identity, Name, Brand, Category, Standardized Unit/Pack Size, Reference MRP, Default Image &amp; Catalog Status.{' '}
                <strong className="text-[#B45309]">Vendor Controls:</strong>{' '}
                Store-Specific Selling Price, Stock Quantity &amp; Store Availability. Editing a master product never overwrites vendor prices or inventory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-[#166534] bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl px-3 py-2 shrink-0 self-start lg:self-center">
            <span>Master Product</span>
            <span>→</span>
            <span>Vendor Selects</span>
            <span>→</span>
            <span className="text-[#B45309]">Store Price &amp; Stock</span>
          </div>
        </section>

        {/* Feedback Banner */}
        {feedbackBanner && (
          <div
            role={feedbackBanner.isError ? 'alert' : 'status'}
            className={`rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 border ${
              feedbackBanner.isError
                ? 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]'
                : 'bg-[#166534]/10 border-[#166534]/30 text-[#166534]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon
                name={feedbackBanner.isError ? 'alert' : 'check'}
                className="w-4 h-4 shrink-0"
              />
              <span>{feedbackBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs font-bold hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <section
          aria-label="Master catalog summary cards"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                statusFilter === 'ALL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Total Master Products
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.total}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                statusFilter === 'ALL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              PostgreSQL SKUs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                statusFilter === 'ACTIVE' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Active in Catalog
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                statusFilter === 'ACTIVE' ? 'text-white' : 'text-[#166534]'
              }`}
            >
              {counts.active}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                statusFilter === 'ACTIVE' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Available to vendors
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              statusFilter === 'INACTIVE'
                ? 'bg-[#B45309] text-white border-[#B45309] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#B45309]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                statusFilter === 'INACTIVE' ? 'text-white/85' : 'text-[#647067]'
              }`}
            >
              Inactive / Archived
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                statusFilter === 'INACTIVE' ? 'text-white' : 'text-[#B45309]'
              }`}
            >
              {counts.inactive}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                statusFilter === 'INACTIVE' ? 'text-white/85' : 'text-[#647067]'
              }`}
            >
              Hidden from new selection
            </span>
          </button>

          <div className="bg-white border border-[#E2E8E3] rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-[#647067] block">
              Active Categories
            </span>
            <strong className="text-2xl font-black text-[#17201A] mt-1 block">
              {counts.activeCategoriesCount}
            </strong>
            <span className="text-[11px] text-[#647067] mt-1 block">
              Database categories
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white border border-[#E2E8E3] rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-[#647067] block">
              Vendor Store Listings
            </span>
            <strong className="text-2xl font-black text-[#166534] mt-1 block">
              {counts.totalStoreListings}
            </strong>
            <span className="text-[11px] text-[#647067] mt-1 block">
              Live store adoptions
            </span>
          </div>
        </section>

        {/* Filter Bar: Status + Category + Search + View Mode */}
        <section
          aria-label="Catalog filters"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs space-y-3.5"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Active / Inactive Filter + View Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Catalog status filter"
                className="inline-flex items-center bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-1"
              >
                {(
                  [
                    { id: 'ALL', label: `All (${counts.total})` },
                    { id: 'ACTIVE', label: `Active (${counts.active})` },
                    { id: 'INACTIVE', label: `Inactive (${counts.inactive})` },
                  ] as { id: CatalogStatusFilter; label: string }[]
                ).map((st) => {
                  const active = statusFilter === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      aria-pressed={active}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#166534] text-white shadow-xs'
                          : 'text-[#647067] hover:text-[#17201A]'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label="Catalog layout view mode"
                className="inline-flex items-center bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-1"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  aria-pressed={viewMode === 'TABLE'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    viewMode === 'TABLE'
                      ? 'bg-white text-[#166534] shadow-xs border border-[#E2E8E3]'
                      : 'text-[#647067] hover:text-[#17201A]'
                  }`}
                >
                  Table View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  aria-pressed={viewMode === 'GRID'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    viewMode === 'GRID'
                      ? 'bg-white text-[#166534] shadow-xs border border-[#E2E8E3]'
                      : 'text-[#647067] hover:text-[#17201A]'
                  }`}
                >
                  Grid View
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-88">
              <Icon
                name="search"
                className="w-4 h-4 text-[#647067] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search master product, brand, SKU, or pack size..."
                aria-label="Search master catalog"
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs sm:text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear catalog search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#647067] hover:text-[#17201A] px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Strip (Real PostgreSQL Categories) */}
          <div className="pt-2.5 border-t border-[#E2E8E3] flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('ALL')}
              aria-pressed={selectedCategoryId === 'ALL'}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedCategoryId === 'ALL'
                  ? 'bg-[#166534] text-white shadow-xs'
                  : 'bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A] hover:border-[#166534]'
              }`}
            >
              All Categories ({catalogProducts.length})
            </button>
            {categories.map((cat) => {
              const active = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  aria-pressed={active}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#166534] text-white shadow-xs'
                      : 'bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A] hover:border-[#166534]'
                  }`}
                >
                  <span aria-hidden="true">{cat.iconEmoji}</span>
                  <span>{cat.shortName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-[#647067] border border-[#E2E8E3]'
                    }`}
                  >
                    {cat.productCount}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Master Catalog Products Display */}
        {filteredProducts.length === 0 ? (
          <section className="bg-white border border-[#E2E8E3] rounded-2xl p-12 text-center space-y-2 shadow-xs">
            <p className="text-base font-bold text-[#17201A]">
              No master products match your filters
            </p>
            <p className="text-xs text-[#647067] max-w-sm mx-auto">
              Try clearing your search query, selecting &ldquo;All Categories&rdquo;, or adding a new standardized product to the master catalog.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId('ALL');
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8E3] bg-white text-xs font-semibold text-[#17201A] hover:border-[#166534]"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D]"
              >
                + Add Master Product
              </button>
            </div>
          </section>
        ) : viewMode === 'GRID' ? (
          /* Grid View */
          <section
            aria-label="Master catalog grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredProducts.map((p) => {
              const isBusy = togglingProductId === p.id;
              return (
                <article
                  key={p.id}
                  className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-12 h-12 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-[#B45309]">
                              {p.sku}
                            </span>
                          </div>
                          <h2 className="text-sm font-black text-[#17201A] leading-snug truncate">
                            {p.name}
                          </h2>
                          <p className="text-xs text-[#647067]">
                            {p.brand || 'Generic'} •{' '}
                            <strong className="text-[#17201A]">{p.unit}</strong>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                          p.active
                            ? 'bg-[#166534]/10 text-[#166534]'
                            : 'bg-[#E2E8E3] text-[#647067]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.active ? 'bg-[#166534]' : 'bg-[#647067]'
                          }`}
                        />
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {p.description && (
                      <p className="text-xs text-[#647067] line-clamp-2">
                        {p.description}
                      </p>
                    )}

                    <div className="rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] p-2.5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#647067] block">
                          Reference MRP
                        </span>
                        <strong className="text-sm font-black text-[#17201A]">
                          {formatCatalogCurrency(p.mrp)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#647067] block">
                          Store Adoption
                        </span>
                        <strong className="text-xs font-bold text-[#166534]">
                          {p.storesListingCount}{' '}
                          {p.storesListingCount === 1 ? 'store' : 'stores'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#E2E8E3] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[#647067] truncate">
                      {p.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailProduct(p)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534]"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#166534] hover:border-[#166534]"
                      >
                        Edit
                      </button>
                      {p.active ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setDeactivateTarget(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold hover:bg-[#DC2626]/20 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleSetActiveStatus(p, true)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D] disabled:opacity-50"
                        >
                          {isBusy ? 'Activating…' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          /* Table View (with Mobile Adaptive Cards) */
          <section
            aria-label="Master catalog table"
            className="bg-white border border-[#E2E8E3] rounded-2xl shadow-xs overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8E3] flex flex-wrap items-center justify-between gap-2 text-xs text-[#647067]">
              <span>
                Showing{' '}
                <strong className="text-[#17201A]">
                  {filteredProducts.length}
                </strong>{' '}
                of {counts.total} master catalog products
              </span>
              {(selectedCategoryId !== 'ALL' ||
                statusFilter !== 'ALL' ||
                searchQuery.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId('ALL');
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="font-semibold text-[#166534] hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Mobile & Tablet Cards */}
            <div className="lg:hidden divide-y divide-[#E2E8E3]">
              {filteredProducts.map((p) => {
                const isBusy = togglingProductId === p.id;
                return (
                  <article key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-11 h-11 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-[#B45309]">
                            {p.sku}
                          </span>
                          <h2 className="text-sm font-black text-[#17201A] truncate">
                            {p.name}
                          </h2>
                          <p className="text-xs text-[#647067]">
                            {p.brand || 'Generic'} • {p.unit} • MRP{' '}
                            {formatCatalogCurrency(p.mrp)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                          p.active
                            ? 'bg-[#166534]/10 text-[#166534]'
                            : 'bg-[#E2E8E3] text-[#647067]'
                        }`}
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-[#647067]">
                        {p.category} • {p.storesListingCount}{' '}
                        {p.storesListingCount === 1 ? 'store' : 'stores'} listing
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailProduct(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#17201A]"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#166534]"
                        >
                          Edit
                        </button>
                        {p.active ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setDeactivateTarget(p)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleSetActiveStatus(p, true)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#166534] text-white text-xs font-semibold disabled:opacity-50"
                          >
                            {isBusy ? 'Activating…' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAF7] border-b border-[#E2E8E3] text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                    <th className="py-3 px-4">Master Product</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Unit / Pack Size</th>
                    <th className="py-3 px-4">Reference MRP</th>
                    <th className="py-3 px-4">Vendor Adoption</th>
                    <th className="py-3 px-4">Catalog Status</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E3] text-xs">
                  {filteredProducts.map((p) => {
                    const isBusy = togglingProductId === p.id;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-[#F8FAF7]/70 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] object-cover shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase text-[#B45309]">
                                  {p.sku}
                                </span>
                              </div>
                              <div className="font-bold text-[#17201A] text-sm">
                                {p.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-[#17201A]">
                          {p.brand || 'Generic'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#F8FAF7] border border-[#E2E8E3] text-[11px] font-semibold text-[#17201A]">
                            {p.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-[#17201A]">
                          {p.unit}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <strong className="font-black text-[#17201A]">
                            {formatCatalogCurrency(p.mrp)}
                          </strong>
                          <span className="block text-[10px] text-[#647067]">
                            Max retail price
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-[#166534]">
                            {p.storesListingCount}{' '}
                            {p.storesListingCount === 1 ? 'store' : 'stores'}
                          </span>
                          <span className="block text-[10px] text-[#647067]">
                            Store price: {p.vendorPriceRangeLabel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              p.active
                                ? 'bg-[#166534]/10 text-[#166534]'
                                : 'bg-[#E2E8E3] text-[#647067]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.active ? 'bg-[#166534]' : 'bg-[#647067]'
                              }`}
                            />
                            {p.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-[#647067]">
                          {formatCatalogDate(p.updatedAt)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailProduct(p)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534]"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#166534] hover:border-[#166534]"
                            >
                              <Icon name="edit" className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            {p.active ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setDeactivateTarget(p)}
                                className="px-2.5 py-1.5 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold hover:bg-[#DC2626]/20 disabled:opacity-50"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleSetActiveStatus(p, true)}
                                className="px-2.5 py-1.5 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D] disabled:opacity-50"
                              >
                                {isBusy ? 'Activating…' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Master Product Details Modal */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="master-product-detail-title"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-4">
              <div className="flex items-center gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detailProduct.image}
                  alt={detailProduct.name}
                  className="w-14 h-14 rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] object-cover shrink-0"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase text-[#B45309]">
                      {detailProduct.sku}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        detailProduct.active
                          ? 'bg-[#166534]/10 text-[#166534]'
                          : 'bg-[#E2E8E3] text-[#647067]'
                      }`}
                    >
                      {detailProduct.active
                        ? 'Active Master Product'
                        : 'Inactive / Archived'}
                    </span>
                  </div>
                  <h2
                    id="master-product-detail-title"
                    className="text-lg sm:text-xl font-black text-[#17201A] mt-0.5"
                  >
                    {detailProduct.name}
                  </h2>
                  <p className="text-xs text-[#647067]">
                    Brand:{' '}
                    <strong className="text-[#17201A]">
                      {detailProduct.brand || 'Generic'}
                    </strong>{' '}
                    • Category: {detailProduct.category}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                aria-label="Close product details"
                className="p-2 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  Admin-Controlled Master Specifications
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Catalog SKU:</dt>
                    <dd className="font-mono font-bold text-[#17201A]">
                      {detailProduct.sku}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Brand:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {detailProduct.brand || 'Generic'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Master Category:</dt>
                    <dd className="font-semibold text-[#17201A]">
                      {detailProduct.category}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Standardized Unit:</dt>
                    <dd className="font-bold text-[#166534]">
                      {detailProduct.unit}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Reference MRP:</dt>
                    <dd className="font-black text-[#17201A]">
                      {formatCatalogCurrency(detailProduct.mrp)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Created / Updated:</dt>
                    <dd className="text-[#17201A]">
                      {formatCatalogDate(detailProduct.createdAt)} /{' '}
                      {formatCatalogDate(detailProduct.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                  Vendor Store Adoption (Read-Only Boundary)
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Stores Listing SKU:</dt>
                    <dd className="font-black text-[#166534]">
                      {detailProduct.storesListingCount}{' '}
                      {detailProduct.storesListingCount === 1
                        ? 'vendor store'
                        : 'vendor stores'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Vendor Selling Prices:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {detailProduct.vendorPriceRangeLabel}
                    </dd>
                  </div>
                  <div className="pt-2 border-t border-[#E2E8E3] text-[11px] text-[#647067] leading-relaxed">
                    Individual selling prices, shelf stock quantities, and store-level availability are managed exclusively by each vendor in the Vendor Portal.
                  </div>
                </dl>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-3.5 text-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#647067] block">
                Standardized Catalog Description
              </span>
              <p className="text-[#17201A]">
                {detailProduct.description || 'No additional description specified.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8E3]">
              <button
                type="button"
                onClick={() => {
                  const target = detailProduct;
                  setDetailProduct(null);
                  openEditModal(target);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-bold hover:bg-[#14532D]"
              >
                <Icon name="edit" className="w-3.5 h-3.5" />
                <span>Edit Master Product</span>
              </button>
              {detailProduct.active ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailProduct;
                    setDetailProduct(null);
                    setDeactivateTarget(target);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-bold hover:bg-[#DC2626]/20"
                >
                  Deactivate Product
                </button>
              ) : (
                <button
                  type="button"
                  disabled={togglingProductId === detailProduct.id}
                  onClick={() => void handleSetActiveStatus(detailProduct, true)}
                  className="px-3.5 py-2 rounded-xl bg-[#166534]/10 text-[#166534] text-xs font-bold hover:bg-[#166534]/20 disabled:opacity-50"
                >
                  {togglingProductId === detailProduct.id
                    ? 'Activating…'
                    : 'Activate Product'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8E3] bg-white text-xs font-semibold text-[#17201A]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Master Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="master-product-form-title"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-3.5">
              <div>
                <h2
                  id="master-product-form-title"
                  className="text-lg sm:text-xl font-black text-[#17201A]"
                >
                  {editingProduct
                    ? `Edit Master Product (${editingProduct.sku})`
                    : 'Add New Master Product'}
                </h2>
                <p className="text-xs text-[#647067] mt-0.5">
                  {editingProduct
                    ? 'Updates PostgreSQL MasterProduct attributes without overwriting vendor store selling prices or inventory.'
                    : 'Create a standardized PostgreSQL MasterProduct entry that vendors can select and list in their stores.'}
                </p>
              </div>
              <button
                type="button"
                disabled={isSavingForm}
                onClick={closeFormModal}
                aria-label="Close product form"
                className="p-2 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A] disabled:opacity-50"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 px-3.5 py-2.5 text-xs font-semibold text-[#DC2626]"
              >
                ⚠ {formError}
              </div>
            )}

            <form
              onSubmit={(e) => void handleSaveMasterProduct(e)}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="mp-name"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Master Product Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="mp-name"
                    type="text"
                    required
                    disabled={isSavingForm}
                    value={formState.name}
                    onChange={(e) =>
                      setFormState({ ...formState, name: e.target.value })
                    }
                    placeholder="e.g. Aashirvaad Select Sharbati Whole Wheat Atta"
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-medium text-[#17201A] focus:outline-none focus:border-[#166534]"
                  />
                  {fieldErrors.name && (
                    <span className="block mt-1 text-[11px] text-[#DC2626]">
                      {fieldErrors.name}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mp-brand"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Brand
                  </label>
                  <input
                    id="mp-brand"
                    type="text"
                    disabled={isSavingForm}
                    value={formState.brand}
                    onChange={(e) =>
                      setFormState({ ...formState, brand: e.target.value })
                    }
                    placeholder="e.g. Aashirvaad, Amul, Cipla"
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-medium text-[#17201A] focus:outline-none focus:border-[#166534]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mp-category"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Master Category <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    id="mp-category"
                    disabled={isSavingForm}
                    value={formState.categoryId}
                    onChange={(e) =>
                      setFormState({ ...formState, categoryId: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-semibold text-[#17201A] focus:outline-none focus:border-[#166534]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {!c.active ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.categoryId && (
                    <span className="block mt-1 text-[11px] text-[#DC2626]">
                      {fieldErrors.categoryId}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mp-unit-value"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Unit Quantity / Pack Size <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id="mp-unit-value"
                      type="number"
                      min={0.001}
                      step="any"
                      required
                      disabled={isSavingForm}
                      value={formState.unitValue}
                      onChange={(e) =>
                        setFormState({ ...formState, unitValue: e.target.value })
                      }
                      placeholder="e.g. 500"
                      className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-bold text-[#17201A] focus:outline-none focus:border-[#166534]"
                    />
                    <select
                      aria-label="Unit type"
                      disabled={isSavingForm}
                      value={formState.unitType}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          unitType: e.target.value as AdminCatalogUnitType,
                        })
                      }
                      className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-2.5 py-2 text-xs font-semibold text-[#17201A] focus:outline-none focus:border-[#166534]"
                    >
                      {ADMIN_CATALOG_UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[10px] text-[#647067] mt-0.5 block">
                    Formatted label:{' '}
                    <strong className="text-[#166534]">
                      {previewUnitLabel(formState.unitValue, formState.unitType)}
                    </strong>
                  </span>
                  {(fieldErrors.unitValue || fieldErrors.unitType) && (
                    <span className="block mt-0.5 text-[11px] text-[#DC2626]">
                      {fieldErrors.unitValue || fieldErrors.unitType}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mp-mrp"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Reference MRP (₹) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="mp-mrp"
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    disabled={isSavingForm}
                    value={formState.mrp}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        mrp: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-bold text-[#17201A] focus:outline-none focus:border-[#166534]"
                  />
                  <span className="text-[10px] text-[#647067] mt-0.5 block">
                    {editingProduct && editingProduct.maxVendorPrice !== null
                      ? `Highest store selling price: ₹${editingProduct.maxVendorPrice}. MRP cannot be set below existing store prices.`
                      : 'Reference ceiling price; vendors set their own store selling price.'}
                  </span>
                  {fieldErrors.mrp && (
                    <span className="block mt-0.5 text-[11px] text-[#DC2626]">
                      {fieldErrors.mrp}
                    </span>
                  )}
                </div>

                {/* Master Product Image Selector + Upload */}
                <div className="sm:col-span-2 rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#17201A]">
                      Master Product Image
                    </span>
                    <span className="text-[11px] text-[#647067]">
                      Upload PNG, JPG/JPEG, or WEBP (max 5 MB) or select a preset
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formState.imageUrl || '/images/placeholder-product.svg'}
                      alt="Master product preview"
                      className="w-16 h-16 rounded-xl bg-white border border-[#E2E8E3] object-contain p-1 shrink-0"
                    />
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                            isModalBusy
                              ? 'bg-white border-[#E2E8E3] text-[#647067] opacity-60 cursor-not-allowed'
                              : 'bg-[#166534] border-[#166534] text-white hover:bg-[#14532D] cursor-pointer shadow-xs'
                          }`}
                        >
                          <Icon name="plus" className="w-3.5 h-3.5" />
                          <span>
                            {isUploadingImage ? 'Uploading Image…' : 'Upload Image'}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={isModalBusy}
                            className="hidden"
                            onChange={(e) => void handleImageFileSelect(e)}
                          />
                        </label>
                        <span className="text-[11px] text-[#647067]">
                          or choose a built-in preset below:
                        </span>
                      </div>

                      <select
                        aria-label="Select master product artwork"
                        disabled={isModalBusy}
                        value={formState.imageUrl}
                        onChange={(e) => {
                          setFormState({ ...formState, imageUrl: e.target.value });
                          setUploadUiState({ status: 'idle' });
                        }}
                        className="w-full rounded-xl border border-[#E2E8E3] bg-white px-3 py-2 text-xs font-medium text-[#17201A] focus:outline-none focus:border-[#166534]"
                      >
                        {imageOptionsForModal.map((preset) => (
                          <option key={preset.path} value={preset.path}>
                            {preset.path.startsWith('https://')
                              ? preset.label
                              : `${preset.label} (${preset.path})`}
                          </option>
                        ))}
                      </select>

                      {uploadUiState.status === 'uploading' && (
                        <div
                          role="status"
                          className="flex items-center gap-2 text-[11px] font-semibold text-[#166534]"
                        >
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#166534] border-t-transparent animate-spin shrink-0" />
                          <span>Uploading image to Supabase Storage…</span>
                        </div>
                      )}

                      {uploadUiState.status === 'uploaded' && (
                        <div
                          role="status"
                          className="rounded-lg bg-[#166534]/10 border border-[#166534]/25 px-2.5 py-1.5 text-[11px] font-semibold text-[#166534]"
                        >
                          ✓ {uploadUiState.message}
                        </div>
                      )}

                      {(uploadUiState.status === 'invalid_file' ||
                        uploadUiState.status === 'too_large' ||
                        uploadUiState.status === 'failed') && (
                        <div
                          role="alert"
                          className="rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/25 px-2.5 py-1.5 text-[11px] font-semibold text-[#DC2626]"
                        >
                          ⚠ {uploadUiState.message}
                        </div>
                      )}

                      {fieldErrors.imageUrl && (
                        <span className="block text-[11px] text-[#DC2626]">
                          {fieldErrors.imageUrl}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="mp-description"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Standardized Description
                  </label>
                  <textarea
                    id="mp-description"
                    rows={2}
                    disabled={isSavingForm}
                    value={formState.description}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        description: e.target.value,
                      })
                    }
                    placeholder="Concise standardized product description displayed across customer and vendor catalogs..."
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs text-[#17201A] focus:outline-none focus:border-[#166534]"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3.5 py-2.5">
                  <div>
                    <span className="font-bold text-[#17201A] block">
                      Master Catalog Status
                    </span>
                    <span className="text-[11px] text-[#647067]">
                      Active products are immediately selectable by vendors in the Vendor Portal.
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isSavingForm}
                      checked={formState.isActive}
                      onChange={(e) =>
                        setFormState({ ...formState, isActive: e.target.checked })
                      }
                      className="rounded border-[#E2E8E3] text-[#166534] focus:ring-[#166534]"
                    />
                    <span className="font-bold text-[#166534]">
                      {formState.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E3]">
                <button
                  type="button"
                  disabled={isModalBusy}
                  onClick={closeFormModal}
                  className="px-4 py-2 rounded-xl border border-[#E2E8E3] bg-white text-xs font-semibold text-[#17201A] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isModalBusy}
                  className="px-4 py-2 rounded-xl bg-[#166534] text-white text-xs font-bold hover:bg-[#14532D] shadow-xs disabled:opacity-50"
                >
                  {isSavingForm
                    ? 'Saving…'
                    : isUploadingImage
                    ? 'Waiting for Upload…'
                    : editingProduct
                    ? 'Save Master Product Changes'
                    : 'Create Master Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deactivating a Master Product */}
      {deactivateTarget && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-mp-title"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-lg w-full shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl border bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30 flex items-center justify-center shrink-0">
                  <Icon name="alert" className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="deactivate-mp-title"
                    className="text-base sm:text-lg font-black text-[#17201A]"
                  >
                    Deactivate &ldquo;{deactivateTarget.name}&rdquo;?
                  </h2>
                  <p className="text-xs font-semibold text-[#647067] mt-0.5">
                    {deactivateTarget.sku} • {deactivateTarget.brand || 'Generic'} (
                    {deactivateTarget.unit})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={togglingProductId === deactivateTarget.id}
                onClick={() => setDeactivateTarget(null)}
                aria-label="Close confirmation dialog"
                className="p-1.5 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A] disabled:opacity-50"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#17201A] leading-relaxed">
              Deactivating this Master Product hides it from new vendor catalog selections and customer storefront discovery. Master products are archived as Inactive in PostgreSQL rather than deleted so historical orders and inventory references remain intact.
            </p>

            <div className="rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3.5 text-xs text-[#B45309] space-y-1">
              <div className="font-bold uppercase tracking-wider text-[11px]">
                Impact Notice
              </div>
              <p className="text-[#17201A] font-medium">
                {deactivateTarget.storesListingCount > 0
                  ? `Currently listed by ${deactivateTarget.storesListingCount} ${
                      deactivateTarget.storesListingCount === 1
                        ? 'vendor store'
                        : 'vendor stores'
                    }. Existing store-specific prices and stock quantities will not be deleted.`
                  : 'No vendor stores are currently listing this product.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8E3]">
              <button
                type="button"
                disabled={togglingProductId === deactivateTarget.id}
                onClick={() => setDeactivateTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8E3] bg-white text-xs font-semibold text-[#17201A] hover:bg-[#F8FAF7] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={togglingProductId === deactivateTarget.id}
                onClick={() =>
                  void handleSetActiveStatus(deactivateTarget, false)
                }
                className="px-4 py-2 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {togglingProductId === deactivateTarget.id
                  ? 'Deactivating…'
                  : 'Confirm Deactivate Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
