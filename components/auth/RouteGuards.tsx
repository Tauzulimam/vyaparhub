import React, { Suspense } from 'react';
import { UserRole } from '@/generated/prisma/enums';
import {
  guardCustomerSubtree,
  guardVendorSubtree,
  redirectAuthenticatedFromLogin,
  redirectAuthenticatedFromRegistration,
  requirePortalAccess,
} from '@/lib/auth/guards';

/**
 * Neutral static-shell fallback rendered while dynamic request-time session & Prisma
 * authorization checks execute inside `<Suspense>` (required by Next.js Cache Components).
 * Contains zero protected portal markup.
 */
export function PortalAuthFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen flex items-center justify-center bg-[#F8FAF7] text-[#647067]"
    >
      <div className="flex items-center gap-2.5 text-xs font-semibold">
        <span className="w-4 h-4 rounded-full border-2 border-[#166534] border-t-transparent animate-spin" />
        <span>Verifying access...</span>
      </div>
    </div>
  );
}

function SectionAuthFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[240px] flex items-center justify-center text-[#647067]"
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-[#166534] border-t-transparent animate-spin" />
        <span>Verifying access...</span>
      </div>
    </div>
  );
}

async function AdminAccessBoundary({ children }: { children: React.ReactNode }) {
  await requirePortalAccess([UserRole.ADMIN], '/login?next=%2Fadmin');
  return <>{children}</>;
}

export function AdminPortalGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PortalAuthFallback />}>
      <AdminAccessBoundary>{children}</AdminAccessBoundary>
    </Suspense>
  );
}

export function AdminNavigationGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SectionAuthFallback />}>
      <AdminAccessBoundary>{children}</AdminAccessBoundary>
    </Suspense>
  );
}

async function VendorAccessBoundary({ children }: { children: React.ReactNode }) {
  await guardVendorSubtree();
  return <>{children}</>;
}

export function VendorPortalGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PortalAuthFallback />}>
      <VendorAccessBoundary>{children}</VendorAccessBoundary>
    </Suspense>
  );
}

export function VendorNavigationGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SectionAuthFallback />}>
      <VendorAccessBoundary>{children}</VendorAccessBoundary>
    </Suspense>
  );
}

async function CustomerAccessBoundary({
  children,
  fallbackLoginPath,
}: {
  children: React.ReactNode;
  fallbackLoginPath: string;
}) {
  await guardCustomerSubtree(fallbackLoginPath);
  return <>{children}</>;
}

export function CustomerPortalGuard({
  children,
  fallbackLoginPath = '/login',
}: {
  children: React.ReactNode;
  fallbackLoginPath?: string;
}) {
  return (
    <Suspense fallback={<PortalAuthFallback />}>
      <CustomerAccessBoundary fallbackLoginPath={fallbackLoginPath}>
        {children}
      </CustomerAccessBoundary>
    </Suspense>
  );
}

export function CustomerNavigationGuard({
  children,
  fallbackLoginPath = '/login?next=%2Forders',
}: {
  children: React.ReactNode;
  fallbackLoginPath?: string;
}) {
  return (
    <Suspense fallback={<SectionAuthFallback />}>
      <CustomerAccessBoundary fallbackLoginPath={fallbackLoginPath}>
        {children}
      </CustomerAccessBoundary>
    </Suspense>
  );
}

async function LoginGuestBoundary({ children }: { children: React.ReactNode }) {
  await redirectAuthenticatedFromLogin();
  return <>{children}</>;
}

export function LoginPageGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PortalAuthFallback />}>
      <LoginGuestBoundary>{children}</LoginGuestBoundary>
    </Suspense>
  );
}

async function RegistrationGuestBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectAuthenticatedFromRegistration();
  return <>{children}</>;
}

export function RegistrationPageGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PortalAuthFallback />}>
      <RegistrationGuestBoundary>{children}</RegistrationGuestBoundary>
    </Suspense>
  );
}
