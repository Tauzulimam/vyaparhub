'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginFormContent } from './LoginFormContent';

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your VyaparHub customer account, vendor store, or management console."
      badgeText="Secure Unified Login"
      footerContent={
        <div className="space-y-4">
          <div className="text-xs text-[#647067]">
            New to VyaparHub?{' '}
            <Link
              href="/register"
              className="font-bold text-[#166534] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
            >
              Create customer account
            </Link>
          </div>

          {/* Dedicated Vendor CTA Card */}
          <div className="rounded-xl border border-[#B45309]/30 bg-[#FFFBEB] p-4 text-left shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#B45309] text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
                🏪
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#92400E]">
                  Are you a local merchant or shop owner?
                </p>
                <p className="mt-0.5 text-xs text-[#78350F] leading-relaxed">
                  List your store, reach neighborhood buyers, and manage inventory with VyaparHub.
                </p>
                <Link
                  href="/vendor/register"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] hover:text-[#78350F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded"
                >
                  <span>Register as a Vendor</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <Suspense fallback={<div className="py-8 text-center text-xs text-[#647067]">Loading sign in...</div>}>
        <LoginFormContent />
      </Suspense>
    </AuthLayout>
  );
}
