'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatReadableDate } from '@/data/adminAnalyticsData';
import type {
  AdminStoreMarketplaceStatus,
  AdminStoreRecord,
  AdminVerificationStatus,
} from '@/data/adminManagementData';
import { useAdminState } from '@/lib/adminStore';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { formatFullINR } from '@/components/admin/charts/RevenueChart';
import { Icon } from '@/components/vendor/Icon';

type StoreFilterTab =
  | 'ALL'
  | 'OPEN'
  | 'CLOSED'
  | 'ACTIVE'
  | 'PENDING_VERIFICATION'
  | 'SUSPENDED'
  | 'GST_REGISTERED'
  | 'NON_GST';

const FILTER_TABS: { id: StoreFilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'GST_REGISTERED', label: 'GST Registered' },
  { id: 'NON_GST', label: 'Non-GST Registered' },
];

const MARKETPLACE_STATUS_BADGE: Record<
  AdminStoreMarketplaceStatus,
  { label: string; className: string; dotClass: string }
> = {
  ACTIVE: {
    label: 'Active in Marketplace',
    className: 'bg-[#166534]/10 text-[#166534] border-[#166534]/20',
    dotClass: 'bg-[#166534]',
  },
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    className: 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30',
    dotClass: 'bg-[#F59E0B]',
  },
  SUSPENDED: {
    label: 'Suspended',
    className: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
    dotClass: 'bg-[#DC2626]',
  },
  REJECTED: {
    label: 'Verification Rejected',
    className: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
    dotClass: 'bg-[#DC2626]',
  },
};

const VERIFICATION_LABEL: Record<AdminVerificationStatus, string> = {
  VERIFIED: 'Verified',
  PENDING: 'Pending Verification',
  REJECTED: 'Rejected',
};

function parseInitialStoreFilter(raw: string | null): StoreFilterTab {
  const upper = (raw || '').toUpperCase();
  if (
    upper === 'OPEN' ||
    upper === 'CLOSED' ||
    upper === 'ACTIVE' ||
    upper === 'PENDING_VERIFICATION' ||
    upper === 'SUSPENDED' ||
    upper === 'GST_REGISTERED' ||
    upper === 'NON_GST'
  ) {
    return upper as StoreFilterTab;
  }
  return 'ALL';
}

function AdminStoresContent() {
  const searchParams = useSearchParams();
  const { stores, actions } = useAdminState();

  const [selectedFilter, setSelectedFilter] = useState<StoreFilterTab>(() =>
    parseInitialStoreFilter(searchParams.get('filter'))
  );
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') || ''
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() =>
    searchParams.get('storeId')
  );
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'REJECT' | 'SUSPEND';
    store: AdminStoreRecord;
  } | null>(null);

  const selectedStore = useMemo(
    () => stores.find((s) => s.storeId === selectedStoreId) ?? null,
    [stores, selectedStoreId]
  );

  const counts = useMemo(() => {
    const total = stores.length;
    const active = stores.filter((s) => s.marketplaceStatus === 'ACTIVE').length;
    const openNow = stores.filter((s) => s.isOpen).length;
    const closed = total - openNow;
    const pendingVerification = stores.filter(
      (s) =>
        s.verificationStatus === 'PENDING' ||
        s.marketplaceStatus === 'PENDING_VERIFICATION'
    ).length;
    const suspended = stores.filter(
      (s) =>
        s.marketplaceStatus === 'SUSPENDED' ||
        s.marketplaceStatus === 'REJECTED'
    ).length;
    const gstRegistered = stores.filter((s) => s.gstRegistered).length;
    const nonGst = total - gstRegistered;

    return {
      ALL: total,
      OPEN: openNow,
      CLOSED: closed,
      ACTIVE: active,
      PENDING_VERIFICATION: pendingVerification,
      SUSPENDED: suspended,
      GST_REGISTERED: gstRegistered,
      NON_GST: nonGst,
    };
  }, [stores]);

  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stores.filter((st) => {
      if (selectedFilter === 'OPEN' && !st.isOpen) return false;
      if (selectedFilter === 'CLOSED' && st.isOpen) return false;
      if (
        selectedFilter === 'ACTIVE' &&
        st.marketplaceStatus !== 'ACTIVE'
      ) {
        return false;
      }
      if (
        selectedFilter === 'PENDING_VERIFICATION' &&
        st.verificationStatus !== 'PENDING' &&
        st.marketplaceStatus !== 'PENDING_VERIFICATION'
      ) {
        return false;
      }
      if (
        selectedFilter === 'SUSPENDED' &&
        st.marketplaceStatus !== 'SUSPENDED' &&
        st.marketplaceStatus !== 'REJECTED'
      ) {
        return false;
      }
      if (selectedFilter === 'GST_REGISTERED' && !st.gstRegistered) {
        return false;
      }
      if (selectedFilter === 'NON_GST' && st.gstRegistered) {
        return false;
      }

      if (q) {
        const matchName = st.storeName.toLowerCase().includes(q);
        const matchId = st.storeId.toLowerCase().includes(q);
        const matchVendor = st.vendorName.toLowerCase().includes(q);
        const matchCat = st.category.toLowerCase().includes(q);
        const matchSector = st.sector.toLowerCase().includes(q);
        if (
          !matchName &&
          !matchId &&
          !matchVendor &&
          !matchCat &&
          !matchSector
        ) {
          return false;
        }
      }

      return true;
    });
  }, [stores, selectedFilter, searchQuery]);

  const handleVerifyStore = (store: AdminStoreRecord) => {
    actions.verifyStore(store.storeId);
    setFeedbackBanner(
      `Prototype Mock: Verified store "${store.storeName}" (${store.storeId.toUpperCase()}). Store is now Active in the marketplace.`
    );
  };

  const handleRestoreStore = (store: AdminStoreRecord) => {
    actions.restoreStore(store.storeId);
    setFeedbackBanner(
      `Prototype Mock: Restored "${store.storeName}" (${store.storeId.toUpperCase()}) to Active marketplace status.`
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
              Marketplace Store Management
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1">
              Monitor individual hyperlocal storefronts, operational open/closed status, GST registration, subscription standing, and marketplace verification.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8E3] rounded-xl px-3.5 py-2 text-xs flex items-center gap-2.5 self-start sm:self-end shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#B45309]" />
            <div>
              <span className="text-[#647067] block text-[10px] uppercase font-bold">
                Operational Separation
              </span>
              <strong className="font-semibold text-[#17201A]">
                Open/Closed = Vendor Control • Suspension = Admin
              </strong>
            </div>
          </div>
        </div>

        {/* Prototype Feedback Banner */}
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
              aria-label="Dismiss notification"
              className="text-xs font-bold hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 6 Summary Metric Cards */}
        <section
          aria-label="Store management summary cards"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <button
            type="button"
            onClick={() => setSelectedFilter('ALL')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'ALL'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'ALL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Total Stores
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.ALL}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'ALL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Onboarded outlets
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('ACTIVE')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'ACTIVE'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'ACTIVE' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Active Stores
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                selectedFilter === 'ACTIVE' ? 'text-white' : 'text-[#166534]'
              }`}
            >
              {counts.ACTIVE}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'ACTIVE' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Verified &amp; live
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('OPEN')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'OPEN'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'OPEN' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Open Now
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                selectedFilter === 'OPEN' ? 'text-white' : 'text-[#166534]'
              }`}
            >
              {counts.OPEN}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'OPEN' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Vendor operational
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('CLOSED')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'CLOSED'
                ? 'bg-[#17201A] text-white border-[#17201A] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#17201A]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'CLOSED' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Closed
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.CLOSED}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'CLOSED' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Off-hours / paused
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('PENDING_VERIFICATION')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'PENDING_VERIFICATION'
                ? 'bg-[#B45309] text-white border-[#B45309] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#B45309]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'PENDING_VERIFICATION'
                  ? 'text-white/85'
                  : 'text-[#647067]'
              }`}
            >
              Pending Verification
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                selectedFilter === 'PENDING_VERIFICATION'
                  ? 'text-white'
                  : 'text-[#B45309]'
              }`}
            >
              {counts.PENDING_VERIFICATION}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'PENDING_VERIFICATION'
                  ? 'text-white/85'
                  : 'text-[#647067]'
              }`}
            >
              Awaiting inspection
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('SUSPENDED')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'SUSPENDED'
                ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#DC2626]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'SUSPENDED'
                  ? 'text-white/85'
                  : 'text-[#647067]'
              }`}
            >
              Suspended
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                selectedFilter === 'SUSPENDED' ? 'text-white' : 'text-[#DC2626]'
              }`}
            >
              {counts.SUSPENDED}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'SUSPENDED'
                  ? 'text-white/85'
                  : 'text-[#647067]'
              }`}
            >
              Marketplace restricted
            </span>
          </button>
        </section>

        {/* Filter Pills & Search Bar */}
        <section
          aria-label="Filter and search stores"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4"
        >
          <div
            role="group"
            aria-label="Store filter tabs"
            className="flex flex-wrap items-center gap-1.5"
          >
            {FILTER_TABS.map((tab) => {
              const active = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#166534] text-white shadow-xs'
                      : 'bg-[#F8FAF7] text-[#17201A] border border-[#E2E8E3] hover:border-[#166534] hover:text-[#166534]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-[#647067] border border-[#E2E8E3]'
                    }`}
                  >
                    {counts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full xl:w-88">
            <Icon
              name="search"
              className="w-4 h-4 text-[#647067] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store name, vendor, category, or sector..."
              aria-label="Search stores by store name, owner, category, or sector"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs sm:text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear store search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#647067] hover:text-[#17201A] px-1"
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Store Records Directory (Responsive Cards on Mobile/Tablet + Table on Desktop) */}
        <section
          aria-label="Marketplace stores list"
          className="bg-white border border-[#E2E8E3] rounded-2xl shadow-xs overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8E3] flex flex-wrap items-center justify-between gap-2 text-xs text-[#647067]">
            <span>
              Showing{' '}
              <strong className="text-[#17201A]">
                {filteredStores.length}
              </strong>{' '}
              of {counts.ALL} marketplace stores
            </span>
            {(selectedFilter !== 'ALL' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('ALL');
                  setSearchQuery('');
                }}
                className="font-semibold text-[#166534] hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          {filteredStores.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-base font-bold text-[#17201A]">
                No matching stores found
              </p>
              <p className="text-xs text-[#647067] max-w-sm mx-auto">
                No storefront matches your current search query and filter selection. Try clearing the search box or switching to &ldquo;All&rdquo;.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D]"
                >
                  Show All Stores
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile & Tablet Adaptive Card View */}
              <div className="lg:hidden divide-y divide-[#E2E8E3]">
                {filteredStores.map((st) => {
                  const mktBadge = MARKETPLACE_STATUS_BADGE[st.marketplaceStatus];
                  return (
                    <article key={st.storeId} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#B45309]">
                              {st.storeId.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-[#647067]">
                              • {st.category}
                            </span>
                          </div>
                          <h2 className="text-sm font-black text-[#17201A] mt-0.5">
                            {st.storeName}
                          </h2>
                          <p className="text-xs text-[#647067]">
                            Owner: <strong className="text-[#17201A]">{st.vendorName}</strong> • {st.sector}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedStoreId(st.storeId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534] shrink-0"
                        >
                          <Icon name="eye" className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Read-only Vendor Operational Open/Closed Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            st.isOpen
                              ? 'bg-[#166534]/10 text-[#166534] border-[#166534]/20'
                              : 'bg-[#E2E8E3] text-[#647067] border-[#647067]/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st.isOpen ? 'bg-[#166534]' : 'bg-[#647067]'
                            }`}
                          />
                          {st.isOpen ? 'Open Now' : 'Closed'} (Vendor)
                        </span>

                        {/* Marketplace / Verification Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${mktBadge.className}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${mktBadge.dotClass}`}
                          />
                          {mktBadge.label}
                        </span>

                        {/* GST Status */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            st.gstRegistered
                              ? 'bg-[#166534]/10 text-[#166534]'
                              : 'bg-[#E2E8E3] text-[#647067]'
                          }`}
                        >
                          {st.gstRegistered ? 'GST Registered' : 'Non-GST'}
                        </span>

                        {/* Subscription Status */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            st.subscriptionStatus === 'EXPIRED'
                              ? 'bg-[#DC2626]/10 text-[#DC2626]'
                              : st.subscriptionStatus === 'EXPIRING_SOON'
                                ? 'bg-[#F59E0B]/15 text-[#B45309]'
                                : 'bg-[#166534]/10 text-[#166534]'
                          }`}
                        >
                          Sub: {st.subscriptionStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop Management Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAF7] border-b border-[#E2E8E3] text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                      <th className="py-3 px-4">Store ID &amp; Name</th>
                      <th className="py-3 px-4">Owner / Vendor</th>
                      <th className="py-3 px-4">Category &amp; Area</th>
                      <th className="py-3 px-4">Onboarded</th>
                      <th className="py-3 px-4">Open / Closed (Vendor)</th>
                      <th className="py-3 px-4">Verification &amp; Status</th>
                      <th className="py-3 px-4">GST Registration</th>
                      <th className="py-3 px-4">Subscription</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E3] text-xs">
                    {filteredStores.map((st) => {
                      const mktBadge =
                        MARKETPLACE_STATUS_BADGE[st.marketplaceStatus];
                      return (
                        <tr
                          key={st.storeId}
                          className="hover:bg-[#F8FAF7]/70 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#B45309] block">
                              {st.storeId.toUpperCase()}
                            </span>
                            <div className="font-bold text-[#17201A] text-sm mt-0.5">
                              {st.storeName}
                            </div>
                            <span className="text-[11px] text-[#647067]">
                              ★ {st.rating} • {st.inventoryTotalProducts} products
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#17201A]">
                              {st.vendorName}
                            </div>
                            <Link
                              href={`/admin/vendors?vendorId=${st.vendorId}`}
                              className="text-[11px] font-semibold text-[#166534] hover:underline"
                            >
                              {st.vendorId.toUpperCase()} →
                            </Link>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#17201A]">
                              {st.category}
                            </div>
                            <div className="text-[11px] text-[#647067] mt-0.5">
                              {st.sector}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-[#17201A]">
                            {formatReadableDate(st.onboardingDate)}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                st.isOpen
                                  ? 'bg-[#166534]/10 text-[#166534] border-[#166534]/20'
                                  : 'bg-[#E2E8E3] text-[#647067] border-[#647067]/20'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  st.isOpen ? 'bg-[#166534]' : 'bg-[#647067]'
                                }`}
                              />
                              {st.isOpen ? 'Open Now' : 'Closed'}
                            </span>
                            <span className="block text-[10px] text-[#647067] mt-0.5">
                              {st.operationalHoursLabel}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${mktBadge.className}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${mktBadge.dotClass}`}
                              />
                              {mktBadge.label}
                            </span>
                            <span className="block text-[11px] text-[#647067] mt-0.5">
                              KYC: {VERIFICATION_LABEL[st.verificationStatus]}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {st.gstRegistered && st.gstin ? (
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#166534]/10 text-[#166534]">
                                  GST Registered
                                </span>
                                <span className="block text-[11px] font-mono text-[#647067] mt-0.5">
                                  {st.gstin}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E2E8E3] text-[#647067]">
                                  Not GST Registered
                                </span>
                                <span className="block text-[11px] text-[#647067] mt-0.5">
                                  No GSTIN on file
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                st.subscriptionStatus === 'EXPIRED'
                                  ? 'bg-[#DC2626]/10 text-[#DC2626]'
                                  : st.subscriptionStatus === 'EXPIRING_SOON'
                                    ? 'bg-[#F59E0B]/15 text-[#B45309]'
                                    : 'bg-[#166534]/10 text-[#166534]'
                              }`}
                            >
                              {st.subscriptionStatus === 'EXPIRING_SOON'
                                ? 'Expiring Soon'
                                : st.subscriptionStatus === 'EXPIRED'
                                  ? 'Expired'
                                  : 'Active'}
                            </span>
                            <span className="block text-[11px] text-[#647067] mt-0.5">
                              {st.subscriptionPlanName}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedStoreId(st.storeId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534] transition-colors"
                            >
                              <Icon name="eye" className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Store Detail & Governance Modal */}
      {selectedStore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-detail-modal-title"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-5 sm:p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#B45309]">
                    {selectedStore.storeId.toUpperCase()}
                  </span>
                  <h2
                    id="store-detail-modal-title"
                    className="text-lg sm:text-xl font-black text-[#17201A]"
                  >
                    {selectedStore.storeName}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      MARKETPLACE_STATUS_BADGE[selectedStore.marketplaceStatus]
                        .className
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        MARKETPLACE_STATUS_BADGE[
                          selectedStore.marketplaceStatus
                        ].dotClass
                      }`}
                    />
                    {
                      MARKETPLACE_STATUS_BADGE[selectedStore.marketplaceStatus]
                        .label
                    }
                  </span>
                </div>
                <p className="text-xs text-[#647067] mt-1">
                  {selectedStore.category} • {selectedStore.address} • Onboarded{' '}
                  {formatReadableDate(selectedStore.onboardingDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStoreId(null)}
                aria-label="Close store details"
                className="p-2 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            {selectedStore.statusNote && (
              <div
                className={`rounded-2xl border p-3.5 text-xs ${
                  selectedStore.marketplaceStatus === 'SUSPENDED' ||
                  selectedStore.marketplaceStatus === 'REJECTED'
                    ? 'bg-[#DC2626]/5 border-[#DC2626]/25 text-[#DC2626]'
                    : selectedStore.marketplaceStatus === 'PENDING_VERIFICATION'
                      ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#B45309]'
                      : 'bg-[#166534]/5 border-[#166534]/20 text-[#166534]'
                }`}
              >
                <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">
                  Marketplace Verification / Governance Note
                </span>
                <p className="text-[#17201A] font-medium">
                  {selectedStore.statusNote}
                </p>
              </div>
            )}

            {/* Operational Control Boundary Notice */}
            <div className="rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    selectedStore.isOpen
                      ? 'bg-[#166534]/10 text-[#166534]'
                      : 'bg-[#E2E8E3] text-[#647067]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedStore.isOpen ? 'bg-[#166534]' : 'bg-[#647067]'
                    }`}
                  />
                  {selectedStore.isOpen ? 'Store Open Now' : 'Store Closed'}
                </span>
                <p className="text-[#647067]">
                  <strong className="text-[#17201A]">
                    Vendor Operational Control:
                  </strong>{' '}
                  Daily Open/Closed state is controlled by the vendor in the Vendor Portal ({selectedStore.operationalHoursLabel}). Admin controls marketplace verification and suspension independently.
                </p>
              </div>
            </div>

            {/* Store Info + Vendor & GST Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  Storefront &amp; Operational Configuration
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Store ID:</dt>
                    <dd className="font-black text-[#17201A]">
                      {selectedStore.storeId.toUpperCase()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Primary Category:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedStore.category}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Operational Hours:</dt>
                    <dd className="font-semibold text-[#17201A]">
                      {selectedStore.operationalHoursLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Delivery Radius:</dt>
                    <dd className="font-semibold text-[#17201A]">
                      {selectedStore.deliveryRadiusKm} km hyperlocal zone
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Minimum Order Value:</dt>
                    <dd className="font-bold text-[#166534]">
                      {formatFullINR(selectedStore.minOrderAmount)}
                    </dd>
                  </div>
                  <div className="pt-1.5 border-t border-[#E2E8E3]">
                    <dt className="text-[#647067] text-[11px]">Description:</dt>
                    <dd className="text-[#17201A] mt-0.5 leading-relaxed">
                      {selectedStore.description}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  Associated Vendor, GST &amp; Subscription
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Vendor / Owner:</dt>
                    <dd className="font-bold text-[#17201A]">
                      <Link
                        href={`/admin/vendors?vendorId=${selectedStore.vendorId}`}
                        className="text-[#166534] hover:underline"
                      >
                        {selectedStore.vendorName} (
                        {selectedStore.vendorId.toUpperCase()}) →
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Store Phone:</dt>
                    <dd className="font-medium text-[#17201A]">
                      {selectedStore.phone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">GST Registration:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedStore.gstRegistered
                        ? 'GST Registered (Verified)'
                        : 'Not GST Registered'}
                    </dd>
                  </div>
                  {selectedStore.gstRegistered && selectedStore.gstin && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#647067]">Verified GSTIN:</dt>
                      <dd className="font-mono font-bold text-[#166534]">
                        {selectedStore.gstin}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2 pt-1.5 border-t border-[#E2E8E3]">
                    <dt className="text-[#647067]">Subscription Plan:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedStore.subscriptionPlanName} (
                      {formatFullINR(selectedStore.subscriptionAmount)})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Subscription Status:</dt>
                    <dd
                      className={`font-bold ${
                        selectedStore.subscriptionStatus === 'EXPIRED'
                          ? 'text-[#DC2626]'
                          : selectedStore.subscriptionStatus === 'EXPIRING_SOON'
                            ? 'text-[#B45309]'
                            : 'text-[#166534]'
                      }`}
                    >
                      {selectedStore.subscriptionStatus.replace('_', ' ')} (Exp:{' '}
                      {formatReadableDate(selectedStore.subscriptionExpiryDate)})
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Inventory & Recent 30-Day Order Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-3.5">
                <span className="text-[11px] font-semibold text-[#647067] block">
                  Listed Catalog Products
                </span>
                <strong className="text-xl font-black text-[#17201A] mt-1 block">
                  {selectedStore.inventoryTotalProducts} SKUs
                </strong>
                <span className="text-[11px] text-[#166534] font-medium">
                  {selectedStore.inventoryInStockCount} in stock •{' '}
                  {selectedStore.inventoryLowOrOutCount} low/out
                </span>
              </div>

              <div className="rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-3.5">
                <span className="text-[11px] font-semibold text-[#647067] block">
                  Recent Orders (30d)
                </span>
                <strong className="text-xl font-black text-[#17201A] mt-1 block">
                  {selectedStore.recentOrdersCount}
                </strong>
                <span className="text-[11px] text-[#647067]">
                  {selectedStore.recentDeliveredCount} delivered
                </span>
              </div>

              <div className="rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-3.5">
                <span className="text-[11px] font-semibold text-[#647067] block">
                  Recent Cancellations
                </span>
                <strong className="text-xl font-black text-[#DC2626] mt-1 block">
                  {selectedStore.recentCancelledCount}
                </strong>
                <Link
                  href="/admin/orders?status=CANCELLED"
                  className="text-[11px] text-[#166534] font-semibold hover:underline"
                >
                  Audit orders →
                </Link>
              </div>

              <div className="rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-3.5">
                <span className="text-[11px] font-semibold text-[#647067] block">
                  30-Day Store GMV
                </span>
                <strong className="text-xl font-black text-[#166534] mt-1 block">
                  {formatFullINR(selectedStore.recentGmv)}
                </strong>
                <span className="text-[11px] text-[#647067]">
                  Rating ★ {selectedStore.rating}
                </span>
              </div>
            </div>

            {/* Mock Admin Actions Bar */}
            <div className="rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17201A]">
                  Admin Store Marketplace Actions (Prototype Mock)
                </h3>
                <span className="text-[11px] text-[#647067]">
                  Does not override vendor&apos;s daily Open/Closed switch
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {selectedStore.verificationStatus !== 'VERIFIED' && (
                  <button
                    type="button"
                    onClick={() => handleVerifyStore(selectedStore)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-bold hover:bg-[#14532D] transition-colors shadow-xs"
                  >
                    <Icon name="check" className="w-3.5 h-3.5" />
                    <span>Verify Store</span>
                  </button>
                )}

                {selectedStore.verificationStatus === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        type: 'REJECT',
                        store: selectedStore,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#DC2626]/40 text-[#DC2626] text-xs font-bold hover:bg-[#DC2626]/10 transition-colors"
                  >
                    <Icon name="close" className="w-3.5 h-3.5" />
                    <span>Reject Verification</span>
                  </button>
                )}

                {selectedStore.marketplaceStatus !== 'SUSPENDED' ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        type: 'SUSPEND',
                        store: selectedStore,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition-colors shadow-xs"
                  >
                    <Icon name="ban" className="w-3.5 h-3.5" />
                    <span>Suspend Store</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRestoreStore(selectedStore)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-bold hover:bg-[#14532D] transition-colors shadow-xs"
                  >
                    <Icon name="check" className="w-3.5 h-3.5" />
                    <span>Restore Store</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedStoreId(null)}
                  className="ml-auto px-4 py-2 rounded-xl border border-[#E2E8E3] bg-white text-xs font-semibold text-[#17201A] hover:bg-[#F8FAF7]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reject Verification / Suspend Store */}
      {confirmDialog && (
        <AdminConfirmModal
          title={
            confirmDialog.type === 'REJECT'
              ? `Reject Store Verification (${confirmDialog.store.storeName})?`
              : `Suspend Store from Marketplace (${confirmDialog.store.storeName})?`
          }
          subtitle={`${confirmDialog.store.storeId.toUpperCase()} • Owner: ${confirmDialog.store.vendorName}`}
          description={
            confirmDialog.type === 'REJECT'
              ? 'Rejecting store verification will mark this storefront as Verification Rejected and keep it hidden from customer discovery until verification requirements are met.'
              : 'Suspending this store removes it from active customer marketplace search and ordering while preserving the vendor’s inventory and operational settings.'
          }
          warningNote={`Store Open/Closed state (${confirmDialog.store.isOpen ? 'Open' : 'Closed'}) remains a separate vendor operational control.`}
          confirmLabel={
            confirmDialog.type === 'REJECT'
              ? 'Confirm Reject Verification'
              : 'Confirm Suspend Store'
          }
          tone="danger"
          requireReasonInput
          defaultReason={
            confirmDialog.type === 'REJECT'
              ? 'Storefront physical address signboard could not be verified during field check.'
              : 'Store temporarily suspended from customer discovery pending compliance/subscription review.'
          }
          onCancel={() => setConfirmDialog(null)}
          onConfirm={(reason) => {
            if (confirmDialog.type === 'REJECT') {
              actions.rejectStoreVerification(
                confirmDialog.store.storeId,
                reason
              );
              setFeedbackBanner(
                `Prototype Mock: Verification rejected for store "${confirmDialog.store.storeName}" (${confirmDialog.store.storeId.toUpperCase()}).`
              );
            } else {
              actions.suspendStore(confirmDialog.store.storeId, reason);
              setFeedbackBanner(
                `Prototype Mock: Suspended store "${confirmDialog.store.storeName}" (${confirmDialog.store.storeId.toUpperCase()}) from customer marketplace.`
              );
            }
            setConfirmDialog(null);
          }}
        />
      )}
    </div>
  );
}

export default function AdminStoresPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] flex flex-col">
          <AdminHeader />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white border border-[#E2E8E3] rounded-2xl p-8 text-center text-sm text-[#647067]">
              Loading Marketplace Store Management...
            </div>
          </main>
        </div>
      }
    >
      <AdminStoresContent />
    </Suspense>
  );
}
