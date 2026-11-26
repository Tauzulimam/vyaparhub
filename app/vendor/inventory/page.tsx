'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { InventoryRow, inputClass } from '@/components/vendor/InventoryRow';
import { Card, PageHeader } from '@/components/vendor/ui';
import { Icon } from '@/components/vendor/Icon';
import { getStockState, useVendorState } from '@/lib/vendorStore';

type Filter = 'all' | 'low' | 'out' | 'hidden';

export default function VendorInventoryPage() {
  const { store, products, masterCatalogById } = useVendorState();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  if (!store) {
    return (
      <>
        <PageHeader title="Inventory" subtitle="Track and update product stock levels and prices." />
        <Card className="p-8 text-center max-w-xl mx-auto space-y-4 border-2 border-dashed border-[#166534]/30 bg-white">
          <p className="text-sm text-[#647067]">Please register a store first to manage inventory.</p>
          <div>
            <Link href="/vendor/stores/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#166534] text-white text-xs font-semibold">
              Register New Store
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const counts = {
    all: products.length,
    low: products.filter((p) => getStockState(p.quantity) === 'LOW_STOCK').length,
    out: products.filter((p) => p.quantity <= 0).length,
    hidden: products.filter((p) => !p.available).length,
  };

  const q = query.trim().toLowerCase();
  const visible = products
    .map((p) => ({
      item: p,
      master: p.masterProduct ?? masterCatalogById[p.masterProductId],
    }))
    .filter(({ item, master }) => {
      if (!master) return false;
      if (q && !`${master.name} ${master.brand} ${master.category}`.toLowerCase().includes(q)) {
        return false;
      }
      if (filter === 'low') return getStockState(item.quantity) === 'LOW_STOCK';
      if (filter === 'out') return item.quantity <= 0;
      if (filter === 'hidden') return !item.available;
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

      {products.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <p className="text-sm text-[#647067]">
            No products in <span className="font-semibold text-[#17201A]">{store.name}</span> yet. Add products from the Master Catalog to start managing inventory.
          </p>
          <div>
            <Link
              href="/vendor/catalog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532d] transition-colors"
            >
              <Icon name="plus" className="w-4 h-4" />
              Browse Master Catalog
            </Link>
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[#647067]">
          No products match your filters.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map(({ item, master }) => (
            <InventoryRow key={item.id} item={item} master={master!} />
          ))}
        </div>
      )}
    </>
  );
}
