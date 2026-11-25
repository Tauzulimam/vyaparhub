'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleResend = () => {
    setIsResending(true);
    setResendNotice(null);

    // UI-only resend simulation (Do NOT actually send email or fake auth)
    setTimeout(() => {
      setIsResending(false);
      setResendNotice(
        'Verification link resent (UI prototype only). In Phase 4C, Supabase Auth will dispatch the email.'
      );
    }, 600);
  };

  return (
    <div className="text-center space-y-6">
      {/* Mail Envelope Visual */}
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[#166534]/10 border border-[#166534]/20 flex items-center justify-center text-[#166534] shadow-xs">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      </div>

      {/* Primary Message */}
      <div className="space-y-2">
        <p className="text-sm text-[#17201A] font-medium leading-relaxed">
          We have sent an account verification link to:
        </p>
        <p className="text-sm font-bold text-[#166534] bg-[#166534]/5 py-1.5 px-3 rounded-lg border border-[#166534]/15 inline-block break-all">
          {emailParam ? emailParam : 'your registered email address'}
        </p>
        <p className="text-xs text-[#647067] leading-relaxed max-w-sm mx-auto pt-1">
          Please click the verification link in the email to activate your account and begin using VyaparHub.
        </p>
      </div>

      {/* Resend Notice Feedback */}
      {resendNotice && (
        <div
          role="status"
          className="rounded-xl border border-[#166534]/30 bg-[#F0FDF4] p-3 text-xs text-[#166534] font-medium leading-relaxed text-left flex items-start gap-2"
        >
          <svg
            className="w-4 h-4 text-[#166534] shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{resendNotice}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <Button
          type="button"
          onClick={handleResend}
          variant="outline"
          size="md"
          fullWidth
          isLoading={isResending}
          className="font-semibold text-xs border-[#E2E8E3]"
        >
          Resend verification email
        </Button>

        <Link
          href="/login"
          className="inline-block w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#166534] hover:bg-[#166534]/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
        >
          &larr; Return to Sign In
        </Link>
      </div>

      {/* Helpful Spam Note */}
      <div className="rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] p-3 text-left">
        <p className="text-xs font-semibold text-[#17201A] flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-[#B45309]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Can&apos;t find the email?
        </p>
        <p className="mt-1 text-[11px] text-[#647067] leading-relaxed">
          Please check your spam, junk, or promotions folder. Email delivery can sometimes take 1&ndash;2 minutes.
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Complete your account registration by verifying your email address."
      badgeText="Verification Required"
      footerContent={
        <div className="text-xs text-[#647067]">
          Need help with your account?{' '}
          <Link
            href="/"
            className="font-semibold text-[#166534] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
          >
            Contact VyaparHub Support
          </Link>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="text-center py-8 text-xs text-[#647067]">
            Loading verification details...
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
