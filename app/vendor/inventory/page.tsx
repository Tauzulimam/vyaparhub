'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { InventoryRow, inputClass } from '@/components/vendor/InventoryRow';
import { Card, PageHeader } from '@/components/vendor/ui';
import { Icon } from '@/components/vendor/Icon';
import { masterById } from '@/data/vendorData';
import { getStockState, useVendorState } from '@/lib/vendorStore';

type Filter = 'all' | 'low' | 'out' | 'hidden';

export default function VendorInventoryPage() {
  const { products } = useVendorState();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const counts = {
    all: products.length,
    low: products.filter((p) => getStockState(p.quantity) === 'LOW_STOCK').length,
    out: products.filter((p) => p.quantity <= 0).length,
    hidden: products.filter((p) => !p.available).length,
  };

  const q = query.trim().toLowerCase();
  const visible = products.filter((p) => {
    const m = masterById[p.masterProductId];
    if (!m) return false;
    if (q && !`${m.name} ${m.brand}`.toLowerCase().includes(q)) return false;
    if (filter === 'low') return getStockState(p.quantity) === 'LOW_STOCK';
    if (filter === 'out') return p.quantity <= 0;
    if (filter === 'hidden') return !p.available;
    return true;
  });

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'low', label: 'Low stock' },
    { id: 'out', label: 'Out of stock' },
    { id: 'hidden', label: 'Hidden' },
  ];

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Products your store sells. Update price, stock and availability."
        actions={
          <Link href="/vendor/catalog">
            <Button leftIcon={<Icon name="plus" className="w-4 h-4" />}>Add from catalog</Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your products…"
          aria-label="Search your products"
          className={`${inputClass} sm:max-w-xs`}
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.id ? 'bg-[#166534] border-[#166534] text-white' : 'bg-white border-[#E2E8E3] text-[#647067] hover:border-[#166534]'
              }`}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[#647067]">
          {products.length === 0 ? 'No products yet. Add some from the master catalog.' : 'No products match your filters.'}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((p) => (
            <InventoryRow key={p.id} item={p} master={masterById[p.masterProductId]} />
          ))}
        </div>
      )}
    </>
  );
}
