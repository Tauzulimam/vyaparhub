import React from 'react';
import { CustomerNavigationGuard } from '@/components/auth/RouteGuards';

export default function OrdersTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerNavigationGuard>{children}</CustomerNavigationGuard>;
}
