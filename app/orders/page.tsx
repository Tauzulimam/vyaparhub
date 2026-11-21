'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import { useMockCart } from '@/lib/mockCart';
import { useMockOrders } from '@/lib/mockOrders';
import { Order, OrderStatus } from '@/types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: 'Order Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PLACED: 'bg-[#F59E0B]/15 text-[#B45309]',
  ACCEPTED: 'bg-[#166534]/10 text-[#166534]',
  PREPARING: 'bg-[#166534]/10 text-[#166534]',
  READY: 'bg-[#166534]/10 text-[#166534]',
  OUT_FOR_DELIVERY: 'bg-[#166534] text-white',
  DELIVERED: 'bg-[#16A34A] text-white',
  CANCELLED: 'bg-[#DC2626]/10 text-[#DC2626]',
};

function OrderCard({ order }: { order: Order }) {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const statusColor = STATUS_COLORS[order.status];

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 hover:border-[#166534] hover:shadow-sm transition-all duration-150 group"
      aria-label={`Order ${order.orderNumber} from ${order.storeName}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        {/* Store / Order info */}
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

          {/* Items preview */}
          <p className="text-xs text-[#647067]">
            {order.items
              .slice(0, 2)
              .map((i) => `${i.name} ×${i.quantity}`)
              .join(', ')}
            {order.items.length > 2 && ` +${order.items.length - 2} more`}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#647067] pt-1">
            <span>🕒 {order.createdAt}</span>
            <span>📦 {totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
            <span className="font-bold text-[#17201A]">₹{order.total}</span>
            <span>
              {order.paymentMethod === 'COD' ? '💵 COD' : order.paymentMethod === 'MOCK_UPI' ? '📱 UPI' : '💳 Card'}
              {' '}
              <span className={order.paymentStatus === 'PAID' ? 'text-[#16A34A] font-semibold' : 'text-[#B45309]'}>
                ({order.paymentStatus === 'PAID' ? 'Paid' : 'Pending'})
              </span>
            </span>
          </div>
        </div>

        {/* Chevron */}
        <div className="hidden sm:flex items-center self-center text-[#647067] group-hover:text-[#166534] transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function OrdersPage() {
  const { cartCount } = useMockCart();
  const { orders } = useMockOrders();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const activeStatuses: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
  const completedStatuses: OrderStatus[] = ['DELIVERED', 'CANCELLED'];

  const filteredOrders =
    filter === 'active'
      ? orders.filter((o) => activeStatuses.includes(o.status))
      : filter === 'completed'
      ? orders.filter((o) => completedStatuses.includes(o.status))
      : orders;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-16 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067]">
          <Link href="/" className="hover:text-[#166534] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">My Orders</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#17201A]">My Orders</h1>
            <p className="text-xs text-[#647067] mt-0.5">
              {orders.length} total {orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
          <Link href="/stores">
            <Button variant="primary" size="sm">Order Again +</Button>
          </Link>
        </div>

        {/* Filter Tabs */}
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

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-[#E2E8E3] rounded-3xl p-10 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-2xl">
              📦
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17201A]">No orders found</h2>
              <p className="text-xs text-[#647067] mt-1">
                {filter === 'active' ? 'No active orders right now.' : filter === 'completed' ? 'No completed orders yet.' : 'You have not placed any orders yet.'}
              </p>
            </div>
            <Link href="/stores">
              <Button variant="primary" size="sm">Start Shopping</Button>
            </Link>
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
