'use client';

import React, { useState } from 'react';
import { AddToStoreModal, CatalogProductCard } from '@/components/vendor/CatalogParts';
import { inputClass } from '@/components/vendor/InventoryRow';
import { Card, PageHeader } from '@/components/vendor/ui';
import { masterCatalog, masterCategories } from '@/data/vendorData';
import { useVendorState } from '@/lib/vendorStore';
import type { MasterProduct } from '@/types/vendor';

export default function VendorCatalogPage() {
  const { products } = useVendorState();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<MasterProduct | null>(null);

  const addedIds = new Set(products.map((p) => p.masterProductId));
  const q = query.trim().toLowerCase();
  const results = masterCatalog.filter(
    (p) =>
      p.active &&
      (category === 'All' || p.category === category) &&
      (!q || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q))
  );

  return (
    <>
      <PageHeader
        title="Master Product Catalog"
        subtitle="Pick a ready-made product — name, image and MRP are managed by VyaparHub. You only set your price and stock."
      />

      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#647067] mb-4">
        {['Search', 'Select product', 'Set price & stock', 'Add to store'].map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#B45309]/10 text-[#B45309] font-bold flex items-center justify-center">{i + 1}</span>
            {s}
            {i < 3 && <span aria-hidden="true">›</span>}
          </li>
        ))}
      </ol>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search catalog by name, brand or category…"
          aria-label="Search master catalog"
          className={`${inputClass} sm:max-w-md`}
        />
        <p className="text-xs text-[#647067] self-center">
          {results.length} product{results.length === 1 ? '' : 's'} · {addedIds.size} already in your store
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4" role="group" aria-label="Filter by category">
        {['All', ...masterCategories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              category === c ? 'bg-[#166534] border-[#166534] text-white' : 'bg-white border-[#E2E8E3] text-[#647067] hover:border-[#166534]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[#647067]">
          No catalog products match your search. Can&apos;t find a product? Request it from VyaparHub support (coming soon).
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <CatalogProductCard key={p.id} product={p} added={addedIds.has(p.id)} onSelect={setSelected} />
          ))}
        </div>
      )}

      {selected && <AddToStoreModal product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
