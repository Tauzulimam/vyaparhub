import React from 'react';
import { CustomerPortalGuard } from '@/components/auth/RouteGuards';

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerPortalGuard fallbackLoginPath="/login?next=%2Fcheckout">
      {children}
    </CustomerPortalGuard>
  );
}
