import React from 'react';
import { RegistrationPageGuard } from '@/components/auth/RouteGuards';

export default function VendorRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RegistrationPageGuard>{children}</RegistrationPageGuard>;
}
