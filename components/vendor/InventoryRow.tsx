'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge, formatINR, StockBadge } from '@/components/vendor/ui';
import { Icon } from '@/components/vendor/Icon';
import { getStockState, useVendorState } from '@/lib/vendorStore';
import type { MasterProduct, StoreProduct } from '@/types/vendor';

export const inputClass =
  'w-full rounded-lg border border-[#E2E8E3] bg-white px-3 py-2 text-sm text-[#17201A] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534]';

export const ProductThumb: React.FC<{ product: MasterProduct; size?: number }> = ({ product, size = 56 }) => (
  <div
    className="shrink-0 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center overflow-hidden"
    style={{ width: size, height: size }}
  >
    <Image src={product.image} alt={product.name} width={size} height={size} className="object-contain p-1" />
  </div>
);

/** True only for a whole number >= min (rejects '', negatives, decimals). */
const isWhole = (v: string, min: number) => v.trim() !== '' && Number.isInteger(Number(v)) && Number(v) >= min;

/** One inventory row: restock, price edit, stock correction, availability, remove. */
export const InventoryRow: React.FC<{ item: StoreProduct; master: MasterProduct }> = ({ item, master }) => {
  const { actions } = useVendorState();
  const [price, setPrice] = useState(String(item.sellingPrice));
  const [addQty, setAddQty] = useState('');
  const [setQty, setSetQty] = useState(String(item.quantity));
  const [showCorrection, setShowCorrection] = useState(false);
  const [flash, setFlash] = useState('');

  const stock = getStockState(item.quantity);

  const notify = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(''), 1800);
  };

  const priceNum = Number(price);
  const priceValid = price.trim() !== '' && priceNum > 0 && priceNum <= master.mrp;
  const priceDirty = priceNum !== item.sellingPrice;

  const addValid = isWhole(addQty, 1);
  const setValid = isWhole(setQty, 0);

  const addStock = () => {
    if (!addValid) return;
    const amount = Number(addQty);
    actions.addStock(item.id, amount);
    setSetQty(String(item.quantity + amount));
    setAddQty('');
    notify(`+${amount} added`);
  };

  const savePrice = () => {
    if (!priceValid || !priceDirty) return;
    actions.updateProduct(item.id, { sellingPrice: priceNum });
    notify('Price updated');
  };

  const applyCorrection = () => {
    if (!setValid) return;
    actions.setStock(item.id, Number(setQty));
    notify('Stock corrected');
  };

  return (
    <article
      className={`bg-white border rounded-2xl p-4 shadow-xs ${
        stock === 'OUT_OF_STOCK' ? 'border-[#DC2626]/40' : stock === 'LOW_STOCK' ? 'border-[#B45309]/40' : 'border-[#E2E8E3]'
      } ${!item.available ? 'opacity-90' : ''}`}
    >
      <div className="flex gap-3">
        <ProductThumb product={master} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug">{master.name}</p>
          <p className="text-xs text-[#647067]">
            {master.brand} · {master.unit} · MRP {formatINR(master.mrp)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StockBadge state={stock} quantity={item.quantity} />
            <Badge tone={item.available ? 'green' : 'gray'}>{item.available ? 'Visible to customers' : 'Hidden'}</Badge>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#647067]">Current stock</p>
          <p
            className={`text-2xl font-black leading-tight ${
              stock === 'OUT_OF_STOCK' ? 'text-[#DC2626]' : stock === 'LOW_STOCK' ? 'text-[#B45309]' : 'text-[#166534]'
            }`}
          >
            {item.quantity}
          </p>
        </div>
      </div>

      {/* Restock */}
      <div className="mt-3 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] p-3">
        <label htmlFor={`add-${item.id}`} className="text-xs font-semibold text-[#647067]">
          Add quantity (restock)
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id={`add-${item.id}`}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="e.g. 20"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStock()}
            className={`${inputClass} ${addQty !== '' && !addValid ? 'border-[#DC2626]' : ''}`}
          />
          <Button size="md" onClick={addStock} disabled={!addValid}>
            Add Stock
          </Button>
        </div>
        {addQty !== '' && !addValid && <p className="mt-1 text-xs text-[#DC2626]">Enter a whole number of 1 or more.</p>}
        {addValid && (
          <p className="mt-1 text-xs text-[#647067]">
            New stock will be <span className="font-semibold text-[#17201A]">{item.quantity + Number(addQty)}</span>
          </p>
        )}
      </div>

      {/* Price */}
      <div className="mt-3 flex items-end gap-2">
        <label className="flex-1 text-xs font-semibold text-[#647067]">
          Selling price (₹)
          <input
            type="number"
            min={1}
            max={master.mrp}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`${inputClass} mt-1 ${price !== '' && !priceValid ? 'border-[#DC2626]' : ''}`}
          />
        </label>
        <Button size="md" variant="outline" onClick={savePrice} disabled={!priceValid || !priceDirty}>
          Update price
        </Button>
      </div>
      {price !== '' && !priceValid && (
        <p className="mt-1 text-xs text-[#DC2626]">Price must be above ₹0 and not exceed MRP ({formatINR(master.mrp)}).</p>
      )}

      {/* Correction */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowCorrection((v) => !v)}
          aria-expanded={showCorrection}
          className="text-xs font-semibold text-[#B45309] hover:underline"
        >
          {showCorrection ? 'Hide stock correction' : 'Correct stock (set exact quantity)'}
        </button>
        {showCorrection && (
          <div className="mt-2 flex gap-2 items-end">
            <label className="flex-1 text-xs font-semibold text-[#647067]">
              Set total stock to
              <input
                type="number"
                min={0}
                step={1}
                value={setQty}
                onChange={(e) => setSetQty(e.target.value)}
                className={`${inputClass} mt-1 ${setQty !== '' && !setValid ? 'border-[#DC2626]' : ''}`}
              />
            </label>
            <Button size="md" variant="outline" onClick={applyCorrection} disabled={!setValid || Number(setQty) === item.quantity}>
              Apply
            </Button>
          </div>
        )}
        {showCorrection && setQty !== '' && !setValid && <p className="mt-1 text-xs text-[#DC2626]">Stock cannot be negative or fractional.</p>}
      </div>

      <div className="mt-3 pt-3 border-t border-[#E2E8E3] flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={item.available}
            disabled={item.quantity <= 0}
            onChange={(e) => actions.updateProduct(item.id, { available: e.target.checked })}
            className="w-4 h-4 accent-[#166534]"
          />
          Available for sale
          {item.quantity <= 0 && <span className="text-[#647067] font-normal">(add stock first)</span>}
        </label>
        <div className="flex items-center gap-2">
          {flash && (
            <span role="status" className="text-xs font-semibold text-[#166534]">
              {flash} ✓
            </span>
          )}
          <Button size="sm" variant="ghost" className="text-[#DC2626]" leftIcon={<Icon name="trash" className="w-4 h-4" />} onClick={() => actions.removeProduct(item.id)}>
            Remove
          </Button>
        </div>
      </div>
    </article>
  );
};
