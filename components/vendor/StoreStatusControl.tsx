'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { useVendorState } from '@/lib/vendorStore';

/** Prominent Open/Closed control — shown on the dashboard only. */
export const StoreStatusControl: React.FC = () => {
  const { store, actions } = useVendorState();

  if (!store) {
    return null;
  }

  const open = store.isOpen;

  return (
    <section
      aria-label="Store operating status"
      className={`rounded-2xl border-2 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        open ? 'bg-[#16A34A]/10 border-[#16A34A]/50' : 'bg-[#DC2626]/10 border-[#DC2626]/50'
      }`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`w-4 h-4 rounded-full shrink-0 ${open ? 'bg-[#16A34A] animate-pulse' : 'bg-[#DC2626]'}`}
          aria-hidden="true"
        />
        <div>
          <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">{store.name} is currently</p>
          <p role="status" className={`text-3xl font-black leading-tight ${open ? 'text-[#166534]' : 'text-[#DC2626]'}`}>
            {open ? 'OPEN' : 'CLOSED'}
          </p>
          <p className="text-xs text-[#647067] mt-0.5">
            {open ? 'Customers can see your store and place orders.' : 'Customers will see your store as closed and cannot order.'}
          </p>
        </div>
      </div>
      <Button
        size="lg"
        variant={open ? 'danger' : 'primary'}
        onClick={() => actions.updateStore({ isOpen: !open })}
        aria-pressed={open}
      >
        {open ? 'Close store' : 'Open store'}
      </Button>
    </section>
  );
};
