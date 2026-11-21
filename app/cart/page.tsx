'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import { useMockCart } from '@/lib/mockCart';

// ── Main Cart Page ──────────────────────────────────────────────────────────
export default function CartPage() {
  const router = useRouter();
  const {
    items,
    store,
    cartCount,
    subtotal,
    deliveryFee,
    platformFee,
    grandTotal,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useMockCart();

  const [confirmClear, setConfirmClear] = useState(false);

  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067] mb-6">
          <Link href="/" className="hover:text-[#166534] transition-colors">Home</Link>
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

            {/* Store Info Banner */}
            {!isEmpty && store && (
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#647067]">Ordering from</p>
                  <p className="text-sm font-bold text-[#17201A] truncate">{store.name}</p>
                  {store.deliveryTimeMin && (
                    <p className="text-xs text-[#647067]">
                      Est. delivery: <span className="font-semibold text-[#166534]">{store.deliveryTimeMin}</span>
                      {store.distanceKm !== undefined && ` • ${store.distanceKm} km away`}
                    </p>
                  )}
                </div>
                <Link href={`/stores/${store.id}`} className="text-xs font-semibold text-[#166534] hover:underline shrink-0">
                  Visit Store →
                </Link>
              </div>
            )}

            {/* Cart Rule Note */}
            {!isEmpty && (
              <aside className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-3 flex items-start gap-2 text-xs text-[#647067]">
                <span className="shrink-0 mt-0.5">ℹ️</span>
                <p>
                  <strong className="text-[#17201A]">Single-store cart:</strong> Your cart can only contain products from one store. This ensures smooth local delivery.
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
                    Browse nearby stores and add items to get started.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/stores">
                    <Button variant="primary" size="md">Browse Nearby Stores</Button>
                  </Link>
                  <Link href="/products">
                    <Button variant="outline" size="md">Search Products</Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Cart Items List */
              <ul className="space-y-3" aria-label="Cart items">
                {items.map((item) => {
                  const itemTotal = item.product.price * item.quantity;
                  const discount =
                    item.product.mrp > item.product.price
                      ? Math.round(((item.product.mrp - item.product.price) / item.product.mrp) * 100)
                      : 0;

                  return (
                    <li
                      key={item.product.id}
                      className="bg-white border border-[#E2E8E3] rounded-2xl p-4 flex gap-4 shadow-xs"
                    >
                      {/* Product Image */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden shrink-0">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          sizes="80px"
                          className="object-contain p-1.5"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                              {item.product.brand}
                            </p>
                            <h3 className="text-sm font-bold text-[#17201A] line-clamp-2 leading-snug">
                              {item.product.name}
                            </h3>
                            <p className="text-xs text-[#647067]">{item.product.unit}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            aria-label={`Remove ${item.product.name} from cart`}
                            className="p-1 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          {/* Price */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-[#17201A]">₹{itemTotal}</span>
                            {discount > 0 && (
                              <span className="text-[11px] font-semibold text-[#B45309] bg-[#F59E0B]/15 px-1.5 py-0.5 rounded-full">
                                {discount}% OFF
                              </span>
                            )}
                            {item.product.mrp > item.product.price && (
                              <span className="text-xs text-[#647067] line-through">
                                ₹{item.product.mrp * item.quantity}
                              </span>
                            )}
                          </div>

                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-1.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl px-2 py-1">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              aria-label={`Decrease quantity of ${item.product.name}`}
                              className="w-6 h-6 rounded-lg bg-white border border-[#E2E8E3] text-[#17201A] hover:border-[#166534] hover:text-[#166534] flex items-center justify-center transition-colors font-bold text-sm"
                            >
                              −
                            </button>
                            <span className="text-sm font-bold text-[#17201A] min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.product.name}`}
                              disabled={
                                item.product.quantityAvailable !== undefined &&
                                item.quantity >= item.product.quantityAvailable
                              }
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

          {/* ── Right: Order Summary ─────────────────────────────────────── */}
          {!isEmpty && (
            <div className="lg:w-80 xl:w-96 shrink-0 space-y-4">
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-5 shadow-xs sticky top-20 space-y-4">
                <h2 className="text-base font-bold text-[#17201A]">Order Summary</h2>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#647067]">
                      Item subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                    </span>
                    <span className="font-semibold text-[#17201A]">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#647067]">Delivery fee</span>
                    {deliveryFee === 0 ? (
                      <span className="font-semibold text-[#166534]">FREE</span>
                    ) : (
                      <span className="font-semibold text-[#17201A]">₹{deliveryFee}</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#647067]">Platform fee</span>
                    <span className="font-semibold text-[#17201A]">₹{platformFee}</span>
                  </div>
                </div>

                {subtotal < 500 && (
                  <p className="text-xs text-[#B45309] bg-[#F59E0B]/10 px-3 py-2 rounded-xl">
                    Add ₹{500 - subtotal} more for <strong>FREE delivery</strong>
                  </p>
                )}

                <div className="pt-3 border-t border-[#E2E8E3] flex justify-between items-center">
                  <span className="text-sm font-bold text-[#17201A]">Total to Pay</span>
                  <span className="text-xl font-extrabold text-[#166534]">₹{grandTotal}</span>
                </div>

                <p className="text-xs text-[#647067] text-center">
                  Inclusive of all charges. Payment on delivery.
                </p>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => router.push('/checkout')}
                >
                  Proceed to Checkout →
                </Button>

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
              <h2 id="clear-dialog-title" className="text-base font-bold text-[#17201A]">Clear entire cart?</h2>
              <p className="text-sm text-[#647067]">
                All {cartCount} items from <strong>{store?.name}</strong> will be removed.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="md" fullWidth onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => {
                  clearCart();
                  setConfirmClear(false);
                }}
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
