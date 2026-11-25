'use client';

import React, { useId } from 'react';

interface PhoneFieldProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

export const PhoneField: React.FC<PhoneFieldProps> = ({
  id: customId,
  name = 'phone',
  label = 'Mobile Number',
  value,
  onChange,
  placeholder = '9876543210',
  required = false,
  error,
  helperText = '10-digit mobile number for order and delivery updates',
  disabled = false,
}) => {
  const generatedId = useId();
  const inputId = customId || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numeric characters, max 10 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(cleaned);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold text-[#17201A]"
      >
        {label}
        {required && <span className="text-[#DC2626] ml-0.5" aria-hidden="true">*</span>}
      </label>

      <div className="relative flex rounded-xl border border-[#E2E8E3] bg-white transition-colors focus-within:ring-2 focus-within:ring-[#166534] focus-within:border-[#166534]">
        {/* Country code badge */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#F8FAF7] border-r border-[#E2E8E3] rounded-l-xl text-xs font-semibold text-[#17201A] select-none shrink-0">
          <span className="text-sm">🇮🇳</span>
          <span>+91</span>
        </div>

        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full rounded-r-xl bg-transparent px-3.5 py-2.5 text-sm text-[#17201A] placeholder:text-[#647067]/60 focus:outline-none disabled:bg-[#F8FAF7] disabled:text-[#647067] ${
            error ? 'text-[#DC2626]' : ''
          }`}
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-[#DC2626] flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className="text-xs text-[#647067]">
          {helperText}
        </p>
      )}
    </div>
  );
};
