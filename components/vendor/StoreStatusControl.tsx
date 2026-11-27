'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/vendor/ui';
import { useVendorState } from '@/lib/vendorStore';

/** Prominent Open/Closed control — shown on the dashboard only. */
export const StoreStatusControl: React.FC = () => {
  const { store, actions } = useVendorState();
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!store) {
    return null;
  }

  const open = store.isOpen;
  const isSuspended =
    store.marketplaceStatus !== undefined && store.marketplaceStatus !== 'ACTIVE';
  const isRejected = store.verificationStatus === 'REJECTED';
  const blockedFromOpening = !open && (isSuspended || isRejected);

  const toggleOpen = async () => {
    if (isUpdating || blockedFromOpening) return;
    setIsUpdating(true);
    setErrorMsg(null);
    const res = await actions.setStoreOpen(!open);
    setIsUpdating(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Unable to update store operating status.');
    }
  };

  return (
    <section
      aria-label="Store operating status"
      className={`rounded-2xl border-2 p-5 space-y-3 ${
        isSuspended
          ? 'bg-[#DC2626]/10 border-[#DC2626]/60'
          : open
          ? 'bg-[#16A34A]/10 border-[#16A34A]/50'
          : 'bg-[#DC2626]/10 border-[#DC2626]/50'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className={`w-4 h-4 rounded-full shrink-0 ${
              open && !isSuspended ? 'bg-[#16A34A] animate-pulse' : 'bg-[#DC2626]'
            }`}
            aria-hidden="true"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                {store.name} is currently
              </p>
              {isSuspended && <Badge tone="red">Marketplace Suspended</Badge>}
              {isRejected && <Badge tone="red">Verification Rejected</Badge>}
            </div>
            <p
              role="status"
              className={`text-3xl font-black leading-tight ${
                open && !isSuspended ? 'text-[#166534]' : 'text-[#DC2626]'
              }`}
            >
              {open ? 'OPEN' : 'CLOSED'}
            </p>
            <p className="text-xs text-[#647067] mt-0.5">
              {isSuspended
                ? 'Suspended by VyaparHub administration — store cannot accept orders or open until reinstated.'
                : isRejected
                ? 'Store verification was rejected — store cannot open until verification issues are resolved.'
                : open
                ? 'Customers can see your store and place orders.'
                : 'Closed by you — customers see your store as closed and cannot place orders.'}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          variant={open ? 'danger' : 'primary'}
          disabled={isUpdating || blockedFromOpening}
          onClick={() => void toggleOpen()}
          aria-pressed={open}
        >
          {isUpdating ? 'Updating...' : open ? 'Close store' : 'Open store'}
        </Button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-white/90 border border-[#DC2626]/30 px-3.5 py-2.5 text-xs font-medium text-[#DC2626]"
        >
          {errorMsg}
        </div>
      )}
    </section>
  );
};
