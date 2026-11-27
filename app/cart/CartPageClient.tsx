'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@/generated/prisma/enums';
import type { CartAuthStatus, CustomerCartDto } from '@/lib/cart/types';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

interface CartPageClientProps {
  initialAuthStatus: CartAuthStatus;
  nonCustomerRole?: UserRole;
  initialCart: CustomerCartDto;
  initialLocationLabel: string;
}

export default function CartPageClient({
  initialAuthStatus,
  nonCustomerRole,
  initialCart,
  initialLocationLabel,
}: CartPageClientProps) {
  const router = useRouter();
  const {
    authStatus,
    items,
    store,
    cartCount,
    subtotal,
    canCheckout,
    hasBlockingIssues,
    blockingIssues,
    deliveryLocationLabel,
    updateItemQuantity,
    removeItem,
    clearCart,
  } = useCustomerCart({
    initialCart,
    initialAuthStatus,
    initialLocationLabel,
    autoFetch: false,
  });

  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isEmpty = items.length === 0;

  const handleQuantityChange = async (cartItemId: string, nextQuantity: number) => {
    if (pendingItemId) return;
    setPendingItemId(cartItemId);
    setActionError(null);
    const res = await updateItemQuantity(cartItemId, nextQuantity);
    setPendingItemId(null);
    if (!res.success) {
      setActionError(res.error);
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    if (pendingItemId) return;
    setPendingItemId(cartItemId);
    setActionError(null);
    const res = await removeItem(cartItemId);
    setPendingItemId(null);
    if (!res.success) {
      setActionError(res.error);
    }
  };

  const handleConfirmClear = async () => {
    if (isClearing) return;
    setIsClearing(true);
    setActionError(null);
    const res = await clearCart();
    setIsClearing(false);
    setConfirmClear(false);
    if (!res.success) {
      setActionError(res.error);
    }
  };

  // Unauthenticated visitor state
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
        <Navbar cartItemCount={0} currentLocation={deliveryLocationLabel} />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-white border border-[#E2E8E3] flex items-center justify-center mx-auto text-3xl shadow-xs">
            🛒
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-[#17201A]">Sign in to view your cart</h1>
            <p className="text-sm text-[#647067]">
              Sign in with your VyaparHub customer account to save items in your cart and proceed to checkout.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Link href="/login?next=%2Fcart">
              <Button variant="primary" size="md">
                Sign In to Shop →
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="md">
                Create Customer Account
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
        <MobileNav cartItemCount={0} />
      </div>
    );
  }

  // Non-CUSTOMER account (e.g. VENDOR or ADMIN)
  if (authStatus === 'forbidden_role') {
    const portalHref = nonCustomerRole === 'ADMIN' ? '/admin' : '/vendor';
    const portalLabel = nonCustomerRole === 'ADMIN' ? 'Admin Console' : 'Vendor Portal';
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
        <Navbar cartItemCount={0} currentLocation={deliveryLocationLabel} />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-white border border-[#E2E8E3] flex items-center justify-center mx-auto text-2xl shadow-xs">
            🏪
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-[#17201A]">Customer Account Required</h1>
            <p className="text-sm text-[#647067]">
              Shopping carts and customer checkout are available exclusively for customer accounts.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link href={portalHref}>
              <Button variant="primary" size="md">
                Return to {portalLabel}
              </Button>
            </Link>
            <Link href="/stores">
              <Button variant="outline" size="md">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
        <MobileNav cartItemCount={0} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} currentLocation={deliveryLocationLabel} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067] mb-6">
          <Link href="/" className="hover:text-[#166534] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">My Cart</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: Cart Items ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-[#17201A]">My Cart</h1>
                {!isEmpty && store && (
                  <p className="text-xs text-[#647067] mt-0.5">
                    {cartCount} {cartCount === 1 ? 'item' : 'items'} from{' '}
                    <span className="font-semibold text-[#166534]">{store.name}</span>
                  </p>
                )}
              </div>
              {!isEmpty && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(true)}
                  className="text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#DC2626]/5"
                >
                  Clear Cart
                </Button>
              )}
            </div>

            {actionError && (
              <div
                role="alert"
                className="rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/25 p-3.5 text-xs font-medium text-[#DC2626]"
              >
                {actionError}
              </div>
            )}

            {/* Stale / Blocking Cart Issues Alert */}
            {!isEmpty && hasBlockingIssues && (
              <div
                role="alert"
                className="rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 p-4 space-y-2"
              >
                <p className="text-xs font-bold text-[#DC2626]">
                  Action required before checkout:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-[#17201A]">
                  {blockingIssues.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Store Info Banner */}
            {!isEmpty && store && (
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-[#647067]">Ordering from</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        store.isEligibleForCheckout
                          ? 'bg-[#16A34A]/15 text-[#166534]'
                          : 'bg-[#DC2626]/15 text-[#DC2626]'
                      }`}
                    >
                      {store.isEligibleForCheckout ? 'Open Now' : 'Closed / Unavailable'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#17201A] truncate">{store.name}</p>
                  <p className="text-xs text-[#647067]">
                    {store.area}, {store.city}
                    {store.timing ? ` • ${store.timing}` : ''}
                    {store.minOrderAmount > 0 ? ` • Min. order ₹${store.minOrderAmount}` : ''}
                  </p>
                </div>
                {store.isEligibleForCheckout && (
                  <Link
                    href={`/stores/${store.id}`}
                    className="text-xs font-semibold text-[#166534] hover:underline shrink-0"
                  >
                    Visit Store →
                  </Link>
                )}
              </div>
            )}

            {/* Single-Store Cart Rule Note */}
            {!isEmpty && (
              <aside className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-3 flex items-start gap-2 text-xs text-[#647067]">
                <span className="shrink-0 mt-0.5">ℹ️</span>
                <p>
                  <strong className="text-[#17201A]">Single-store cart:</strong> Your cart contains products from one local store at a time, priced using live store inventory.
                </p>
              </aside>
            )}

            {/* Empty State */}
            {isEmpty ? (
              <div className="bg-white border border-[#E2E8E3] rounded-3xl p-10 text-center space-y-5 shadow-xs mt-4">
                <div className="w-16 h-16 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-3xl">
                  🛒
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#17201A]">Your cart is empty</h2>
                  <p className="text-sm text-[#647067] mt-1">
                    Browse open nearby stores and add in-stock items to get started.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/stores">
                    <Button variant="primary" size="md">
                      Browse Nearby Stores
                    </Button>
                  </Link>
                  <Link href="/products">
                    <Button variant="outline" size="md">
                      Search Products
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Cart Items List */
              <ul className="space-y-3" aria-label="Cart items">
                {items.map((item) => {
                  const isBusy = pendingItemId === item.cartItemId;
                  const discount =
                    item.mrp > item.unitPrice && item.unitPrice > 0
                      ? Math.round(((item.mrp - item.unitPrice) / item.mrp) * 100)
                      : 0;

                  return (
                    <li
                      key={item.cartItemId}
                      className={`bg-white border rounded-2xl p-4 flex gap-4 shadow-xs ${
                        item.issueCode !== null ? 'border-[#DC2626]/40' : 'border-[#E2E8E3]'
                      }`}
                    >
                      {/* Product Image */}
                      <Link
                        href={`/products/${item.storeProductId}`}
                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden shrink-0"
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-contain p-1.5"
                        />
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                              {item.brand}
                            </p>
                            <h3 className="text-sm font-bold text-[#17201A] line-clamp-2 leading-snug">
                              <Link
                                href={`/products/${item.storeProductId}`}
                                className="hover:text-[#166534] transition-colors"
                              >
                                {item.name}
                              </Link>
                            </h3>
                            <p className="text-xs text-[#647067]">
                              {item.unit} • ₹{item.unitPrice} each
                              {item.stockQuantity > 0
                                ? ` • ${item.stockQuantity} in stock`
                                : ' • Out of stock'}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleRemoveItem(item.cartItemId)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors shrink-0 disabled:opacity-40"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>

                        {item.issueMessage && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#DC2626]/10 px-3 py-2 text-xs text-[#DC2626] font-medium">
                            <span>{item.issueMessage}</span>
                            {item.issueCode === 'INSUFFICIENT_STOCK' && item.stockQuantity > 0 && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void handleQuantityChange(item.cartItemId, item.stockQuantity)
                                }
                                className="px-2.5 py-1 rounded-lg bg-white border border-[#DC2626]/30 text-[#17201A] font-semibold hover:border-[#166534]"
                              >
                                Set to {item.stockQuantity}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1">
                          {/* Line Subtotal */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-[#17201A]">
                              ₹{item.lineSubtotal}
                            </span>
                            {discount > 0 && (
                              <span className="text-[11px] font-semibold text-[#B45309] bg-[#F59E0B]/15 px-1.5 py-0.5 rounded-full">
                                {discount}% OFF
                              </span>
                            )}
                            {item.mrp > item.unitPrice && (
                              <span className="text-xs text-[#647067] line-through">
                                ₹{Number((item.mrp * item.quantity).toFixed(2))}
                              </span>
                            )}
                          </div>

                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-1.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl px-2 py-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleQuantityChange(item.cartItemId, item.quantity - 1)
                              }
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="w-6 h-6 rounded-lg bg-white border border-[#E2E8E3] text-[#17201A] hover:border-[#166534] hover:text-[#166534] flex items-center justify-center transition-colors font-bold text-sm disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="text-sm font-bold text-[#17201A] min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={
                                isBusy ||
                                item.stockQuantity <= 0 ||
                                item.quantity >= item.stockQuantity ||
                                item.issueCode !== null
                              }
                              onClick={() =>
                                void handleQuantityChange(item.cartItemId, item.quantity + 1)
                              }
                              aria-label={`Increase quantity of ${item.name}`}
                              className="w-6 h-6 rounded-lg bg-[#166534] text-white hover:bg-[#14532D] flex items-center justify-center transition-colors font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Right: Truthful Cart Summary ─────────────────────────────── */}
          {!isEmpty && (
            <div className="lg:w-80 xl:w-96 shrink-0 space-y-4">
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-5 shadow-xs sticky top-20 space-y-4">
                <h2 className="text-base font-bold text-[#17201A]">Cart Summary</h2>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#647067]">
                      Item subtotal ({cartCount} {cartCount === 1 ? 'unit' : 'units'})
                    </span>
                    <span className="font-semibold text-[#17201A]">₹{subtotal}</span>
                  </div>
                </div>

                {store && store.minOrderAmount > 0 && subtotal < store.minOrderAmount && (
                  <p className="text-xs text-[#647067] bg-[#F8FAF7] border border-[#E2E8E3] px-3 py-2 rounded-xl">
                    Store minimum order reference: <strong>₹{store.minOrderAmount}</strong>
                  </p>
                )}

                <div className="pt-3 border-t border-[#E2E8E3] flex justify-between items-center">
                  <span className="text-sm font-bold text-[#17201A]">Cart Subtotal</span>
                  <span className="text-xl font-extrabold text-[#166534]">₹{subtotal}</span>
                </div>

                <p className="text-xs text-[#647067] text-center">
                  Calculated from live store prices • Cash on Delivery at checkout
                </p>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!canCheckout}
                  onClick={() => router.push('/checkout')}
                >
                  Proceed to Checkout →
                </Button>

                {!canCheckout && (
                  <p className="text-xs text-[#DC2626] text-center font-medium">
                    Resolve the unavailable or out-of-stock items above to proceed.
                  </p>
                )}

                <Link href="/stores" className="block">
                  <Button variant="outline" size="sm" fullWidth>
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileNav cartItemCount={cartCount} />

      {/* Clear Cart Confirmation */}
      {confirmClear && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mx-auto text-xl">
                🗑
              </div>
              <h2 id="clear-dialog-title" className="text-base font-bold text-[#17201A]">
                Clear entire cart?
              </h2>
              <p className="text-sm text-[#647067]">
                All {cartCount} {cartCount === 1 ? 'item' : 'items'} from{' '}
                <strong>{store?.name}</strong> will be removed.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                fullWidth
                disabled={isClearing}
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                fullWidth
                isLoading={isClearing}
                disabled={isClearing}
                onClick={() => void handleConfirmClear()}
              >
                Clear Cart
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
