'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/vendor/Icon';
import { StoreSwitcher } from '@/components/vendor/StoreSwitcher';
import { useVendorState } from '@/lib/vendorStore';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/vendor', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/vendor/orders', label: 'Orders', icon: 'orders' },
  { href: '/vendor/inventory', label: 'Inventory', icon: 'inventory' },
  { href: '/vendor/catalog', label: 'Master Catalog', icon: 'catalog' },
  { href: '/vendor/store', label: 'My Store', icon: 'store' },
  { href: '/vendor/subscription', label: 'Subscription', icon: 'plan' },
];

// The 5 most used items fit in the mobile bottom bar; the rest live in the menu.
const MOBILE_BAR = NAV_ITEMS.slice(0, 5);

const Brand: React.FC = () => (
  <Link href="/vendor" className="flex items-center gap-2" aria-label="VyaparHub Vendor Dashboard">
    <div className="w-9 h-9 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-lg shadow-xs">
      V
    </div>
    <div className="flex flex-col leading-none">
      <span className="text-lg font-black tracking-tight text-[#17201A]">
        Vyapar<span className="text-[#166534]">Hub</span>
      </span>
      <span className="text-[10px] font-semibold text-[#B45309] tracking-wider uppercase mt-0.5">Vendor Portal</span>
    </div>
  </Link>
);

export const VendorShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { store, orders } = useVendorState();
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const renderLink = (item: NavItem, onClick?: () => void) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClick}
      aria-current={isActive(item) ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] ${
        isActive(item)
          ? 'bg-[#166534] text-white shadow-xs'
          : 'text-[#17201A] hover:bg-[#166534]/10 hover:text-[#166534]'
      }`}
    >
      <Icon name={item.icon} className="w-5 h-5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.href === '/vendor/orders' && pendingCount > 0 && (
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#B45309] text-white text-[11px] font-bold flex items-center justify-center">
          {pendingCount}
        </span>
      )}
    </Link>
  );

  const storeStatus = (
    <div className="flex items-center gap-1.5 text-xs font-semibold">
      <span className={`w-2 h-2 rounded-full ${store.isOpen ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
      <span className={store.isOpen ? 'text-[#166534]' : 'text-[#DC2626]'}>{store.isOpen ? 'Store Open' : 'Store Closed'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-[#E2E8E3] p-4 overflow-y-auto">
        <Brand />
        <div className="mt-5">
          <StoreSwitcher />
        </div>
        <nav aria-label="Vendor navigation" className="mt-5 flex-1 space-y-1">
          {NAV_ITEMS.map((item) => renderLink(item))}
        </nav>
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#647067] hover:bg-[#F8FAF7] hover:text-[#17201A]"
        >
          <Icon name="back" className="w-5 h-5" />
          Customer site
        </Link>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-[#E2E8E3] px-4 h-14 flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-3">
            {storeStatus}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open vendor menu"
              className="p-2 rounded-lg text-[#647067] hover:bg-[#F8FAF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
            >
              <Icon name="menu" />
            </button>
          </div>
        </header>

        <main key={store.id} className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">{children}</main>
      </div>

      {/* Mobile slide-over menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Vendor menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 max-w-[85%] bg-white p-4 shadow-xl flex flex-col">
            <div className="flex items-center justify-between">
              <span className="font-bold">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg hover:bg-[#F8FAF7]"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="mt-4">
              <StoreSwitcher onNavigate={() => setMenuOpen(false)} />
            </div>
            <nav aria-label="Vendor menu" className="mt-4 space-y-1 flex-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => renderLink(item, () => setMenuOpen(false)))}
            </nav>
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#647067] hover:bg-[#F8FAF7]"
            >
              <Icon name="back" />
              Customer site
            </Link>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav
        aria-label="Vendor bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E2E8E3] py-1.5 px-1 shadow-lg"
      >
        <div className="flex items-center justify-around">
          {MOBILE_BAR.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? 'page' : undefined}
              className={`relative flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium ${
                isActive(item) ? 'text-[#166534]' : 'text-[#647067]'
              }`}
            >
              <Icon name={item.icon} />
              <span className="mt-0.5">{item.label === 'Master Catalog' ? 'Catalog' : item.label}</span>
              {item.href === '/vendor/orders' && pendingCount > 0 && (
                <span className="absolute -top-0.5 right-0 min-w-4 h-4 px-1 rounded-full bg-[#B45309] text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};
