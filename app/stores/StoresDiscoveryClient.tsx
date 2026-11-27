'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { StoreCard } from '@/components/store/StoreCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';
import type { Category, Store } from '@/types';

interface StoresDiscoveryClientProps {
  stores: Store[];
  categories: Category[];
  initialLocationLabel: string;
}

export default function StoresDiscoveryClient({
  stores,
  categories,
  initialLocationLabel,
}: StoresDiscoveryClientProps) {
  const { cartCount, deliveryLocationLabel } = useCustomerCart({
    initialLocationLabel,
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'min-order' | 'radius' | 'name'>('featured');

  const categoryOptions = useMemo(
    () => ['All', ...categories.map((cat) => cat.name)],
    [categories]
  );

  const filteredStores = useMemo(() => {
    let list = [...stores];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (store) =>
          store.name.toLowerCase().includes(q) ||
          store.category.toLowerCase().includes(q) ||
          store.address.toLowerCase().includes(q) ||
          (store.area && store.area.toLowerCase().includes(q)) ||
          (store.city && store.city.toLowerCase().includes(q)) ||
          (store.postalCode && store.postalCode.toLowerCase().includes(q)) ||
          (store.description && store.description.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'All') {
      list = list.filter(
        (store) =>
          store.category === selectedCategory ||
          store.categoriesOffered?.includes(selectedCategory)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'min-order') {
        return (a.minOrderAmount ?? 0) - (b.minOrderAmount ?? 0);
      }
      if (sortBy === 'radius') {
        return (a.deliveryRadiusKm ?? a.distanceKm) - (b.deliveryRadiusKm ?? b.distanceKm);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [stores, searchQuery, selectedCategory, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('featured');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} currentLocation={deliveryLocationLabel} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-24 md:pb-16">
        {/* Breadcrumb / Top Bar */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067]">
          <Link href="/" className="hover:text-[#166534] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">Nearby Stores</span>
        </nav>

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534] mb-2">
              <span className="w-2 h-2 rounded-full bg-[#166534]" />
              Live Open Stores
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17201A] tracking-tight">
              Nearby Neighborhood Stores
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1 max-w-xl">
              Browse active, open local retailers delivering directly to your neighborhood. Live store hours, minimum order thresholds, and store-specific product catalogs.
            </p>
          </div>

          <div className="text-xs text-[#647067]">
            Showing <strong className="text-[#17201A]">{filteredStores.length}</strong> of{' '}
            {stores.length} open {stores.length === 1 ? 'store' : 'stores'}
          </div>
        </div>

        {/* Filter and Control Bar */}
        <section
          aria-label="Store Filters"
          className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-8 lg:col-span-9">
              <SearchBar
                placeholder="Search stores by name, category, area, city, or PIN code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            {/* Sort Options */}
            <div className="md:col-span-4 lg:col-span-3 flex items-center gap-2">
              <label htmlFor="sort-stores" className="text-xs font-medium text-[#647067] shrink-0">
                Sort by:
              </label>
              <select
                id="sort-stores"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'featured' | 'min-order' | 'radius' | 'name')
                }
                className="w-full px-3 py-2 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-xs text-[#17201A] font-medium focus:outline-none focus:border-[#166534]"
              >
                <option value="featured">Recommended</option>
                <option value="min-order">Minimum Order (Lowest)</option>
                <option value="radius">Delivery Radius</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
          </div>

          {/* Category Pills Bar */}
          <div className="pt-2 border-t border-[#E2E8E3] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-medium text-[#647067] shrink-0 mr-1">Category:</span>
            {categoryOptions.map((cat) => {
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
        </section>

        {/* Stores Grid or Empty State */}
        {filteredStores.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8E3] rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto my-8 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] text-[#647067] flex items-center justify-center mx-auto text-2xl">
              🏪
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#17201A]">
                {stores.length === 0 ? 'No stores are currently open' : 'No matching stores found'}
              </h3>
              <p className="text-xs text-[#647067] mt-1">
                {stores.length === 0
                  ? 'Check back shortly once local retailers open their stores for orders.'
                  : 'No open local stores matched your current search and category filters.'}
              </p>
            </div>
            {(searchQuery.trim() !== '' || selectedCategory !== 'All') && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
