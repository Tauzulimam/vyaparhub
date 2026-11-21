'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge, formatINR } from '@/components/vendor/ui';
import { inputClass, ProductThumb } from '@/components/vendor/InventoryRow';
import { useVendorState } from '@/lib/vendorStore';
import type { MasterProduct } from '@/types/vendor';

/** Catalog card: shared product info + "Add to my store" entry point. */
export const CatalogProductCard: React.FC<{
  product: MasterProduct;
  added: boolean;
  onSelect: (p: MasterProduct) => void;
}> = ({ product, added, onSelect }) => (
  <article className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs flex flex-col">
    <div className="flex gap-3">
      <ProductThumb product={product} size={64} />
      <div className="min-w-0">
        <p className="text-sm font-bold leading-snug">{product.name}</p>
        <p className="text-xs text-[#647067]">
          {product.brand} · {product.unit}
        </p>
        <p className="text-xs mt-1 text-[#17201A] font-semibold">MRP {formatINR(product.mrp)}</p>
      </div>
    </div>
    <p className="mt-2 text-xs text-[#647067] flex-1">{product.description}</p>
    <div className="mt-3 flex items-center justify-between gap-2">
      <Badge tone="gray">{product.category}</Badge>
      {added ? (
        <Badge tone="green">✓ In your store</Badge>
      ) : (
        <Button size="sm" onClick={() => onSelect(product)}>
          Add to store
        </Button>
      )}
    </div>
  </article>
);

/** Vendor enters ONLY store-specific price + stock; everything else comes from the master product. */
export const AddToStoreModal: React.FC<{ product: MasterProduct; onClose: () => void }> = ({ product, onClose }) => {
  const { actions } = useVendorState();
  const [price, setPrice] = useState(String(product.mrp));
  const [qty, setQty] = useState('10');

  const priceNum = Number(price);
  const qtyNum = Number(qty);
  const priceValid = price !== '' && priceNum > 0 && priceNum <= product.mrp;
  const qtyValid = qty !== '' && Number.isInteger(qtyNum) && qtyNum >= 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceValid || !qtyValid) return;
    actions.addProduct(product.id, priceNum, qtyNum);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Add product to store">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-lg font-black">Add to your store</h2>

        <div className="flex gap-3 p-3 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3]">
          <ProductThumb product={product} size={56} />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-snug">{product.name}</p>
            <p className="text-xs text-[#647067]">
              {product.brand} · {product.unit}
            </p>
            <p className="text-xs font-semibold mt-0.5">MRP {formatINR(product.mrp)}</p>
          </div>
        </div>
        <p className="text-[11px] text-[#647067]">Name, image and unit come from the shared master catalog. You only set your price and stock.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[#647067]">
            Your selling price (₹)
            <input type="number" min={1} max={product.mrp} value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputClass} mt-1 ${price !== '' && !priceValid ? 'border-[#DC2626]' : ''}`} autoFocus />
          </label>
          <label className="text-xs font-semibold text-[#647067]">
            Available quantity
            <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputClass} mt-1`} />
          </label>
        </div>
        {!priceValid && <p className="text-xs text-[#DC2626]">Enter a price above ₹0 and not above MRP ({formatINR(product.mrp)}).</p>}
        {!qtyValid && <p className="text-xs text-[#DC2626]">Enter a whole-number quantity (0 or more).</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!priceValid || !qtyValid}>
            Add product to store
          </Button>
        </div>
      </form>
    </div>
  );
};
