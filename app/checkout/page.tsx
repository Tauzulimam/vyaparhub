import React, { Suspense } from 'react';
import { getCheckoutPageServerData } from '@/lib/cart/server';
import CheckoutPageClient from './CheckoutPageClient';

function CheckoutLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 bg-white border border-[#E2E8E3] rounded-2xl" />
            <div className="h-32 bg-white border border-[#E2E8E3] rounded-2xl" />
          </div>
          <div className="h-64 bg-white border border-[#E2E8E3] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

async function CheckoutPageContent() {
  const { customer, cart, addresses } = await getCheckoutPageServerData();

  return (
    <CheckoutPageClient
      customer={customer}
      initialCart={cart}
      initialAddresses={addresses}
    />
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoadingFallback />}>
      <CheckoutPageContent />
    </Suspense>
  );
}
