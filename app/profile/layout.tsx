import React from 'react';
import { CustomerPortalGuard } from '@/components/auth/RouteGuards';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerPortalGuard fallbackLoginPath="/login?next=%2Fprofile">
      {children}
    </CustomerPortalGuard>
  );
}
