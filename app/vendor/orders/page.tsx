'use client';

import React, { useState } from 'react';
import { OrderCard } from '@/components/vendor/OrderCard';
import { Card, PageHeader } from '@/components/vendor/ui';
import { useVendorState } from '@/lib/vendorStore';

type Tab = 'incoming' | 'current' | 'handoff' | 'past';

const TABS: { id: Tab; label: string }[] = [
  { id: 'incoming', label: 'Incoming' },
  { id: 'current', label: 'In progress' },
  { id: 'handoff', label: 'With delivery' },
  { id: 'past', label: 'Past' },
];

export default function VendorOrdersPage() {
  const { orders } = useVendorState();
  const [tab, setTab] = useState<Tab>('incoming');

  const groups: Record<Tab, typeof orders> = {
    incoming: orders.filter((o) => o.status === 'PENDING'),
    current: orders.filter((o) => ['ACCEPTED', 'PREPARING', 'READY'].includes(o.status)),
    handoff: orders.filter((o) => o.status === 'PICKED_UP' || o.status === 'OUT_FOR_DELIVERY'),
    past: orders.filter((o) => o.status === 'DELIVERED' || o.status === 'CANCELLED'),
  };
  const list = groups[tab];

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="You manage: Order Placed → Accepted → Preparing → Ready for Pickup. Pickup and delivery are handled by delivery partners."
      />

      <div role="tablist" aria-label="Order groups" className="flex gap-1 p-1 bg-white border border-[#E2E8E3] rounded-xl w-full sm:w-fit mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] ${
              tab === t.id ? 'bg-[#166534] text-white' : 'text-[#647067] hover:text-[#17201A]'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs ${tab === t.id ? 'text-white/80' : 'text-[#647067]'}`}>{groups[t.id].length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[#647067]">No orders in this group.</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </>
  );
}
