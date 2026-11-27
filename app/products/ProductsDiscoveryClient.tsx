'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { ProductCard } from '@/components/product/ProductCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { SwitchCartModal } from '@/components/cart/SwitchCartModal';
import type { Category, Product, Store } from '@/types';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

interface ProductsDiscoveryClientProps {
  products: Product[];
  categories: Category[];
  stores: Store[];
  initialLocationLabel: string;
}

export default function ProductsDiscoveryClient({
  products,
  categories,
  stores,
  initialLocationLabel,
}: ProductsDiscoveryClientProps) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const urlCategoryParam = searchParams.get('category') || 'All';
  const urlStoreParam = searchParams.get('store') || 'All';

  const urlCategoryName = useMemo(() => {
    if (urlCategoryParam === 'All') return 'All';
    const bySlug = categories.find((c) => c.slug === urlCategoryParam);
    if (bySlug) return bySlug.name;
    const byName = categories.find(
      (c) => c.name.toLowerCase() === urlCategoryParam.toLowerCase()
    );
    return byName ? byName.name : 'All';
  }, [urlCategoryParam, categories]);

  const initialStoreFilter = useMemo(() => {
    if (urlStoreParam === 'All') return 'All';
    return stores.some((s) => s.id === urlStoreParam) ? urlStoreParam : 'All';
  }, [urlStoreParam, stores]);

  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [userCategory, setUserCategory] = useState<string | null>(null);
  const [userStore, setUserStore] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'discount'>(
    'featured'
  );

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

  const activeSearchQuery = userQuery !== null ? userQuery : urlQuery;
  const activeCategory = userCategory !== null ? userCategory : urlCategoryName;
  const selectedStore = userStore !== null ? userStore : initialStoreFilter;

  const categoryOptions = useMemo(
    () => ['All', ...categories.map((c) => c.name)],
    [categories]
  );

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (activeSearchQuery.trim()) {
      const q = activeSearchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.storeName.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (activeCategory !== 'All') {
      list = list.filter((p) => p.category === activeCategory);
    }

    if (selectedStore !== 'All') {
      list = list.filter((p) => p.storeId === selectedStore);
    }

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
      return 0;
    });

    return list;
  }, [products, activeSearchQuery, activeCategory, selectedStore, sortBy]);

  const showToast = (text: string, isError = false) => {
    setCartToast({ text, isError });
    setTimeout(() => setCartToast(null), 3500);
  };

  const handleAddToCart = async (product: Product) => {
    const result = await addToCart(product.id, 1);
    if (result.success) {
      showToast(`Added 1x "${product.name}" from ${product.storeName} to cart.`);
      return;
    }
    if (result.code === 'UNAUTHENTICATED') {
      const qs = searchParams.toString();
      const nextTarget = qs ? `/products?${qs}` : '/products';
      router.push(`/login?next=${encodeURIComponent(nextTarget)}`);
      return;
    }
    if (result.code === 'STORE_CONFLICT') {
      setConflictStoreName(result.conflictStore?.name || cartStore?.name || 'another store');
      setPendingProduct(product);
      return;
    }
    showToast(result.error, true);
  };

  const handleResetFilters = () => {
    setUserQuery('');
    setUserCategory('All');
    setUserStore('All');
    setSortBy('featured');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar
        cartItemCount={cartCount}
        currentLocation={deliveryLocationLabel}
        onSearch={(q) => setUserQuery(q)}
      />

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
          <span className="text-[#17201A] font-semibold">Product Discovery</span>
        </nav>

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534] mb-2">
              <span className="w-2 h-2 rounded-full bg-[#166534]" />
              Master Catalog • Store-Specific Pricing
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17201A] tracking-tight">
              Product Discovery & Browse
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1 max-w-xl">
              Search real in-stock products across open neighborhood stores. Each listing reflects the fulfilling store&apos;s live selling price and available stock.
            </p>
          </div>

          <div className="text-xs text-[#647067]">
            Showing <strong className="text-[#17201A]">{filteredProducts.length}</strong>{' '}
            {filteredProducts.length === 1 ? 'listing' : 'listings'} across{' '}
            <strong className="text-[#17201A]">{stores.length}</strong> open{' '}
            {stores.length === 1 ? 'store' : 'stores'}
          </div>
        </div>

        {/* Filter and Control Bar */}
        <section
          aria-label="Catalog Filters"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 lg:col-span-6">
              <SearchBar
                placeholder="Search products by brand, name, category, or store..."
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
                onChange={(e) => setUserStore(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-xs text-[#17201A] font-medium focus:outline-none focus:border-[#166534]"
              >
                <option value="All">All Open Stores ({stores.length})</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.area ? ` (${s.area})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div className="md:col-span-3 lg:col-span-3">
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
          </div>

          {/* Category Chips Bar */}
          <div className="pt-2 border-t border-[#E2E8E3] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-medium text-[#647067] shrink-0 mr-1">Category:</span>
            {categoryOptions.map((cat) => {
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
          <section
            aria-label="Product Search Results"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
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
              <h3 className="text-lg font-bold text-[#17201A]">
                {products.length === 0
                  ? 'No in-stock products available'
                  : 'No matching products'}
              </h3>
              <p className="text-xs text-[#647067] mt-1">
                {products.length === 0
                  ? 'Available items appear automatically once open local stores list products in stock.'
                  : "We couldn't find any available items matching your current search or filters."}
              </p>
            </div>
            {(activeSearchQuery.trim() !== '' ||
              activeCategory !== 'All' ||
              selectedStore !== 'All') && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Reset All Filters
              </Button>
            )}
          </div>
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
