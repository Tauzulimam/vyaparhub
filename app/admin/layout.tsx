import React from 'react';
import { AdminPortalGuard } from '@/components/auth/RouteGuards';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminPortalGuard>{children}</AdminPortalGuard>;
}
