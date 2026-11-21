'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { ProductCard } from '@/components/product/ProductCard';
import { StoreCard } from '@/components/store/StoreCard';
import { mockCategories, mockProducts, mockStores } from '@/data/mockData';
import { Category, Product, Store } from '@/types';

export default function Home() {
  const [cartCount, setCartCount] = useState<number>(2);
  const [activeMobileTab, setActiveMobileTab] = useState<string>('home');
  const [lastActionMessage, setLastActionMessage] = useState<string>(
    'Tip: Click buttons or cards to test interactive states.'
  );
  const [searchOutput, setSearchOutput] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handleAddToCart = (product: Product) => {
    setCartCount((prev) => prev + 1);
    setLastActionMessage(`Added 1x "${product.name}" from ${product.storeName} to cart.`);
  };

  const handleStoreClick = (store: Store) => {
    setLastActionMessage(
      `Selected store: "${store.name}" (${store.distanceKm} km away, ${store.deliveryTimeMin}).`
    );
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category.name);
    setLastActionMessage(`Browsing category: "${category.name}" (${category.itemCount} items).`);
  };

  const handleSearch = (query: string) => {
    setSearchOutput(query);
    setLastActionMessage(
      query ? `Search query submitted: "${query}"` : 'Search query cleared.'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      {/* 1. Header / Navbar */}
      <Navbar
        cartItemCount={cartCount}
        currentLocation="Sector 14, Main Market (0.4 km)"
        onSearch={handleSearch}
        onCartClick={() =>
          setLastActionMessage(`Cart clicked! Total items in cart: ${cartCount}`)
        }
        onLocationClick={() =>
          setLastActionMessage(
            'Location selector clicked (Hyperlocal radius configured to ~5 km).'
          )
        }
      />

      {/* Main Showcase Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 pb-24 md:pb-12">
        {/* Showcase Header Banner */}
        <section aria-labelledby="showcase-heading" className="bg-white border border-[#E2E8E3] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8E3] pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534] mb-2">
                <span className="w-2 h-2 rounded-full bg-[#166534]" />
                Phase 2A — Shared UI Foundation
              </div>
              <h1 id="showcase-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17201A]">
                VyaparHub Component Showcase
              </h1>
              <p className="text-sm text-[#647067] mt-1 max-w-2xl">
                Visual verification of shared, reusable typed components built with Next.js,
                TypeScript, and Tailwind CSS. (This is a component verification page, not the
                final customer marketplace homepage).
              </p>
            </div>

            {/* Interactive Feedback Pill */}
            <div className="p-3 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-xs max-w-sm">
              <span className="font-semibold text-[#166534] block mb-0.5">Live Component Action:</span>
              <p className="text-[#17201A] truncate">{lastActionMessage}</p>
            </div>
          </div>

          {/* Design System Swatches */}
          <div className="pt-6">
            <h2 className="text-xs font-bold text-[#647067] uppercase tracking-wider mb-3">
              Phase 2 Design System Palette
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-center text-[10px]">
              <div className="p-2 rounded-lg bg-[#166534] text-white font-medium">Primary<br/>#166534</div>
              <div className="p-2 rounded-lg bg-[#14532D] text-white font-medium">Primary Dark<br/>#14532D</div>
              <div className="p-2 rounded-lg bg-[#F59E0B] text-black font-medium">Accent<br/>#F59E0B</div>
              <div className="p-2 rounded-lg bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A] font-medium">Background<br/>#F8FAF7</div>
              <div className="p-2 rounded-lg bg-white border border-[#E2E8E3] text-[#17201A] font-medium">Surface<br/>#FFFFFF</div>
              <div className="p-2 rounded-lg bg-[#17201A] text-white font-medium">Main Text<br/>#17201A</div>
              <div className="p-2 rounded-lg bg-[#647067] text-white font-medium">Sec Text<br/>#647067</div>
              <div className="p-2 rounded-lg bg-[#E2E8E3] text-[#17201A] font-medium">Border<br/>#E2E8E3</div>
              <div className="p-2 rounded-lg bg-[#16A34A] text-white font-medium">Success<br/>#16A34A</div>
              <div className="p-2 rounded-lg bg-[#DC2626] text-white font-medium">Error<br/>#DC2626</div>
            </div>
          </div>
        </section>

        {/* 2. Button Showcase */}
        <section aria-labelledby="buttons-heading" className="bg-white border border-[#E2E8E3] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h2 id="buttons-heading" className="text-lg font-bold text-[#17201A]">
              1. Button Component (<code className="text-xs font-mono text-[#166534]">components/ui/Button</code>)
            </h2>
            <p className="text-xs text-[#647067]">
              Fully accessible, typed button with variants, sizes, icon slots, disabled, and loading states.
            </p>
          </div>

          <div className="space-y-6">
            {/* Variants */}
            <div>
              <h3 className="text-xs font-semibold text-[#647067] uppercase tracking-wider mb-3">Variants</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={() => setLastActionMessage('Primary button clicked')}>
                  Primary Button
                </Button>
                <Button variant="secondary" onClick={() => setLastActionMessage('Secondary button clicked')}>
                  Secondary
                </Button>
                <Button variant="outline" onClick={() => setLastActionMessage('Outline button clicked')}>
                  Outline
                </Button>
                <Button variant="ghost" onClick={() => setLastActionMessage('Ghost button clicked')}>
                  Ghost
                </Button>
                <Button variant="danger" onClick={() => setLastActionMessage('Danger button clicked')}>
                  Danger
                </Button>
              </div>
            </div>

            {/* Sizes & States */}
            <div>
              <h3 className="text-xs font-semibold text-[#647067] uppercase tracking-wider mb-3">Sizes & States</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small (sm)</Button>
                <Button size="md">Medium (md)</Button>
                <Button size="lg">Large (lg)</Button>
                <Button disabled>Disabled</Button>
                <Button isLoading>Loading</Button>
                <Button
                  variant="outline"
                  leftIcon={
                    <svg className="w-4 h-4 text-[#166534]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  With Icon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Search Bar Showcase */}
        <section aria-labelledby="search-heading" className="bg-white border border-[#E2E8E3] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="mb-4">
            <h2 id="search-heading" className="text-lg font-bold text-[#17201A]">
              2. Search Bar (<code className="text-xs font-mono text-[#166534]">components/ui/SearchBar</code>)
            </h2>
            <p className="text-xs text-[#647067]">
              Accessible search input with search icon, clear button, and submit handler.
            </p>
          </div>

          <div className="max-w-xl">
            <SearchBar onSearch={handleSearch} />
            {searchOutput && (
              <p className="mt-2 text-xs text-[#166534] font-medium">
                Active search term: &quot;{searchOutput}&quot;
              </p>
            )}
          </div>
        </section>

        {/* 4. Category Cards Showcase */}
        <section id="categories" aria-labelledby="categories-heading" className="bg-white border border-[#E2E8E3] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="categories-heading" className="text-lg font-bold text-[#17201A]">
                3. Category Card (<code className="text-xs font-mono text-[#166534]">components/ui/CategoryCard</code>)
              </h2>
              <p className="text-xs text-[#647067]">
                Touch-friendly category selector displaying catalog category name and product counts.
              </p>
            </div>
            {selectedCategory && (
              <span className="text-xs font-semibold text-[#166534] px-2.5 py-1 rounded-full bg-[#166534]/10">
                Selected: {selectedCategory}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {mockCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onClick={handleCategoryClick}
              />
            ))}
          </div>
        </section>

        {/* 5. Store Cards Showcase */}
        <section id="stores" aria-labelledby="stores-heading" className="bg-white border border-[#E2E8E3] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 id="stores-heading" className="text-lg font-bold text-[#17201A]">
                  4. Local Store Card (<code className="text-xs font-mono text-[#166534]">components/store/StoreCard</code>)
                </h2>
                <p className="text-xs text-[#647067]">
                  Hyperlocal store display highlighting distance (km), ETA, rating, and real-time open status.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#647067] self-start sm:self-auto">
                Showing {mockStores.length} nearby stores
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {mockStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onClick={handleStoreClick}
              />
            ))}
          </div>
        </section>

        {/* 6. Product Cards Showcase */}
        <section aria-labelledby="products-heading" className="bg-white border border-[#E2E8E3] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 id="products-heading" className="text-lg font-bold text-[#17201A]">
                5. Product Card (<code className="text-xs font-mono text-[#166534]">components/product/ProductCard</code>)
              </h2>
              <p className="text-xs text-[#647067]">
                Hyperlocal item card linking MasterProduct information with store-specific price, discount, and stock.
              </p>
            </div>
            <div className="text-xs text-[#647067] self-start sm:self-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span>Cart Count: <strong className="text-[#17201A]">{cartCount} items</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {mockProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <Footer />

      {/* 8. Mobile Bottom Navigation (Fixed on mobile viewports) */}
      <MobileNav
        cartItemCount={cartCount}
        activeTab={activeMobileTab}
        onTabChange={(tab) => {
          setActiveMobileTab(tab);
          setLastActionMessage(`Mobile nav switched to "${tab}" tab.`);
        }}
      />
    </div>
  );
}
