'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { StoreCard } from '@/components/store/StoreCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { mockStores } from '@/data/mockData';

export default function StoresPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openOnly, setOpenOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'delivery'>('distance');

  const categories = [
    'All',
    'Daily Grocery & Staples',
    'Dairy & Fresh Sweets',
    'Bakery & Confectionery',
    'Pharmacy & Wellness',
    'Stationery & Books',
    'Electronics & Mobile',
    'Pet Supplies & Care',
    'General Store & Home Needs',
  ];

  // Filter & Sort logic
  const filteredStores = useMemo(() => {
    let list = [...mockStores];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (store) =>
          store.name.toLowerCase().includes(q) ||
          store.category.toLowerCase().includes(q) ||
          store.address.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      list = list.filter(
        (store) =>
          store.category === selectedCategory ||
          store.categoriesOffered?.includes(selectedCategory)
      );
    }

    // Open now filter
    if (openOnly) {
      list = list.filter((store) => store.isOpen);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'distance') {
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'delivery') {
        return a.deliveryTimeMin.localeCompare(b.deliveryTimeMin);
      }
      return 0;
    });

    return list;
  }, [searchQuery, selectedCategory, openOnly, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setOpenOnly(false);
    setSortBy('distance');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar currentLocation="Sector 14, Main Market (0.4 km)" />

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
              Hyperlocal Radius: ~5 km
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17201A] tracking-tight">
              Nearby Neighborhood Stores
            </h1>
            <p className="text-xs sm:text-sm text-[#647067] mt-1 max-w-xl">
              Browse verified local retailers delivering directly to your door in Sector 14. Real-time store availability, local prices, and fast delivery.
            </p>
          </div>

          <div className="text-xs text-[#647067]">
            Showing <strong className="text-[#17201A]">{filteredStores.length}</strong> of{' '}
            {mockStores.length} local stores
          </div>
        </div>

        {/* Filter and Control Bar */}
        <section aria-label="Store Filters" className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 lg:col-span-7">
              <SearchBar
                placeholder="Search stores by name, category, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            {/* Sort Options */}
            <div className="md:col-span-3 lg:col-span-3 flex items-center gap-2">
              <label htmlFor="sort-stores" className="text-xs font-medium text-[#647067] shrink-0">
                Sort by:
              </label>
              <select
                id="sort-stores"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'distance' | 'rating' | 'delivery')}
                className="w-full px-3 py-2 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-xs text-[#17201A] font-medium focus:outline-none focus:border-[#166534]"
              >
                <option value="distance">Distance (Nearest first)</option>
                <option value="rating">Rating (Highest first)</option>
                <option value="delivery">Delivery (Fastest)</option>
              </select>
            </div>

            {/* Open Now Toggle */}
            <div className="md:col-span-3 lg:col-span-2 flex items-center justify-start md:justify-end">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#17201A] select-none">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-[#166534] border-[#E2E8E3] focus:ring-[#166534]"
                />
                <span>Open Now Only</span>
              </label>
            </div>
          </div>

          {/* Category Pills Bar */}
          <div className="pt-2 border-t border-[#E2E8E3] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-medium text-[#647067] shrink-0 mr-1">Category:</span>
            {categories.map((cat) => {
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
              <h3 className="text-lg font-bold text-[#17201A]">No stores found</h3>
              <p className="text-xs text-[#647067] mt-1">
                No local stores matched your current search and filter criteria within this delivery radius.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Clear All Filters
            </Button>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
