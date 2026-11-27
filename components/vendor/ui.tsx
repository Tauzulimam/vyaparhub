import React from 'react';
import type { StockState, VendorOrderStatus } from '@/types/vendor';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
    <div>
      <h1 className="text-2xl font-black tracking-tight text-[#17201A]">{title}</h1>
      {subtitle && <p className="text-sm text-[#647067] mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`bg-white border border-[#E2E8E3] rounded-2xl shadow-xs ${className}`}>{children}</section>
);

export const SectionTitle: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-base font-bold text-[#17201A]">{title}</h2>
    {action}
  </div>
);

type Tone = 'green' | 'terracotta' | 'red' | 'gray' | 'amber';
const TONES: Record<Tone, string> = {
  green: 'bg-[#166534]/10 text-[#166534]',
  terracotta: 'bg-[#B45309]/10 text-[#B45309]',
  red: 'bg-[#DC2626]/10 text-[#DC2626]',
  gray: 'bg-[#E2E8E3] text-[#647067]',
  amber: 'bg-[#F59E0B]/15 text-[#B45309]',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${TONES[tone]}`}>
    {children}
  </span>
);

export const ORDER_STATUS_LABEL: Record<VendorOrderStatus, string> = {
  PLACED: 'Order Placed',
  PENDING: 'Order Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  READY: 'Ready for Pickup',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const ORDER_TONE: Record<VendorOrderStatus, Tone> = {
  PLACED: 'terracotta',
  PENDING: 'terracotta',
  ACCEPTED: 'amber',
  PREPARING: 'amber',
  READY_FOR_PICKUP: 'green',
  READY: 'green',
  PICKED_UP: 'gray',
  OUT_FOR_DELIVERY: 'gray',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

export const OrderStatusBadge: React.FC<{ status: VendorOrderStatus }> = ({ status }) => (
  <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
);

export const StockBadge: React.FC<{ state: StockState; quantity: number }> = ({ state, quantity }) => {
  if (state === 'OUT_OF_STOCK') return <Badge tone="red">Out of stock</Badge>;
  if (state === 'LOW_STOCK') return <Badge tone="terracotta">Low stock · {quantity} left</Badge>;
  return <Badge tone="green">{quantity} in stock</Badge>;
};

export const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
