import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCustomerStoreDetail } from '@/lib/marketplace/server';
import StoreDetailClient from './StoreDetailClient';

interface StoreDetailPageProps {
  params: Promise<{ id: string }>;
}

function StoreDetailLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-52 bg-white border border-[#E2E8E3] rounded-3xl" />
        <div className="h-20 bg-white border border-[#E2E8E3] rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-64 bg-white border border-[#E2E8E3] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function StoreDetailLoader({ params }: StoreDetailPageProps) {
  const { id } = await params;
  const detail = await getCustomerStoreDetail(id);

  if (!detail) {
    notFound();
  }

  return <StoreDetailClient store={detail.store} products={detail.products} />;
}

export default function StoreDetailPage({ params }: StoreDetailPageProps) {
  return (
    <Suspense fallback={<StoreDetailLoadingFallback />}>
      <StoreDetailLoader params={params} />
    </Suspense>
  );
}
