'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import { SwitchCartModal } from '@/components/cart/SwitchCartModal';
import type { OtherStoreOffer } from '@/lib/marketplace/server';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';
import type { Product, Store } from '@/types';

interface ProductDetailClientProps {
  product: Product;
  store: Store;
  otherStoreOffers: OtherStoreOffer[];
  initialLocationLabel: string;
}

export default function ProductDetailClient({
  product,
  store,
  otherStoreOffers,
  initialLocationLabel,
}: ProductDetailClientProps) {
  const router = useRouter();
  const {
    cartCount,
    deliveryLocationLabel,
    store: cartStore,
    addToCart,
    replaceCartWithProduct,
  } = useCustomerCart({
    initialLocationLabel,
  });
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isSwitchingStore, setIsSwitchingStore] = useState<boolean>(false);
  const [conflictStoreName, setConflictStoreName] = useState<string>('');
  const [cartToast, setCartToast] = useState<{ text: string; isError?: boolean } | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  const maxStock = Math.max(1, product.quantityAvailable ?? 1);
  const discountPercent =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;
  const savingsAmount =
    product.mrp > product.price ? Number((product.mrp - product.price).toFixed(2)) : 0;

  const storeLocationLabel =
    store.area && store.city ? `${store.area}, ${store.city}` : store.address;

  const showToast = (text: string, isError = false) => {
    setCartToast({ text, isError });
    setTimeout(() => setCartToast(null), 3500);
  };

  const handleAdd = async () => {
    if (!product.inStock || isAdding) return;
    setIsAdding(true);
    const res = await addToCart(product.id, selectedQty);
    setIsAdding(false);

    if (res.success) {
      showToast(`Added ${selectedQty}x "${product.name}" from ${store.name} to cart.`);
      return;
    }
    if (res.code === 'UNAUTHENTICATED') {
      router.push(`/login?next=${encodeURIComponent(`/products/${product.id}`)}`);
      return;
    }
    if (res.code === 'STORE_CONFLICT') {
      setConflictStoreName(res.conflictStore?.name || cartStore?.name || 'another store');
      setPendingProduct(product);
      return;
    }
    showToast(res.error, true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} currentLocation={deliveryLocationLabel} />

      {cartToast && (
        <aside
          aria-live="polite"
          className={`fixed top-20 right-4 z-50 max-w-sm p-3.5 bg-white border rounded-xl shadow-lg flex items-center gap-3 animate-fade-in ${
            cartToast.isError ? 'border-[#DC2626]' : 'border-[#166534]'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 text-xs font-bold ${
              cartToast.isError ? 'bg-[#DC2626]' : 'bg-[#166534]'
            }`}
          >
            {cartToast.isError ? '!' : '✓'}
          </div>
          <p className="text-xs font-medium text-[#17201A]">{cartToast.text}</p>
          <button
            onClick={() => setCartToast(null)}
            className="text-[#647067] hover:text-[#17201A] text-xs font-bold ml-auto"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </aside>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-24 md:pb-16">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs text-[#647067]"
        >
          <Link href="/" className="hover:text-[#166534] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#166534] transition-colors">
            Products
          </Link>
          <span>/</span>
          <Link
            href={`/stores/${store.id}`}
            className="hover:text-[#166534] transition-colors truncate max-w-[180px]"
          >
            {store.name}
          </Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold truncate max-w-[220px]">
            {product.name}
          </span>
        </nav>

        {/* Primary StoreProduct Detail Card */}
        <section
          aria-labelledby="product-detail-heading"
          className="bg-white border border-[#E2E8E3] rounded-3xl p-6 sm:p-8 shadow-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: MasterProduct Artwork */}
            <div className="md:col-span-5">
              <div className="relative w-full aspect-square rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden flex items-center justify-center">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  className="object-contain p-8"
                  priority
                />
                {discountPercent > 0 && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F59E0B]/15 text-[#B45309]">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Right: Commercial & Store-Specific Details */}
            <div className="md:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={
                      product.categorySlug
                        ? `/products?category=${product.categorySlug}`
                        : '/products'
                    }
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534] hover:bg-[#166534]/15 transition-colors"
                  >
                    {product.category}
                  </Link>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A]">
                    {product.unit}
                  </span>
                  {product.inStock ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#16A34A]/10 text-[#166534]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                      In Stock
                      {product.quantityAvailable !== undefined
                        ? ` (${product.quantityAvailable} available)`
                        : ''}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DC2626]/10 text-[#DC2626]">
                      Unavailable
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold uppercase tracking-wider text-[#647067]">
                  {product.brand}
                </p>

                <h1
                  id="product-detail-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-[#17201A] tracking-tight leading-snug"
                >
                  {product.name}
                </h1>

                {product.description && (
                  <p className="text-xs sm:text-sm text-[#647067] leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Store-Specific Price Block */}
              <div className="p-4 rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-3xl font-black text-[#17201A]">₹{product.price}</span>
                  {product.mrp > product.price && (
                    <span className="text-sm text-[#647067] line-through">
                      MRP ₹{product.mrp}
                    </span>
                  )}
                  {savingsAmount > 0 && (
                    <span className="text-xs font-semibold text-[#166534]">
                      Save ₹{savingsAmount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#647067]">
                  Store-specific selling price set by <strong className="text-[#17201A]">{store.name}</strong> (MRP ₹{product.mrp} incl. of all taxes)
                </p>
              </div>

              {/* Quantity & Add to Cart Controls */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="inline-flex items-center gap-2 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl px-2.5 py-1.5">
                  <button
                    type="button"
                    disabled={selectedQty <= 1 || isAdding}
                    onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-7 h-7 rounded-lg bg-white border border-[#E2E8E3] text-[#17201A] font-bold disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-[24px] text-center text-sm font-bold text-[#17201A]">
                    {selectedQty}
                  </span>
                  <button
                    type="button"
                    disabled={selectedQty >= maxStock || isAdding}
                    onClick={() => setSelectedQty((q) => Math.min(maxStock, q + 1))}
                    aria-label="Increase quantity"
                    className="w-7 h-7 rounded-lg bg-white border border-[#E2E8E3] text-[#17201A] font-bold disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  isLoading={isAdding}
                  disabled={!product.inStock || isAdding}
                  onClick={() => void handleAdd()}
                >
                  {product.inStock
                    ? `Add to Cart • ₹${Number((product.price * selectedQty).toFixed(2))}`
                    : 'Currently Unavailable'}
                </Button>
              </div>

              {/* Fulfilling Store Attribution Card */}
              <div className="pt-3 border-t border-[#E2E8E3]">
                <div className="rounded-2xl border border-[#E2E8E3] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#647067]">
                        Sold & fulfilled by
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#16A34A]/10 text-[#166534]">
                        Open Now
                      </span>
                    </div>
                    <p className="text-base font-bold text-[#17201A]">{store.name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#647067]">
                      <span>📍 {storeLocationLabel}</span>
                      {store.timing && <span>🕒 {store.timing}</span>}
                      {store.minOrderAmount !== undefined && (
                        <span>🛒 Min. order ₹{store.minOrderAmount}</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/stores/${store.id}`} className="shrink-0">
                    <Button variant="outline" size="sm">
                      Visit Store →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Other Open Stores Selling the Same MasterProduct */}
        {otherStoreOffers.length > 0 && (
          <section
            aria-labelledby="other-stores-heading"
            className="bg-white border border-[#E2E8E3] rounded-3xl p-6 space-y-4 shadow-xs"
          >
            <div>
              <h2 id="other-stores-heading" className="text-lg font-bold text-[#17201A]">
                Also Sold by Other Open Nearby Stores
              </h2>
              <p className="text-xs text-[#647067]">
                Compare independent store-specific prices and available stock for {product.name}
              </p>
            </div>

            <div className="divide-y divide-[#E2E8E3]">
              {otherStoreOffers.map((offer) => (
                <div
                  key={offer.storeProductId}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-[#17201A]">{offer.storeName}</p>
                    <p className="text-xs text-[#647067]">
                      {offer.area}, {offer.city} • {offer.quantityAvailable} in stock • Min. order ₹
                      {offer.minOrderAmount}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-bold text-[#17201A]">₹{offer.price}</span>
                      {offer.mrp > offer.price && (
                        <span className="ml-1.5 text-xs text-[#647067] line-through">
                          ₹{offer.mrp}
                        </span>
                      )}
                    </div>
                    <Link href={`/products/${offer.storeProductId}`}>
                      <Button variant="outline" size="sm">
                        View Offer
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <MobileNav cartItemCount={cartCount} />

      {pendingProduct && (
        <SwitchCartModal
          newProduct={pendingProduct}
          currentStoreName={conflictStoreName || cartStore?.name || 'another store'}
          isSubmitting={isSwitchingStore}
          onCancel={() => {
            if (!isSwitchingStore) setPendingProduct(null);
          }}
          onConfirm={async () => {
            setIsSwitchingStore(true);
            const res = await replaceCartWithProduct(pendingProduct.id, selectedQty);
            setIsSwitchingStore(false);
            setPendingProduct(null);
            if (res.success) {
              showToast(
                `Switched cart to ${pendingProduct.storeName} and added ${selectedQty}x "${pendingProduct.name}".`
              );
            } else {
              showToast(res.error, true);
            }
          }}
        />
      )}
    </div>
  );
}
