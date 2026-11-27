import React, { Suspense } from 'react';
import { getCustomerOrdersPageServerData } from '@/lib/cart/server';
import OrdersPageClient from './OrdersPageClient';

function OrdersLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-40" />
        <div className="h-52 bg-white border border-[#E2E8E3] rounded-3xl" />
      </div>
    </div>
  );
}

async function OrdersPageContent() {
  const { orders, deliveryLocationLabel } = await getCustomerOrdersPageServerData();
  return (
    <OrdersPageClient
      initialOrders={orders}
      initialLocationLabel={deliveryLocationLabel}
    />
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoadingFallback />}>
      <OrdersPageContent />
    </Suspense>
  );
}
