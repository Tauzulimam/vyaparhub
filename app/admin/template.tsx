import React from 'react';
import { AdminNavigationGuard } from '@/components/auth/RouteGuards';

export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminNavigationGuard>{children}</AdminNavigationGuard>;
}
