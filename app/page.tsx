import React, { Suspense } from 'react';
import { getCustomerMarketplaceData } from '@/lib/marketplace/server';
import HomeMarketplaceClient from './HomeMarketplaceClient';

function HomeLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-pulse">
        <div className="h-64 bg-white border border-[#E2E8E3] rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-white border border-[#E2E8E3] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-56 bg-white border border-[#E2E8E3] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function HomeMarketplaceContent() {
  const { categories, stores, products, deliveryLocationLabel } =
    await getCustomerMarketplaceData();
  return (
    <HomeMarketplaceClient
      categories={categories}
      stores={stores}
      products={products}
      initialLocationLabel={deliveryLocationLabel}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoadingFallback />}>
      <HomeMarketplaceContent />
    </Suspense>
  );
}
