import React from 'react';
import { VendorNavigationGuard } from '@/components/auth/RouteGuards';

export default function VendorTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VendorNavigationGuard>{children}</VendorNavigationGuard>;
}
