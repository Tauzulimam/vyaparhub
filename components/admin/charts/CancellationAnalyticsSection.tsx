'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AggregatedTimePoint,
  CancellationAnalyticsSummary,
  ChartGranularity,
  DateRangePreset,
} from '@/data/adminAnalyticsData';
import { formatFullINR } from '@/components/admin/charts/RevenueChart';

export interface CancellationAnalyticsSectionProps {
  cancellationAnalytics: CancellationAnalyticsSummary;
  timeSeries: AggregatedTimePoint[];
  granularity: ChartGranularity;
  dateRangeLabel: string;
  preset: DateRangePreset;
  customFrom: string;
  customTo: string;
}

export const CancellationAnalyticsSection: React.FC<
  CancellationAnalyticsSectionProps
> = ({
  cancellationAnalytics,
  timeSeries,
  granularity,
  dateRangeLabel,
  preset,
  customFrom,
  customTo,
}) => {
  const {
    totalCancellations,
    cancellationRate,
    cancelledOrderValue,
    mostCommonReason,
    customerCausedCount,
    customerCausedPercentage,
    vendorCausedCount,
    vendorCausedPercentage,
    deliverySystemCausedCount,
    deliverySystemCausedPercentage,
    reasonsBreakdown,
  } = cancellationAnalytics;

  const nonZeroReasons = reasonsBreakdown.filter((r) => r.count > 0);

  const buildDrilldownUrl = (extraParams?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set('status', 'CANCELLED');
    params.set('preset', preset);
    if (preset === 'CUSTOM') {
      params.set('from', customFrom);
      params.set('to', customTo);
    }
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
    }
    return `/admin/orders?${params.toString()}`;
  };

  return (
    <section
      aria-label="Order Cancellation Analytics"
      className="bg-white border border-[#E2E8E3] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Section Header + View Cancelled Orders Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#17201A]">
              Order Cancellation Analytics
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DC2626]/10 text-[#DC2626]">
              {totalCancellations.toLocaleString('en-IN')} cancelled ({cancellationRate}% rate)
            </span>
          </div>
          <p className="text-xs text-[#647067] mt-0.5">
            Root-cause breakdown, actor attribution, and cancellation trend over time ({dateRangeLabel})
          </p>
        </div>

        <Link
          href={buildDrilldownUrl()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#166534] text-white text-xs sm:text-sm font-semibold hover:bg-[#14532D] transition-colors shadow-xs self-start sm:self-auto"
        >
          <span>View Cancelled Orders</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {totalCancellations === 0 ? (
        <div className="h-48 rounded-xl bg-[#F8FAF7] border border-dashed border-[#E2E8E3] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#17201A]">
            No cancelled orders in the selected period
          </p>
          <p className="text-xs text-[#647067] mt-1 max-w-xs">
            Select a date range within Oct 2025 – Nov 2026 to inspect cancellation reasons and attribution trends.
          </p>
        </div>
      ) : (
        <>
          {/* 6 Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link
              href={buildDrilldownUrl()}
              className="bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-2xl p-3.5 hover:border-[#DC2626] transition-colors group"
            >
              <span className="text-[11px] font-semibold text-[#647067] block">
                Total Cancellations
              </span>
              <strong className="text-2xl font-black text-[#DC2626] mt-1 block">
                {totalCancellations.toLocaleString('en-IN')}
              </strong>
              <span className="text-[11px] text-[#647067] mt-1 block group-hover:text-[#DC2626]">
                Value: {formatFullINR(cancelledOrderValue)} →
              </span>
            </Link>

            <div className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-3.5">
              <span className="text-[11px] font-semibold text-[#647067] block">
                Cancellation Rate
              </span>
              <strong className="text-2xl font-black text-[#17201A] mt-1 block">
                {cancellationRate.toFixed(1)}%
              </strong>
              <span className="text-[11px] text-[#647067] mt-1 block">
                Of total period orders
              </span>
            </div>

            <Link
              href={
                mostCommonReason
                  ? buildDrilldownUrl({ reason: mostCommonReason.key })
                  : buildDrilldownUrl()
              }
              className="bg-[#B45309]/10 border border-[#B45309]/25 rounded-2xl p-3.5 hover:border-[#B45309] transition-colors"
            >
              <span className="text-[11px] font-semibold text-[#647067] block">
                Most Common Reason
              </span>
              <strong className="text-sm font-black text-[#B45309] mt-1 block leading-snug line-clamp-1">
                {mostCommonReason?.label ?? '—'}
              </strong>
              <span className="text-[11px] text-[#647067] mt-1 block">
                {mostCommonReason
                  ? `${mostCommonReason.count} orders (${mostCommonReason.percentage}%)`
                  : 'No records'}
              </span>
            </Link>

            <Link
              href={buildDrilldownUrl({ actor: 'Customer' })}
              className="bg-[#166534]/5 border border-[#166534]/20 rounded-2xl p-3.5 hover:border-[#166534] transition-colors"
            >
              <span className="text-[11px] font-semibold text-[#647067] block">
                Customer-Caused
              </span>
              <strong className="text-xl font-black text-[#166534] mt-1 block">
                {customerCausedCount.toLocaleString('en-IN')}
              </strong>
              <span className="text-[11px] text-[#647067] mt-1 block">
                {customerCausedPercentage}% of cancellations →
              </span>
            </Link>

            <Link
              href={buildDrilldownUrl({ actor: 'Vendor' })}
              className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl p-3.5 hover:border-[#B45309] transition-colors"
            >
              <span className="text-[11px] font-semibold text-[#647067] block">
                Vendor / Store-Caused
              </span>
              <strong className="text-xl font-black text-[#B45309] mt-1 block">
                {vendorCausedCount.toLocaleString('en-IN')}
              </strong>
              <span className="text-[11px] text-[#647067] mt-1 block">
                {vendorCausedPercentage}% of cancellations →
              </span>
            </Link>

            <Link
              href={buildDrilldownUrl({ actor: 'DeliverySystem' })}
              className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-3.5 hover:border-[#166534] transition-colors"
            >
              <span className="text-[11px] font-semibold text-[#647067] block">
                Delivery / System / Pay
              </span>
              <strong className="text-xl font-black text-[#17201A] mt-1 block">
                {deliverySystemCausedCount.toLocaleString('en-IN')}
              </strong>
              <span className="text-[11px] text-[#647067] mt-1 block">
                {deliverySystemCausedPercentage}% of cancellations →
              </span>
            </Link>
          </div>

          {/* 2-Column Visual Grid: Reasons Donut Chart + Cancellation Trend Over Time */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column (7 cols): Cancellation Reasons Donut + Interactive Breakdown */}
            <div className="lg:col-span-7 bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#17201A]">
                    Cancellation Reasons Breakdown
                  </h3>
                  <p className="text-[11px] text-[#647067]">
                    Click any reason to inspect matching cancelled orders
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#17201A]">
                  Total: {totalCancellations}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-5 h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={nonZeroReasons}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                        stroke="#F8FAF7"
                        strokeWidth={2}
                      >
                        {nonZeroReasons.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8E3',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#17201A',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        }}
                        formatter={(value, name) => [
                          `${Number(value).toLocaleString('en-IN')} cancelled orders`,
                          String(name),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#647067]">
                      Cancelled
                    </span>
                    <span className="text-lg font-black text-[#DC2626]">
                      {totalCancellations.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-7 space-y-1.5">
                  {reasonsBreakdown.map((reason) => (
                    <Link
                      key={reason.key}
                      href={buildDrilldownUrl({ reason: reason.key })}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-[#E2E8E3] hover:border-[#166534] text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: reason.color }}
                        />
                        <span className="font-semibold text-[#17201A] truncate">
                          {reason.label}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#F8FAF7] text-[#647067] border border-[#E2E8E3] shrink-0">
                          {reason.cancelledBy}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <strong className="font-bold text-[#17201A]">
                          {reason.count}
                        </strong>
                        <span className="text-[11px] text-[#647067] w-11 text-right">
                          ({reason.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Cancellation Trend Over Time */}
            <div className="lg:col-span-5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#17201A]">
                    Cancellations Trend ({granularity})
                  </h3>
                  <p className="text-[11px] text-[#647067]">
                    Stacked by attribution source over time
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-[#E2E8E3] text-[#17201A] capitalize">
                  {granularity}
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={timeSeries}
                    margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8E3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#647067', fontSize: 11 }}
                      axisLine={{ stroke: '#E2E8E3' }}
                      tickLine={false}
                      minTickGap={14}
                    />
                    <YAxis
                      tick={{ fill: '#647067', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8E3',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#17201A',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      }}
                      formatter={(value, name) => [
                        `${Number(value).toLocaleString('en-IN')} orders`,
                        String(name),
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={28}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', color: '#17201A' }}
                    />
                    <Bar
                      dataKey="vendorCancellations"
                      name="Vendor / Store"
                      stackId="cancelSource"
                      fill="#D97706"
                    />
                    <Bar
                      dataKey="customerCancellations"
                      name="Customer"
                      stackId="cancelSource"
                      fill="#166534"
                    />
                    <Bar
                      dataKey="deliverySystemCancellations"
                      name="Delivery / System"
                      stackId="cancelSource"
                      fill="#DC2626"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#E2E8E3] flex items-center justify-between text-[11px] text-[#647067]">
                <span>
                  Vendor-side stock &amp; rejection issues account for{' '}
                  <strong className="text-[#17201A]">{vendorCausedPercentage}%</strong> of period cancellations.
                </span>
                <Link
                  href={buildDrilldownUrl()}
                  className="font-bold text-[#166534] hover:underline shrink-0 ml-2"
                >
                  Inspect all →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
