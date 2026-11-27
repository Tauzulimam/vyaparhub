'use client';

import React from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/Button';

export interface SwitchCartModalProps {
  newProduct: Product;
  currentStoreName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const SwitchCartModal: React.FC<SwitchCartModalProps> = ({
  newProduct,
  currentStoreName,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-cart-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white border border-[#E2E8E3] rounded-3xl shadow-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 text-[#B45309] flex items-center justify-center shrink-0 text-lg font-bold">
            ⚠
          </div>
          <div>
            <h2 id="switch-cart-dialog-title" className="text-base font-bold text-[#17201A]">
              Replace cart items with {newProduct.storeName}?
            </h2>
            <p className="text-xs text-[#647067] mt-1 leading-relaxed">
              Your cart currently contains items from{' '}
              <strong className="text-[#17201A]">{currentStoreName}</strong>. Do you want to clear
              your current cart and add{' '}
              <strong className="text-[#17201A]">{newProduct.name}</strong> from{' '}
              <strong className="text-[#17201A]">{newProduct.storeName}</strong> instead?
            </p>
          </div>
        </div>

        <aside className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-2xl p-3 text-xs text-[#647067]">
          <strong className="text-[#17201A]">VyaparHub Single-Store Cart Rule:</strong> One cart may
          contain products from only one local store at a time to ensure fast and reliable
          hyperlocal delivery.
        </aside>

        <div className="flex gap-3">
          <Button variant="outline" size="md" fullWidth disabled={isSubmitting} onClick={onCancel}>
            Keep Current Cart
          </Button>
          <Button
            variant="danger"
            size="md"
            fullWidth
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            Clear &amp; Switch Store
          </Button>
        </div>
      </div>
    </div>
  );
};
