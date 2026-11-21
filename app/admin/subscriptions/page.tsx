'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  type AdminSubscriptionRecord,
  type AdminSubscriptionStatus,
  formatReadableDate,
  MOCK_ADMIN_SUBSCRIPTIONS,
  REFERENCE_TODAY,
} from '@/data/adminAnalyticsData';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { formatFullINR } from '@/components/admin/charts/RevenueChart';
import { Icon } from '@/components/vendor/Icon';

type SubscriptionFilterTab =
  | 'ALL'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'MONTHLY'
  | 'ANNUAL';

const FILTER_TABS: { id: SubscriptionFilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'ANNUAL', label: 'Annual' },
];

const STATUS_BADGE: Record<
  AdminSubscriptionStatus,
  { label: string; className: string; dotClass: string }
> = {
  ACTIVE: {
    label: 'Active',
    className: 'bg-[#166534]/10 text-[#166534] border-[#166534]/20',
    dotClass: 'bg-[#166534]',
  },
  EXPIRING_SOON: {
    label: 'Expiring Soon',
    className: 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30',
    dotClass: 'bg-[#F59E0B]',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
    dotClass: 'bg-[#DC2626]',
  },
};

function formatDaysStatus(rec: AdminSubscriptionRecord): string {
  if (rec.status === 'EXPIRED') {
    const daysAgo = Math.abs(rec.daysDelta);
    return `Expired ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
  }
  return `${rec.daysDelta} ${rec.daysDelta === 1 ? 'day' : 'days'} remaining`;
}

function parseInitialFilter(raw: string | null): SubscriptionFilterTab {
  const upper = (raw || '').toUpperCase();
  if (
    upper === 'ACTIVE' ||
    upper === 'EXPIRING_SOON' ||
    upper === 'EXPIRED' ||
    upper === 'MONTHLY' ||
    upper === 'ANNUAL'
  ) {
    return upper;
  }
  return 'ALL';
}

function SubscriptionsManagementContent() {
  const searchParams = useSearchParams();
  const initialFilter = parseInitialFilter(searchParams.get('filter'));

  const [selectedFilter, setSelectedFilter] =
    useState<SubscriptionFilterTab>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubscription, setSelectedSubscription] =
    useState<AdminSubscriptionRecord | null>(null);

  const counts = useMemo(() => {
    const all = MOCK_ADMIN_SUBSCRIPTIONS.length;
    const active = MOCK_ADMIN_SUBSCRIPTIONS.filter(
      (s) => s.status === 'ACTIVE'
    ).length;
    const expiringSoon = MOCK_ADMIN_SUBSCRIPTIONS.filter(
      (s) => s.status === 'EXPIRING_SOON'
    ).length;
    const expired = MOCK_ADMIN_SUBSCRIPTIONS.filter(
      (s) => s.status === 'EXPIRED'
    ).length;
    const monthly = MOCK_ADMIN_SUBSCRIPTIONS.filter(
      (s) => s.billingCycle === 'Monthly'
    ).length;
    const annual = MOCK_ADMIN_SUBSCRIPTIONS.filter(
      (s) => s.billingCycle === 'Annual'
    ).length;
    return {
      ALL: all,
      ACTIVE: active,
      EXPIRING_SOON: expiringSoon,
      EXPIRED: expired,
      MONTHLY: monthly,
      ANNUAL: annual,
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_ADMIN_SUBSCRIPTIONS.filter((rec) => {
      if (selectedFilter === 'ACTIVE' && rec.status !== 'ACTIVE') return false;
      if (selectedFilter === 'EXPIRING_SOON' && rec.status !== 'EXPIRING_SOON')
        return false;
      if (selectedFilter === 'EXPIRED' && rec.status !== 'EXPIRED') return false;
      if (selectedFilter === 'MONTHLY' && rec.billingCycle !== 'Monthly')
        return false;
      if (selectedFilter === 'ANNUAL' && rec.billingCycle !== 'Annual')
        return false;

      if (q) {
        const matchStore = rec.storeName.toLowerCase().includes(q);
        const matchVendor = rec.vendorName.toLowerCase().includes(q);
        if (!matchStore && !matchVendor) return false;
      }

      return true;
    });
  }, [selectedFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] flex flex-col">
      <AdminHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Breadcrumb & Page Header */}
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
              Vendor &amp; Store Subscriptions
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1">
              Manage store subscription plans (Monthly ₹100 / Annual ₹1,000), track renewal dates, and inspect billing history as of {formatReadableDate(REFERENCE_TODAY)}.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8E3] rounded-xl px-3.5 py-2 text-xs self-start sm:self-end shadow-xs">
            <span className="text-[#647067] block text-[10px] uppercase font-bold">
              Phase 2 Prototype
            </span>
            <strong className="font-semibold text-[#17201A]">
              {counts.ALL} Tracked Store Subscriptions
            </strong>
          </div>
        </div>

        {/* Interactive Summary Metric Cards */}
        <section
          aria-label="Subscription status summary cards"
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
              All Stores
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.ALL}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'ALL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Total subscriptions
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
              Active
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
              Matches Active KPI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('EXPIRING_SOON')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'EXPIRING_SOON'
                ? 'bg-[#B45309] text-white border-[#B45309] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#B45309]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'EXPIRING_SOON'
                  ? 'text-white/85'
                  : 'text-[#647067]'
              }`}
            >
              Expiring Soon
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                selectedFilter === 'EXPIRING_SOON'
                  ? 'text-white'
                  : 'text-[#B45309]'
              }`}
            >
              {counts.EXPIRING_SOON}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'EXPIRING_SOON'
                  ? 'text-white/85'
                  : 'text-[#647067]'
              }`}
            >
              Due within 7 days
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('EXPIRED')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'EXPIRED'
                ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#DC2626]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'EXPIRED'
                  ? 'text-white/85'
                  : 'text-[#647067]'
              }`}
            >
              Expired
            </span>
            <strong
              className={`text-2xl font-black mt-1 block ${
                selectedFilter === 'EXPIRED' ? 'text-white' : 'text-[#DC2626]'
              }`}
            >
              {counts.EXPIRED}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'EXPIRED'
                  ? 'text-white/85'
                  : 'text-[#647067]'
              }`}
            >
              Awaiting renewal
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('MONTHLY')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'MONTHLY'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'MONTHLY' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Monthly Plan
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.MONTHLY}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'MONTHLY' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              ₹100 / month cycle
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('ANNUAL')}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              selectedFilter === 'ANNUAL'
                ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                selectedFilter === 'ANNUAL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Annual Plan
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {counts.ANNUAL}
            </strong>
            <span
              className={`text-[11px] mt-1 block ${
                selectedFilter === 'ANNUAL' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              ₹1,000 / year cycle
            </span>
          </button>
        </section>

        {/* Filter & Search Bar */}
        <section
          aria-label="Filter and search subscriptions"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div
            role="group"
            aria-label="Subscription filter tabs"
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

          <div className="relative w-full lg:w-80">
            <Icon
              name="search"
              className="w-4 h-4 text-[#647067] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store name or vendor/owner..."
              aria-label="Search subscriptions by store name or vendor name"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs sm:text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] focus:ring-2 focus:ring-[#166534]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#647067] hover:text-[#17201A] px-1"
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Subscription Records Table / Cards */}
        <section
          aria-label="Store subscriptions list"
          className="bg-white border border-[#E2E8E3] rounded-2xl shadow-xs overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8E3] flex items-center justify-between text-xs text-[#647067]">
            <span>
              Showing{' '}
              <strong className="text-[#17201A]">
                {filteredRecords.length}
              </strong>{' '}
              of {counts.ALL} subscription records
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

          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-base font-bold text-[#17201A]">
                No matching store subscriptions found
              </p>
              <p className="text-xs text-[#647067] max-w-sm mx-auto">
                No store or vendor matches your current search query and status filter. Try clearing the search or selecting &ldquo;All&rdquo;.
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
                  Show All Subscriptions
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile & Tablet Adaptive Subscription Cards */}
              <div className="lg:hidden divide-y divide-[#E2E8E3]">
                {filteredRecords.map((rec) => {
                  const statusStyle = STATUS_BADGE[rec.status];
                  return (
                    <article key={rec.id} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-black text-[#17201A]">
                              {rec.storeName}
                            </h2>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle.className}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`}
                              />
                              {statusStyle.label}
                            </span>
                          </div>
                          <p className="text-[#647067] mt-0.5">
                            {rec.storeCategory} • {rec.sector}
                          </p>
                          <p className="text-[#17201A] font-semibold mt-0.5">
                            Owner: {rec.vendorName} ({rec.vendorPhone})
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <strong className="text-sm font-black text-[#17201A] block">
                            {formatFullINR(rec.amount)}
                          </strong>
                          <span className="text-[11px] text-[#647067]">
                            {rec.planName}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[#17201A] font-medium">
                          {formatReadableDate(rec.startDate)} →{' '}
                          {formatReadableDate(rec.expiryDate)}
                        </span>
                        <span
                          className={`font-bold ${
                            rec.status === 'EXPIRED'
                              ? 'text-[#DC2626]'
                              : rec.status === 'EXPIRING_SOON'
                                ? 'text-[#B45309]'
                                : 'text-[#166534]'
                          }`}
                        >
                          {formatDaysStatus(rec)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#647067]">
                          Onboarded {formatReadableDate(rec.onboardingDate)} •{' '}
                          {rec.totalRenewalsCount} cycles
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSubscription(rec)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534]"
                        >
                          <Icon name="eye" className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
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
                    <th className="py-3 px-4">Store &amp; Category</th>
                    <th className="py-3 px-4">Vendor / Owner</th>
                    <th className="py-3 px-4">Onboarded</th>
                    <th className="py-3 px-4">Plan &amp; Cycle</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Start → Expiry / Renewal</th>
                    <th className="py-3 px-4">Status &amp; Timeline</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E3] text-xs">
                  {filteredRecords.map((rec) => {
                    const statusStyle = STATUS_BADGE[rec.status];
                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-[#F8FAF7]/70 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#17201A]">
                            {rec.storeName}
                          </div>
                          <div className="text-[11px] text-[#647067] mt-0.5">
                            {rec.storeCategory} • {rec.sector}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#17201A]">
                            {rec.vendorName}
                          </div>
                          <div className="text-[11px] text-[#647067] mt-0.5">
                            {rec.vendorPhone}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-[#17201A]">
                          {formatReadableDate(rec.onboardingDate)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[#17201A]">
                            {rec.planName}
                          </div>
                          <span className="text-[11px] text-[#647067]">
                            {rec.billingCycle} Billing
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <strong className="font-black text-[#17201A]">
                            {formatFullINR(rec.amount)}
                          </strong>
                          <span className="text-[11px] text-[#647067] block">
                            /{rec.billingCycle === 'Monthly' ? 'mo' : 'yr'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-[#17201A] font-medium">
                            {formatReadableDate(rec.startDate)} →{' '}
                            {formatReadableDate(rec.expiryDate)}
                          </div>
                          <div className="text-[11px] text-[#647067] mt-0.5">
                            {rec.totalRenewalsCount}{' '}
                            {rec.totalRenewalsCount === 1
                              ? 'cycle'
                              : 'cycles'}{' '}
                            completed
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusStyle.className}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`}
                            />
                            {statusStyle.label}
                          </span>
                          <div
                            className={`text-[11px] font-semibold mt-1 ${
                              rec.status === 'EXPIRED'
                                ? 'text-[#DC2626]'
                                : rec.status === 'EXPIRING_SOON'
                                  ? 'text-[#B45309]'
                                  : 'text-[#647067]'
                            }`}
                          >
                            {formatDaysStatus(rec)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedSubscription(rec)}
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

      {/* Subscription Details Modal */}
      {selectedSubscription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-detail-title"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="subscription-detail-title"
                    className="text-lg sm:text-xl font-black text-[#17201A]"
                  >
                    {selectedSubscription.storeName}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      STATUS_BADGE[selectedSubscription.status].className
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        STATUS_BADGE[selectedSubscription.status].dotClass
                      }`}
                    />
                    {STATUS_BADGE[selectedSubscription.status].label}
                  </span>
                </div>
                <p className="text-xs text-[#647067] mt-1">
                  Subscription ID: {selectedSubscription.id.toUpperCase()} •{' '}
                  {selectedSubscription.storeCategory}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubscription(null)}
                aria-label="Close subscription details"
                className="p-2 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            {/* Store & Vendor Info + Current Plan Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  Store &amp; Vendor Profile
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Vendor / Owner:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedSubscription.vendorName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Contact Phone:</dt>
                    <dd className="font-medium text-[#17201A]">
                      {selectedSubscription.vendorPhone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Email:</dt>
                    <dd className="font-medium text-[#17201A] truncate">
                      {selectedSubscription.vendorEmail}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Location:</dt>
                    <dd className="font-medium text-[#17201A] text-right">
                      {selectedSubscription.sector}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Onboarding Date:</dt>
                    <dd className="font-semibold text-[#166534]">
                      {formatReadableDate(selectedSubscription.onboardingDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">GST Registration:</dt>
                    <dd className="font-medium text-[#17201A]">
                      {selectedSubscription.gstRegistered
                        ? 'GST Verified'
                        : 'Unregistered / Exempt'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  Current Plan &amp; Period
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Plan Name:</dt>
                    <dd className="font-bold text-[#17201A]">
                      {selectedSubscription.planName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Billing Cycle:</dt>
                    <dd className="font-medium text-[#17201A]">
                      {selectedSubscription.billingCycle}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Plan Amount:</dt>
                    <dd className="font-black text-[#166534]">
                      {formatFullINR(selectedSubscription.amount)} /{' '}
                      {selectedSubscription.billingCycle === 'Monthly'
                        ? 'month'
                        : 'year'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Period Start:</dt>
                    <dd className="font-medium text-[#17201A]">
                      {formatReadableDate(selectedSubscription.startDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Expiry / Renewal:</dt>
                    <dd className="font-medium text-[#17201A]">
                      {formatReadableDate(selectedSubscription.expiryDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#647067]">Timeline Status:</dt>
                    <dd
                      className={`font-bold ${
                        selectedSubscription.status === 'EXPIRED'
                          ? 'text-[#DC2626]'
                          : selectedSubscription.status === 'EXPIRING_SOON'
                            ? 'text-[#B45309]'
                            : 'text-[#166534]'
                      }`}
                    >
                      {formatDaysStatus(selectedSubscription)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Previous Renewal & Payment Records */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17201A]">
                  Previous Renewal &amp; Payment History
                </h3>
                <span className="text-xs text-[#647067]">
                  Showing recent {selectedSubscription.paymentHistory.length} of{' '}
                  {selectedSubscription.totalRenewalsCount} renewals
                </span>
              </div>

              <div className="border border-[#E2E8E3] rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAF7] border-b border-[#E2E8E3] text-[11px] font-bold text-[#647067]">
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Paid On</th>
                      <th className="py-2.5 px-3">Subscription Period</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E3]">
                    {selectedSubscription.paymentHistory.map((pay) => (
                      <tr key={pay.id}>
                        <td className="py-2.5 px-3 font-semibold text-[#17201A]">
                          {pay.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 text-[#647067]">
                          {formatReadableDate(pay.paidOn)}
                        </td>
                        <td className="py-2.5 px-3 text-[#17201A]">
                          {pay.periodCovered}
                        </td>
                        <td className="py-2.5 px-3 text-[#647067]">
                          {pay.paymentMode}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#166534]">
                          {formatFullINR(pay.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#647067]">
              <span>
                Phase 2 Prototype: Renewal billing and Razorpay subscription actions will be enabled in Phase 11.
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubscription(null)}
                className="px-4 py-1.5 rounded-xl bg-[#166534] text-white font-semibold hover:bg-[#14532D] self-end sm:self-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] p-8 text-center text-sm font-semibold">
          Loading subscription records...
        </div>
      }
    >
      <SubscriptionsManagementContent />
    </Suspense>
  );
}
