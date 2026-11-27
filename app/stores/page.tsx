import React, { Suspense } from 'react';
import { getCustomerMarketplaceData } from '@/lib/marketplace/server';
import StoresDiscoveryClient from './StoresDiscoveryClient';

function StoresLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-1/3" />
        <div className="h-24 bg-white border border-[#E2E8E3] rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-56 bg-white border border-[#E2E8E3] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function StoresDiscoveryContent() {
  const { stores, categories } = await getCustomerMarketplaceData();
  return <StoresDiscoveryClient stores={stores} categories={categories} />;
}

export default function StoresPage() {
  return (
    <Suspense fallback={<StoresLoadingFallback />}>
      <StoresDiscoveryContent />
    </Suspense>
  );
}
