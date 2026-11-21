'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/vendor/Icon';
import { useVendorState } from '@/lib/vendorStore';

/** Shows the active store, lets the vendor switch stores, and links to store registration. */
export const StoreSwitcher: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { store, stores, actions } = useVendorState();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-[#F8FAF7] border border-[#E2E8E3]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Current store ${store.name}. Switch store`}
        className="w-full flex items-center gap-2 p-3 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
      >
        <div className="w-8 h-8 rounded-lg bg-[#B45309]/10 text-[#B45309] flex items-center justify-center shrink-0">
          <Icon name="store" className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{store.name}</p>
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${store.isOpen ? 'text-[#166534]' : 'text-[#DC2626]'}`}>
            <span className={`w-2 h-2 rounded-full ${store.isOpen ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
            {store.isOpen ? 'Open' : 'Closed'}
          </p>
        </div>
        <svg className={`w-4 h-4 text-[#647067] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[#E2E8E3] p-2 space-y-1">
          <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[#647067]">Your stores ({stores.length})</p>
          {stores.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                actions.switchStore(s.id);
                setOpen(false);
              }}
              aria-current={s.id === store.id}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm transition-colors ${
                s.id === store.id ? 'bg-[#166534]/10 text-[#166534] font-semibold' : 'hover:bg-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.isOpen ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
              <span className="flex-1 truncate">{s.name}</span>
              {s.id === store.id && <Icon name="check" className="w-4 h-4" />}
            </button>
          ))}
          <Link
            href="/vendor/stores/new"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-semibold text-[#B45309] hover:bg-[#B45309]/10"
          >
            <Icon name="plus" className="w-4 h-4" />
            Register New Store
          </Link>
        </div>
      )}
    </div>
  );
};
