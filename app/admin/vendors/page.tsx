'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatReadableDate } from '@/data/adminAnalyticsData';
import type {
  AdminVendorAccountStatus,
  AdminVerificationStatus,
} from '@/data/adminManagementData';
import { type EnrichedAdminVendor, useAdminState } from '@/lib/adminStore';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { Icon } from '@/components/vendor/Icon';

type VendorFilterTab =
  | 'ALL'
  | 'VERIFIED'
  | 'PENDING'
  | 'SUSPENDED'
  | 'GST_REGISTERED'
  | 'NON_GST';

const FILTER_TABS: { id: VendorFilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SUSPENDED', label: 'Suspended / Restricted' },
  { id: 'GST_REGISTERED', label: 'GST Registered' },
  { id: 'NON_GST', label: 'Non-GST Registered' },
];

const VERIFICATION_BADGE: Record<
  AdminVerificationStatus,
  { label: string; className: string; dotClass: string }
> = {
  VERIFIED: {
    label: 'Verified',
    className: 'bg-[#166534]/10 text-[#166534] border-[#166534]/20',
    dotClass: 'bg-[#166534]',
  },
  PENDING: {
    label: 'Pending Verification',
    className: 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30',
    dotClass: 'bg-[#F59E0B]',
  },
  REJECTED: {
    label: 'Verification Rejected',
    className: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
    dotClass: 'bg-[#DC2626]',
  },
};

const ACCOUNT_STATUS_BADGE: Record<
  AdminVendorAccountStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: 'Active Account',
    className: 'bg-[#166534]/10 text-[#166534] border-[#166534]/20',
  },
  PENDING_REVIEW: {
    label: 'Pending Review',
    className: 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30',
  },
  SUSPENDED: {
    label: 'Suspended / Restricted',
    className: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
  },
};

function parseInitialVendorFilter(raw: string | null): VendorFilterTab {
  const upper = (raw || '').toUpperCase();
  if (
    upper === 'VERIFIED' ||
    upper === 'PENDING' ||
    upper === 'SUSPENDED' ||
    upper === 'GST_REGISTERED' ||
    upper === 'NON_GST'
  ) {
    return upper as VendorFilterTab;
  }
  return 'ALL';
}

function AdminVendorsContent() {
  const searchParams = useSearchParams();
  const { vendors, actions } = useAdminState();

  const [selectedFilter, setSelectedFilter] = useState<VendorFilterTab>(() =>
    parseInitialVendorFilter(searchParams.get('filter'))
  );
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') || ''
  );
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(() =>
    searchParams.get('vendorId')
  );
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'REJECT' | 'SUSPEND';
    vendor: EnrichedAdminVendor;
  } | null>(null);

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.vendorId === selectedVendorId) ?? null,
    [vendors, selectedVendorId]
  );

  const counts = useMemo(() => {
    const total = vendors.length;
    const verified = vendors.filter(
      (v) => v.verificationStatus === 'VERIFIED' && v.accountStatus !== 'SUSPENDED'
    ).length;
    const pending = vendors.filter(
      (v) => v.verificationStatus === 'PENDING'
    ).length;
    const suspended = vendors.filter(
      (v) =>
        v.accountStatus === 'SUSPENDED' || v.verificationStatus === 'REJECTED'
    ).length;
    const gstRegistered = vendors.filter((v) => v.gstRegistered).length;
    const nonGst = total - gstRegistered;

    return {
      ALL: total,
      VERIFIED: verified,
      PENDING: pending,
      SUSPENDED: suspended,
      GST_REGISTERED: gstRegistered,
      NON_GST: nonGst,
    };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vendors.filter((v) => {
      if (
        selectedFilter === 'VERIFIED' &&
        (v.verificationStatus !== 'VERIFIED' || v.accountStatus === 'SUSPENDED')
      ) {
        return false;
      }
      if (
        selectedFilter === 'PENDING' &&
        v.verificationStatus !== 'PENDING'
      ) {
        return false;
      }
      if (
        selectedFilter === 'SUSPENDED' &&
        v.accountStatus !== 'SUSPENDED' &&
        v.verificationStatus !== 'REJECTED'
      ) {
        return false;
      }
      if (selectedFilter === 'GST_REGISTERED' && !v.gstRegistered) {
        return false;
      }
      if (selectedFilter === 'NON_GST' && v.gstRegistered) {
        return false;
      }

      if (q) {
        const matchOwner = v.ownerName.toLowerCase().includes(q);
        const matchId = v.vendorId.toLowerCase().includes(q);
        const matchPhone = v.phone.toLowerCase().includes(q);
        const matchEmail = v.email.toLowerCase().includes(q);
        const matchStore = v.stores.some((st) =>
          st.storeName.toLowerCase().includes(q)
        );
        if (
          !matchOwner &&
          !matchId &&
          !matchPhone &&
          !matchEmail &&
          !matchStore
        ) {
          return false;
        }
      }

      return true;
    });
  }, [vendors, selectedFilter, searchQuery]);

  const handleApproveVendor = (vendor: EnrichedAdminVendor) => {
    actions.approveVendorVerification(vendor.vendorId);
    setFeedbackBanner(
      `Prototype Mock: Approved verification for ${vendor.ownerName} (${vendor.vendorId.toUpperCase()}). Account is now Verified & Active.`
    );
  };

  const handleRestoreVendor = (vendor: EnrichedAdminVendor) => {
    actions.restoreVendor(vendor.vendorId);
    setFeedbackBanner(
      `Prototype Mock: Restored vendor account for ${vendor.ownerName} (${vendor.vendorId.toUpperCase()}) and associated stores to Active status.`
    );
  };

  const renderSubscriptionSummaryBadge = (v: EnrichedAdminVendor) => {
    if (v.overallSubscriptionStatus === 'HAS_EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
          {v.expiredSubCount} Expired
        </span>
      );
    }
    if (v.overallSubscriptionStatus === 'HAS_EXPIRING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          {v.expiringSubCount} Expiring Soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#166534]/10 text-[#166534] border border-[#166534]/20">
        <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
        {v.activeSubCount} Active
      </span>
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
              Marketplace Vendor Management
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1">
              Review vendor account verification, business identity, associated stores, GST registration standing, and subscription health.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
            <Link
              href="/admin/stores"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534] transition-colors shadow-xs"
            >
              <Icon name="store" className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Manage All Stores ({vendors.reduce((s, v) => s + v.storeCount, 0)}) →</span>
            </Link>
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

        {/* 5 Interactive Summary Cards */}
        <section
          aria-label="Vendor summary metrics"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
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
              Total Vendors
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.ALL}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'ALL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Matches Dashboard KPI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('VERIFIED')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'VERIFIED'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'VERIFIED' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Verified Vendors
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                selectedFilter === 'VERIFIED' ? 'text-white' : 'text-[#166534]'
              }`}
            >
              {counts.VERIFIED}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'VERIFIED' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Active in marketplace
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('PENDING')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'PENDING'
                ? 'bg-[#B45309] text-white border-[#B45309] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#B45309]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'PENDING' ? 'text-white/85' : 'text-[#647067]'
              }`}
            >
              Pending Verification
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                selectedFilter === 'PENDING' ? 'text-white' : 'text-[#B45309]'
              }`}
            >
              {counts.PENDING}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'PENDING' ? 'text-white/85' : 'text-[#647067]'
              }`}
            >
              Awaiting KYC review
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
                selectedFilter === 'SUSPENDED' ? 'text-white/85' : 'text-[#647067]'
              }`}
            >
              Suspended / Restricted
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
                selectedFilter === 'SUSPENDED' ? 'text-white/85' : 'text-[#647067]'
              }`}
            >
              Action or renewal needed
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('GST_REGISTERED')}
            className={`col-span-2 sm:col-span-1 text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'GST_REGISTERED'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'GST_REGISTERED'
                  ? 'text-white/80'
                  : 'text-[#647067]'
              }`}
            >
              GST Registered Vendors
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.GST_REGISTERED}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'GST_REGISTERED'
                  ? 'text-white/80'
                  : 'text-[#647067]'
              }`}
            >
              {counts.NON_GST} non-GST / exempt
            </span>
          </button>
        </section>

        {/* Filter Pills & Search Bar */}
        <section
          aria-label="Filter and search vendors"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div
            role="group"
            aria-label="Vendor filter tabs"
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

          <div className="relative w-full lg:w-88">
            <Icon
              name="search"
              className="w-4 h-4 text-[#647067] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search owner name, mobile, or store name..."
              aria-label="Search vendors by owner name, mobile number, or store name"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs sm:text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear vendor search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#647067] hover:text-[#17201A] px-1"
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Vendor Records List (Responsive Mobile/Tablet Cards + Desktop Table) */}
        <section
          aria-label="Marketplace vendors directory"
          className="bg-white border border-[#E2E8E3] rounded-2xl shadow-xs overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8E3] flex flex-wrap items-center justify-between gap-2 text-xs text-[#647067]">
            <span>
              Showing{' '}
              <strong className="text-[#17201A]">
                {filteredVendors.length}
              </strong>{' '}
              of {counts.ALL} registered vendors
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

          {filteredVendors.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-base font-bold text-[#17201A]">
                No matching vendors found
              </p>
              <p className="text-xs text-[#647067] max-w-sm mx-auto">
                No vendor account matches your search query and filter criteria. Try clearing the search box or switching to &ldquo;All&rdquo;.
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
                  Show All Vendors
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile & Tablet Adaptive Card View */}
              <div className="lg:hidden divide-y divide-[#E2E8E3]">
                {filteredVendors.map((v) => {
                  const verBadge = VERIFICATION_BADGE[v.verificationStatus];
                  const accBadge = ACCOUNT_STATUS_BADGE[v.accountStatus];
                  return (
                    <article key={v.vendorId} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#B45309]">
                              {v.vendorId.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-[#647067]">
                              • Onboarded {formatReadableDate(v.onboardingDate)}
                            </span>
                          </div>
                          <h2 className="text-sm font-black text-[#17201A] mt-0.5">
                            {v.ownerName}
                          </h2>
                          <p className="text-xs text-[#647067]">
                            {v.phone} • {v.email}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedVendorId(v.vendorId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534] shrink-0"
                        >
                          <Icon name="eye" className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${verBadge.className}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${verBadge.dotClass}`}
                          />
                          {verBadge.label}
                        </span>
                        {v.accountStatus === 'SUSPENDED' && (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${accBadge.className}`}
                          >
                            {accBadge.label}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            v.gstRegistered
                              ? 'bg-[#166534]/10 text-[#166534]'
                              : 'bg-[#E2E8E3] text-[#647067]'
                          }`}
                        >
                          {v.gstRegistered
                            ? `GST Registered (${v.gstRegisteredStoreCount}/${v.storeCount})`
                            : 'Not GST Registered'}
                        </span>
                        {renderSubscriptionSummaryBadge(v)}
                      </div>

                      <div className="rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <span className="text-[#647067] truncate">
                          <strong className="text-[#17201A]">
                            {v.storeCount} {v.storeCount === 1 ? 'Store' : 'Stores'}:
                          </strong>{' '}
                          {v.stores.map((s) => s.storeName).join(', ')}
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
                      <th className="py-3 px-4">Vendor ID &amp; Owner</th>
                      <th className="py-3 px-4">Contact (Mobile &amp; Email)</th>
                      <th className="py-3 px-4">Onboarding Date</th>
                      <th className="py-3 px-4">Associated Stores</th>
                      <th className="py-3 px-4">Verification &amp; Account</th>
                      <th className="py-3 px-4">GST Status</th>
                      <th className="py-3 px-4">Subscriptions</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E3] text-xs">
                    {filteredVendors.map((v) => {
                      const verBadge = VERIFICATION_BADGE[v.verificationStatus];
                      const accBadge = ACCOUNT_STATUS_BADGE[v.accountStatus];
                      return (
                        <tr
                          key={v.vendorId}
                          className="hover:bg-[#F8FAF7]/70 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#B45309] block">
                              {v.vendorId.toUpperCase()}
                            </span>
                            <div className="font-bold text-[#17201A] text-sm mt-0.5">
                              {v.ownerName}
                            </div>
                            <span className="text-[11px] text-[#647067]">
                              {v.businessEntityType}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#17201A]">
                              {v.phone}
                            </div>
                            <div className="text-[11px] text-[#647067] mt-0.5">
                              {v.email}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-[#17201A]">
                            {formatReadableDate(v.onboardingDate)}
                            <span className="block text-[11px] text-[#647067]">
                              {v.primarySector}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 font-bold text-[#17201A]">
                              <span className="px-2 py-0.5 rounded-lg bg-[#166534]/10 text-[#166534] text-[11px]">
                                {v.storeCount}{' '}
                                {v.storeCount === 1 ? 'Store' : 'Stores'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#647067] mt-1 max-w-52 truncate">
                              {v.stores.map((s) => s.storeName).join(' • ')}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${verBadge.className}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${verBadge.dotClass}`}
                                />
                                {verBadge.label}
                              </span>
                              {v.accountStatus === 'SUSPENDED' && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${accBadge.className}`}
                                >
                                  {accBadge.label}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {v.gstRegistered ? (
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#166534]/10 text-[#166534]">
                                  GST Registered
                                </span>
                                <span className="block text-[11px] text-[#647067] mt-0.5">
                                  {v.gstRegisteredStoreCount} of {v.storeCount}{' '}
                                  {v.storeCount === 1 ? 'store' : 'stores'} verified
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E2E8E3] text-[#647067]">
                                  Not GST Registered
                                </span>
                                <span className="block text-[11px] text-[#647067] mt-0.5">
                                  Exempt / Unregistered
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderSubscriptionSummaryBadge(v)}
                            <span className="block text-[11px] text-[#647067] mt-0.5">
                              {v.stores
                                .map((s) => s.subscriptionBillingCycle)
                                .join(', ')}{' '}
                              billing
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedVendorId(v.vendorId)}
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

      {/* Vendor Detail & Governance Modal */}
      {selectedVendor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-detail-modal-title"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-5 sm:p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#B45309]">
                    {selectedVendor.vendorId.toUpperCase()}
                  </span>
                  <h2
                    id="vendor-detail-modal-title"
                    className="text-lg sm:text-xl font-black text-[#17201A]"
                  >
                    {selectedVendor.ownerName}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      VERIFICATION_BADGE[selectedVendor.verificationStatus]
                        .className
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        VERIFICATION_BADGE[selectedVendor.verificationStatus]
                          .dotClass
                      }`}
                    />
                    {
                      VERIFICATION_BADGE[selectedVendor.verificationStatus]
                        .label
                    }
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      ACCOUNT_STATUS_BADGE[selectedVendor.accountStatus]
                        .className
                    }`}
                  >
                    {ACCOUNT_STATUS_BADGE[selectedVendor.accountStatus].label}
                  </span>
                </div>
                <p className="text-xs text-[#647067] mt-1">
                  Onboarded on {formatReadableDate(selectedVendor.onboardingDate)} •{' '}
                  {selectedVendor.businessEntityType} • Last compliance review:{' '}
                  {formatReadableDate(selectedVendor.lastReviewedOn)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVendorId(null)}
                aria-label="Close vendor details"
                className="p-2 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            {selectedVendor.statusNote && (
              <div
                className={`rounded-2xl border p-3.5 text-xs ${
                  selectedVendor.accountStatus === 'SUSPENDED' ||
                  selectedVendor.verificationStatus === 'REJECTED'
                    ? 'bg-[#DC2626]/5 border-[#DC2626]/25 text-[#DC2626]'
                    : selectedVendor.verificationStatus === 'PENDING'
                      ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#B45309]'
                      : 'bg-[#166534]/5 border-[#166534]/20 text-[#166534]'
                }`}
              >
                <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">
                  Marketplace Status &amp; Audit Note
                </span>
                <p className="text-[#17201A] font-medium">
                  {selectedVendor.statusNote}
                </p>
              </div>
            )}

            {/* Verified Identity + GST/Business & Subscription Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  Verified Identity &amp; Onboarding
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Vendor ID:</dt>
                    <dd className="font-black text-[#17201A]">
                      {selectedVendor.vendorId.toUpperCase()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Owner Name:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedVendor.ownerName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Registered Mobile:</dt>
                    <dd className="font-semibold text-[#17201A]">
                      {selectedVendor.phone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Business Email:</dt>
                    <dd className="font-medium text-[#17201A] truncate">
                      {selectedVendor.email}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Primary Area:</dt>
                    <dd className="font-medium text-[#17201A] text-right">
                      {selectedVendor.primarySector}
                    </dd>
                  </div>
                  <div className="pt-1.5 border-t border-[#E2E8E3]">
                    <dt className="text-[#647067] text-[11px]">
                      KYC / Business Verification Summary:
                    </dt>
                    <dd className="font-semibold text-[#166534] mt-0.5">
                      {selectedVendor.kycVerificationSummary}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  GST &amp; Subscription Overview
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Business Structure:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedVendor.businessEntityType}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">GST Standing:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedVendor.gstRegistered
                        ? `GST Registered (${selectedVendor.gstRegisteredStoreCount}/${selectedVendor.storeCount} stores)`
                        : 'Not GST Registered'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Associated Stores:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedVendor.storeCount}{' '}
                      {selectedVendor.storeCount === 1 ? 'Store' : 'Stores'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Active Subscriptions:</dt>
                    <dd className="font-semibold text-[#166534]">
                      {selectedVendor.activeSubCount} Active •{' '}
                      {selectedVendor.expiringSubCount} Expiring •{' '}
                      {selectedVendor.expiredSubCount} Expired
                    </dd>
                  </div>
                  <div className="pt-1.5 border-t border-[#E2E8E3] flex items-center justify-between">
                    <span className="text-[11px] text-[#647067]">
                      Subscription Ledger:
                    </span>
                    <Link
                      href={`/admin/subscriptions`}
                      className="text-xs font-bold text-[#166534] hover:underline"
                    >
                      Open Subscriptions →
                    </Link>
                  </div>
                </dl>
              </div>
            </div>

            {/* Associated Stores List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17201A]">
                  Associated Stores ({selectedVendor.storeCount})
                </h3>
                <span className="text-[11px] text-[#647067]">
                  Store Open/Closed state is vendor-controlled
                </span>
              </div>

              <div className="space-y-2.5">
                {selectedVendor.stores.map((st) => (
                  <div
                    key={st.storeId}
                    className="rounded-2xl border border-[#E2E8E3] bg-[#F8FAF7] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-[#B45309]">
                          {st.storeId.toUpperCase()}
                        </span>
                        <strong className="text-sm font-bold text-[#17201A]">
                          {st.storeName}
                        </strong>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            st.isOpen
                              ? 'bg-[#166534]/10 text-[#166534]'
                              : 'bg-[#E2E8E3] text-[#647067]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st.isOpen ? 'bg-[#166534]' : 'bg-[#647067]'
                            }`}
                          />
                          {st.isOpen ? 'Open Now' : 'Closed'}
                        </span>
                      </div>
                      <p className="text-[#647067]">
                        {st.category} • {st.sector}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {st.gstRegistered && st.gstin ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-[#E2E8E3] text-[11px] font-mono font-semibold text-[#166534]">
                            GSTIN: {st.gstin} (Verified)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-[#E2E8E3] text-[11px] text-[#647067]">
                            Non-GST Registered
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-[#E2E8E3] text-[11px] font-semibold text-[#17201A]">
                          {st.subscriptionPlanName} ({st.subscriptionStatus.replace('_', ' ')})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <Link
                        href={`/admin/stores?storeId=${st.storeId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8E3] text-xs font-semibold text-[#166534] hover:border-[#166534] transition-colors"
                      >
                        <Icon name="store" className="w-3.5 h-3.5" />
                        <span>Inspect Store →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Admin Actions Bar */}
            <div className="rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17201A]">
                  Admin Account Governance Actions (Prototype Mock)
                </h3>
                <span className="text-[11px] text-[#647067]">
                  Destructive/restrictive actions require confirmation
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {selectedVendor.verificationStatus !== 'VERIFIED' && (
                  <button
                    type="button"
                    onClick={() => handleApproveVendor(selectedVendor)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-bold hover:bg-[#14532D] transition-colors shadow-xs"
                  >
                    <Icon name="check" className="w-3.5 h-3.5" />
                    <span>Approve Verification</span>
                  </button>
                )}

                {selectedVendor.verificationStatus === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        type: 'REJECT',
                        vendor: selectedVendor,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#DC2626]/40 text-[#DC2626] text-xs font-bold hover:bg-[#DC2626]/10 transition-colors"
                  >
                    <Icon name="close" className="w-3.5 h-3.5" />
                    <span>Reject Verification</span>
                  </button>
                )}

                {selectedVendor.accountStatus !== 'SUSPENDED' ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        type: 'SUSPEND',
                        vendor: selectedVendor,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition-colors shadow-xs"
                  >
                    <Icon name="ban" className="w-3.5 h-3.5" />
                    <span>Suspend Vendor</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRestoreVendor(selectedVendor)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-bold hover:bg-[#14532D] transition-colors shadow-xs"
                  >
                    <Icon name="check" className="w-3.5 h-3.5" />
                    <span>Restore Vendor Account</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedVendorId(null)}
                  className="ml-auto px-4 py-2 rounded-xl border border-[#E2E8E3] bg-white text-xs font-semibold text-[#17201A] hover:bg-[#F8FAF7]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reject Verification / Suspend Vendor */}
      {confirmDialog && (
        <AdminConfirmModal
          title={
            confirmDialog.type === 'REJECT'
              ? `Reject Verification for ${confirmDialog.vendor.ownerName}?`
              : `Suspend Vendor Account (${confirmDialog.vendor.ownerName})?`
          }
          subtitle={`${confirmDialog.vendor.vendorId.toUpperCase()} • ${confirmDialog.vendor.storeCount} Associated ${confirmDialog.vendor.storeCount === 1 ? 'Store' : 'Stores'}`}
          description={
            confirmDialog.type === 'REJECT'
              ? 'Rejecting verification will mark this vendor account as Verification Rejected and prevent associated stores from going live in the customer marketplace until documents are re-submitted.'
              : 'Suspending this vendor account restricts marketplace visibility across their associated stores until restored by an administrator.'
          }
          warningNote={`Affects ${confirmDialog.vendor.storeCount} associated ${confirmDialog.vendor.storeCount === 1 ? 'store' : 'stores'}: ${confirmDialog.vendor.stores.map((s) => s.storeName).join(', ')}.`}
          confirmLabel={
            confirmDialog.type === 'REJECT'
              ? 'Confirm Reject Verification'
              : 'Confirm Suspend Vendor'
          }
          tone="danger"
          requireReasonInput
          defaultReason={
            confirmDialog.type === 'REJECT'
              ? 'Uploaded municipal trade license document image is blurry; requested clear scan.'
              : 'Temporarily suspended for subscription renewal and compliance audit.'
          }
          onCancel={() => setConfirmDialog(null)}
          onConfirm={(reason) => {
            if (confirmDialog.type === 'REJECT') {
              actions.rejectVendorVerification(
                confirmDialog.vendor.vendorId,
                reason
              );
              setFeedbackBanner(
                `Prototype Mock: Verification rejected for ${confirmDialog.vendor.ownerName} (${confirmDialog.vendor.vendorId.toUpperCase()}).`
              );
            } else {
              actions.suspendVendor(confirmDialog.vendor.vendorId, reason);
              setFeedbackBanner(
                `Prototype Mock: Suspended vendor account ${confirmDialog.vendor.ownerName} (${confirmDialog.vendor.vendorId.toUpperCase()}).`
              );
            }
            setConfirmDialog(null);
          }}
        />
      )}
    </div>
  );
}

export default function AdminVendorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] flex flex-col">
          <AdminHeader />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white border border-[#E2E8E3] rounded-2xl p-8 text-center text-sm text-[#647067]">
              Loading Marketplace Vendor Management...
            </div>
          </main>
        </div>
      }
    >
      <AdminVendorsContent />
    </Suspense>
  );
}
