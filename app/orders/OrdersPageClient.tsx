'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import type {
  CustomerOrderStatusDto,
  CustomerOrderSummaryDto,
} from '@/lib/cart/types';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

const STATUS_LABELS: Record<CustomerOrderStatusDto, string> = {
  PLACED: 'Order Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<CustomerOrderStatusDto, string> = {
  PLACED: 'bg-[#F59E0B]/15 text-[#B45309]',
  ACCEPTED: 'bg-[#166534]/10 text-[#166534]',
  PREPARING: 'bg-[#166534]/10 text-[#166534]',
  READY_FOR_PICKUP: 'bg-[#166534]/10 text-[#166534]',
  PICKED_UP: 'bg-[#166534]/15 text-[#166534]',
  OUT_FOR_DELIVERY: 'bg-[#166534] text-white',
  DELIVERED: 'bg-[#16A34A] text-white',
  CANCELLED: 'bg-[#DC2626]/10 text-[#DC2626]',
};

const ACTIVE_STATUSES: CustomerOrderStatusDto[] = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
];

const COMPLETED_STATUSES: CustomerOrderStatusDto[] = ['DELIVERED', 'CANCELLED'];

function OrderCard({ order }: { order: CustomerOrderSummaryDto }) {
  const statusColor = STATUS_COLORS[order.status];
  const extraCount = Math.max(0, order.itemCount - order.itemsPreview.reduce((s, i) => s + i.quantity, 0));

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 hover:border-[#166534] hover:shadow-sm transition-all duration-150 group"
      aria-label={`Order ${order.orderNumber} from ${order.storeName}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                {order.orderNumber}
              </p>
              <h3 className="text-sm font-bold text-[#17201A] group-hover:text-[#166534] transition-colors truncate">
                {order.storeName}
              </h3>
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {order.itemsPreview.length > 0 && (
            <p className="text-xs text-[#647067]">
              {order.itemsPreview.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
              {extraCount > 0 && ` (+${extraCount} more)`}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#647067] pt-1">
            <span>🕒 {order.placedAtLabel}</span>
            <span>
              📦 {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="font-bold text-[#17201A]">₹{order.totalAmount}</span>
            <span>
              {order.paymentMethod === 'COD'
                ? '💵 COD'
                : order.paymentMethod === 'UPI'
                ? '📱 UPI'
                : '💳 Card'}{' '}
              <span
                className={
                  order.paymentStatus === 'PAID'
                    ? 'text-[#16A34A] font-semibold'
                    : order.paymentStatus === 'FAILED'
                    ? 'text-[#DC2626] font-semibold'
                    : 'text-[#B45309]'
                }
              >
                ({order.paymentStatus === 'PAID'
                  ? 'Paid'
                  : order.paymentStatus === 'REFUNDED'
                  ? 'Refunded'
                  : order.paymentStatus === 'FAILED'
                  ? 'Failed'
                  : 'Pending'})
              </span>
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center self-center text-[#647067] group-hover:text-[#166534] transition-colors shrink-0">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

interface OrdersPageClientProps {
  initialOrders: CustomerOrderSummaryDto[];
  initialLocationLabel: string;
}

export default function OrdersPageClient({
  initialOrders,
  initialLocationLabel,
}: OrdersPageClientProps) {
  const { cartCount, deliveryLocationLabel } = useCustomerCart({
    initialLocationLabel,
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredOrders =
    filter === 'active'
      ? initialOrders.filter((o) => ACTIVE_STATUSES.includes(o.status))
      : filter === 'completed'
      ? initialOrders.filter((o) => COMPLETED_STATUSES.includes(o.status))
      : initialOrders;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} currentLocation={deliveryLocationLabel} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-16 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067]">
          <Link href="/" className="hover:text-[#166534] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">My Orders</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#17201A]">My Orders</h1>
            <p className="text-xs text-[#647067] mt-0.5">
              {initialOrders.length} total {initialOrders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
          <Link href="/stores">
            <Button variant="primary" size="sm">
              Browse Stores
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        {initialOrders.length > 0 && (
          <div className="flex gap-1.5" role="tablist" aria-label="Order filter">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                  filter === f
                    ? 'bg-[#166534] text-white'
                    : 'bg-white border border-[#E2E8E3] text-[#647067] hover:border-[#166534]'
                }`}
              >
                {f === 'all' ? 'All Orders' : f === 'active' ? 'Active' : 'Completed'}
              </button>
            ))}
          </div>
        )}

        {/* Orders List / Truthful Empty State */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-[#E2E8E3] rounded-3xl p-10 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-2xl">
              📦
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17201A]">
                {initialOrders.length === 0 ? 'No orders yet' : 'No orders found'}
              </h2>
              <p className="text-xs text-[#647067] mt-1">
                {initialOrders.length === 0
                  ? 'You have not placed any orders yet. Explore open neighborhood stores to start shopping.'
                  : filter === 'active'
                  ? 'No active orders right now.'
                  : 'No completed orders yet.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link href="/stores">
                <Button variant="primary" size="sm">
                  Start Shopping
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="outline" size="sm">
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Order history">
            {filteredOrders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />
      <MobileNav cartItemCount={cartCount} />
    </div>
  );
}
