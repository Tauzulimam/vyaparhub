'use client';

import React from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  badgeText,
  children,
  footerContent,
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAF7] flex flex-col justify-between text-[#17201A]">
      {/* Header Bar */}
      <header className="w-full bg-white border-b border-[#E2E8E3] py-3.5 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded-lg"
            aria-label="VyaparHub Homepage"
          >
            <div className="w-9 h-9 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-[#14532D] transition-colors">
              V
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-[#17201A] group-hover:text-[#166534] transition-colors leading-none">
                Vyapar<span className="text-[#166534]">Hub</span>
              </span>
              <span className="text-[10px] font-semibold text-[#647067] tracking-wider uppercase mt-0.5">
                Hyperlocal Commerce
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#647067] hover:text-[#166534] transition-colors py-1.5 px-2.5 rounded-lg hover:bg-[#F8FAF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Marketplace</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Badge */}
          {badgeText && (
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#166534]/10 text-[#166534] border border-[#166534]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" aria-hidden="true" />
                {badgeText}
              </span>
            </div>
          )}

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#17201A]">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[#647067] leading-relaxed max-w-sm mx-auto">
              {subtitle}
            </p>
          </div>

          {/* White Form Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8E3] p-6 sm:p-8 shadow-sm">
            {children}
          </div>

          {/* Additional Outer Links / Cards */}
          {footerContent && (
            <div className="mt-6 text-center">
              {footerContent}
            </div>
          )}
        </div>
      </main>

      {/* Footer / Trust Bar */}
      <footer className="w-full border-t border-[#E2E8E3] bg-white py-4 px-4 sm:px-6 text-center text-xs text-[#647067]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-[#166534]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Verified Local Stores
            </span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-[#166534]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure Prototype
            </span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-[#166534]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Hyperlocal ~5 km
            </span>
          </div>

          <p className="text-[11px] text-[#647067]">
            VyaparHub &copy; 2026. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
