'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  type ChartGranularity,
  type DateRangePreset,
  type KpiComparison,
  getAdminAnalyticsSnapshot,
  REFERENCE_TODAY,
} from '@/data/adminAnalyticsData';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AnalyticsDateFilter } from '@/components/admin/AnalyticsDateFilter';
import { OrdersTrendChart } from '@/components/admin/charts/OrdersTrendChart';
import {
  formatFullINR,
  GmvMarketplaceChart,
  RevenueChart,
} from '@/components/admin/charts/RevenueChart';
import { OrderStatusChart } from '@/components/admin/charts/OrderStatusChart';
import { CategoryPerformanceChart } from '@/components/admin/charts/CategoryPerformanceChart';
import { GrowthChart } from '@/components/admin/charts/GrowthChart';
import { CancellationAnalyticsSection } from '@/components/admin/charts/CancellationAnalyticsSection';
import { Icon, type IconName } from '@/components/vendor/Icon';

interface KpiCardProps {
  label: string;
  formattedValue: string;
  subtitle: string;
  comparison: KpiComparison;
  icon: IconName;
  accentTone?: 'green' | 'terracotta' | 'red';
  invertTrendColor?: boolean;
  href?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  formattedValue,
  subtitle,
  comparison,
  icon,
  accentTone = 'green',
  invertTrendColor = false,
  href,
}) => {
  const iconToneClass = {
    green: 'bg-[#166534]/10 text-[#166534]',
    terracotta: 'bg-[#B45309]/10 text-[#B45309]',
    red: 'bg-[#DC2626]/10 text-[#DC2626]',
  }[accentTone];

  const renderTrendBadge = () => {
    if (comparison.changePercent === null) {
      return (
        <span className="text-[11px] font-medium text-[#647067]">
          No prior baseline
        </span>
      );
    }

    const isPositive = comparison.changePercent > 0;
    const isNegative = comparison.changePercent < 0;
    const arrow = isPositive ? '↑' : isNegative ? '↓' : '→';
    const absPercent = Math.abs(comparison.changePercent).toFixed(1);

    let colorClass = 'text-[#647067] bg-[#F8FAF7]';
    if (isPositive) {
      colorClass = invertTrendColor
        ? 'text-[#DC2626] bg-[#DC2626]/10'
        : 'text-[#166534] bg-[#166534]/10';
    } else if (isNegative) {
      colorClass = invertTrendColor
        ? 'text-[#166534] bg-[#166534]/10'
        : 'text-[#DC2626] bg-[#DC2626]/10';
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${colorClass}`}
      >
        <span>
          {arrow} {absPercent}%
        </span>
        <span className="font-medium opacity-85">vs previous period</span>
      </span>
    );
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#647067] uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="text-2xl font-black text-[#17201A] mt-1 leading-tight">
            {formattedValue}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconToneClass}`}
        >
          <Icon name={icon} className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-[#E2E8E3]">
        <div>{renderTrendBadge()}</div>
        <p className="text-[11px] text-[#647067] truncate">{subtitle}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-white border border-[#E2E8E3] hover:border-[#166534] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
      {content}
    </article>
  );
};

export default function AdminDashboardPage() {
  const [preset, setPreset] = useState<DateRangePreset>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState<string>('2026-11-01');
  const [customTo, setCustomTo] = useState<string>(REFERENCE_TODAY);
  const [granularityChoice, setGranularityChoice] = useState<
    ChartGranularity | 'auto'
  >('auto');

  const validationError = useMemo(() => {
    if (preset !== 'CUSTOM') return null;
    if (!customFrom || !customTo) {
      return 'Please select both From Date and To Date.';
    }
    if (customFrom > customTo) {
      return 'Invalid date range: From Date cannot be after To Date.';
    }
    return null;
  }, [preset, customFrom, customTo]);

  const snapshot = useMemo(() => {
    if (validationError) {
      return getAdminAnalyticsSnapshot(
        'CUSTOM',
        '2099-01-01',
        '2099-01-01',
        granularityChoice === 'auto' ? undefined : granularityChoice
      );
    }
    return getAdminAnalyticsSnapshot(
      preset,
      customFrom,
      customTo,
      granularityChoice === 'auto' ? undefined : granularityChoice
    );
  }, [preset, customFrom, customTo, granularityChoice, validationError]);

  const handlePresetChange = (nextPreset: DateRangePreset) => {
    setPreset(nextPreset);
    setGranularityChoice('auto');
  };

  const handleCustomRangeChange = (from: string, to: string) => {
    setPreset('CUSTOM');
    setCustomFrom(from);
    setCustomTo(to);
  };

  const sub = snapshot.subscriptionAnalytics;
  const totalSubs =
    sub.activeSubscriptions +
    sub.expiringSubscriptions +
    sub.expiredSubscriptions;
  const activeSubPct =
    totalSubs > 0 ? Math.round((sub.activeSubscriptions / totalSubs) * 100) : 0;
  const expiringSubPct =
    totalSubs > 0
      ? Math.round((sub.expiringSubscriptions / totalSubs) * 100)
      : 0;
  const expiredSubPct =
    totalSubs > 0 ? Math.max(0, 100 - activeSubPct - expiringSubPct) : 0;

  const cancelledOrdersDrilldownHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('status', 'CANCELLED');
    params.set('preset', preset);
    if (preset === 'CUSTOM') {
      params.set('from', customFrom);
      params.set('to', customTo);
    }
    return `/admin/orders?${params.toString()}`;
  }, [preset, customFrom, customTo]);

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] flex flex-col">
      {/* Top Admin Navigation Bar */}
      <AdminHeader />

      {/* Main Admin Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#166534] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#166534]" />
              Platform Administration &amp; Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#17201A]">
              Admin Analytics &amp; Marketplace Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1">
              Monitor hyperlocal order volume, platform revenue vs. marketplace GMV, vendor growth, category demand, cancellations, and store subscriptions.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8E3] rounded-xl px-3.5 py-2 text-xs flex items-center gap-2.5 self-start md:self-end shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <div>
              <span className="text-[#647067] block text-[10px] uppercase font-bold">
                Accounting Separation
              </span>
              <strong className="font-semibold text-[#17201A]">
                Platform Revenue ≠ Vendor GMV
              </strong>
            </div>
          </div>
        </div>

        {/* Global Analytics Date-Range Filter */}
        <AnalyticsDateFilter
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          granularity={snapshot.granularity}
          isAutoGranularity={granularityChoice === 'auto'}
          validationError={validationError}
          activeRangeLabel={snapshot.dateRangeLabel}
          previousRangeLabel={snapshot.previousRangeLabel}
          dayCount={snapshot.dayCount}
          onPresetChange={handlePresetChange}
          onCustomRangeChange={handleCustomRangeChange}
          onGranularityChange={setGranularityChoice}
        />

        {/* Period-Aware Analytics KPI Cards (8 Cards) */}
        <section aria-label="Period KPI Summary Cards">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#647067]">
              Key Performance Indicators
            </h2>
            <span className="text-xs text-[#647067]">
              {snapshot.hasData
                ? `Period totals (${snapshot.dayCount} days)`
                : 'No data in selected window'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <KpiCard
              label="GMV / Marketplace Sales"
              formattedValue={formatFullINR(snapshot.kpis.gmv.value)}
              subtitle={`Prev: ${formatFullINR(snapshot.kpis.gmv.previousValue)} • Vendor order value`}
              comparison={snapshot.kpis.gmv}
              icon="rupee"
              accentTone="terracotta"
            />
            <KpiCard
              label="Platform Revenue"
              formattedValue={formatFullINR(
                snapshot.kpis.platformRevenue.value
              )}
              subtitle={`Prev: ${formatFullINR(snapshot.kpis.platformRevenue.previousValue)} • Subscriptions + service fees`}
              comparison={snapshot.kpis.platformRevenue}
              icon="plan"
              accentTone="green"
            />
            <KpiCard
              label="Total Orders"
              formattedValue={snapshot.kpis.totalOrders.value.toLocaleString(
                'en-IN'
              )}
              subtitle={`Prev: ${snapshot.kpis.totalOrders.previousValue.toLocaleString('en-IN')} orders • View all →`}
              comparison={snapshot.kpis.totalOrders}
              icon="orders"
              accentTone="green"
              href={`/admin/orders?status=ALL&preset=${preset}`}
            />
            <KpiCard
              label="Delivered Orders"
              formattedValue={snapshot.kpis.deliveredOrders.value.toLocaleString(
                'en-IN'
              )}
              subtitle={`Prev: ${snapshot.kpis.deliveredOrders.previousValue.toLocaleString('en-IN')} fulfilled`}
              comparison={snapshot.kpis.deliveredOrders}
              icon="check"
              accentTone="green"
            />
            <KpiCard
              label="Cancelled Orders"
              formattedValue={snapshot.kpis.cancelledOrders.value.toLocaleString(
                'en-IN'
              )}
              subtitle={`Prev: ${snapshot.kpis.cancelledOrders.previousValue.toLocaleString('en-IN')} cancelled • Inspect →`}
              comparison={snapshot.kpis.cancelledOrders}
              icon="alert"
              accentTone="red"
              invertTrendColor
              href={cancelledOrdersDrilldownHref}
            />
            <KpiCard
              label="Active Vendors"
              formattedValue={snapshot.kpis.activeVendors.value.toLocaleString(
                'en-IN'
              )}
              subtitle={`Prev period end: ${snapshot.kpis.activeVendors.previousValue.toLocaleString('en-IN')} vendors • Manage →`}
              comparison={snapshot.kpis.activeVendors}
              icon="users"
              accentTone="terracotta"
              href="/admin/vendors"
            />
            <KpiCard
              label="Active Stores"
              formattedValue={snapshot.kpis.activeStores.value.toLocaleString(
                'en-IN'
              )}
              subtitle={`Prev period end: ${snapshot.kpis.activeStores.previousValue.toLocaleString('en-IN')} stores • Manage →`}
              comparison={snapshot.kpis.activeStores}
              icon="store"
              accentTone="green"
              href="/admin/stores"
            />
            <KpiCard
              label="Active Subscriptions"
              formattedValue={snapshot.kpis.activeSubscriptions.value.toLocaleString(
                'en-IN'
              )}
              subtitle={`Prev period end: ${snapshot.kpis.activeSubscriptions.previousValue.toLocaleString('en-IN')} active • View →`}
              comparison={snapshot.kpis.activeSubscriptions}
              icon="plan"
              accentTone="green"
              href="/admin/subscriptions?filter=ACTIVE"
            />
          </div>
        </section>

        {/* Charts Row 1: Orders Trend & Order Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OrdersTrendChart
            data={snapshot.timeSeries}
            granularity={snapshot.granularity}
            dateRangeLabel={snapshot.dateRangeLabel}
          />
          <OrderStatusChart
            data={snapshot.orderStatusDistribution}
            totalOrders={snapshot.kpis.totalOrders.value}
            dateRangeLabel={snapshot.dateRangeLabel}
          />
        </div>

        {/* Dedicated Order Cancellation Analytics Section */}
        <CancellationAnalyticsSection
          cancellationAnalytics={snapshot.cancellationAnalytics}
          timeSeries={snapshot.timeSeries}
          granularity={snapshot.granularity}
          dateRangeLabel={snapshot.dateRangeLabel}
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
        />

        {/* Charts Row 2: Platform Revenue vs Separate GMV / Marketplace Sales Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart
            data={snapshot.timeSeries}
            granularity={snapshot.granularity}
            dateRangeLabel={snapshot.dateRangeLabel}
          />
          <GmvMarketplaceChart
            data={snapshot.timeSeries}
            granularity={snapshot.granularity}
            dateRangeLabel={snapshot.dateRangeLabel}
          />
        </div>

        {/* Charts Row 3: Category Performance & Store / Vendor Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryPerformanceChart
            data={snapshot.categoryPerformance}
            dateRangeLabel={snapshot.dateRangeLabel}
          />
          <GrowthChart
            data={snapshot.timeSeries}
            granularity={snapshot.granularity}
            dateRangeLabel={snapshot.dateRangeLabel}
          />
        </div>

        {/* 7. Actionable Subscription Analytics Section */}
        <section
          aria-label="Subscription Analytics"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#17201A]">
                  Subscription Analytics
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#166534]/10 text-[#166534]">
                  ₹100/mo &amp; ₹1,000/yr Plans
                </span>
              </div>
              <p className="text-xs text-[#647067] mt-0.5">
                Store subscription health, renewal pipeline, and period subscription revenue ({snapshot.dateRangeLabel})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {snapshot.hasData && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-xs">
                  <span className="text-[#647067]">Active Retention Rate:</span>
                  <strong className="font-black text-[#166534]">
                    {sub.renewalRate}%
                  </strong>
                </div>
              )}

              <Link
                href="/admin/subscriptions"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#166534] text-white text-xs sm:text-sm font-semibold hover:bg-[#14532D] transition-colors shadow-xs"
              >
                <span>View Subscribers</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {!snapshot.hasData ? (
            <div className="h-40 rounded-xl bg-[#F8FAF7] border border-dashed border-[#E2E8E3] flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-bold text-[#17201A]">
                No subscription metrics for this date range
              </p>
              <p className="text-xs text-[#647067] mt-1">
                Select a date window within Oct 2025 – Nov 2026 to view subscription status and revenue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* 4 Actionable Key Subscription Metric Boxes */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  href="/admin/subscriptions?filter=ACTIVE"
                  className="bg-[#166534]/5 border border-[#166534]/20 hover:border-[#166534] rounded-2xl p-3.5 transition-colors group"
                >
                  <span className="text-xs font-semibold text-[#647067] block">
                    Active Subscriptions
                  </span>
                  <strong className="text-2xl font-black text-[#166534] mt-1 block">
                    {sub.activeSubscriptions}
                  </strong>
                  <span className="text-[11px] text-[#647067] mt-1 block group-hover:text-[#166534]">
                    View active stores →
                  </span>
                </Link>

                <Link
                  href="/admin/subscriptions?filter=EXPIRING_SOON"
                  className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 hover:border-[#B45309] rounded-2xl p-3.5 transition-colors group"
                >
                  <span className="text-xs font-semibold text-[#647067] block">
                    Expiring Soon
                  </span>
                  <strong className="text-2xl font-black text-[#B45309] mt-1 block">
                    {sub.expiringSubscriptions}
                  </strong>
                  <span className="text-[11px] text-[#647067] mt-1 block group-hover:text-[#B45309]">
                    Due within 7 days →
                  </span>
                </Link>

                <Link
                  href="/admin/subscriptions?filter=EXPIRED"
                  className="bg-[#DC2626]/5 border border-[#DC2626]/20 hover:border-[#DC2626] rounded-2xl p-3.5 transition-colors group"
                >
                  <span className="text-xs font-semibold text-[#647067] block">
                    Expired Subscriptions
                  </span>
                  <strong className="text-2xl font-black text-[#DC2626] mt-1 block">
                    {sub.expiredSubscriptions}
                  </strong>
                  <span className="text-[11px] text-[#647067] mt-1 block group-hover:text-[#DC2626]">
                    Awaiting renewal →
                  </span>
                </Link>

                <Link
                  href="/admin/subscriptions"
                  className="bg-[#F8FAF7] border border-[#E2E8E3] hover:border-[#166534] rounded-2xl p-3.5 transition-colors group"
                >
                  <span className="text-xs font-semibold text-[#647067] block">
                    Subscription Revenue
                  </span>
                  <strong className="text-2xl font-black text-[#17201A] mt-1 block">
                    {formatFullINR(sub.subscriptionRevenue)}
                  </strong>
                  <span className="text-[11px] text-[#166534] font-semibold mt-1 block">
                    Collected in period →
                  </span>
                </Link>
              </div>

              {/* Compact Visual Distribution Bar & Actionable Plan Revenue Split */}
              <div className="lg:col-span-5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#17201A]">
                    Subscription Status &amp; Plan Split
                  </span>
                  <Link
                    href="/admin/subscriptions"
                    className="text-[#166534] font-semibold hover:underline"
                  >
                    {totalSubs} total tracked →
                  </Link>
                </div>

                {/* Stacked status bar */}
                <div
                  className="h-3.5 w-full rounded-full overflow-hidden flex bg-[#E2E8E3]"
                  role="img"
                  aria-label={`Subscription breakdown: ${activeSubPct}% active, ${expiringSubPct}% expiring, ${expiredSubPct}% expired`}
                >
                  <div
                    className="bg-[#166534] h-full transition-all"
                    style={{ width: `${activeSubPct}%` }}
                    title={`Active: ${sub.activeSubscriptions}`}
                  />
                  <div
                    className="bg-[#F59E0B] h-full transition-all"
                    style={{ width: `${expiringSubPct}%` }}
                    title={`Expiring Soon: ${sub.expiringSubscriptions}`}
                  />
                  <div
                    className="bg-[#DC2626] h-full transition-all"
                    style={{ width: `${expiredSubPct}%` }}
                    title={`Expired: ${sub.expiredSubscriptions}`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#647067]">
                  <Link
                    href="/admin/subscriptions?filter=ACTIVE"
                    className="inline-flex items-center gap-1.5 hover:text-[#166534]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#166534]" />
                    Active ({activeSubPct}%)
                  </Link>
                  <Link
                    href="/admin/subscriptions?filter=EXPIRING_SOON"
                    className="inline-flex items-center gap-1.5 hover:text-[#B45309]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    Expiring ({expiringSubPct}%)
                  </Link>
                  <Link
                    href="/admin/subscriptions?filter=EXPIRED"
                    className="inline-flex items-center gap-1.5 hover:text-[#DC2626]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                    Expired ({expiredSubPct}%)
                  </Link>
                </div>

                <div className="pt-2.5 border-t border-[#E2E8E3] grid grid-cols-2 gap-2 text-xs">
                  <Link
                    href="/admin/subscriptions?filter=MONTHLY"
                    className="bg-white rounded-xl px-3 py-2 border border-[#E2E8E3] hover:border-[#166534] transition-colors"
                  >
                    <span className="text-[#647067] block text-[11px]">
                      Monthly Plan (₹100) • {sub.monthlyPlanTotal} stores
                    </span>
                    <strong className="font-bold text-[#17201A]">
                      {formatFullINR(sub.monthlyPlanRevenue)}
                    </strong>
                  </Link>
                  <Link
                    href="/admin/subscriptions?filter=ANNUAL"
                    className="bg-white rounded-xl px-3 py-2 border border-[#E2E8E3] hover:border-[#166534] transition-colors"
                  >
                    <span className="text-[#647067] block text-[11px]">
                      Annual Plan (₹1,000) • {sub.annualPlanTotal} stores
                    </span>
                    <strong className="font-bold text-[#17201A]">
                      {formatFullINR(sub.annualPlanRevenue)}
                    </strong>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
