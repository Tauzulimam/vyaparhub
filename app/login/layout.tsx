import React from 'react';
import { LoginPageGuard } from '@/components/auth/RouteGuards';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoginPageGuard>{children}</LoginPageGuard>;
}
