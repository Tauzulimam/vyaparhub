import React from 'react';
import Image from 'next/image';
import { Store } from '@/types';

interface StoreCardProps {
  store: Store;
  onClick?: (store: Store) => void;
  className?: string;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onClick,
  className = '',
}) => {
  return (
    <article
      onClick={() => onClick?.(store)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(store);
        }
      }}
      aria-label={`View store ${store.name}, ${store.distanceKm} kilometers away`}
      className={`group flex flex-col bg-white border border-[#E2E8E3] rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 hover:border-[#166534] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] select-none ${className}`}
    >
      {/* Store Banner / Image */}
      <div className="relative w-full h-32 bg-[#F8FAF7] border-b border-[#E2E8E3] overflow-hidden">
        <Image
          src={store.image}
          alt={store.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-150 group-hover:scale-102"
        />

        {/* Hyperlocal Distance Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 text-[#166534] shadow-xs border border-[#E2E8E3]">
            <svg
              className="w-3.5 h-3.5 text-[#166534]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {store.distanceKm} km away
          </span>
        </div>

        {/* Status Badge: Open / Closed */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shadow-xs ${
              store.isOpen
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#DC2626] text-white'
            }`}
          >
            {store.isOpen ? 'Open Now' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Store Content */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-base font-bold text-[#17201A] group-hover:text-[#166534] transition-colors line-clamp-1">
              {store.name}
            </h3>
            {/* Rating */}
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#B45309] shrink-0">
              <svg
                className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {store.rating} ({store.reviewCount})
            </span>
          </div>

          <p className="text-xs text-[#647067] mb-2">{store.category}</p>
        </div>

        {/* Delivery ETA & Address */}
        <div className="pt-2 border-t border-[#E2E8E3] flex items-center justify-between text-xs text-[#647067]">
          <span className="flex items-center gap-1 font-medium text-[#17201A]">
            <svg
              className="w-3.5 h-3.5 text-[#166534]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {store.deliveryTimeMin}
          </span>
          <span className="truncate max-w-[150px] text-[#647067]">
            {store.address}
          </span>
        </div>
      </div>
    </article>
  );
};
