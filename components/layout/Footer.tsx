import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-[#E2E8E3] pt-12 pb-16 md:pb-12 text-[#17201A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#E2E8E3]">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#166534] text-white flex items-center justify-center font-bold text-base shadow-xs">
                V
              </div>
              <span className="text-xl font-black tracking-tight text-[#17201A]">
                Vyapar<span className="text-[#166534]">Hub</span>
              </span>
            </div>
            <p className="text-xs text-[#647067] leading-relaxed">
              A hyperlocal multi-vendor marketplace connecting neighborhood customers with verified nearby local stores.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#166534]/10 text-[#166534]">
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse" />
              Service Radius: ~5 km
            </div>
          </div>

          {/* Customers */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#17201A] uppercase tracking-wider">
              For Customers
            </h4>
            <ul className="space-y-2 text-xs text-[#647067]">
              <li>
                <Link href="/stores" className="hover:text-[#166534] transition-colors">
                  Nearby Local Stores
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-[#166534] transition-colors">
                  Browse Product Categories
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-[#166534] transition-colors">
                  My Orders &amp; Tracking
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-[#166534] transition-colors">
                  My Cart &amp; Checkout
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-[#166534] transition-colors">
                  Customer Profile &amp; Addresses
                </Link>
              </li>
            </ul>
          </div>

          {/* Vendors */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#17201A] uppercase tracking-wider">
              For Vendors
            </h4>
            <ul className="space-y-2 text-xs text-[#647067]">
              <li>
                <Link href="#vendor" className="hover:text-[#166534] transition-colors">
                  Register Your Store
                </Link>
              </li>
              <li>
                <Link href="#vendor" className="hover:text-[#166534] transition-colors">
                  Master Product Catalog
                </Link>
              </li>
              <li>
                <Link href="#vendor" className="hover:text-[#166534] transition-colors">
                  Stock & Price Management
                </Link>
              </li>
              <li>
                <Link href="#vendor" className="hover:text-[#166534] transition-colors">
                  Store Subscriptions
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform / Project */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#17201A] uppercase tracking-wider">
              VyaparHub Project
            </h4>
            <ul className="space-y-2 text-xs text-[#647067]">
              <li>
                <span className="text-[#17201A] font-medium">Final Year Engineering Project</span>
              </li>
              <li>
                <span>Architecture: Next.js App Router</span>
              </li>
              <li>
                <span>Multi-Vendor Hyperlocal Design</span>
              </li>
              <li>
                <span className="inline-flex items-center text-[11px] font-semibold text-[#166534]">
                  Phase 2C — Customer Transaction UI
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#647067]">
          <p>© 2026 VyaparHub. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Empowering Local Kirana Stores</span>
            <span>•</span>
            <span>Fast Hyperlocal Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
