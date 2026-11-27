import React, { Suspense } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { getAdminCatalogPageServerData } from '@/lib/admin/catalog/server';
import AdminCatalogClient from './AdminCatalogClient';

function AdminCatalogLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#17201A] flex flex-col">
      <AdminHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-80" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 bg-white border border-[#E2E8E3] rounded-2xl"
            />
          ))}
        </div>
        <div className="h-64 bg-white border border-[#E2E8E3] rounded-2xl" />
      </main>
    </div>
  );
}

async function AdminCatalogPageContent() {
  const snapshot = await getAdminCatalogPageServerData();
  return <AdminCatalogClient initialSnapshot={snapshot} />;
}

export default function AdminCatalogPage() {
  return (
    <Suspense fallback={<AdminCatalogLoadingFallback />}>
      <AdminCatalogPageContent />
    </Suspense>
  );
}
