'use client';

import React, { useState } from 'react';
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

export interface OrdersTrendChartProps {
  data: AggregatedTimePoint[];
  granularity: ChartGranularity;
  dateRangeLabel: string;
}

export const OrdersTrendChart: React.FC<OrdersTrendChartProps> = ({
  data,
  granularity,
  dateRangeLabel,
}) => {
  const [showComparison, setShowComparison] = useState(true);

  const totalOrdersSum = data.reduce((s, d) => s + d.totalOrders, 0);
  const deliveredSum = data.reduce((s, d) => s + d.deliveredOrders, 0);
  const cancelledSum = data.reduce((s, d) => s + d.cancelledOrders, 0);

  return (
    <section
      aria-label="Orders Trend Chart"
      className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#17201A]">Orders Trend</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#166534]/10 text-[#166534] capitalize">
              {granularity} view
            </span>
          </div>
          <p className="text-xs text-[#647067] mt-0.5">
            Marketplace order volume over time ({dateRangeLabel})
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#17201A] bg-[#F8FAF7] border border-[#E2E8E3] px-3 py-1.5 rounded-xl cursor-pointer select-none self-start">
          <input
            type="checkbox"
            checked={showComparison}
            onChange={(e) => setShowComparison(e.target.checked)}
            className="rounded border-[#E2E8E3] text-[#166534] focus:ring-[#166534]"
          />
          <span>Compare Completed vs Cancelled</span>
        </label>
      </div>

      {data.length === 0 ? (
        <div className="h-64 rounded-xl bg-[#F8FAF7] border border-dashed border-[#E2E8E3] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#17201A]">No order activity for this period</p>
          <p className="text-xs text-[#647067] mt-1 max-w-xs">
            Adjust the date filter above to a range within Oct 2025 – Nov 2026 to view order trends.
          </p>
        </div>
      ) : (
        <>
          <div className="h-68 w-full">
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
                  height={30}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', color: '#17201A' }}
                />
                <Line
                  type="monotone"
                  dataKey="totalOrders"
                  name="Total Orders"
                  stroke="#166534"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#166534' }}
                  activeDot={{ r: 5 }}
                />
                {showComparison && (
                  <Line
                    type="monotone"
                    dataKey="deliveredOrders"
                    name="Completed (Delivered)"
                    stroke="#B45309"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 2.5, fill: '#B45309' }}
                  />
                )}
                {showComparison && (
                  <Line
                    type="monotone"
                    dataKey="cancelledOrders"
                    name="Cancelled"
                    stroke="#DC2626"
                    strokeWidth={1.75}
                    dot={{ r: 2, fill: '#DC2626' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-[#E2E8E3] grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[#F8FAF7] rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Total Orders</span>
              <strong className="text-sm font-black text-[#17201A]">
                {totalOrdersSum.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="bg-[#166534]/5 rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Completed</span>
              <strong className="text-sm font-black text-[#166534]">
                {deliveredSum.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="bg-[#DC2626]/5 rounded-xl px-3 py-2">
              <span className="text-[#647067] block">Cancelled</span>
              <strong className="text-sm font-black text-[#DC2626]">
                {cancelledSum.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
