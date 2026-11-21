'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  type AdminOrderRecord,
  type AdminOrderStatus,
  type CancellationReasonKey,
  CANCELLATION_REASON_KEYS,
  CANCELLATION_REASON_META,
  type DateRangePreset,
  getAdminOrdersForRange,
  ORDER_STATUS_META,
  REFERENCE_TODAY,
} from '@/data/adminAnalyticsData';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { formatFullINR } from '@/components/admin/charts/RevenueChart';
import { Icon } from '@/components/vendor/Icon';

type OrderStatusFilter = 'ALL' | AdminOrderStatus;
type ActorFilter = 'ALL' | 'Customer' | 'Vendor' | 'Delivery' | 'System' | 'DeliverySystem';

const STATUS_FILTER_OPTIONS: { id: OrderStatusFilter; label: string }[] = [
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'ALL', label: 'All Orders' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { id: 'PREPARING', label: 'Preparing' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'ORDER_PLACED', label: 'Order Placed' },
];

const PERIOD_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'LAST_MONTH', label: 'Last Month' },
  { id: 'THIS_QUARTER', label: 'This Quarter' },
  { id: 'THIS_YEAR', label: 'This Year' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

const ACTOR_BADGE_STYLE: Record<
  'Customer' | 'Vendor' | 'Delivery' | 'System',
  string
> = {
  Customer: 'bg-[#166534]/10 text-[#166534] border-[#166534]/20',
  Vendor: 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30',
  Delivery: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
  System: 'bg-[#E2E8E3] text-[#17201A] border-[#647067]/25',
};

function parseInitialStatus(raw: string | null): OrderStatusFilter {
  const upper = (raw || '').toUpperCase();
  if (
    upper === 'ALL' ||
    upper === 'CANCELLED' ||
    upper === 'DELIVERED' ||
    upper === 'OUT_FOR_DELIVERY' ||
    upper === 'READY_FOR_PICKUP' ||
    upper === 'PREPARING' ||
    upper === 'ACCEPTED' ||
    upper === 'ORDER_PLACED'
  ) {
    return upper as OrderStatusFilter;
  }
  return 'CANCELLED';
}

function parseInitialPreset(raw: string | null): DateRangePreset {
  const upper = (raw || '').toUpperCase();
  if (
    upper === 'THIS_MONTH' ||
    upper === 'LAST_MONTH' ||
    upper === 'THIS_QUARTER' ||
    upper === 'THIS_YEAR' ||
    upper === 'CUSTOM'
  ) {
    return upper as DateRangePreset;
  }
  return 'THIS_MONTH';
}

function parseInitialReason(raw: string | null): 'ALL' | CancellationReasonKey {
  const upper = (raw || '').toUpperCase() as CancellationReasonKey;
  if (CANCELLATION_REASON_KEYS.includes(upper)) {
    return upper;
  }
  return 'ALL';
}

function parseInitialActor(raw: string | null): ActorFilter {
  if (
    raw === 'Customer' ||
    raw === 'Vendor' ||
    raw === 'Delivery' ||
    raw === 'System' ||
    raw === 'DeliverySystem'
  ) {
    return raw;
  }
  return 'ALL';
}

function AdminOrdersDrilldownContent() {
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>(() =>
    parseInitialStatus(searchParams.get('status'))
  );
  const [preset, setPreset] = useState<DateRangePreset>(() =>
    parseInitialPreset(searchParams.get('preset'))
  );
  const [customFrom, setCustomFrom] = useState<string>(
    () => searchParams.get('from') || '2026-11-01'
  );
  const [customTo, setCustomTo] = useState<string>(
    () => searchParams.get('to') || REFERENCE_TODAY
  );
  const [reasonFilter, setReasonFilter] = useState<'ALL' | CancellationReasonKey>(
    () => parseInitialReason(searchParams.get('reason'))
  );
  const [actorFilter, setActorFilter] = useState<ActorFilter>(() =>
    parseInitialActor(searchParams.get('actor'))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord | null>(
    null
  );

  const dateValidationError =
    preset === 'CUSTOM' && customFrom > customTo
      ? 'Invalid date range: From Date cannot be after To Date.'
      : null;

  const periodData = useMemo(() => {
    if (dateValidationError) {
      return {
        orders: [] as AdminOrderRecord[],
        fromDate: customFrom,
        toDate: customTo,
        label: 'Invalid Custom Range',
      };
    }
    return getAdminOrdersForRange(preset, customFrom, customTo);
  }, [preset, customFrom, customTo, dateValidationError]);

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatusFilter, number> = {
      ALL: periodData.orders.length,
      CANCELLED: 0,
      DELIVERED: 0,
      OUT_FOR_DELIVERY: 0,
      READY_FOR_PICKUP: 0,
      PREPARING: 0,
      ACCEPTED: 0,
      ORDER_PLACED: 0,
    };
    for (const o of periodData.orders) {
      counts[o.status] += 1;
    }
    return counts;
  }, [periodData.orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return periodData.orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;

      if (reasonFilter !== 'ALL' && o.cancellationReasonKey !== reasonFilter) {
        return false;
      }

      if (actorFilter !== 'ALL') {
        if (actorFilter === 'DeliverySystem') {
          if (o.cancelledBy !== 'Delivery' && o.cancelledBy !== 'System')
            return false;
        } else if (o.cancelledBy !== actorFilter) {
          return false;
        }
      }

      if (q) {
        const matchId = o.orderNumber.toLowerCase().includes(q);
        const matchCustomer = o.customerName.toLowerCase().includes(q);
        const matchStore = o.storeName.toLowerCase().includes(q);
        const matchReason = (o.cancellationReason || '')
          .toLowerCase()
          .includes(q);
        if (!matchId && !matchCustomer && !matchStore && !matchReason)
          return false;
      }

      return true;
    });
  }, [periodData.orders, statusFilter, reasonFilter, actorFilter, searchQuery]);

  const cancelledSummary = useMemo(() => {
    const cancelledInView = filteredOrders.filter(
      (o) => o.status === 'CANCELLED'
    );
    const totalVal = cancelledInView.reduce((s, o) => s + o.orderValue, 0);
    const custCount = cancelledInView.filter(
      (o) => o.cancelledBy === 'Customer'
    ).length;
    const vendorCount = cancelledInView.filter(
      (o) => o.cancelledBy === 'Vendor'
    ).length;
    const delivSysCount = cancelledInView.filter(
      (o) => o.cancelledBy === 'Delivery' || o.cancelledBy === 'System'
    ).length;
    return {
      count: cancelledInView.length,
      totalVal,
      custCount,
      vendorCount,
      delivSysCount,
    };
  }, [filteredOrders]);

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
              Marketplace Orders &amp; Cancellation Drill-Down
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1">
              Inspect cancelled and active marketplace orders, root-cause cancellation reasons, responsible actors, and stage at cancellation.
            </p>
          </div>

          {/* Period Selector synced with Admin Analytics */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white border border-[#E2E8E3] rounded-2xl p-1.5 shadow-xs self-start sm:self-end">
            {PERIOD_OPTIONS.map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#166534] text-white shadow-xs'
                      : 'text-[#647067] hover:text-[#17201A]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Inputs when CUSTOM preset is active */}
        {preset === 'CUSTOM' && (
          <section className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="orders-from-date"
                  className="block text-xs font-semibold text-[#17201A] mb-1"
                >
                  From Date
                </label>
                <input
                  id="orders-from-date"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-1.5 text-xs font-medium text-[#17201A]"
                />
              </div>
              <div>
                <label
                  htmlFor="orders-to-date"
                  className="block text-xs font-semibold text-[#17201A] mb-1"
                >
                  To Date
                </label>
                <input
                  id="orders-to-date"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-1.5 text-xs font-medium text-[#17201A]"
                />
              </div>
              <span className="text-xs text-[#647067] pb-1.5">
                Showing records for: <strong className="text-[#17201A]">{periodData.label}</strong>
              </span>
            </div>
            {dateValidationError && (
              <div
                role="alert"
                className="rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 px-3 py-2 text-xs font-semibold text-[#DC2626]"
              >
                ⚠ {dateValidationError}
              </div>
            )}
          </section>
        )}

        {/* Cancelled Orders Summary Strip */}
        <section
          aria-label="Cancelled orders period summary"
          className="grid grid-cols-2 sm:grid-cols-5 gap-3"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-[#647067] block">
              Period Cancelled Orders
            </span>
            <strong className="text-2xl font-black text-[#DC2626] mt-1 block">
              {statusCounts.CANCELLED.toLocaleString('en-IN')}
            </strong>
            <span className="text-[11px] text-[#647067] mt-0.5 block">
              Matches Dashboard KPI
            </span>
          </div>

          <div className="bg-white border border-[#E2E8E3] rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-[#647067] block">
              Cancelled Value (Filtered)
            </span>
            <strong className="text-2xl font-black text-[#17201A] mt-1 block">
              {formatFullINR(cancelledSummary.totalVal)}
            </strong>
            <span className="text-[11px] text-[#647067] mt-0.5 block">
              Across {cancelledSummary.count} matching orders
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('CANCELLED');
              setActorFilter(actorFilter === 'Customer' ? 'ALL' : 'Customer');
            }}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              actorFilter === 'Customer'
                ? 'bg-[#166534] text-white border-[#166534]'
                : 'bg-white border-[#E2E8E3] hover:border-[#166534]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                actorFilter === 'Customer' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Cancelled by Customer
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {cancelledSummary.custCount}
            </strong>
            <span
              className={`text-[11px] mt-0.5 block ${
                actorFilter === 'Customer' ? 'text-white/80' : 'text-[#647067]'
              }`}
            >
              Click to filter
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('CANCELLED');
              setActorFilter(actorFilter === 'Vendor' ? 'ALL' : 'Vendor');
            }}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              actorFilter === 'Vendor'
                ? 'bg-[#B45309] text-white border-[#B45309]'
                : 'bg-white border-[#E2E8E3] hover:border-[#B45309]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                actorFilter === 'Vendor' ? 'text-white/85' : 'text-[#647067]'
              }`}
            >
              Cancelled by Vendor
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {cancelledSummary.vendorCount}
            </strong>
            <span
              className={`text-[11px] mt-0.5 block ${
                actorFilter === 'Vendor' ? 'text-white/85' : 'text-[#647067]'
              }`}
            >
              Stock / store rejection
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('CANCELLED');
              setActorFilter(
                actorFilter === 'DeliverySystem' ? 'ALL' : 'DeliverySystem'
              );
            }}
            className={`text-left rounded-2xl p-3.5 border transition-colors ${
              actorFilter === 'DeliverySystem'
                ? 'bg-[#17201A] text-white border-[#17201A]'
                : 'bg-white border-[#E2E8E3] hover:border-[#17201A]'
            }`}
          >
            <span
              className={`text-[11px] font-semibold block ${
                actorFilter === 'DeliverySystem'
                  ? 'text-white/80'
                  : 'text-[#647067]'
              }`}
            >
              Delivery &amp; System
            </span>
            <strong className="text-2xl font-black mt-1 block">
              {cancelledSummary.delivSysCount}
            </strong>
            <span
              className={`text-[11px] mt-0.5 block ${
                actorFilter === 'DeliverySystem'
                  ? 'text-white/80'
                  : 'text-[#647067]'
              }`}
            >
              Delivery / payment timeout
            </span>
          </button>
        </section>

        {/* Order Status Filter + Cancellation Filters + Search */}
        <section
          aria-label="Order filters"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs space-y-4"
        >
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(opt.id);
                    if (opt.id !== 'CANCELLED' && opt.id !== 'ALL') {
                      setReasonFilter('ALL');
                      setActorFilter('ALL');
                    }
                  }}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? opt.id === 'CANCELLED'
                        ? 'bg-[#DC2626] text-white shadow-xs'
                        : 'bg-[#166534] text-white shadow-xs'
                      : 'bg-[#F8FAF7] text-[#17201A] border border-[#E2E8E3] hover:border-[#166534]'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-[#647067] border border-[#E2E8E3]'
                    }`}
                  >
                    {statusCounts[opt.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reason, Cancelled By, and Search Controls */}
          <div className="pt-3 border-t border-[#E2E8E3] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label
                htmlFor="filter-cancellation-reason"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#647067] mb-1"
              >
                Cancellation Reason
              </label>
              <select
                id="filter-cancellation-reason"
                value={reasonFilter}
                onChange={(e) => {
                  const val = e.target.value as 'ALL' | CancellationReasonKey;
                  setReasonFilter(val);
                  if (val !== 'ALL') setStatusFilter('CANCELLED');
                }}
                className="w-full rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3 py-2 text-xs font-semibold text-[#17201A] focus:outline-none focus:border-[#166534]"
              >
                <option value="ALL">All Cancellation Reasons</option>
                {CANCELLATION_REASON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {CANCELLATION_REASON_META[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-cancelled-by"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#647067] mb-1"
              >
                Cancelled By
              </label>
              <select
                id="filter-cancelled-by"
                value={actorFilter}
                onChange={(e) => {
                  const val = e.target.value as ActorFilter;
                  setActorFilter(val);
                  if (val !== 'ALL') setStatusFilter('CANCELLED');
                }}
                className="w-full rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3 py-2 text-xs font-semibold text-[#17201A] focus:outline-none focus:border-[#166534]"
              >
                <option value="ALL">All Actors</option>
                <option value="Customer">Customer</option>
                <option value="Vendor">Vendor / Store</option>
                <option value="Delivery">Delivery Partner</option>
                <option value="System">System / Payment</option>
                <option value="DeliverySystem">
                  Delivery + System Combined
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="search-admin-orders"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#647067] mb-1"
              >
                Search Orders
              </label>
              <div className="relative">
                <Icon
                  name="search"
                  className="w-4 h-4 text-[#647067] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  id="search-admin-orders"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID (e.g. VH-ORD-4320), customer, store, or reason..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs font-medium text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear order search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#647067] hover:text-[#17201A]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Orders Table */}
        <section
          aria-label="Admin orders table"
          className="bg-white border border-[#E2E8E3] rounded-2xl shadow-xs overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8E3] flex flex-wrap items-center justify-between gap-2 text-xs text-[#647067]">
            <span>
              Showing{' '}
              <strong className="text-[#17201A]">{filteredOrders.length}</strong>{' '}
              matching orders in <strong className="text-[#17201A]">{periodData.label}</strong>
            </span>
            {(statusFilter !== 'CANCELLED' ||
              reasonFilter !== 'ALL' ||
              actorFilter !== 'ALL' ||
              searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('CANCELLED');
                  setReasonFilter('ALL');
                  setActorFilter('ALL');
                  setSearchQuery('');
                }}
                className="font-semibold text-[#166534] hover:underline"
              >
                Reset to All Cancelled Orders
              </button>
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-base font-bold text-[#17201A]">
                No orders match the selected filters
              </p>
              <p className="text-xs text-[#647067] max-w-sm mx-auto">
                Try broadening your date range, clearing the search input, or resetting the cancellation reason / actor filter.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('CANCELLED');
                    setReasonFilter('ALL');
                    setActorFilter('ALL');
                    setSearchQuery('');
                    setPreset('THIS_MONTH');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D]"
                >
                  Show This Month&apos;s Cancelled Orders
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAF7] border-b border-[#E2E8E3] text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer &amp; Store</th>
                    <th className="py-3 px-4">Order Value</th>
                    <th className="py-3 px-4">Order / Cancel Time</th>
                    <th className="py-3 px-4">Cancellation Reason</th>
                    <th className="py-3 px-4">Cancelled By</th>
                    <th className="py-3 px-4">Stage When Cancelled</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E3] text-xs">
                  {filteredOrders.slice(0, 120).map((ord) => {
                    const isCancelled = ord.status === 'CANCELLED';
                    return (
                      <tr
                        key={ord.id}
                        className="hover:bg-[#F8FAF7]/70 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-black text-[#17201A]">
                            {ord.orderNumber}
                          </div>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1"
                            style={{
                              backgroundColor: `${ORDER_STATUS_META[ord.status].color}15`,
                              color: ORDER_STATUS_META[ord.status].color,
                            }}
                          >
                            {ORDER_STATUS_META[ord.status].label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#17201A]">
                            {ord.customerName}
                            <span className="font-normal text-[#647067]">
                              {' '}
                              • {ord.customerSector}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#166534] font-semibold mt-0.5">
                            {ord.storeName}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <strong className="font-black text-[#17201A]">
                            {formatFullINR(ord.orderValue)}
                          </strong>
                          <span className="text-[11px] text-[#647067] block">
                            {ord.paymentMethod} • {ord.items.length}{' '}
                            {ord.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-[#17201A]">
                            <span className="text-[#647067] text-[11px]">
                              Placed:{' '}
                            </span>
                            {ord.orderDateTime}
                          </div>
                          {isCancelled && ord.cancellationDateTime && (
                            <div className="text-[#DC2626] font-medium mt-0.5">
                              <span className="text-[11px]">Cancelled: </span>
                              {ord.cancellationDateTime}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isCancelled ? (
                            <span className="font-semibold text-[#17201A]">
                              {ord.cancellationReason}
                            </span>
                          ) : (
                            <span className="text-[#647067]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isCancelled && ord.cancelledBy ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                ACTOR_BADGE_STYLE[ord.cancelledBy]
                              }`}
                            >
                              {ord.cancelledBy}
                            </span>
                          ) : (
                            <span className="text-[#647067]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isCancelled && ord.stageWhenCancelledLabel ? (
                            <div>
                              <span className="font-semibold text-[#17201A]">
                                {ord.stageWhenCancelledLabel}
                              </span>
                              <span className="text-[11px] text-[#647067] block">
                                +{ord.minutesBeforeCancellation} mins after order
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#647067]">
                              {ORDER_STATUS_META[ord.status].label}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
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
          )}
        </section>
      </main>

      {/* Complete Order & Cancellation Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-modal-title"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-5 sm:p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="order-detail-modal-title"
                    className="text-lg sm:text-xl font-black text-[#17201A]"
                  >
                    Order {selectedOrder.orderNumber}
                  </h2>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: `${ORDER_STATUS_META[selectedOrder.status].color}18`,
                      color: ORDER_STATUS_META[selectedOrder.status].color,
                    }}
                  >
                    {ORDER_STATUS_META[selectedOrder.status].label}
                  </span>
                </div>
                <p className="text-xs text-[#647067] mt-1">
                  Placed on {selectedOrder.orderDateTime} • Payment Mode:{' '}
                  {selectedOrder.paymentMethod}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                className="p-2 rounded-xl text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            {/* Cancellation Audit Card (when order is CANCELLED) */}
            {selectedOrder.status === 'CANCELLED' && (
              <div className="bg-[#DC2626]/5 border border-[#DC2626]/25 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                    Cancellation Audit Summary
                  </h3>
                  {selectedOrder.cancelledBy && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        ACTOR_BADGE_STYLE[selectedOrder.cancelledBy]
                      }`}
                    >
                      Cancelled by {selectedOrder.cancelledBy}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white rounded-xl p-3 border border-[#E2E8E3]">
                    <span className="text-[#647067] block text-[11px]">
                      Cancellation Reason
                    </span>
                    <strong className="font-bold text-[#17201A] text-sm mt-0.5 block">
                      {selectedOrder.cancellationReason}
                    </strong>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-[#E2E8E3]">
                    <span className="text-[#647067] block text-[11px]">
                      Order Stage When Cancelled
                    </span>
                    <strong className="font-bold text-[#17201A] text-sm mt-0.5 block">
                      {selectedOrder.stageWhenCancelledLabel}
                    </strong>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-[#E2E8E3]">
                    <span className="text-[#647067] block text-[11px]">
                      Order Placed Timestamp
                    </span>
                    <strong className="font-semibold text-[#17201A] mt-0.5 block">
                      {selectedOrder.orderDateTime}
                    </strong>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-[#E2E8E3]">
                    <span className="text-[#647067] block text-[11px]">
                      Cancellation Timestamp
                    </span>
                    <strong className="font-semibold text-[#DC2626] mt-0.5 block">
                      {selectedOrder.cancellationDateTime} (+
                      {selectedOrder.minutesBeforeCancellation} mins)
                    </strong>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-[#E2E8E3] text-xs space-y-1.5">
                  <div>
                    <span className="font-bold text-[#17201A]">
                      Operational Log:{' '}
                    </span>
                    <span className="text-[#647067]">
                      {selectedOrder.cancellationNote}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[#17201A]">
                      Settlement &amp; Payment Status:{' '}
                    </span>
                    <span className="text-[#166534] font-medium">
                      {selectedOrder.settlementImpactNote}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Store & Customer Neighborhood Context (Privacy-safe) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  Store Information
                </span>
                <p className="font-bold text-[#17201A] text-sm">
                  {selectedOrder.storeName}
                </p>
                <p className="text-[#647067]">{selectedOrder.storeCategory}</p>
                <p className="text-[11px] text-[#166534] font-semibold">
                  Store ID: {selectedOrder.storeId}
                </p>
              </div>

              <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  Customer Delivery Zone
                </span>
                <p className="font-bold text-[#17201A] text-sm">
                  {selectedOrder.customerName}
                </p>
                <p className="text-[#647067]">
                  Neighborhood: {selectedOrder.customerSector}, Gurugram
                </p>
                <p className="text-[11px] text-[#647067]">
                  Personal contact details masked in Admin Audit View
                </p>
              </div>
            </div>

            {/* Ordered Items & Value Breakdown */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17201A]">
                Order Items &amp; Value Breakdown
              </h3>
              <div className="border border-[#E2E8E3] rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAF7] border-b border-[#E2E8E3] text-[11px] font-bold text-[#647067]">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E3]">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={`${item.name}-${idx}`}>
                        <td className="py-2.5 px-3 font-semibold text-[#17201A]">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-[#647067]">
                          {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#647067]">
                          {formatFullINR(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#17201A]">
                          {formatFullINR(item.unitPrice * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="bg-[#F8FAF7] border-t border-[#E2E8E3] p-3.5 space-y-1 text-xs">
                  <div className="flex justify-between text-[#647067]">
                    <span>Items Subtotal</span>
                    <span>{formatFullINR(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#647067]">
                    <span>Hyperlocal Delivery Fee</span>
                    <span>{formatFullINR(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-[#647067]">
                    <span>Platform Service Fee</span>
                    <span>{formatFullINR(selectedOrder.platformFee)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-[#17201A] pt-1.5 border-t border-[#E2E8E3]">
                    <span>Total Order Value</span>
                    <span>{formatFullINR(selectedOrder.orderValue)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] p-8 text-center text-sm font-semibold">
          Loading marketplace orders...
        </div>
      }
    >
      <AdminOrdersDrilldownContent />
    </Suspense>
  );
}
