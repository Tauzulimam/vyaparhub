'use client';

import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { OrderStatusDistributionItem } from '@/data/adminAnalyticsData';

export interface OrderStatusChartProps {
  data: OrderStatusDistributionItem[];
  totalOrders: number;
  dateRangeLabel: string;
}

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({
  data,
  totalOrders,
  dateRangeLabel,
}) => {
  const nonZeroData = data.filter((d) => d.count > 0);

  return (
    <section
      aria-label="Order Status Distribution Chart"
      className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[#17201A]">Order Status Distribution</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A]">
            {totalOrders.toLocaleString('en-IN')} total
          </span>
        </div>
        <p className="text-xs text-[#647067] mt-0.5">
          Breakdown across fulfillment stages ({dateRangeLabel})
        </p>
      </div>

      {nonZeroData.length === 0 ? (
        <div className="h-64 rounded-xl bg-[#F8FAF7] border border-dashed border-[#E2E8E3] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#17201A]">No order statuses to display</p>
          <p className="text-xs text-[#647067] mt-1 max-w-xs">
            There are zero orders recorded during the selected custom period.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
          {/* Donut Chart */}
          <div className="sm:col-span-2 h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nonZeroData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  {nonZeroData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
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
                    `${Number(value).toLocaleString('en-IN')} orders`,
                    String(name),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label inside donut */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#647067]">
                Orders
              </span>
              <span className="text-lg font-black text-[#17201A]">
                {totalOrders.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Legend & Stage Breakdown List */}
          <div className="sm:col-span-3 space-y-1.5">
            {data.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAF7] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-[#17201A] truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-[#17201A]">
                    {item.count.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] font-medium text-[#647067] w-11 text-right">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
