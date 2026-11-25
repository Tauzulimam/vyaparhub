'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { forgotPasswordAction } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    setError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await forgotPasswordAction({ email });

      if (!result.success) {
        if (result.errors?.email) {
          setError(result.errors.email);
        }
        if (result.errors?.general) {
          setGeneralError(result.errors.general);
        }
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      console.error('Forgot password submission error:', err);
      setGeneralError('A network or server error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your registered email address and we'll send you instructions to reset your password."
      badgeText="Account Recovery"
      footerContent={
        <div className="text-xs text-[#647067]">
          Remember your password?{' '}
          <Link
            href="/login"
            className="font-bold text-[#166534] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
          >
            Sign In
          </Link>
        </div>
      }
    >
      {submitted ? (
        /* Privacy-Preserving Confirmation View */
        <div className="space-y-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#166534]/10 border border-[#166534]/20 flex items-center justify-center text-[#166534]">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#17201A]">
              Check Your Inbox
            </h2>
            {/* Generic privacy-preserving message: does NOT reveal if email exists */}
            <p className="text-xs text-[#647067] leading-relaxed">
              If an account exists for <span className="font-semibold text-[#17201A]">{email}</span>, password reset instructions have been sent. Please check your inbox and spam folder.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setEmail('');
                setError(undefined);
                setGeneralError(null);
              }}
              variant="outline"
              size="md"
              fullWidth
              className="text-xs font-semibold"
            >
              Try another email address
            </Button>

            <Link
              href="/login"
              className="inline-block w-full py-2 text-xs font-bold text-[#166534] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
            >
              &larr; Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        /* Forgot Password Form */
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Safe General Error Banner */}
          {generalError && (
            <div
              role="alert"
              className="rounded-xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-xs text-[#DC2626] font-medium leading-relaxed flex items-start gap-2"
            >
              <svg
                className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              <span>{generalError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="block text-xs font-semibold text-[#17201A]">
              Email Address <span className="text-[#DC2626]" aria-hidden="true">*</span>
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(undefined);
                if (generalError) setGeneralError(null);
              }}
              placeholder="name@example.com"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'forgot-email-error' : undefined}
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17201A] placeholder:text-[#647067]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] disabled:opacity-60 disabled:cursor-not-allowed ${
                error
                  ? 'border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]'
                  : 'border-[#E2E8E3] hover:border-[#166534]/50'
              }`}
            />
            {error && (
              <p id="forgot-email-error" role="alert" className="text-xs font-medium text-[#DC2626] flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="shadow-xs font-bold"
            >
              {isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link'}
            </Button>
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs font-semibold text-[#647067] hover:text-[#166534] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
            >
              &larr; Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
