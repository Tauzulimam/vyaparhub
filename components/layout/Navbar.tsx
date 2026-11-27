'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { SearchBar } from '@/components/ui/SearchBar';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

interface NavbarProps {
  cartItemCount?: number;
  currentLocation?: string;
  onSearch?: (query: string) => void;
  onCartClick?: () => void;
  onLocationClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartItemCount,
  currentLocation,
  onSearch,
  onCartClick,
  onLocationClick,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount: sharedCartCount, deliveryLocationLabel } = useCustomerCart();
  const effectiveCartCount = cartItemCount !== undefined ? cartItemCount : sharedCartCount;
  const effectiveLocation = currentLocation ?? deliveryLocationLabel;
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleSearchSubmit = (query: string) => {
    if (onSearch) {
      onSearch(query);
    } else if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-[#E2E8E3] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Brand Logo & Hyperlocal Location */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded-lg"
              aria-label="VyaparHub Homepage"
            >
              <div className="w-9 h-9 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-[#14532D] transition-colors">
                V
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-[#17201A] group-hover:text-[#166534] transition-colors leading-none">
                  Vyapar<span className="text-[#166534]">Hub</span>
                </span>
                <span className="text-[10px] font-medium text-[#647067] tracking-wider uppercase">
                  Hyperlocal
                </span>
              </div>
            </Link>

            {/* Hyperlocal Delivery Location Selector */}
            <button
              type="button"
              onClick={onLocationClick}
              aria-label={`Change delivery location, currently ${effectiveLocation}`}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] text-left hover:border-[#166534] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
            >
              <svg
                className="w-4 h-4 text-[#166534] shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold text-[#166534] uppercase tracking-wider">
                  Delivering to
                </span>
                <span className="text-xs font-semibold text-[#17201A] truncate max-w-[150px]">
                  {effectiveLocation}
                </span>
              </div>
              <svg
                className="w-3.5 h-3.5 text-[#647067] ml-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-2">
            <SearchBar onSearch={handleSearchSubmit} />
          </div>

          {/* Right Navigation & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="md:hidden p-2 rounded-lg text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
              aria-label="Toggle mobile search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Stores Link */}
            <Link
              href="/stores"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] ${
                pathname.startsWith('/stores')
                  ? 'text-[#166534] bg-[#166534]/10 font-semibold'
                  : 'text-[#17201A] hover:text-[#166534] hover:bg-[#F8FAF7]'
              }`}
            >
              <svg
                className="w-4 h-4 text-[#166534]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>Stores</span>
            </Link>

            {/* Products Link */}
            <Link
              href="/products"
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] ${
                pathname.startsWith('/products')
                  ? 'text-[#166534] bg-[#166534]/10 font-semibold'
                  : 'text-[#17201A] hover:text-[#166534] hover:bg-[#F8FAF7]'
              }`}
            >
              <svg
                className="w-4 h-4 text-[#166534]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              <span>Products</span>
            </Link>

            {/* Orders Link */}
            <Link
              href="/orders"
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] ${
                pathname.startsWith('/orders')
                  ? 'text-[#166534] bg-[#166534]/10 font-semibold'
                  : 'text-[#17201A] hover:text-[#166534] hover:bg-[#F8FAF7]'
              }`}
            >
              <svg
                className="w-4 h-4 text-[#166534]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Orders</span>
            </Link>

            {/* Cart Button */}
            <Link
              href="/cart"
              aria-label={`Shopping cart with ${effectiveCartCount} items`}
              onClick={onCartClick ? (e) => { e.preventDefault(); onCartClick(); } : undefined}
              className={`relative inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] ${
                pathname === '/cart' || pathname === '/checkout'
                  ? 'border-[#166534] bg-[#166534]/10 text-[#166534] font-semibold'
                  : 'border-[#E2E8E3] bg-white text-[#17201A] hover:bg-[#F8FAF7] hover:border-[#166534] hover:text-[#166534]'
              }`}
            >
              <svg
                className="w-5 h-5 text-[#166534]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {effectiveCartCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-[#166534] text-white">
                  {effectiveCartCount}
                </span>
              )}
            </Link>

            {/* Profile Link */}
            <Link
              href="/profile"
              aria-label="My Profile"
              className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] ${
                pathname === '/profile'
                  ? 'text-[#166534] bg-[#166534]/10'
                  : 'text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Mobile Search Dropdown / Bar */}
        {isMobileSearchOpen && (
          <div className="pb-3 md:hidden">
            <SearchBar onSearch={handleSearchSubmit} autoFocus />
          </div>
        )}
      </div>
    </header>
  );
};
