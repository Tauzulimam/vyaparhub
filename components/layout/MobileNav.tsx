'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

interface MobileNavProps {
  cartItemCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ cartItemCount }) => {
  const pathname = usePathname();
  const { cartCount: sharedCartCount } = useCustomerCart();
  const effectiveCartCount = cartItemCount !== undefined ? cartItemCount : sharedCartCount;

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      isActive: pathname === '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'stores',
      label: 'Stores',
      href: '/stores',
      isActive: pathname.startsWith('/stores'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'cart',
      label: 'Cart',
      href: '/cart',
      isActive: pathname === '/cart',
      badge: effectiveCartCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: 'Orders',
      href: '/orders',
      isActive: pathname.startsWith('/orders'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      isActive: pathname === '/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E2E8E3] py-1.5 px-1 md:hidden shadow-lg"
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`relative flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
              item.isActive ? 'text-[#166534]' : 'text-[#647067] hover:text-[#17201A]'
            }`}
          >
            <div className="relative">
              {item.icon}
              {Boolean(item.badge && item.badge > 0) && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-[#166534] text-white flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
