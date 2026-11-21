import React from 'react';
import Image from 'next/image';
import { Product } from '@/types';
import { Button } from '@/components/ui/Button';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  className = '',
}) => {
  const discountPercent =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  return (
    <article
      className={`group relative flex flex-col justify-between p-3.5 sm:p-4 bg-white border border-[#E2E8E3] rounded-2xl transition-all duration-150 hover:border-[#166534] hover:shadow-sm ${className}`}
    >
      <div>
        {/* Top Badges: Discount & Store */}
        <div className="flex items-center justify-between gap-1 mb-2">
          {discountPercent > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F59E0B]/15 text-[#B45309]">
              {discountPercent}% OFF
            </span>
          ) : (
            <span />
          )}

          {!product.inStock && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#DC2626]/10 text-[#DC2626]">
              Out of stock
            </span>
          )}
        </div>

        {/* Product Image */}
        <div className="relative w-full aspect-square mb-3 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden flex items-center justify-center">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 160px, (max-width: 1024px) 220px, 260px"
            className="object-contain p-3 transition-transform duration-150 group-hover:scale-105"
          />
        </div>

        {/* Brand & Unit */}
        <div className="flex items-center justify-between text-[11px] text-[#647067] mb-1">
          <span className="font-medium tracking-wide uppercase">{product.brand}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#F8FAF7] border border-[#E2E8E3] font-mono">
            {product.unit}
          </span>
        </div>

        {/* Product Name */}
        <h3 className="text-sm font-semibold text-[#17201A] line-clamp-2 min-h-[40px] leading-snug mb-1">
          {product.name}
        </h3>

        {/* Local Store Attribution */}
        <p className="text-[11px] text-[#647067] flex items-center gap-1 mb-3">
          <svg
            className="w-3 h-3 text-[#166534] shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <span className="truncate">{product.storeName}</span>
        </p>
      </div>

      {/* Pricing & Add Action */}
      <div className="pt-2 border-t border-[#E2E8E3] flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold text-[#17201A]">
              ₹{product.price}
            </span>
            {product.mrp > product.price && (
              <span className="text-xs text-[#647067] line-through font-normal">
                ₹{product.mrp}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#647067]">MRP incl. taxes</span>
        </div>

        <Button
          variant={product.inStock ? 'outline' : 'secondary'}
          size="sm"
          disabled={!product.inStock}
          onClick={() => onAddToCart?.(product)}
          aria-label={
            product.inStock
              ? `Add ${product.name} to cart`
              : `${product.name} is out of stock`
          }
          className="shrink-0"
        >
          {product.inStock ? '+ Add' : 'Unavailable'}
        </Button>
      </div>
    </article>
  );
};
