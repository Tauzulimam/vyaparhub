import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  const productHref = `/products/${product.id}`;

  return (
    <article
      className={`group relative flex flex-col justify-between p-3.5 sm:p-4 bg-white border border-[#E2E8E3] rounded-2xl transition-all duration-150 hover:border-[#166534] hover:shadow-sm ${className}`}
    >
      <div>
        {/* Top Badges: Discount & Stock */}
        <div className="flex items-center justify-between gap-1 mb-2">
          {discountPercent > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F59E0B]/15 text-[#B45309]">
              {discountPercent}% OFF
            </span>
          ) : (
            <span />
          )}

          {!product.inStock ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#DC2626]/10 text-[#DC2626]">
              Out of stock
            </span>
          ) : product.quantityAvailable !== undefined && product.quantityAvailable <= 5 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F59E0B]/15 text-[#B45309]">
              {product.quantityAvailable} left
            </span>
          ) : null}
        </div>

        {/* Product Image */}
        <Link
          href={productHref}
          aria-label={`View ${product.name} from ${product.storeName}`}
          className="relative block w-full aspect-square mb-3 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 160px, (max-width: 1024px) 220px, 260px"
            className="object-contain p-3 transition-transform duration-150 group-hover:scale-105"
          />
        </Link>

        {/* Brand & Unit */}
        <div className="flex items-center justify-between text-[11px] text-[#647067] mb-1">
          <span className="font-medium tracking-wide uppercase truncate max-w-[60%]">
            {product.brand}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#F8FAF7] border border-[#E2E8E3] font-mono shrink-0">
            {product.unit}
          </span>
        </div>

        {/* Product Name */}
        <h3 className="text-sm font-semibold text-[#17201A] line-clamp-2 min-h-[40px] leading-snug mb-1">
          <Link
            href={productHref}
            className="hover:text-[#166534] transition-colors focus-visible:outline-none focus-visible:underline"
          >
            {product.name}
          </Link>
        </h3>

        {/* Local Store Attribution */}
        <Link
          href={`/stores/${product.storeId}`}
          className="text-[11px] text-[#647067] hover:text-[#166534] flex items-center gap-1 mb-3 transition-colors"
        >
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
        </Link>
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
          <span className="text-[10px] text-[#647067]">
            {product.mrp > product.price ? 'Below MRP' : `MRP ₹${product.mrp}`}
          </span>
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
