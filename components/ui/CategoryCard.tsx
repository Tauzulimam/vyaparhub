import React from 'react';
import Image from 'next/image';
import { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  onClick?: (category: Category) => void;
  className?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onClick,
  className = '',
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(category)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(category);
        }
      }}
      aria-label={`Browse ${category.name} category`}
      className={`group flex flex-col items-center p-4 bg-white border border-[#E2E8E3] rounded-2xl cursor-pointer transition-all duration-150 hover:border-[#166534] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] select-none text-center ${className}`}
    >
      <div className="relative w-14 h-14 mb-2.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center overflow-hidden transition-transform duration-150 group-hover:scale-105">
        <Image
          src={category.image}
          alt={category.name}
          width={40}
          height={40}
          className="object-contain"
        />
      </div>

      <h3 className="text-xs sm:text-sm font-semibold text-[#17201A] group-hover:text-[#166534] line-clamp-1">
        {category.name}
      </h3>

      <span className="text-[11px] text-[#647067] mt-0.5">
        {category.itemCount} items
      </span>
    </div>
  );
};
