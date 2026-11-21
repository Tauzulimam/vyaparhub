'use client';

import React, { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { ProductCard } from '@/components/product/ProductCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { mockProducts, mockCategories, mockStores } from '@/data/mockData';
import { Product } from '@/types';
import { useMockCart } from '@/lib/mockCart';

function ProductsContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const urlCategorySlug = searchParams.get('category') || 'All';

  // Map initial category slug to name
  const urlCategoryName = useMemo(() => {
    if (urlCategorySlug === 'All') return 'All';
    const found = mockCategories.find((c) => c.slug === urlCategorySlug);
    return found ? found.name : 'All';
  }, [urlCategorySlug]);

  // Manage user-adjusted search and filters without setState inside useEffect
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [userCategory, setUserCategory] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'discount'>('featured');
  const { cartCount, incrementCart } = useMockCart();
  const [cartToast, setCartToast] = useState<string | null>(null);

  const activeSearchQuery = userQuery !== null ? userQuery : urlQuery;
  const activeCategory = userCategory !== null ? userCategory : urlCategoryName;

  const categories = useMemo(() => {
    return ['All', ...mockCategories.map((c) => c.name)];
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let list = [...mockProducts];

    // Search query
    if (activeSearchQuery.trim()) {
      const q = activeSearchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.storeName.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (activeCategory !== 'All') {
      list = list.filter((p) => p.category === activeCategory);
    }

    // Store filter
    if (selectedStore !== 'All') {
      list = list.filter((p) => p.storeId === selectedStore);
    }

    // Stock filter
    if (inStockOnly) {
      list = list.filter((p) => p.inStock);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price;
      }
      if (sortBy === 'discount') {
        const discountA = a.mrp > a.price ? (a.mrp - a.price) / a.mrp : 0;
        const discountB = b.mrp > b.price ? (b.mrp - b.price) / b.mrp : 0;
        return discountB - discountA;
      }
      // 'featured'
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return 0;
    });

    return list;
  }, [activeSearchQuery, activeCategory, selectedStore, inStockOnly, sortBy]);

  const handleAddToCart = (product: Product) => {
    incrementCart();
    setCartToast(`Added 1x "${product.name}" from ${product.storeName} to cart.`);
    setTimeout(() => setCartToast(null), 3500);
  };

  const handleResetFilters = () => {
    setUserQuery('');
    setUserCategory('All');
    setSelectedStore('All');
    setInStockOnly(false);
    setSortBy('featured');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar
        cartItemCount={cartCount}
        onSearch={(q) => setUserQuery(q)}
      />

      {/* Cart Toast Notification */}
      {cartToast && (
        <aside
          aria-live="polite"
          className="fixed top-20 right-4 z-50 max-w-sm p-3.5 bg-white border border-[#166534] rounded-xl shadow-lg flex items-center gap-3 animate-fade-in"
        >
          <div className="w-6 h-6 rounded-full bg-[#166534] text-white flex items-center justify-center shrink-0 text-xs font-bold">
            ✓
          </div>
          <p className="text-xs font-medium text-[#17201A]">{cartToast}</p>
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
          <span className="text-[#17201A] font-semibold">Product Discovery</span>
        </nav>

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534] mb-2">
              <span className="w-2 h-2 rounded-full bg-[#166534]" />
              Master Catalog • Hyperlocal Pricing
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17201A] tracking-tight">
              Product Discovery & Browse
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1 max-w-xl">
              Search and discover groceries, dairy, bakery, health products, books and electronics sold by nearby verified retailers.
            </p>
          </div>

          <div className="text-xs text-[#647067]">
            Showing <strong className="text-[#17201A]">{filteredProducts.length}</strong> items across{' '}
            <strong className="text-[#17201A]">{mockStores.length}</strong> local stores
          </div>
        </div>

        {/* Filter and Control Bar */}
        <section aria-label="Catalog Filters" className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 lg:col-span-5">
              <SearchBar
                placeholder="Search products by brand, title, or store..."
                value={activeSearchQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onClear={() => setUserQuery('')}
              />
            </div>

            {/* Store Dropdown */}
            <div className="md:col-span-3 lg:col-span-3">
              <select
                aria-label="Filter by store"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-xs text-[#17201A] font-medium focus:outline-none focus:border-[#166534]"
              >
                <option value="All">All Local Stores ({mockStores.length})</option>
                {mockStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.distanceKm} km)
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div className="md:col-span-3 lg:col-span-2">
              <select
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'discount'
                  )
                }
                className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-xs text-[#17201A] font-medium focus:outline-none focus:border-[#166534]"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
              </select>
            </div>

            {/* In-Stock Toggle */}
            <div className="md:col-span-12 lg:col-span-2 flex items-center justify-start lg:justify-end">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#17201A] select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-[#166534] border-[#E2E8E3] focus:ring-[#166534]"
                />
                <span>In-Stock Only</span>
              </label>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="pt-2 border-t border-[#E2E8E3] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-medium text-[#647067] shrink-0 mr-1">Category:</span>
            {categories.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setUserCategory(cat)}
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
        </section>

        {/* Product Cards Grid */}
        {filteredProducts.length > 0 ? (
          <section aria-label="Product Search Results" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </section>
        ) : (
          <div className="bg-white border border-[#E2E8E3] rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto my-8 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] text-[#647067] flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#17201A]">No matching products</h3>
              <p className="text-xs text-[#647067] mt-1">
                We couldn&apos;t find any items matching your search criteria from local stores.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset All Filters
            </Button>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav cartItemCount={cartCount} />
    </div>
  );
}

function ProductsLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
        <div className="h-20 bg-white rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoadingFallback />}>
      <ProductsContent />
    </Suspense>
  );
}
