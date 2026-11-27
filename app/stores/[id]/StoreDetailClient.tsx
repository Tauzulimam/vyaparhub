'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { ProductCard } from '@/components/product/ProductCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { SwitchCartModal } from '@/components/cart/SwitchCartModal';
import type { Product, Store } from '@/types';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

interface StoreDetailClientProps {
  store: Store;
  products: Product[];
  initialLocationLabel: string;
}

export default function StoreDetailClient({
  store,
  products,
  initialLocationLabel,
}: StoreDetailClientProps) {
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
  const [cartToast, setCartToast] = useState<{ text: string; isError?: boolean } | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [conflictStoreName, setConflictStoreName] = useState<string>('');
  const [isSwitchingStore, setIsSwitchingStore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const storeCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => cats.add(p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    return list;
  }, [products, searchQuery, selectedCategory]);

  const showToast = (text: string, isError = false) => {
    setCartToast({ text, isError });
    setTimeout(() => setCartToast(null), 3500);
  };

  const handleAddToCart = async (product: Product) => {
    const result = await addToCart(product.id, 1);
    if (result.success) {
      showToast(`Added 1x "${product.name}" to cart.`);
      return;
    }
    if (result.code === 'UNAUTHENTICATED') {
      router.push(`/login?next=${encodeURIComponent(`/stores/${store.id}`)}`);
      return;
    }
    if (result.code === 'STORE_CONFLICT') {
      setConflictStoreName(result.conflictStore?.name || cartStore?.name || 'another store');
      setPendingProduct(product);
      return;
    }
    showToast(result.error, true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} currentLocation={deliveryLocationLabel} />

      {/* Cart Toast Notification */}
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-24 md:pb-16">
        {/* Navigation Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067]">
          <Link href="/" className="hover:text-[#166534] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/stores" className="hover:text-[#166534] transition-colors">
            Stores
          </Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold truncate max-w-[240px]">
            {store.name}
          </span>
        </nav>

        {/* Store Profile Banner Card */}
        <section
          aria-labelledby="store-title"
          className="bg-white border border-[#E2E8E3] rounded-3xl p-6 sm:p-8 overflow-hidden shadow-xs"
        >
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
            {/* Store Image */}
            <div className="relative w-full md:w-56 h-36 sm:h-44 rounded-2xl bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden shrink-0">
              <Image
                src={store.image}
                alt={store.name}
                fill
                sizes="(max-width: 768px) 100vw, 240px"
                className="object-cover"
                priority
              />
              <span
                className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-xs ${
                  store.isOpen ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                }`}
              >
                {store.isOpen ? 'Open Now' : 'Closed'}
              </span>
            </div>

            {/* Store Information */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534]">
                  {store.category}
                </span>
                {store.minOrderAmount !== undefined && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A]">
                    Min. order ₹{store.minOrderAmount}
                  </span>
                )}
              </div>

              <h1
                id="store-title"
                className="text-2xl sm:text-3xl font-extrabold text-[#17201A] tracking-tight"
              >
                {store.name}
              </h1>

              {store.description && (
                <p className="text-xs sm:text-sm text-[#647067] max-w-2xl leading-relaxed">
                  {store.description}
                </p>
              )}

              {/* Meta details */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[#647067] border-t border-[#E2E8E3]">
                <span className="flex items-center gap-1 font-medium text-[#17201A]">
                  <span className="text-[#166534]">📍</span> {store.address}
                </span>
                {store.deliveryRadiusKm !== undefined && store.deliveryRadiusKm > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-[#166534]">
                    🚗 Delivers within {store.deliveryRadiusKm} km
                  </span>
                )}
                {store.timing && (
                  <span className="flex items-center gap-1">
                    🕒 Hours: <strong className="text-[#17201A]">{store.timing}</strong>
                  </span>
                )}
                {store.minOrderAmount !== undefined && (
                  <span className="flex items-center gap-1">
                    🛒 Min. Order: <strong className="text-[#17201A]">₹{store.minOrderAmount}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hyperlocal Cart Policy Callout */}
          <aside
            aria-label="VyaparHub Cart Rule"
            className="mt-6 p-3.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl flex items-center gap-3 text-xs text-[#647067]"
          >
            <span className="text-base">ℹ️</span>
            <p>
              <strong className="text-[#17201A]">VyaparHub Single-Store Cart Rule:</strong> Your cart can contain products from only one local store at a time. Prices and stock shown below are specific to {store.name}.
            </p>
          </aside>
        </section>

        {/* In-store Search & Category Filtering */}
        {products.length > 0 && (
          <section
            aria-label="Store Catalog Filter"
            className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:max-w-md">
                <SearchBar
                  placeholder={`Search products in ${store.name}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                />
              </div>

              <div className="flex items-center gap-4 self-start sm:self-auto text-xs">
                <span className="text-[#647067]">
                  Showing <strong className="text-[#17201A]">{filteredProducts.length}</strong> of{' '}
                  {products.length} available {products.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {storeCategories.length > 2 && (
              <div className="pt-2 border-t border-[#E2E8E3] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs font-medium text-[#647067] shrink-0 mr-1">Section:</span>
                {storeCategories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        isSelected
                          ? 'bg-[#166534] text-white shadow-xs'
                          : 'bg-[#F8FAF7] border border-[#E2E8E3] text-[#647067] hover:border-[#166534] hover:text-[#17201A]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Products Grid */}
        <section aria-label="Available Store Products">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-[#E2E8E3] rounded-3xl p-10 text-center space-y-3 max-w-md mx-auto shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] text-[#647067] flex items-center justify-center mx-auto text-xl">
                📦
              </div>
              <h3 className="text-base font-bold text-[#17201A]">
                No available products right now
              </h3>
              <p className="text-xs text-[#647067]">
                {store.name} does not currently have in-stock items listed for sale. Please check back later or browse other nearby stores.
              </p>
              <div className="pt-1">
                <Link href="/stores">
                  <Button variant="outline" size="sm">
                    Browse Other Stores
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8E3] rounded-3xl p-10 text-center space-y-3 max-w-md mx-auto shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] text-[#647067] flex items-center justify-center mx-auto text-xl">
                🔍
              </div>
              <h3 className="text-base font-bold text-[#17201A]">No products found</h3>
              <p className="text-xs text-[#647067]">
                No items in {store.name} matched your search or category filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              >
                Reset Store Filters
              </Button>
            </div>
          )}
        </section>
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
            const res = await replaceCartWithProduct(pendingProduct.id, 1);
            setIsSwitchingStore(false);
            setPendingProduct(null);
            if (res.success) {
              showToast(
                `Switched cart to ${pendingProduct.storeName} and added 1x "${pendingProduct.name}".`
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
