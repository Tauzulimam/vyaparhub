'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryPerformanceItem } from '@/data/adminAnalyticsData';

export interface CategoryPerformanceChartProps {
  data: CategoryPerformanceItem[];
  dateRangeLabel: string;
}

const BAR_COLORS = [
  '#166534',
  '#15803D',
  '#16A34A',
  '#B45309',
  '#D97706',
  '#F59E0B',
  '#65A30D',
  '#647067',
];

function formatCompactINR(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${val}`;
}

export const CategoryPerformanceChart: React.FC<CategoryPerformanceChartProps> = ({
  data,
  dateRangeLabel,
}) => {
  const [metric, setMetric] = useState<'gmv' | 'orders'>('gmv');

  return (
    <section
      aria-label="Category Performance Chart"
      className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-[#17201A]">Category Performance</h2>
          <p className="text-xs text-[#647067] mt-0.5">
            Marketplace sales &amp; order volume by master catalog category ({dateRangeLabel})
          </p>
        </div>

        <div
          role="group"
          aria-label="Category metric toggle"
          className="inline-flex items-center bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-1 self-start"
        >
          <button
            type="button"
            onClick={() => setMetric('gmv')}
            aria-pressed={metric === 'gmv'}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              metric === 'gmv'
                ? 'bg-white text-[#166534] shadow-xs border border-[#E2E8E3]'
                : 'text-[#647067] hover:text-[#17201A]'
            }`}
          >
            Sales (₹ GMV)
          </button>
          <button
            type="button"
            onClick={() => setMetric('orders')}
            aria-pressed={metric === 'orders'}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              metric === 'orders'
                ? 'bg-white text-[#166534] shadow-xs border border-[#E2E8E3]'
                : 'text-[#647067] hover:text-[#17201A]'
            }`}
          >
            Orders Count
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 rounded-xl bg-[#F8FAF7] border border-dashed border-[#E2E8E3] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#17201A]">No category activity in range</p>
          <p className="text-xs text-[#647067] mt-1 max-w-xs">
            Select a range with marketplace orders to compare category sales and volume.
          </p>
        </div>
      ) : (
        <>
          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={metric === 'gmv' ? formatCompactINR : (v) => String(v)}
                  tick={{ fill: '#647067', fontSize: 11 }}
                  axisLine={{ stroke: '#E2E8E3' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={115}
                  tick={{ fill: '#17201A', fontSize: 11, fontWeight: 600 }}
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
                  formatter={(value, _name, item) => {
                    const payload = item.payload as CategoryPerformanceItem;
                    if (metric === 'gmv') {
                      return [
                        `₹${Number(value).toLocaleString('en-IN')} (${payload.orders.toLocaleString('en-IN')} orders • ${payload.sharePercentage}% share)`,
                        payload.category,
                      ];
                    }
                    return [
                      `${Number(value).toLocaleString('en-IN')} orders (₹${payload.gmv.toLocaleString('en-IN')} GMV)`,
                      payload.category,
                    ];
                  }}
                />
                <Bar
                  dataKey={metric}
                  name={metric === 'gmv' ? 'Category GMV (₹)' : 'Category Orders'}
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                >
                  {data.map((entry, idx) => (
                    <Cell key={entry.category} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {data[0] && (
            <div className="mt-3 pt-3 border-t border-[#E2E8E3] flex flex-wrap items-center justify-between gap-2 text-xs text-[#647067]">
              <span>
                Top category:{' '}
                <strong className="text-[#17201A]">{data[0].category}</strong> (
                {data[0].sharePercentage}% of marketplace GMV)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/categories"
                  className="font-semibold text-[#166534] hover:underline"
                >
                  Manage Categories →
                </Link>
                <Link
                  href="/admin/catalog"
                  className="font-semibold text-[#B45309] hover:underline"
                >
                  Master Catalog →
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
