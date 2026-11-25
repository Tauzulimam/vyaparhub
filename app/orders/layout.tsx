import React from 'react';
import { CustomerPortalGuard } from '@/components/auth/RouteGuards';

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerPortalGuard fallbackLoginPath="/login?next=%2Forders">
      {children}
    </CustomerPortalGuard>
  );
}
