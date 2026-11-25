'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordField } from '@/components/auth/PasswordField';
import { Button } from '@/components/ui/Button';
import { loginAction } from '@/app/actions/auth';
import type { LoginFieldErrors } from '@/lib/auth/validation';

export function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const verifiedParam = searchParams.get('verified');
  const nextParam = searchParams.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Map callback error codes to safe user-friendly explanations
  const getCallbackErrorMessage = (err: string | null): string | null => {
    switch (err) {
      case 'auth_callback_failed':
        return 'Email confirmation link is invalid or has expired. Please check your email or register again.';
      case 'account_setup_required':
        return 'Your email address was confirmed, but account profile setup could not be completed. Please contact support.';
      case 'account_setup_failed':
        return 'An unexpected error occurred during account profile setup. Please try signing in or contact support.';
      case 'account_suspended':
        return 'Your account has been suspended. Access to protected portals is disabled. Please contact customer support.';
      case 'account_inactive':
        return 'Your account is not active. Please contact customer support.';
      case 'session_error':
        return 'Unable to verify your account session at this time. Please sign in again.';
      case 'missing_config':
        return 'Authentication service is temporarily unavailable. Please try again later.';
      default:
        return err ? 'An authentication error occurred. Please try again.' : null;
    }
  };

  const callbackError = getCallbackErrorMessage(errorParam);

  const validate = () => {
    const newErrors: LoginFieldErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Please enter your password.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginAction({
        email,
        password,
        rememberMe,
        next: nextParam,
      });

      if (!result.success) {
        if (result.errors) {
          setErrors(result.errors);
          if (result.errors.general) {
            setGeneralError(result.errors.general);
          }
        } else {
          setGeneralError('Unable to sign in. Please check your credentials and try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Successful login: navigate to authoritative role-based destination
      router.push(result.redirectTo || '/');
      router.refresh();
    } catch (err) {
      console.error('Login submission error:', err);
      setGeneralError(
        'A network or server error occurred. Please check your connection and try again.'
      );
      setIsSubmitting(false);
    }
  };

  const activeAlert = generalError || callbackError;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Error Alert Banner */}
      {activeAlert && (
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
          <span>{activeAlert}</span>
        </div>
      )}

      {/* Verified Success Banner */}
      {!activeAlert && verifiedParam === 'true' && (
        <div
          role="status"
          className="rounded-xl border border-[#166534]/30 bg-[#F0FDF4] p-3 text-xs text-[#166534] font-medium leading-relaxed flex items-start gap-2"
        >
          <svg
            className="w-4 h-4 text-[#166534] shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Email address verified successfully. You may now sign in.</span>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="block text-xs font-semibold text-[#17201A]">
          Email Address <span className="text-[#DC2626]" aria-hidden="true">*</span>
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isSubmitting}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            if (generalError) setGeneralError(null);
          }}
          placeholder="name@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17201A] placeholder:text-[#647067]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] disabled:opacity-60 disabled:cursor-not-allowed ${
            errors.email
              ? 'border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]'
              : 'border-[#E2E8E3] hover:border-[#166534]/50'
          }`}
        />
        {errors.email && (
          <p
            id="login-email-error"
            role="alert"
            className="text-xs font-medium text-[#DC2626] flex items-center gap-1"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            {errors.email}
          </p>
        )}
      </div>

      {/* Password Field */}
      <PasswordField
        id="login-password"
        name="password"
        label="Password"
        value={password}
        disabled={isSubmitting}
        onChange={(e) => {
          setPassword(e.target.value);
          if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          if (generalError) setGeneralError(null);
        }}
        autoComplete="current-password"
        required
        error={errors.password}
      />

      {/* Remember Me & Forgot Password Row */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isSubmitting}
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-[#E2E8E3] text-[#166534] focus:ring-[#166534] transition-colors disabled:opacity-60"
          />
          <span className="text-xs text-[#647067]">Remember me</span>
        </label>
        <Link
          href="/forgot-password"
          className="text-xs font-semibold text-[#166534] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit Button */}
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
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </div>
    </form>
  );
}
