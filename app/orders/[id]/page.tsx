import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCustomerOrderDetailPageServerData } from '@/lib/cart/server';
import OrderDetailPageClient from './OrderDetailPageClient';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

function OrderDetailLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
        <div className="h-28 bg-white rounded-2xl" />
        <div className="h-64 bg-white rounded-2xl" />
      </div>
    </div>
  );
}

async function OrderDetailContent({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const { order, deliveryLocationLabel } = await getCustomerOrderDetailPageServerData(id);

  if (!order) {
    notFound();
  }

  return (
    <OrderDetailPageClient
      order={order}
      initialLocationLabel={deliveryLocationLabel}
    />
  );
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <Suspense fallback={<OrderDetailLoadingFallback />}>
      <OrderDetailContent params={params} />
    </Suspense>
  );
}
