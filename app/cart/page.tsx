import React, { Suspense } from 'react';
import { getCartPageServerData } from '@/lib/cart/server';
import CartPageClient from './CartPageClient';

function CartLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="h-24 bg-white border border-[#E2E8E3] rounded-2xl" />
            <div className="h-28 bg-white border border-[#E2E8E3] rounded-2xl" />
          </div>
          <div className="h-64 bg-white border border-[#E2E8E3] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

async function CartPageContent() {
  const data = await getCartPageServerData();
  return (
    <CartPageClient
      initialAuthStatus={data.authStatus}
      nonCustomerRole={data.nonCustomerRole}
      initialCart={data.cart}
      initialLocationLabel={data.deliveryLocationLabel}
    />
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoadingFallback />}>
      <CartPageContent />
    </Suspense>
  );
}
