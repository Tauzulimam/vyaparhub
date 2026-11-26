import React from 'react';
import { connection } from 'next/server';
import { VendorShell } from '@/components/vendor/VendorShell';
import { VendorPortalGuard } from '@/components/auth/RouteGuards';
import { VendorProvider } from '@/components/vendor/VendorProvider';
import { getAuthenticatedVendorData } from '@/lib/vendor/server';

async function AuthenticatedVendorLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const vendorData = await getAuthenticatedVendorData();

  return (
    <VendorProvider
      vendorProfile={vendorData.vendorProfile}
      initialStores={vendorData.stores}
      initialActiveStoreId={vendorData.activeStoreId}
      categories={vendorData.categories}
    >
      <VendorShell>{children}</VendorShell>
    </VendorProvider>
  );
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <VendorPortalGuard>
      <AuthenticatedVendorLayoutContent>{children}</AuthenticatedVendorLayoutContent>
    </VendorPortalGuard>
  );
}
