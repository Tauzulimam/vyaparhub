'use client';

import React, { useState } from 'react';
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
import {
  mockCategories,
  mockStores,
  getPopularProducts,
  getBuyAgainProducts,
} from '@/data/mockData';
import { Product } from '@/types';
import { useMockCart } from '@/lib/mockCart';

export default function HomePage() {
  const router = useRouter();
  const { cartCount, addToCart, replaceCartWithProduct, store } = useMockCart();
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');

  const popularProducts = getPopularProducts();
  const buyAgainProducts = getBuyAgainProducts();

  // Filter popular products by tab
  const filteredPopular =
    activeCategoryFilter === 'All'
      ? popularProducts
      : popularProducts.filter((p) => p.category.includes(activeCategoryFilter));

  const handleAddToCart = (product: Product) => {
    const result = addToCart(product, 1);
    if (result.success) {
      setCartFeedback(`Added "${product.name}" from ${product.storeName} to cart.`);
      setTimeout(() => setCartFeedback(null), 4000);
    } else {
      // Store conflict — prompt user
      setPendingProduct(product);
    }
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
        currentLocation="Sector 14, Main Market (0.4 km)"
        onLocationClick={() =>
          setCartFeedback('Hyperlocal location: Sector 14, Gurugram (~5 km service radius).')
        }
      />

      {/* Cart Notification Toast */}
      {cartFeedback && (
        <aside
          aria-live="polite"
          className="fixed top-20 right-4 z-50 max-w-sm p-3.5 bg-white border border-[#166534] rounded-xl shadow-lg flex items-center gap-3 animate-fade-in"
        >
          <div className="w-6 h-6 rounded-full bg-[#166534] text-white flex items-center justify-center shrink-0 text-xs font-bold">
            ✓
          </div>
          <p className="text-xs font-medium text-[#17201A]">{cartFeedback}</p>
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
        <section aria-label="Marketplace Welcome" className="relative rounded-3xl bg-gradient-to-b from-white to-[#F8FAF7] border border-[#E2E8E3] p-6 sm:p-10 lg:p-12 overflow-hidden shadow-xs">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534] border border-[#166534]/20">
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse" />
              Hyperlocal Multi-Vendor Marketplace • Within 5 km
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
                placeholder="Search products or stores (e.g. Milk, Atta, Bread, Medicines, Earphones)..."
                onSearch={handleHeroSearch}
                className="shadow-sm"
              />

              {/* Quick Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[#647067]">
                <span className="font-medium text-[#17201A]">Popular searches:</span>
                {['Amul Milk', 'Aashirvaad Atta', 'Bread', 'First Aid', 'boAt Earphones'].map(
                  (tag) => (
                    <Link
                      key={tag}
                      href={`/products?q=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-1 rounded-full bg-white border border-[#E2E8E3] hover:border-[#166534] hover:text-[#166534] transition-colors"
                    >
                      {tag}
                    </Link>
                  )
                )}
              </div>
            </div>

            {/* Hyperlocal Value Highlights */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#E2E8E3] text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#166534]/10 text-[#166534] flex items-center justify-center font-bold text-sm shrink-0">
                  ⚡
                </div>
                <div>
                  <strong className="block font-semibold text-[#17201A]">15–30 Min Delivery</strong>
                  <span className="text-[#647067]">Hyperlocal ~5 km speed</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 text-[#B45309] flex items-center justify-center font-bold text-sm shrink-0">
                  🏪
                </div>
                <div>
                  <strong className="block font-semibold text-[#17201A]">Verified Local Stores</strong>
                  <span className="text-[#647067]">Family kirana & retailers</span>
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
                Master catalog items available across your neighborhood stores
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs sm:text-sm font-semibold text-[#166534] hover:text-[#14532D] flex items-center gap-1"
            >
              All Products <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
            {mockCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
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
                  Near Sector 14
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#647067]">
                Family kirana shops, dispensaries, bakeries and stores within your delivery zone
              </p>
            </div>
            <Link
              href="/stores"
              className="text-xs sm:text-sm font-semibold text-[#166534] hover:text-[#14532D] flex items-center gap-1"
            >
              View All ({mockStores.length}) <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {mockStores.slice(0, 4).map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </section>

        {/* 5. Popular Near You (with category filter tabs) */}
        <section aria-labelledby="popular-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 id="popular-heading" className="text-xl sm:text-2xl font-bold text-[#17201A]">
                Popular Near You
              </h2>
              <p className="text-xs sm:text-sm text-[#647067]">
                High-demand items sold by local vendors in your area
              </p>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {['All', 'Dairy', 'Grocery', 'Bakery', 'Pharmacy', 'Electronics'].map((filter) => {
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
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredPopular.slice(0, 10).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </section>

        {/* 6. Buy Again / Daily Staples */}
        <section aria-labelledby="buyagain-heading" className="bg-white border border-[#E2E8E3] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/15 text-[#B45309] flex items-center justify-center font-bold text-sm">
                ↻
              </div>
              <div>
                <h2 id="buyagain-heading" className="text-lg sm:text-xl font-bold text-[#17201A]">
                  Buy Again • Daily Essentials
                </h2>
                <p className="text-xs text-[#647067]">
                  Quickly reorder daily staples like milk, bread, eggs, and flour from your regular stores
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
            {buyAgainProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </section>

        {/* 7. VyaparHub Local Mission & Vendor CTA */}
        <section aria-label="About VyaparHub Platform" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Customer Value */}
          <div className="bg-white border border-[#E2E8E3] rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534]">
                Why Shop Hyperlocal?
              </span>
              <h3 className="text-xl font-bold text-[#17201A]">
                Empowering Neighborhood Retailers
              </h3>
              <p className="text-xs sm:text-sm text-[#647067] leading-relaxed">
                When you order on VyaparHub, your purchase goes directly to verified local merchants in your sector. Enjoy transparent local pricing, authentic brands from our Master Product Catalog, and fast 15–30 minute delivery.
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

          {/* Card 2: Local Storekeeper Call to Action */}
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

      {/* 8. Footer */}
      <Footer />

      {/* 9. Mobile Bottom Navigation */}
      <MobileNav cartItemCount={cartCount} />

      {/* 10. Single-Store Cart Conflict Modal */}
      {pendingProduct && (
        <SwitchCartModal
          newProduct={pendingProduct}
          currentStoreName={store?.name || 'another store'}
          onCancel={() => setPendingProduct(null)}
          onConfirm={() => {
            replaceCartWithProduct(pendingProduct, 1);
            setCartFeedback(
              `Switched cart to ${pendingProduct.storeName} and added "${pendingProduct.name}".`
            );
            setTimeout(() => setCartFeedback(null), 4000);
            setPendingProduct(null);
          }}
        />
      )}
    </div>
  );
}
