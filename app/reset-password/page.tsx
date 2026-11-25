'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { Button } from '@/components/ui/Button';
import { resetPasswordAction } from '@/app/actions/auth';
import type { ResetPasswordFieldErrors } from '@/lib/auth/validation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: ResetPasswordFieldErrors = {};

    if (!password) {
      newErrors.password = 'Please enter a new password.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
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
      const result = await resetPasswordAction({
        password,
        confirmPassword,
      });

      if (!result.success) {
        if (result.errors) {
          setErrors(result.errors);
          if (result.errors.general) {
            setGeneralError(result.errors.general);
          }
        } else {
          setGeneralError('Unable to update password. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (err) {
      console.error('Password reset submission error:', err);
      setGeneralError('A network or server error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Choose a strong, unique password with at least 8 characters to secure your account."
      badgeText="Secure Password Reset"
      footerContent={
        <div className="text-xs text-[#647067]">
          Remembered your existing password?{' '}
          <Link
            href="/login"
            className="font-bold text-[#166534] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
          >
            Sign In
          </Link>
        </div>
      }
    >
      {isSuccess ? (
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
            <h2 className="text-base font-bold text-[#17201A]">Password Changed Successfully</h2>
            <p className="text-xs text-[#647067] leading-relaxed">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/login" className="block w-full">
              <Button type="button" variant="primary" size="lg" fullWidth className="shadow-xs font-bold">
                Sign In to Account
              </Button>
            </Link>
          </div>
        </div>
      ) : (
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
              <div className="space-y-1">
                <span>{generalError}</span>
                {generalError.toLowerCase().includes('expired') && (
                  <div>
                    <Link
                      href="/forgot-password"
                      className="font-bold underline hover:text-[#B91C1C]"
                    >
                      Request a new reset link &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Password */}
          <PasswordField
            id="reset-new-password"
            name="password"
            label="New Password"
            value={password}
            disabled={isSubmitting}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              if (generalError) setGeneralError(null);
              if (confirmPassword && e.target.value !== confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
              } else if (confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            autoComplete="new-password"
            required
            error={errors.password}
            helperText="Minimum 8 characters"
          />

          {/* Confirm New Password */}
          <PasswordField
            id="reset-confirm-password"
            name="confirmPassword"
            label="Confirm New Password"
            value={confirmPassword}
            disabled={isSubmitting}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              if (generalError) setGeneralError(null);
              if (e.target.value && e.target.value !== password) {
                setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
              }
            }}
            autoComplete="new-password"
            required
            error={errors.confirmPassword}
          />

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
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
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
