'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { PhoneField } from '@/components/auth/PhoneField';
import { Button } from '@/components/ui/Button';
import { registerCustomerAction } from '@/app/actions/auth';
import type { CustomerRegistrationFieldErrors } from '@/lib/auth/validation';

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<CustomerRegistrationFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: CustomerRegistrationFieldErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Please enter your full name.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!phone) {
      newErrors.phone = 'Please enter your mobile number.';
    } else if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number.';
    }

    if (!password) {
      newErrors.password = 'Please create a password.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must accept the Terms of Service & Privacy Policy.';
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
      const result = await registerCustomerAction({
        fullName,
        email,
        mobileNumber: phone,
        password,
        confirmPassword,
        termsAccepted: agreeTerms,
      });

      if (!result.success) {
        if (result.errors) {
          setErrors(result.errors);
          if (result.errors.general) {
            setGeneralError(result.errors.general);
          }
        } else {
          setGeneralError('Registration could not be completed. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Successful registration & provisioning: redirect to email verification page
      const targetEmail = result.email || email.trim().toLowerCase();
      router.push(`/verify-email?email=${encodeURIComponent(targetEmail)}`);
    } catch (err) {
      console.error('Registration submission error:', err);
      setGeneralError('A network or server error occurred. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join VyaparHub to order from neighborhood kiranas, bakeries, pharmacies, and stores."
      badgeText="Customer Registration"
      footerContent={
        <div className="space-y-4">
          <div className="text-xs text-[#647067]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-[#166534] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
            >
              Sign In
            </Link>
          </div>

          {/* Vendor CTA Link */}
          <div className="rounded-xl border border-[#B45309]/30 bg-[#FFFBEB] p-4 text-left shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#B45309] text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
                🏪
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#92400E]">
                  Want to sell your products on VyaparHub?
                </p>
                <p className="mt-0.5 text-xs text-[#78350F] leading-relaxed">
                  Register as a local merchant to create stores and receive neighborhood orders.
                </p>
                <Link
                  href="/vendor/register"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] hover:text-[#78350F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded"
                >
                  <span>Go to Vendor Registration</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      }
    >
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

        {/* Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="reg-name" className="block text-xs font-semibold text-[#17201A]">
            Full Name <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <input
            id="reg-name"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            disabled={isSubmitting}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              if (generalError) setGeneralError(null);
            }}
            placeholder="e.g. Ramesh Kumar"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'reg-name-error' : undefined}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17201A] placeholder:text-[#647067]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] disabled:opacity-60 disabled:cursor-not-allowed ${
              errors.fullName
                ? 'border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E2E8E3] hover:border-[#166534]/50'
            }`}
          />
          {errors.fullName && (
            <p id="reg-name-error" role="alert" className="text-xs font-medium text-[#DC2626] flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="block text-xs font-semibold text-[#17201A]">
            Email Address <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <input
            id="reg-email"
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
            placeholder="ramesh@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'reg-email-error' : undefined}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17201A] placeholder:text-[#647067]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] disabled:opacity-60 disabled:cursor-not-allowed ${
              errors.email
                ? 'border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E2E8E3] hover:border-[#166534]/50'
            }`}
          />
          {errors.email && (
            <p id="reg-email-error" role="alert" className="text-xs font-medium text-[#DC2626] flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {errors.email}
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <PhoneField
          id="reg-phone"
          name="phone"
          label="Mobile Number"
          value={phone}
          onChange={(val) => {
            setPhone(val);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            if (generalError) setGeneralError(null);
          }}
          disabled={isSubmitting}
          required
          error={errors.phone}
          helperText="Used for order confirmation & delivery partner updates"
        />

        {/* Password */}
        <PasswordField
          id="reg-password"
          name="password"
          label="Password"
          value={password}
          disabled={isSubmitting}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            if (confirmPassword && e.target.value !== confirmPassword) {
              setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
            } else if (confirmPassword) {
              setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }
            if (generalError) setGeneralError(null);
          }}
          autoComplete="new-password"
          required
          error={errors.password}
          helperText="Minimum 8 characters"
        />

        {/* Confirm Password */}
        <PasswordField
          id="reg-confirm-password"
          name="confirmPassword"
          label="Confirm Password"
          value={confirmPassword}
          disabled={isSubmitting}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            if (e.target.value && e.target.value !== password) {
              setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
            }
            if (generalError) setGeneralError(null);
          }}
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
        />

        {/* Terms Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={isSubmitting}
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                if (generalError) setGeneralError(null);
              }}
              className="h-4 w-4 rounded border-[#E2E8E3] text-[#166534] focus:ring-[#166534] mt-0.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-[#647067] leading-relaxed">
              I agree to the{' '}
              <span className="text-[#17201A] font-semibold underline">Terms of Service</span>{' '}
              and{' '}
              <span className="text-[#17201A] font-semibold underline">Privacy Policy</span>.
            </span>
          </label>
          {errors.agreeTerms && (
            <p role="alert" className="mt-1 text-xs font-medium text-[#DC2626] flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {errors.agreeTerms}
            </p>
          )}
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
            {isSubmitting ? 'Creating Account...' : 'Create Customer Account'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
