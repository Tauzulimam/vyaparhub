'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/vendor/Icon';

const ADMIN_NAV_LINKS: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/admin/vendors', label: 'Vendors', icon: 'users' },
  { href: '/admin/stores', label: 'Stores', icon: 'store' },
  { href: '/admin/catalog', label: 'Master Catalog', icon: 'catalog' },
  { href: '/admin/categories', label: 'Categories', icon: 'tag' },
  { href: '/admin/orders', label: 'Orders', icon: 'orders' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: 'plan' },
];

export const AdminHeader: React.FC = () => {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8E3] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 xl:gap-5 min-w-0">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded-xl"
            >
              <div className="w-9 h-9 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                V
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-lg font-black tracking-tight text-[#17201A]">
                  Vyapar<span className="text-[#166534]">Hub</span>
                </span>
                <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider mt-0.5">
                  Admin Console
                </span>
              </div>
            </Link>

            {/* Primary Admin Section Tabs (Desktop) */}
            <nav
              aria-label="Admin Console sections"
              className="hidden lg:flex items-center gap-1 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-1 overflow-x-auto"
            >
              {ADMIN_NAV_LINKS.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#166534] text-white shadow-xs'
                        : 'text-[#17201A] hover:text-[#166534] hover:bg-white'
                    }`}
                  >
                    <Icon name={item.icon} className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <nav
            aria-label="Cross-portal navigation"
            className="flex items-center gap-2 text-xs sm:text-sm shrink-0"
          >
            <Link
              href="/vendor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8E3] bg-[#F8FAF7] font-semibold text-[#17201A] hover:border-[#166534] hover:text-[#166534] transition-colors"
            >
              <Icon name="store" className="w-4 h-4 text-[#B45309]" />
              <span>Vendor Portal</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8E3] bg-white font-semibold text-[#647067] hover:border-[#166534] hover:text-[#17201A] transition-colors"
            >
              <Icon name="home" className="w-4 h-4 text-[#166534]" />
              <span className="hidden sm:inline">Customer Marketplace</span>
              <span className="sm:hidden">Storefront</span>
            </Link>
          </nav>
        </div>

        {/* Tablet & Mobile Admin Section Tabs */}
        <nav
          aria-label="Mobile Admin Console sections"
          className="lg:hidden flex items-center gap-1.5 pb-2.5 overflow-x-auto"
        >
          {ADMIN_NAV_LINKS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'bg-[#F8FAF7] border border-[#E2E8E3] text-[#17201A] hover:border-[#166534]'
                }`}
              >
                <Icon name={item.icon} className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
