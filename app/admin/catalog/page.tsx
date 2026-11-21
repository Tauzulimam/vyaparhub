'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatReadableDate } from '@/data/adminAnalyticsData';
import type { AdminMasterProductRecord } from '@/data/adminManagementData';
import {
  type MasterProductFormInput,
  useAdminState,
} from '@/lib/adminStore';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { formatFullINR } from '@/components/admin/charts/RevenueChart';
import { Icon } from '@/components/vendor/Icon';

type CatalogStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type CatalogViewMode = 'TABLE' | 'GRID';

const MOCK_IMAGE_PRESETS: { label: string; path: string }[] = [
  {
    label: 'Standard Product Placeholder',
    path: '/images/placeholder-product.svg',
  },
  {
    label: 'Category Packaged Goods Placeholder',
    path: '/images/placeholder-category.svg',
  },
  {
    label: 'Storefront Supply Placeholder',
    path: '/images/placeholder-store.svg',
  },
];

function AdminCatalogContent() {
  const searchParams = useSearchParams();
  const { catalogProducts, categories, actions } = useAdminState();

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') || ''
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.get('category') || 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>('ALL');
  const [viewMode, setViewMode] = useState<CatalogViewMode>('TABLE');

  const [detailProduct, setDetailProduct] =
    useState<AdminMasterProductRecord | null>(null);
  const [editingProduct, setEditingProduct] =
    useState<AdminMasterProductRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] =
    useState<AdminMasterProductRecord | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Form state for Add / Edit Master Product
  const [formState, setFormState] = useState<MasterProductFormInput>({
    name: '',
    brand: '',
    category: categories[0]?.name || 'Daily Grocery & Staples',
    unit: '',
    mrp: 100,
    image: '/images/placeholder-product.svg',
    description: '',
    active: true,
  });
  const [mockUploadedFileName, setMockUploadedFileName] = useState<
    string | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);

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
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
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
  }, [catalogProducts, statusFilter, selectedCategory, searchQuery]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormState({
      name: '',
      brand: '',
      category:
        selectedCategory !== 'ALL'
          ? selectedCategory
          : categories[0]?.name || 'Daily Grocery & Staples',
      unit: '',
      mrp: 120,
      image: '/images/placeholder-product.svg',
      description: '',
      active: true,
    });
    setMockUploadedFileName(null);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: AdminMasterProductRecord) => {
    setIsAddModalOpen(false);
    setEditingProduct(product);
    setFormState({
      name: product.name,
      brand: product.brand,
      category: product.category,
      unit: product.unit,
      mrp: product.mrp,
      image: product.image,
      description: product.description,
      active: product.active,
    });
    setMockUploadedFileName(null);
    setFormError(null);
  };

  const closeFormModal = () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
    setFormError(null);
  };

  const handleSaveMasterProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!formState.brand.trim()) {
      setFormError('Brand Name is required.');
      return;
    }
    if (!formState.category.trim()) {
      setFormError('Please select a Master Category.');
      return;
    }
    if (!formState.unit.trim()) {
      setFormError('Standardized Unit / Pack Size is required (e.g. "1 kg pack", "500 ml pouch").');
      return;
    }
    if (!Number.isFinite(Number(formState.mrp)) || Number(formState.mrp) <= 0) {
      setFormError('Reference MRP must be a valid positive amount in ₹.');
      return;
    }
    if (!formState.description.trim()) {
      setFormError('Brief standardized product description is required.');
      return;
    }

    if (editingProduct) {
      actions.updateMasterProduct(editingProduct.id, formState);
      setFeedbackBanner(
        `Prototype Mock: Updated Master Product "${formState.name.trim()}" (${editingProduct.id.toUpperCase()}). Individual vendor store prices & stock quantities were preserved.`
      );
      if (detailProduct?.id === editingProduct.id) {
        setDetailProduct({
          ...editingProduct,
          ...formState,
          name: formState.name.trim(),
          brand: formState.brand.trim(),
          unit: formState.unit.trim(),
          description: formState.description.trim(),
        });
      }
    } else {
      const created = actions.addMasterProduct(formState);
      setFeedbackBanner(
        `Prototype Mock: Added "${created.name}" (${created.id.toUpperCase()}) to the Master Product Catalog.`
      );
    }

    closeFormModal();
  };

  const handleActivateProduct = (product: AdminMasterProductRecord) => {
    actions.toggleMasterProductStatus(product.id, true);
    setFeedbackBanner(
      `Prototype Mock: Activated "${product.name}" (${product.id.toUpperCase()}) in the Master Product Catalog.`
    );
    if (detailProduct?.id === product.id) {
      setDetailProduct({ ...product, active: true });
    }
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
              Curate standardized master product identities, brands, pack sizes, reference MRPs, and default images shared across all VyaparHub vendor stores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-end">
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534] transition-colors shadow-xs"
            >
              <Icon name="tag" className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Manage Categories ({categories.length})</span>
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
            role="status"
            className="rounded-2xl bg-[#166534]/10 border border-[#166534]/30 px-4 py-3 text-xs sm:text-sm font-semibold text-[#166534] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <Icon name="check" className="w-4 h-4 shrink-0" />
              <span>{feedbackBanner}</span>
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
              Standardized SKUs
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
            <Link
              href="/admin/categories"
              className="text-[11px] font-semibold text-[#166534] hover:underline mt-1 block"
            >
              View categories →
            </Link>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white border border-[#E2E8E3] rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-[#647067] block">
              Vendor Store Listings
            </span>
            <strong className="text-2xl font-black text-[#166534] mt-1 block">
              {counts.totalStoreListings}
            </strong>
            <span className="text-[11px] text-[#647067] mt-1 block">
              Store-level adoptions
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

          {/* Category Filter Strip */}
          <div className="pt-2.5 border-t border-[#E2E8E3] flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              aria-pressed={selectedCategory === 'ALL'}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-[#166534] text-white shadow-xs'
                  : 'bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A] hover:border-[#166534]'
              }`}
            >
              All Categories ({catalogProducts.length})
            </button>
            {categories.map((cat) => {
              const active = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
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
                  setSelectedCategory('ALL');
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
            {filteredProducts.map((p) => (
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
                            {p.id.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono text-[#647067]">
                            • {p.sku}
                          </span>
                        </div>
                        <h2 className="text-sm font-black text-[#17201A] leading-snug truncate">
                          {p.name}
                        </h2>
                        <p className="text-xs text-[#647067]">
                          {p.brand} • <strong className="text-[#17201A]">{p.unit}</strong>
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

                  <p className="text-xs text-[#647067] line-clamp-2">
                    {p.description}
                  </p>

                  <div className="rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] p-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#647067] block">
                        Reference MRP
                      </span>
                      <strong className="text-sm font-black text-[#17201A]">
                        {formatFullINR(p.mrp)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#647067] block">
                        Store Adoption
                      </span>
                      <strong className="text-xs font-bold text-[#166534]">
                        {p.storesListingCount} stores
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
                        onClick={() => setDeactivateTarget(p)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold hover:bg-[#DC2626]/20"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActivateProduct(p)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D]"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
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
              {(selectedCategory !== 'ALL' ||
                statusFilter !== 'ALL' ||
                searchQuery.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
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
              {filteredProducts.map((p) => (
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
                          {p.id.toUpperCase()} • {p.sku}
                        </span>
                        <h2 className="text-sm font-black text-[#17201A] truncate">
                          {p.name}
                        </h2>
                        <p className="text-xs text-[#647067]">
                          {p.brand} • {p.unit} • MRP {formatFullINR(p.mrp)}
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
                      {p.category} • {p.storesListingCount} stores listing
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
                          onClick={() => setDeactivateTarget(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivateProduct(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#166534] text-white text-xs font-semibold"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
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
                  {filteredProducts.map((p) => (
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
                                {p.id.toUpperCase()}
                              </span>
                              <span className="text-[10px] font-mono text-[#647067]">
                                • {p.sku}
                              </span>
                            </div>
                            <div className="font-bold text-[#17201A] text-sm">
                              {p.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#17201A]">
                        {p.brand}
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
                          {formatFullINR(p.mrp)}
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
                        {formatReadableDate(p.updatedAt)}
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
                              onClick={() => setDeactivateTarget(p)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold hover:bg-[#DC2626]/20"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivateProduct(p)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D]"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
                      {detailProduct.id.toUpperCase()} • {detailProduct.sku}
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
                    Brand: <strong className="text-[#17201A]">{detailProduct.brand}</strong> • Category: {detailProduct.category}
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
                    <dt className="text-[#647067]">Product ID / SKU:</dt>
                    <dd className="font-mono font-bold text-[#17201A]">
                      {detailProduct.id.toUpperCase()} ({detailProduct.sku})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Brand:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {detailProduct.brand}
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
                      {formatFullINR(detailProduct.mrp)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Created / Updated:</dt>
                    <dd className="text-[#17201A]">
                      {formatReadableDate(detailProduct.createdAt)} /{' '}
                      {formatReadableDate(detailProduct.updatedAt)}
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
                      {detailProduct.storesListingCount} vendor stores
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
              <p className="text-[#17201A]">{detailProduct.description}</p>
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
                  onClick={() => handleActivateProduct(detailProduct)}
                  className="px-3.5 py-2 rounded-xl bg-[#166534]/10 text-[#166534] text-xs font-bold hover:bg-[#166534]/20"
                >
                  Activate Product
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
                    ? `Edit Master Product (${editingProduct.id.toUpperCase()})`
                    : 'Add New Master Product'}
                </h2>
                <p className="text-xs text-[#647067] mt-0.5">
                  {editingProduct
                    ? 'Updates master catalog identity and MRP without overwriting vendor store selling prices or inventory.'
                    : 'Create a standardized master catalog entry that vendors can select and list in their stores.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                aria-label="Close product form"
                className="p-2 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]"
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

            <form onSubmit={handleSaveMasterProduct} className="space-y-4 text-xs">
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
                    value={formState.name}
                    onChange={(e) =>
                      setFormState({ ...formState, name: e.target.value })
                    }
                    placeholder="e.g. Aashirvaad Select Sharbati Whole Wheat Atta"
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-medium text-[#17201A] focus:outline-none focus:border-[#166534]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mp-brand"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Brand <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="mp-brand"
                    type="text"
                    value={formState.brand}
                    onChange={(e) =>
                      setFormState({ ...formState, brand: e.target.value })
                    }
                    placeholder="e.g. Aashirvaad, Amul, Tata"
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
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({ ...formState, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-semibold text-[#17201A] focus:outline-none focus:border-[#166534]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {!c.active ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="mp-unit"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Standardized Unit / Pack Size{' '}
                    <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="mp-unit"
                    type="text"
                    value={formState.unit}
                    onChange={(e) =>
                      setFormState({ ...formState, unit: e.target.value })
                    }
                    placeholder="e.g. 5 kg bag, 500 ml pouch, Pack of 4"
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-medium text-[#17201A] focus:outline-none focus:border-[#166534]"
                  />
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
                    min={1}
                    step={1}
                    value={formState.mrp}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        mrp: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-bold text-[#17201A] focus:outline-none focus:border-[#166534]"
                  />
                  <span className="text-[10px] text-[#647067] mt-0.5 block">
                    Reference ceiling price; vendors set their own store selling price.
                  </span>
                </div>

                {/* Mock Master Image Selector / Upload UI */}
                <div className="sm:col-span-2 rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17201A]">
                      Master Product Image (Phase 2 Mock Upload UI)
                    </span>
                    <span className="text-[11px] text-[#647067]">
                      No cloud upload in Phase 2
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formState.image}
                      alt="Master product preview"
                      className="w-12 h-12 rounded-xl bg-white border border-[#E2E8E3] object-cover shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <select
                        aria-label="Select master product placeholder preset"
                        value={formState.image}
                        onChange={(e) =>
                          setFormState({ ...formState, image: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#E2E8E3] bg-white px-3 py-1.5 text-xs font-medium text-[#17201A]"
                      >
                        {MOCK_IMAGE_PRESETS.map((preset) => (
                          <option key={preset.path} value={preset.path}>
                            {preset.label} ({preset.path})
                          </option>
                        ))}
                      </select>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8E3] text-xs font-semibold text-[#166534] hover:border-[#166534] cursor-pointer">
                          <Icon name="plus" className="w-3.5 h-3.5" />
                          <span>Choose Mock Image File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setMockUploadedFileName(file.name);
                              }
                            }}
                          />
                        </label>
                        {mockUploadedFileName && (
                          <span className="text-[11px] text-[#166534] font-semibold">
                            ✓ Mock selected: {mockUploadedFileName} (mapped to local placeholder)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="mp-description"
                    className="block font-bold text-[#17201A] mb-1"
                  >
                    Standardized Description{' '}
                    <span className="text-[#DC2626]">*</span>
                  </label>
                  <textarea
                    id="mp-description"
                    rows={2}
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
                      checked={formState.active}
                      onChange={(e) =>
                        setFormState({ ...formState, active: e.target.checked })
                      }
                      className="rounded border-[#E2E8E3] text-[#166534] focus:ring-[#166534]"
                    />
                    <span className="font-bold text-[#166534]">
                      {formState.active ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E3]">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="px-4 py-2 rounded-xl border border-[#E2E8E3] bg-white text-xs font-semibold text-[#17201A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#166534] text-white text-xs font-bold hover:bg-[#14532D] shadow-xs"
                >
                  {editingProduct
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
        <AdminConfirmModal
          title={`Deactivate "${deactivateTarget.name}"?`}
          subtitle={`${deactivateTarget.id.toUpperCase()} • ${deactivateTarget.brand} (${deactivateTarget.unit})`}
          description="Deactivating this Master Product hides it from new vendor catalog selections. Master products are archived as Inactive rather than physically deleted to preserve historical order and inventory references."
          warningNote={
            deactivateTarget.storesListingCount > 0
              ? `Currently listed by ${deactivateTarget.storesListingCount} vendor stores. Existing store-specific prices and stock quantities will not be deleted.`
              : 'No vendor stores are currently listing this product.'
          }
          confirmLabel="Confirm Deactivate Product"
          tone="warning"
          onCancel={() => setDeactivateTarget(null)}
          onConfirm={() => {
            actions.toggleMasterProductStatus(deactivateTarget.id, false);
            setFeedbackBanner(
              `Prototype Mock: Deactivated "${deactivateTarget.name}" (${deactivateTarget.id.toUpperCase()}) in the Master Product Catalog.`
            );
            setDeactivateTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function AdminCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] flex flex-col">
          <AdminHeader />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white border border-[#E2E8E3] rounded-2xl p-8 text-center text-sm text-[#647067]">
              Loading Master Product Catalog Management...
            </div>
          </main>
        </div>
      }
    >
      <AdminCatalogContent />
    </Suspense>
  );
}
