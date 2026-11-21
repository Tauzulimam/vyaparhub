'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AggregatedTimePoint, ChartGranularity } from '@/data/adminAnalyticsData';

export interface RevenueChartProps {
  data: AggregatedTimePoint[];
  granularity: ChartGranularity;
  dateRangeLabel: string;
}

function formatCompactINR(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${val}`;
}

export const formatFullINR = (val: number): string =>
  `₹${Math.round(val).toLocaleString('en-IN')}`;

/**
 * 2. PLATFORM REVENUE CHART
 * Shows ONLY VyaparHub platform-side revenue:
 * - Subscription revenue (₹100/mo & ₹1,000/yr vendor plans)
 * - Platform/service fee revenue
 * - Total platform revenue
 * Does NOT treat vendor product sales (GMV) as VyaparHub revenue.
 */
export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  granularity,
  dateRangeLabel,
}) => {
  const totalSubRev = data.reduce((s, d) => s + d.subscriptionRevenue, 0);
  const totalFeeRev = data.reduce((s, d) => s + d.platformFeeRevenue, 0);
  const totalPlatformRev = totalSubRev + totalFeeRev;

  return (
    <section
      aria-label="VyaparHub Platform Revenue Chart"
      className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-[#17201A]">
              VyaparHub Platform Revenue
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#166534]/10 text-[#166534]">
              Platform Earnings Only
            </span>
          </div>
          <p className="text-xs text-[#647067] mt-0.5">
            Subscription plans + platform service fees ({granularity} • {dateRangeLabel}). Excludes vendor product sales.
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="text-[11px] font-semibold text-[#647067] block">
            Total Platform Revenue
          </span>
          <strong className="text-lg font-black text-[#166534]">
            {formatFullINR(totalPlatformRev)}
          </strong>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 rounded-xl bg-[#F8FAF7] border border-dashed border-[#E2E8E3] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#17201A]">No platform revenue data in range</p>
          <p className="text-xs text-[#647067] mt-1 max-w-xs">
            Select a valid date range within Oct 2025 – Nov 2026 to inspect subscription and service fee revenue.
          </p>
        </div>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#647067', fontSize: 11 }}
                  axisLine={{ stroke: '#E2E8E3' }}
                  tickLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={formatCompactINR}
                  tick={{ fill: '#647067', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
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
                    formatFullINR(Number(value)),
                    String(name),
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', color: '#17201A' }}
                />
                <Bar
                  dataKey="platformFeeRevenue"
                  name="Platform / Service Fee Revenue"
                  stackId="platformRev"
                  fill="#166534"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="subscriptionRevenue"
                  name="Vendor Subscription Revenue"
                  stackId="platformRev"
                  fill="#D97706"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-[#E2E8E3] grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[#166534]/5 rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Service Fee Revenue</span>
              <strong className="text-sm font-black text-[#166534]">
                {formatFullINR(totalFeeRev)}
              </strong>
            </div>
            <div className="bg-[#B45309]/10 rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Subscription Revenue</span>
              <strong className="text-sm font-black text-[#B45309]">
                {formatFullINR(totalSubRev)}
              </strong>
            </div>
            <div className="bg-[#F8FAF7] rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Total Platform Revenue</span>
              <strong className="text-sm font-black text-[#17201A]">
                {formatFullINR(totalPlatformRev)}
              </strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

/**
 * 3. GMV / MARKETPLACE SALES — SEPARATE CHART
 * Clearly displays total marketplace customer order value separately from VyaparHub's own platform revenue.
 */
export const GmvMarketplaceChart: React.FC<RevenueChartProps> = ({
  data,
  granularity,
  dateRangeLabel,
}) => {
  const totalGmv = data.reduce((s, d) => s + d.gmv, 0);
  const deliveredGmv = data.reduce((s, d) => s + d.deliveredGmv, 0);
  const totalOrders = data.reduce((s, d) => s + d.totalOrders, 0);
  const avgOrderVal = totalOrders > 0 ? Math.round(totalGmv / totalOrders) : 0;

  return (
    <section
      aria-label="GMV Marketplace Sales Chart"
      className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-[#17201A]">
              GMV / Marketplace Sales
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#B45309]/10 text-[#B45309]">
              Vendor Order Volume
            </span>
          </div>
          <p className="text-xs text-[#647067] mt-0.5">
            Gross Merchandise Value across local vendor stores ({granularity} • {dateRangeLabel}). Settled to stores net of service fees.
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="text-[11px] font-semibold text-[#647067] block">
            Gross Marketplace Sales
          </span>
          <strong className="text-lg font-black text-[#B45309]">
            {formatFullINR(totalGmv)}
          </strong>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 rounded-xl bg-[#F8FAF7] border border-dashed border-[#E2E8E3] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#17201A]">No GMV / marketplace sales in range</p>
          <p className="text-xs text-[#647067] mt-1 max-w-xs">
            Select a date range within Oct 2025 – Nov 2026 to view gross marketplace order value.
          </p>
        </div>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 4 }}>
                <defs>
                  <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B45309" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#B45309" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="deliveredGmvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#166534" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#166534" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#647067', fontSize: 11 }}
                  axisLine={{ stroke: '#E2E8E3' }}
                  tickLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={formatCompactINR}
                  tick={{ fill: '#647067', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
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
                    formatFullINR(Number(value)),
                    String(name),
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', color: '#17201A' }}
                />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  name="Total GMV (Gross Order Value)"
                  stroke="#B45309"
                  strokeWidth={2.5}
                  fill="url(#gmvFill)"
                />
                <Area
                  type="monotone"
                  dataKey="deliveredGmv"
                  name="Fulfilled / Delivered Sales"
                  stroke="#166534"
                  strokeWidth={2}
                  fill="url(#deliveredGmvFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-[#E2E8E3] grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[#B45309]/10 rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Total GMV</span>
              <strong className="text-sm font-black text-[#B45309]">
                {formatFullINR(totalGmv)}
              </strong>
            </div>
            <div className="bg-[#166534]/5 rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Fulfilled Sales</span>
              <strong className="text-sm font-black text-[#166534]">
                {formatFullINR(deliveredGmv)}
              </strong>
            </div>
            <div className="bg-[#F8FAF7] rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Avg Order Value</span>
              <strong className="text-sm font-black text-[#17201A]">
                {formatFullINR(avgOrderVal)}
              </strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
