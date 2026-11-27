import React, { Suspense } from 'react';
import { getCustomerMarketplaceData } from '@/lib/marketplace/server';
import ProductsDiscoveryClient from './ProductsDiscoveryClient';

function ProductsLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
        <div className="h-20 bg-white rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function ProductsDiscoveryContent() {
  const { products, categories, stores } = await getCustomerMarketplaceData();
  return (
    <ProductsDiscoveryClient
      products={products}
      categories={categories}
      stores={stores}
    />
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoadingFallback />}>
      <ProductsDiscoveryContent />
    </Suspense>
  );
}
