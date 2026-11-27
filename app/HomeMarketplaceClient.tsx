'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { ProductCard } from '@/components/product/ProductCard';
import { StoreCard } from '@/components/store/StoreCard';
import { SwitchCartModal } from '@/components/cart/SwitchCartModal';
import type { Category, Product, Store } from '@/types';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

interface HomeMarketplaceClientProps {
  categories: Category[];
  stores: Store[];
  products: Product[];
  initialLocationLabel: string;
}

export default function HomeMarketplaceClient({
  categories,
  stores,
  products,
  initialLocationLabel,
}: HomeMarketplaceClientProps) {
  const router = useRouter();
  const {
    cartCount,
    deliveryLocationLabel,
    addToCart,
    replaceCartWithProduct,
    store: cartStore,
  } = useCustomerCart({
    initialLocationLabel,
  });
  const [cartFeedback, setCartFeedback] = useState<{ text: string; isError?: boolean } | null>(
    null
  );
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [conflictStoreName, setConflictStoreName] = useState<string>('');
  const [isSwitchingStore, setIsSwitchingStore] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');

  const categoryFilterOptions = useMemo(() => {
    const withProducts = Array.from(new Set(products.map((p) => p.category)));
    if (withProducts.length > 0) {
      return ['All', ...withProducts.slice(0, 6)];
    }
    return ['All', ...categories.slice(0, 5).map((c) => c.name)];
  }, [products, categories]);

  const filteredPopular = useMemo(() => {
    if (activeCategoryFilter === 'All') {
      return products;
    }
    return products.filter(
      (p) =>
        p.category === activeCategoryFilter ||
        p.category.toLowerCase().includes(activeCategoryFilter.toLowerCase())
    );
  }, [products, activeCategoryFilter]);

  const dailyEssentialProducts = useMemo(() => products.slice(0, 5), [products]);

  const showToast = (text: string, isError = false) => {
    setCartFeedback({ text, isError });
    setTimeout(() => setCartFeedback(null), 4000);
  };

  const handleAddToCart = async (product: Product) => {
    const result = await addToCart(product.id, 1);
    if (result.success) {
      showToast(`Added "${product.name}" from ${product.storeName} to cart.`);
      return;
    }
    if (result.code === 'UNAUTHENTICATED') {
      router.push('/login?next=%2F');
      return;
    }
    if (result.code === 'STORE_CONFLICT') {
      setConflictStoreName(result.conflictStore?.name || cartStore?.name || 'another store');
      setPendingProduct(product);
      return;
    }
    showToast(result.error, true);
  };

  const handleHeroSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      {/* 1. Header/Navbar */}
      <Navbar
        cartItemCount={cartCount}
        currentLocation={deliveryLocationLabel}
        onLocationClick={() =>
          showToast(`Delivering to: ${deliveryLocationLabel}. Manage addresses in My Profile.`)
        }
      />

      {/* Cart Notification Toast */}
      {cartFeedback && (
        <aside
          aria-live="polite"
          className={`fixed top-20 right-4 z-50 max-w-sm p-3.5 bg-white border rounded-xl shadow-lg flex items-center gap-3 animate-fade-in ${
            cartFeedback.isError ? 'border-[#DC2626]' : 'border-[#166534]'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 text-xs font-bold ${
              cartFeedback.isError ? 'bg-[#DC2626]' : 'bg-[#166534]'
            }`}
          >
            {cartFeedback.isError ? '!' : '✓'}
          </div>
          <p className="text-xs font-medium text-[#17201A]">{cartFeedback.text}</p>
          <button
            onClick={() => setCartFeedback(null)}
            className="text-[#647067] hover:text-[#17201A] text-xs font-bold ml-auto"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12 pb-24 md:pb-16">
        {/* 2. Hero Section */}
        <section
          aria-label="Marketplace Welcome"
          className="relative rounded-3xl bg-gradient-to-b from-white to-[#F8FAF7] border border-[#E2E8E3] p-6 sm:p-10 lg:p-12 overflow-hidden shadow-xs"
        >
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534] border border-[#166534]/20">
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse" />
              Hyperlocal Multi-Vendor Marketplace • Live Local Stores
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#17201A] leading-tight">
              Your Neighborhood Stores, <br className="hidden sm:inline" />
              <span className="text-[#166534]">Delivered In Minutes.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#647067] leading-relaxed max-w-2xl">
              Shop fresh dairy, daily groceries, medicines, bakery treats, books and electronics directly from trusted local retailers right around your corner.
            </p>

            {/* Prominent Hero Search Bar */}
            <div className="pt-2 max-w-2xl">
              <SearchBar
                placeholder="Search products or stores (e.g. Milk, Atta, ORS, Bread, Earphones)..."
                onSearch={handleHeroSearch}
                className="shadow-sm"
              />

              {/* Quick Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[#647067]">
                <span className="font-medium text-[#17201A]">Popular searches:</span>
                {['Cipla ORS', 'Amul Milk', 'Aashirvaad Atta', 'Bread', 'Dettol'].map((tag) => (
                  <Link
                    key={tag}
                    href={`/products?q=${encodeURIComponent(tag)}`}
                    className="px-2.5 py-1 rounded-full bg-white border border-[#E2E8E3] hover:border-[#166534] hover:text-[#166534] transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Hyperlocal Value Highlights */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#E2E8E3] text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#166534]/10 text-[#166534] flex items-center justify-center font-bold text-sm shrink-0">
                  ⚡
                </div>
                <div>
                  <strong className="block font-semibold text-[#17201A]">Fast Local Delivery</strong>
                  <span className="text-[#647067]">Direct from nearby open shops</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 text-[#B45309] flex items-center justify-center font-bold text-sm shrink-0">
                  🏪
                </div>
                <div>
                  <strong className="block font-semibold text-[#17201A]">Real Store Pricing</strong>
                  <span className="text-[#647067]">Transparent store-specific prices</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center font-bold text-sm shrink-0">
                  💵
                </div>
                <div>
                  <strong className="block font-semibold text-[#17201A]">Cash on Delivery</strong>
                  <span className="text-[#647067]">Pay upon safe arrival</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Category Browsing */}
        <section aria-labelledby="categories-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="categories-heading" className="text-xl sm:text-2xl font-bold text-[#17201A]">
                Shop by Category
              </h2>
              <p className="text-xs sm:text-sm text-[#647067]">
                Master catalog categories available across open neighborhood stores
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs sm:text-sm font-semibold text-[#166534] hover:text-[#14532D] flex items-center gap-1"
            >
              All Products <span>→</span>
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8E3] rounded-2xl p-6 text-center text-xs text-[#647067]">
              Categories will appear once active in the catalog.
            </div>
          )}
        </section>

        {/* 4. Nearby Local Stores Section */}
        <section aria-labelledby="stores-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="stores-heading" className="text-xl sm:text-2xl font-bold text-[#17201A]">
                  Nearby Local Stores
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534]">
                  Open Now ({stores.length})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#647067]">
                Open kirana shops, pharmacies, bakeries and neighborhood stores accepting orders right now
              </p>
            </div>
            <Link
              href="/stores"
              className="text-xs sm:text-sm font-semibold text-[#166534] hover:text-[#14532D] flex items-center gap-1"
            >
              View All ({stores.length}) <span>→</span>
            </Link>
          </div>

          {stores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {stores.slice(0, 4).map((s) => (
                <StoreCard key={s.id} store={s} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8E3] rounded-3xl p-8 text-center space-y-2 shadow-xs">
              <p className="text-base font-bold text-[#17201A]">No stores are currently open</p>
              <p className="text-xs text-[#647067] max-w-md mx-auto">
                Local stores appear here automatically as soon as vendors open their shops for orders.
              </p>
            </div>
          )}
        </section>

        {/* 5. Available Near You (with category filter tabs) */}
        <section aria-labelledby="popular-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 id="popular-heading" className="text-xl sm:text-2xl font-bold text-[#17201A]">
                Popular Near You
              </h2>
              <p className="text-xs sm:text-sm text-[#647067]">
                In-stock items currently sold by open local vendors
              </p>
            </div>

            {categoryFilterOptions.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categoryFilterOptions.map((filter) => {
                  const isSelected = activeCategoryFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setActiveCategoryFilter(filter)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        isSelected
                          ? 'bg-[#166534] text-white shadow-xs'
                          : 'bg-white border border-[#E2E8E3] text-[#647067] hover:border-[#166534] hover:text-[#17201A]'
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {filteredPopular.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredPopular.slice(0, 10).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8E3] rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <p className="text-sm font-bold text-[#17201A]">
                {products.length === 0
                  ? 'No in-stock products available right now'
                  : `No available items in "${activeCategoryFilter}"`}
              </p>
              <p className="text-xs text-[#647067]">
                {products.length === 0
                  ? 'Products appear here automatically when open stores list in-stock items.'
                  : 'Try switching back to All categories to view available items from open stores.'}
              </p>
              {activeCategoryFilter !== 'All' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveCategoryFilter('All')}
                >
                  Show All Available Items
                </Button>
              )}
            </div>
          )}
        </section>

        {/* 6. Daily Essentials */}
        {dailyEssentialProducts.length > 0 && (
          <section
            aria-labelledby="buyagain-heading"
            className="bg-white border border-[#E2E8E3] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/15 text-[#B45309] flex items-center justify-center font-bold text-sm">
                  ↻
                </div>
                <div>
                  <h2 id="buyagain-heading" className="text-lg sm:text-xl font-bold text-[#17201A]">
                    Daily Essentials • In Stock Now
                  </h2>
                  <p className="text-xs text-[#647067]">
                    Ready-to-order essentials with live store pricing and stock availability
                  </p>
                </div>
              </div>
              <Link
                href="/products"
                className="text-xs sm:text-sm font-semibold text-[#166534] hover:text-[#14532D]"
              >
                Browse All
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
              {dailyEssentialProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </section>
        )}

        {/* 7. VyaparHub Local Mission & Vendor CTA (Promotional Static Section) */}
        <section
          aria-label="About VyaparHub Platform"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white border border-[#E2E8E3] rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534]">
                Why Shop Hyperlocal?
              </span>
              <h3 className="text-xl font-bold text-[#17201A]">
                Empowering Neighborhood Retailers
              </h3>
              <p className="text-xs sm:text-sm text-[#647067] leading-relaxed">
                When you order on VyaparHub, your purchase goes directly to local merchants in your neighborhood. Enjoy transparent store-level pricing, authentic brands from our Master Product Catalog, and fast local fulfillment.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Link href="/stores">
                <Button variant="primary" size="sm">
                  Explore Nearby Stores
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="outline" size="sm">
                  Search Products
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#166534] to-[#14532D] text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                For Local Store Owners
              </span>
              <h3 className="text-xl font-bold text-white">
                Sell to Hundreds of Nearby Customers
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                No need for expensive product photography or entering barcode details from scratch. Pick pre-verified items from our central Master Product Catalog, set your price and stock, and start fulfilling neighborhood orders.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href="/vendor/stores/new">
                <Button variant="secondary" size="sm">
                  Register Your Store →
                </Button>
              </Link>
              <Link
                href="/vendor"
                className="text-xs font-bold text-white/90 hover:text-white underline underline-offset-4"
              >
                Open Vendor Portal
              </Link>
            </div>
          </div>
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
                `Switched cart to ${pendingProduct.storeName} and added "${pendingProduct.name}".`
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
