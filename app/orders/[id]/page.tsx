'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import { useMockCart } from '@/lib/mockCart';
import { useMockOrders } from '@/lib/mockOrders';
import { OrderStatus } from '@/types';

// ── Status steps (not CANCELLED) ─────────────────────────────────────────────
const ORDER_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'PLACED', label: 'Order Placed', icon: '📋' },
  { status: 'ACCEPTED', label: 'Accepted', icon: '✅' },
  { status: 'PREPARING', label: 'Preparing', icon: '👨‍🍳' },
  { status: 'READY', label: 'Ready', icon: '📦' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🛵' },
  { status: 'DELIVERED', label: 'Delivered', icon: '🏠' },
];

const STATUS_ORDER: OrderStatus[] = [
  'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

function getStepIndex(status: OrderStatus): number {
  if (status === 'CANCELLED') return -1;
  return STATUS_ORDER.indexOf(status);
}

// ── Status Progress Bar ───────────────────────────────────────────────────────
function OrderStatusProgress({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <div className="bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-2xl">❌</span>
        <div>
          <p className="text-sm font-bold text-[#DC2626]">Order Cancelled</p>
          <p className="text-xs text-[#647067]">This order was cancelled and will not be fulfilled.</p>
        </div>
      </div>
    );
  }

  const currentIndex = getStepIndex(status);

  return (
    <div className="bg-white border border-[#E2E8E3] rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#17201A]">Order Status</h2>
        <span className="text-xs font-bold text-[#166534] bg-[#166534]/10 px-2.5 py-1 rounded-full">
          {ORDER_STEPS[currentIndex]?.label || status}
        </span>
      </div>

      {/* Progress Steps — desktop horizontal */}
      <div className="hidden sm:block">
        <div className="flex items-start">
          {ORDER_STEPS.map((step, idx) => {
            const done = idx <= currentIndex;
            const active = idx === currentIndex;
            return (
              <div key={step.status} className="flex flex-col items-center flex-1">
                {/* Connector + Circle row */}
                <div className="flex items-center w-full">
                  {/* Left connector */}
                  <div className={`h-0.5 flex-1 ${idx === 0 ? 'opacity-0' : done ? 'bg-[#166534]' : 'bg-[#E2E8E3]'}`} />
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 border-2 transition-all ${
                      active
                        ? 'border-[#166534] bg-[#166534] text-white shadow-md'
                        : done
                        ? 'border-[#166534] bg-[#166534]/10 text-[#166534]'
                        : 'border-[#E2E8E3] bg-white text-[#647067]'
                    }`}
                  >
                    {done && !active ? '✓' : step.icon}
                  </div>
                  {/* Right connector */}
                  <div className={`h-0.5 flex-1 ${idx === ORDER_STEPS.length - 1 ? 'opacity-0' : done && idx < currentIndex ? 'bg-[#166534]' : 'bg-[#E2E8E3]'}`} />
                </div>
                <p className={`text-[10px] font-semibold mt-1.5 text-center max-w-[64px] ${active ? 'text-[#166534]' : done ? 'text-[#647067]' : 'text-[#647067]/40'}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile vertical list */}
      <ul className="sm:hidden space-y-2">
        {ORDER_STEPS.map((step, idx) => {
          const done = idx <= currentIndex;
          const active = idx === currentIndex;
          return (
            <li key={step.status} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 border-2 ${
                active ? 'border-[#166534] bg-[#166534] text-white' : done ? 'border-[#166534] bg-[#166534]/10 text-[#166534]' : 'border-[#E2E8E3] bg-white text-[#647067]'
              }`}>
                {done && !active ? '✓' : step.icon}
              </div>
              <span className={`text-xs font-semibold ${active ? 'text-[#166534]' : done ? 'text-[#17201A]' : 'text-[#647067]/50'}`}>
                {step.label}
              </span>
              {active && (
                <span className="text-[10px] text-[#647067] bg-[#F8FAF7] px-2 py-0.5 rounded-full border border-[#E2E8E3]">Current</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Order Detail Content ─────────────────────────────────────────────────────
function OrderDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get('placed') === '1';

  const { cartCount, clearCart } = useMockCart();
  const { orders, cancelOrder } = useMockOrders();

  const orderId = params.id as string;
  const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  // Clear cart on successful order placement
  useEffect(() => {
    if (justPlaced) {
      clearCart();
    }
  }, [justPlaced, clearCart]);

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
        <Navbar cartItemCount={cartCount} />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-2xl">❓</div>
          <div>
            <h1 className="text-xl font-bold text-[#17201A]">Order Not Found</h1>
            <p className="text-sm text-[#647067] mt-1">We could not find order <strong>{orderId}</strong>.</p>
          </div>
          <Link href="/orders">
            <Button variant="primary" size="md">View All Orders</Button>
          </Link>
        </main>
        <Footer />
        <MobileNav cartItemCount={cartCount} />
      </div>
    );
  }

  const canCancel = order.status === 'PLACED' || order.status === 'ACCEPTED';
  const showPlacedBanner = justPlaced && !dismissedBanner;

  const handleCancel = () => {
    const success = cancelOrder(order.id);
    if (success) {
      setShowCancelConfirm(false);
    } else {
      setCancelError('This order cannot be cancelled at its current stage.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} />

      {/* Placed Success Banner */}
      {showPlacedBanner && (
        <aside
          aria-live="polite"
          className="bg-[#166534] text-white px-4 py-3 text-center text-sm font-semibold flex items-center justify-center gap-2"
        >
          <span>✅</span>
          <span>Your order {order.orderNumber} has been placed! The store will confirm shortly.</span>
          <button
            onClick={() => setDismissedBanner(true)}
            aria-label="Dismiss order placed banner"
            className="ml-2 text-white/70 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </aside>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-16 space-y-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067]">
          <Link href="/" className="hover:text-[#166534] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/orders" className="hover:text-[#166534] transition-colors">My Orders</Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">{order.orderNumber}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#17201A]">{order.orderNumber}</h1>
            <p className="text-xs text-[#647067]">Placed: {order.createdAt}</p>
          </div>
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelConfirm(true)}
              className="border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5"
            >
              Cancel Order
            </Button>
          )}
        </div>

        {/* Status Progress */}
        <OrderStatusProgress status={order.status} />

        {/* Estimated Delivery */}
        {order.status !== 'CANCELLED' && (
          <div className="bg-[#166534]/5 border border-[#166534]/20 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-xl">🛵</span>
            <div>
              <p className="text-xs font-semibold text-[#647067]">Estimated Delivery</p>
              <p className="text-sm font-bold text-[#17201A]">{order.estimatedDeliveryTime}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ── Ordered Items ─────────────────────────────────────────── */}
          <div className="md:col-span-2 bg-white border border-[#E2E8E3] rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#17201A] flex items-center gap-2">
              <span>🏪</span> {order.storeName}
              {order.storeAddress && (
                <span className="font-normal text-[#647067]">· {order.storeAddress}</span>
              )}
            </h2>

            <ul className="divide-y divide-[#E2E8E3]">
              {order.items.map((item) => (
                <li key={item.id} className="py-3 flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden shrink-0">
                    <Image src={item.image} alt={item.name} fill sizes="48px" className="object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">{item.brand}</p>
                    <p className="text-sm font-bold text-[#17201A] line-clamp-1">{item.name}</p>
                    <p className="text-xs text-[#647067]">{item.unit} × {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#17201A]">₹{item.price * item.quantity}</p>
                    {item.mrp > item.price && (
                      <p className="text-xs text-[#647067] line-through">₹{item.mrp * item.quantity}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Bill Summary */}
            <div className="border-t border-[#E2E8E3] pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#647067]">Item subtotal</span>
                <span className="font-semibold">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#647067]">Delivery fee</span>
                {order.deliveryFee === 0 ? (
                  <span className="font-semibold text-[#166534]">FREE</span>
                ) : (
                  <span className="font-semibold">₹{order.deliveryFee}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-[#647067]">Platform fee</span>
                <span className="font-semibold">₹{order.platformFee}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8E3]">
                <span className="font-bold text-[#17201A]">Order Total</span>
                <span className="text-lg font-extrabold text-[#166534]">₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* ── Delivery Address ─────────────────────────────────────── */}
          <div className="bg-white border border-[#E2E8E3] rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-bold text-[#17201A] flex items-center gap-2">
              <span>📍</span> Delivery Address
            </h2>
            <div className="text-xs text-[#647067] space-y-0.5">
              <p className="text-sm font-semibold text-[#17201A]">
                {order.deliveryAddress.name}
                <span className="ml-2 text-xs font-normal text-white bg-[#166534] px-2 py-0.5 rounded-full">
                  {order.deliveryAddress.tag}
                </span>
              </p>
              <p>{order.deliveryAddress.addressLine}</p>
              {order.deliveryAddress.landmark && <p>Near: {order.deliveryAddress.landmark}</p>}
              <p>{order.deliveryAddress.city} — {order.deliveryAddress.pincode}</p>
              <p>{order.deliveryAddress.phone}</p>
              {order.deliveryInstructions && (
                <p className="italic mt-2 text-[#647067]">&ldquo;{order.deliveryInstructions}&rdquo;</p>
              )}
            </div>
          </div>

          {/* ── Payment Info ─────────────────────────────────────────── */}
          <div className="bg-white border border-[#E2E8E3] rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-bold text-[#17201A] flex items-center gap-2">
              <span>💳</span> Payment
            </h2>
            <div className="text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[#647067]">Method:</span>
                <span className="font-semibold text-[#17201A]">
                  {order.paymentMethod === 'COD'
                    ? '💵 Cash on Delivery'
                    : order.paymentMethod === 'MOCK_UPI'
                    ? '📱 UPI'
                    : '💳 Card'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#647067]">Status:</span>
                <span className={`font-bold ${order.paymentStatus === 'PAID' ? 'text-[#16A34A]' : 'text-[#B45309]'}`}>
                  {order.paymentStatus === 'PAID' ? '✓ Paid' : '⏳ Pending'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#647067]">Amount:</span>
                <span className="font-bold text-[#17201A]">₹{order.total}</span>
              </div>
              {order.paymentMethod === 'COD' && order.paymentStatus === 'PENDING' && (
                <p className="text-[#647067] mt-2">Pay ₹{order.total} to the delivery person in cash.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link href="/orders">
            <Button variant="outline" size="md">← All Orders</Button>
          </Link>
          <Link href={`/stores/${order.storeId}`}>
            <Button variant="ghost" size="md">Order Again from {order.storeName}</Button>
          </Link>
        </div>
      </main>

      <Footer />
      <MobileNav cartItemCount={cartCount} />

      {/* Cancel Confirm Dialog */}
      {showCancelConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mx-auto text-xl">❌</div>
              <h2 id="cancel-dialog-title" className="text-base font-bold text-[#17201A]">Cancel this order?</h2>
              <p className="text-sm text-[#647067]">
                Order <strong>{order.orderNumber}</strong> from <strong>{order.storeName}</strong> will be cancelled. This cannot be undone.
              </p>
              {cancelError && <p className="text-xs text-[#DC2626]">{cancelError}</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="md" fullWidth onClick={() => { setShowCancelConfirm(false); setCancelError(null); }}>
                Keep Order
              </Button>
              <Button variant="danger" size="md" fullWidth onClick={handleCancel}>
                Cancel Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetailLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
        <div className="h-28 bg-white rounded-2xl" />
        <div className="h-64 bg-white rounded-2xl" />
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<OrderDetailLoadingFallback />}>
      <OrderDetailContent />
    </Suspense>
  );
}
