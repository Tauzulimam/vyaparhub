import { VendorShell } from '@/components/vendor/VendorShell';
import { VendorPortalGuard } from '@/components/auth/RouteGuards';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <VendorPortalGuard>
      <VendorShell>{children}</VendorShell>
    </VendorPortalGuard>
  );
}
