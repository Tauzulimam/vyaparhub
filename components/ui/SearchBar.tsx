'use client';

import React, { useState } from 'react';
import { SearchBarProps } from '@/types';

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search milk, bread, fresh vegetables, local stores...',
  value,
  defaultValue = '',
  onChange,
  onSearch,
  onClear,
  className = '',
  autoFocus = false,
  ariaLabel = 'Search products and local stores',
}) => {
  const [internalQuery, setInternalQuery] = useState(defaultValue);
  const query = value !== undefined ? value : internalQuery;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (value === undefined) {
      setInternalQuery(e.target.value);
    }
    onChange?.(e);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  const handleClear = () => {
    if (value === undefined) {
      setInternalQuery('');
    }
    onClear?.();
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`relative flex items-center w-full ${className}`}
    >
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#647067]">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <input
        type="search"
        value={query}
        onChange={handleChange}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder-[#647067] transition-all duration-150 focus:outline-none focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/15 shadow-xs"
      />

      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search query"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#647067] hover:text-[#17201A] focus:outline-none focus-visible:text-[#166534]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  );
};
