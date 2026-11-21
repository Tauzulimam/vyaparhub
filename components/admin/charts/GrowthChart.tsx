'use client';

import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AggregatedTimePoint, ChartGranularity } from '@/data/adminAnalyticsData';

export interface GrowthChartProps {
  data: AggregatedTimePoint[];
  granularity: ChartGranularity;
  dateRangeLabel: string;
}

export const GrowthChart: React.FC<GrowthChartProps> = ({
  data,
  granularity,
  dateRangeLabel,
}) => {
  const latest = data[data.length - 1];
  const first = data[0];
  const addedVendors = data.reduce((s, d) => s + d.newVendors, 0);
  const addedStores = data.reduce((s, d) => s + d.newStores, 0);

  return (
    <section
      aria-label="Store and Vendor Growth Chart"
      className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#17201A]">Store &amp; Vendor Growth</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#166534]/10 text-[#166534] capitalize">
              {granularity}
            </span>
          </div>
          <p className="text-xs text-[#647067] mt-0.5">
            Cumulative registered vendors &amp; active hyperlocal stores ({dateRangeLabel})
          </p>
        </div>
        {latest && (
          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="bg-[#166534]/10 text-[#166534] px-2.5 py-1 rounded-xl font-bold">
              {latest.activeStores} Active Stores
            </div>
            <div className="bg-[#B45309]/10 text-[#B45309] px-2.5 py-1 rounded-xl font-bold">
              {latest.registeredVendors} Vendors
            </div>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="h-64 rounded-xl bg-[#F8FAF7] border border-dashed border-[#E2E8E3] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#17201A]">No vendor growth records in range</p>
          <p className="text-xs text-[#647067] mt-1 max-w-xs">
            Choose a date range within Oct 2025 – Nov 2026 to view onboarding progression.
          </p>
        </div>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#647067', fontSize: 11 }}
                  axisLine={{ stroke: '#E2E8E3' }}
                  tickLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fill: '#647067', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
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
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', color: '#17201A' }}
                />
                <Line
                  type="monotone"
                  dataKey="activeStores"
                  name="Active Stores"
                  stroke="#166534"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#166534' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="registeredVendors"
                  name="Registered Vendors"
                  stroke="#B45309"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#B45309' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-[#E2E8E3] grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[#F8FAF7] rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Period Start → End</span>
              <strong className="text-sm font-black text-[#17201A]">
                {first?.activeStores ?? 0} → {latest?.activeStores ?? 0} stores
              </strong>
            </div>
            <div className="bg-[#166534]/5 rounded-xl px-3 py-2">
              <span className="text-[#647067] block">New Stores Onboarded</span>
              <strong className="text-sm font-black text-[#166534]">
                +{addedStores} stores
              </strong>
            </div>
            <div className="bg-[#B45309]/10 rounded-xl px-3 py-2">
              <span className="text-[#647067] block">New Vendors Registered</span>
              <strong className="text-sm font-black text-[#B45309]">
                +{addedVendors} vendors
              </strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
