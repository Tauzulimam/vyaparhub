import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCustomerStoreProductDetail } from '@/lib/marketplace/server';
import ProductDetailClient from './ProductDetailClient';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

function ProductDetailLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-96 bg-white border border-[#E2E8E3] rounded-3xl" />
      </div>
    </div>
  );
}

async function ProductDetailLoader({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const detail = await getCustomerStoreProductDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <ProductDetailClient
      product={detail.product}
      store={detail.store}
      otherStoreOffers={detail.otherStoreOffers}
    />
  );
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  return (
    <Suspense fallback={<ProductDetailLoadingFallback />}>
      <ProductDetailLoader params={params} />
    </Suspense>
  );
}
