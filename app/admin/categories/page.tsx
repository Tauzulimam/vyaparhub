'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatReadableDate } from '@/data/adminAnalyticsData';
import {
  type CategoryFormInput,
  type EnrichedAdminCategory,
  useAdminState,
} from '@/lib/adminStore';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { Icon } from '@/components/vendor/Icon';

type CategoryStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const EMOJI_PRESETS = ['🌾', '🥛', '🥖', '💊', '🧺', '📚', '🔌', '🐾', '🍎', '🧴', '🍱', '📦'];

export default function AdminCategoriesPage() {
  const { categories, actions } = useAdminState();

  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<EnrichedAdminCategory | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<EnrichedAdminCategory | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [formState, setFormState] = useState<CategoryFormInput>({
    name: '',
    shortName: '',
    description: '',
    iconEmoji: '📦',
    active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.active).length;
    const inactive = total - active;
    const totalAssignedProducts = categories.reduce(
      (s, c) => s + c.productCount,
      0
    );
    return {
      total,
      active,
      inactive,
      totalAssignedProducts,
    };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((c) => {
      if (statusFilter === 'ACTIVE' && !c.active) return false;
      if (statusFilter === 'INACTIVE' && c.active) return false;

      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchShort = c.shortName.toLowerCase().includes(q);
        const matchId = c.id.toLowerCase().includes(q);
        const matchDesc = c.description.toLowerCase().includes(q);
        if (!matchName && !matchShort && !matchId && !matchDesc) return false;
      }

      return true;
    });
  }, [categories, statusFilter, searchQuery]);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormState({
      name: '',
      shortName: '',
      description: '',
      iconEmoji: '📦',
      active: true,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (cat: EnrichedAdminCategory) => {
    setIsAddModalOpen(false);
    setEditingCategory(cat);
    setFormState({
      name: cat.name,
      shortName: cat.shortName,
      description: cat.description,
      iconEmoji: cat.iconEmoji,
      active: cat.active,
    });
    setFormError(null);
  };

  const closeFormModal = () => {
    setIsAddModalOpen(false);
    setEditingCategory(null);
    setFormError(null);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      setFormError('Category Name is required.');
      return;
    }
    if (!formState.description.trim()) {
      setFormError('Category Description is required.');
      return;
    }

    const duplicate = categories.find(
      (c) =>
        c.name.toLowerCase() === formState.name.trim().toLowerCase() &&
        c.id !== editingCategory?.id
    );
    if (duplicate) {
      setFormError(`A category named "${duplicate.name}" already exists.`);
      return;
    }

    if (editingCategory) {
      actions.updateCategory(editingCategory.id, formState);
      setFeedbackBanner(
        `Prototype Mock: Updated category "${formState.name.trim()}" (${editingCategory.id}).`
      );
    } else {
      const created = actions.addCategory(formState);
      setFeedbackBanner(
        `Prototype Mock: Added new category "${created.name}" (${created.id}).`
      );
    }

    closeFormModal();
  };

  const handleActivateCategory = (cat: EnrichedAdminCategory) => {
    actions.toggleCategoryStatus(cat.id, true);
    setFeedbackBanner(
      `Prototype Mock: Activated category "${cat.name}" (${cat.id}).`
    );
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
              Marketplace Category Management
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1">
              Manage standardized VyaparHub marketplace categories, visual identifiers, and active/archive states linked to the Master Product Catalog.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-end">
            <Link
              href="/admin/catalog"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534] transition-colors shadow-xs"
            >
              <Icon name="catalog" className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Master Catalog ({counts.totalAssignedProducts} SKUs) →</span>
            </Link>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#166534] text-white text-xs sm:text-sm font-bold hover:bg-[#14532D] transition-colors shadow-xs"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

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
          aria-label="Category summary metrics"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
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
              Total Categories
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.total}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                statusFilter === 'ALL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              VyaparHub taxonomy
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
              Active Categories
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
              Visible in marketplace
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
              No permanent deletion
            </span>
          </button>

          <div className="bg-white border border-[#E2E8E3] rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-[#647067] block">
              Assigned Master Products
            </span>
            <strong className="text-2xl font-black text-[#17201A] mt-1 block">
              {counts.totalAssignedProducts}
            </strong>
            <span className="text-[11px] text-[#166534] font-semibold mt-1 block">
              Synced with Master Catalog
            </span>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section
          aria-label="Filter and search categories"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div
            role="group"
            aria-label="Category status filter"
            className="inline-flex items-center bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-1 self-start"
          >
            {(
              [
                { id: 'ALL', label: `All (${counts.total})` },
                { id: 'ACTIVE', label: `Active (${counts.active})` },
                { id: 'INACTIVE', label: `Inactive (${counts.inactive})` },
              ] as { id: CategoryStatusFilter; label: string }[]
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#166534] text-white shadow-xs'
                      : 'text-[#647067] hover:text-[#17201A]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-84">
            <Icon
              name="search"
              className="w-4 h-4 text-[#647067] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category name, ID, or description..."
              aria-label="Search categories"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs sm:text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear category search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#647067] hover:text-[#17201A] px-1"
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Categories Table & Responsive Cards */}
        <section
          aria-label="Marketplace categories list"
          className="bg-white border border-[#E2E8E3] rounded-2xl shadow-xs overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8E3] flex flex-wrap items-center justify-between gap-2 text-xs text-[#647067]">
            <span>
              Showing{' '}
              <strong className="text-[#17201A]">
                {filteredCategories.length}
              </strong>{' '}
              of {counts.total} categories • Archive/deactivate semantics protect categories with assigned products
            </span>
            {(statusFilter !== 'ALL' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="font-semibold text-[#166534] hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-base font-bold text-[#17201A]">
                No matching categories found
              </p>
              <p className="text-xs text-[#647067] max-w-sm mx-auto">
                No category matches your current search or status filter.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D]"
                >
                  Show All Categories
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile & Tablet Cards */}
              <div className="lg:hidden divide-y divide-[#E2E8E3]">
                {filteredCategories.map((cat) => (
                  <article key={cat.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl bg-[#166534]/10 border border-[#166534]/20 flex items-center justify-center text-xl shrink-0"
                          aria-hidden="true"
                        >
                          {cat.iconEmoji}
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-[#B45309]">
                            {cat.id} • {cat.shortName}
                          </span>
                          <h2 className="text-sm font-black text-[#17201A]">
                            {cat.name}
                          </h2>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          cat.active
                            ? 'bg-[#166534]/10 text-[#166534]'
                            : 'bg-[#E2E8E3] text-[#647067]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cat.active ? 'bg-[#166534]' : 'bg-[#647067]'
                          }`}
                        />
                        {cat.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="text-xs text-[#647067]">{cat.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs text-[#647067]">
                        <strong className="text-[#17201A]">
                          {cat.productCount} master products
                        </strong>{' '}
                        ({cat.activeProductCount} active) • {cat.storeCount} stores
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/catalog?category=${encodeURIComponent(cat.name)}`}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#17201A]"
                        >
                          Products →
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#166534]"
                        >
                          Edit
                        </button>
                        {cat.active ? (
                          <button
                            type="button"
                            onClick={() => setDeactivateTarget(cat)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivateCategory(cat)}
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
                      <th className="py-3 px-4">Icon &amp; Category ID</th>
                      <th className="py-3 px-4">Category Name &amp; Short Label</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Master Product Count</th>
                      <th className="py-3 px-4">Primary Stores</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E3] text-xs">
                    {filteredCategories.map((cat) => (
                      <tr
                        key={cat.id}
                        className="hover:bg-[#F8FAF7]/70 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-10 h-10 rounded-xl bg-[#166534]/10 border border-[#166534]/20 flex items-center justify-center text-lg shrink-0"
                              aria-hidden="true"
                            >
                              {cat.iconEmoji}
                            </div>
                            <div>
                              <span className="font-mono font-bold text-[#B45309] block">
                                {cat.id}
                              </span>
                              <span className="text-[10px] text-[#647067]">
                                /{cat.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#17201A] text-sm">
                            {cat.name}
                          </div>
                          <span className="text-[11px] text-[#647067]">
                            Short label: <strong className="text-[#17201A]">{cat.shortName}</strong>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-[#647067] line-clamp-2">
                            {cat.description}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Link
                            href={`/admin/catalog?category=${encodeURIComponent(cat.name)}`}
                            className="inline-flex items-center gap-1.5 font-black text-[#166534] hover:underline"
                          >
                            <span>
                              {cat.productCount}{' '}
                              {cat.productCount === 1 ? 'Product' : 'Products'}
                            </span>
                            <span>→</span>
                          </Link>
                          <span className="block text-[11px] text-[#647067] mt-0.5">
                            {cat.activeProductCount} active •{' '}
                            {cat.inactiveProductCount} inactive
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Link
                            href={`/admin/stores?q=${encodeURIComponent(cat.shortName)}`}
                            className="font-bold text-[#17201A] hover:text-[#166534] hover:underline"
                          >
                            {cat.storeCount}{' '}
                            {cat.storeCount === 1 ? 'store' : 'stores'}
                          </Link>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              cat.active
                                ? 'bg-[#166534]/10 text-[#166534]'
                                : 'bg-[#E2E8E3] text-[#647067]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                cat.active ? 'bg-[#166534]' : 'bg-[#647067]'
                              }`}
                            />
                            {cat.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-[#647067]">
                          {formatReadableDate(cat.updatedAt)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(cat)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#166534] hover:border-[#166534]"
                            >
                              <Icon name="edit" className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            {cat.active ? (
                              <button
                                type="button"
                                onClick={() => setDeactivateTarget(cat)}
                                className="px-2.5 py-1.5 rounded-xl bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold hover:bg-[#DC2626]/20"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivateCategory(cat)}
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
            </>
          )}
        </section>
      </main>

      {/* Add / Edit Category Modal */}
      {(isAddModalOpen || editingCategory) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-form-modal-title"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-lg w-full shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-3.5">
              <div>
                <h2
                  id="category-form-modal-title"
                  className="text-lg font-black text-[#17201A]"
                >
                  {editingCategory
                    ? `Edit Category (${editingCategory.id})`
                    : 'Add New Marketplace Category'}
                </h2>
                <p className="text-xs text-[#647067] mt-0.5">
                  {editingCategory
                    ? `Linked to ${editingCategory.productCount} master catalog products and ${editingCategory.storeCount} stores.`
                    : 'Define a standardized category for the Master Product Catalog and hyperlocal stores.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                aria-label="Close category form"
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

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label
                  htmlFor="cat-name"
                  className="block font-bold text-[#17201A] mb-1"
                >
                  Full Category Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="cat-name"
                  type="text"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                  placeholder="e.g. Organic Fruits & Vegetables"
                  className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-medium text-[#17201A] focus:outline-none focus:border-[#166534]"
                />
              </div>

              <div>
                <label
                  htmlFor="cat-short-name"
                  className="block font-bold text-[#17201A] mb-1"
                >
                  Short Display Label
                </label>
                <input
                  id="cat-short-name"
                  type="text"
                  value={formState.shortName}
                  onChange={(e) =>
                    setFormState({ ...formState, shortName: e.target.value })
                  }
                  placeholder="e.g. Fruits & Veg (used on compact filter pills & charts)"
                  className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs font-medium text-[#17201A] focus:outline-none focus:border-[#166534]"
                />
              </div>

              <div>
                <span className="block font-bold text-[#17201A] mb-1.5">
                  Visual Icon / Identifier
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {EMOJI_PRESETS.map((emoji) => {
                    const selected = formState.iconEmoji === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          setFormState({ ...formState, iconEmoji: emoji })
                        }
                        className={`w-9 h-9 rounded-xl text-base flex items-center justify-center border transition-colors ${
                          selected
                            ? 'bg-[#166534] text-white border-[#166534]'
                            : 'bg-[#F8FAF7] border-[#E2E8E3] hover:border-[#166534]'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="cat-description"
                  className="block font-bold text-[#17201A] mb-1"
                >
                  Category Description <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  id="cat-description"
                  rows={2}
                  value={formState.description}
                  onChange={(e) =>
                    setFormState({ ...formState, description: e.target.value })
                  }
                  placeholder="Describe the products and neighborhood stores included in this category..."
                  className="w-full rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs text-[#17201A] focus:outline-none focus:border-[#166534]"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3.5 py-2.5">
                <div>
                  <span className="font-bold text-[#17201A] block">
                    Category Status
                  </span>
                  <span className="text-[11px] text-[#647067]">
                    Active categories appear in customer and vendor filters.
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
                  {editingCategory ? 'Save Category Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deactivating a Category */}
      {deactivateTarget && (
        <AdminConfirmModal
          title={`Deactivate "${deactivateTarget.name}"?`}
          subtitle={`Category ID: ${deactivateTarget.id} • ${deactivateTarget.productCount} Assigned Master Products`}
          description="Categories with assigned products or stores are never permanently deleted in VyaparHub. Deactivating archives the category so it is hidden from new product onboarding while preserving existing product and store references."
          warningNote={
            deactivateTarget.productCount > 0
              ? `Warning: This category currently has ${deactivateTarget.productCount} master catalog products (${deactivateTarget.activeProductCount} active) and ${deactivateTarget.storeCount} stores assigned to it. Deactivating will affect category filtering for these products.`
              : 'No master catalog products are currently assigned to this category.'
          }
          confirmLabel="Confirm Deactivate Category"
          tone="warning"
          onCancel={() => setDeactivateTarget(null)}
          onConfirm={() => {
            actions.toggleCategoryStatus(deactivateTarget.id, false);
            setFeedbackBanner(
              `Prototype Mock: Deactivated/archived category "${deactivateTarget.name}" (${deactivateTarget.id}). Assigned products remain intact.`
            );
            setDeactivateTarget(null);
          }}
        />
      )}
    </div>
  );
}
