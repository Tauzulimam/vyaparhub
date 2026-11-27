import React, { Suspense } from 'react';
import { getCustomerProfilePageServerData } from '@/lib/cart/server';
import ProfilePageClient from './ProfilePageClient';

function ProfileLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <div className="h-16 bg-white border-b border-[#E2E8E3]" />
      <div className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-36 bg-white border border-[#E2E8E3] rounded-3xl" />
        <div className="h-10 bg-gray-200 rounded-xl w-64" />
        <div className="h-56 bg-white border border-[#E2E8E3] rounded-2xl" />
      </div>
    </div>
  );
}

async function ProfilePageContent() {
  const { profile, addresses } = await getCustomerProfilePageServerData();
  return <ProfilePageClient initialProfile={profile} initialAddresses={addresses} />;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <ProfilePageContent />
    </Suspense>
  );
}
