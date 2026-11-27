import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';

export default function StoreNotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar />
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-white border border-[#E2E8E3] text-[#DC2626] flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
          !
        </div>
        <h1 className="text-2xl font-bold text-[#17201A]">Store Not Available</h1>
        <p className="text-sm text-[#647067]">
          This store could not be found or is currently closed and unavailable in the marketplace.
        </p>
        <div className="pt-2">
          <Link href="/stores">
            <Button variant="primary" size="md">
              Browse Open Nearby Stores
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
