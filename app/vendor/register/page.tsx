'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { PhoneField } from '@/components/auth/PhoneField';
import { Button } from '@/components/ui/Button';
import { registerVendorAction } from '@/app/actions/auth';
import type { VendorRegistrationFieldErrors } from '@/lib/auth/validation';

export default function VendorRegisterPage() {
  const router = useRouter();

  const [ownerName, setOwnerName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [registeredMobile, setRegisteredMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<VendorRegistrationFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: VendorRegistrationFieldErrors = {};

    if (!ownerName.trim()) {
      newErrors.ownerName = 'Please enter the merchant or owner name.';
    } else if (ownerName.trim().length < 2) {
      newErrors.ownerName = 'Owner name must be at least 2 characters.';
    }

    if (!businessEmail.trim()) {
      newErrors.businessEmail = 'Please enter your business email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail.trim())) {
      newErrors.businessEmail = 'Please enter a valid business email address.';
    }

    if (!registeredMobile) {
      newErrors.registeredMobile = 'Please enter your registered mobile number.';
    } else if (registeredMobile.length !== 10 || !/^[6-9]\d{9}$/.test(registeredMobile)) {
      newErrors.registeredMobile = 'Please enter a valid 10-digit Indian mobile number.';
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
      newErrors.agreeTerms = 'You must accept the Vendor Terms & Marketplace Guidelines.';
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
      const result = await registerVendorAction({
        ownerName,
        businessEmail,
        registeredMobile,
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
      const targetEmail = result.email || businessEmail.trim().toLowerCase();
      router.push(`/verify-email?email=${encodeURIComponent(targetEmail)}`);
    } catch (err) {
      console.error('Vendor registration submission error:', err);
      setGeneralError('A network or server error occurred. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Register as Vendor"
      subtitle="Start selling on VyaparHub. Connect your neighborhood store to local customers within ~5 km."
      badgeText="Merchant Partner Portal"
      footerContent={
        <div className="space-y-3">
          <div className="text-xs text-[#647067]">
            Already registered as a vendor?{' '}
            <Link
              href="/login"
              className="font-bold text-[#166534] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] rounded"
            >
              Sign In to Vendor Portal
            </Link>
          </div>

          <div className="text-xs text-[#647067]">
            Looking to buy groceries or household items?{' '}
            <Link
              href="/register"
              className="font-bold text-[#B45309] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded"
            >
              Customer Registration
            </Link>
          </div>
        </div>
      }
    >
      {/* Onboarding Clarification Callout */}
      <div className="mb-5 rounded-xl border border-[#166534]/20 bg-[#F0FDF4] p-3.5 text-xs text-[#166534] leading-relaxed">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-md bg-[#166534] text-white flex items-center justify-center shrink-0 font-bold text-[11px] shadow-2xs mt-0.5">
            i
          </div>
          <div className="space-y-1">
            <p className="font-bold text-[#14532D]">
              Quick 2-Step Onboarding Process:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[#166534]">
              <li>
                <strong>Step 1 (Here):</strong> Create your vendor user account with credentials.
              </li>
              <li>
                <strong>Step 2 (Next):</strong> Add your store profile, location, and operating hours.
              </li>
            </ul>
            <p className="text-[11px] text-[#14532D]/80 pt-1 border-t border-[#166534]/15">
              GST and business documentation are verified during store setup. <strong>GSTIN is NOT required</strong> at this account creation stage.
            </p>
          </div>
        </div>
      </div>

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

        {/* Owner / Contact Name */}
        <div className="space-y-1.5">
          <label htmlFor="vendor-owner-name" className="block text-xs font-semibold text-[#17201A]">
            Owner / Contact Name <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <input
            id="vendor-owner-name"
            name="ownerName"
            type="text"
            autoComplete="name"
            required
            disabled={isSubmitting}
            value={ownerName}
            onChange={(e) => {
              setOwnerName(e.target.value);
              if (errors.ownerName) setErrors((prev) => ({ ...prev, ownerName: undefined }));
              if (generalError) setGeneralError(null);
            }}
            placeholder="e.g. Rajesh Gupta"
            aria-invalid={Boolean(errors.ownerName)}
            aria-describedby={errors.ownerName ? 'vendor-owner-name-error' : undefined}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17201A] placeholder:text-[#647067]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] disabled:opacity-60 disabled:cursor-not-allowed ${
              errors.ownerName
                ? 'border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E2E8E3] hover:border-[#166534]/50'
            }`}
          />
          {errors.ownerName && (
            <p id="vendor-owner-name-error" role="alert" className="text-xs font-medium text-[#DC2626] flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {errors.ownerName}
            </p>
          )}
        </div>

        {/* Business Email */}
        <div className="space-y-1.5">
          <label htmlFor="vendor-business-email" className="block text-xs font-semibold text-[#17201A]">
            Business Email <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <input
            id="vendor-business-email"
            name="businessEmail"
            type="email"
            autoComplete="email"
            required
            disabled={isSubmitting}
            value={businessEmail}
            onChange={(e) => {
              setBusinessEmail(e.target.value);
              if (errors.businessEmail) setErrors((prev) => ({ ...prev, businessEmail: undefined }));
              if (generalError) setGeneralError(null);
            }}
            placeholder="store@rajeshkirana.com"
            aria-invalid={Boolean(errors.businessEmail)}
            aria-describedby={errors.businessEmail ? 'vendor-business-email-error' : undefined}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17201A] placeholder:text-[#647067]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] disabled:opacity-60 disabled:cursor-not-allowed ${
              errors.businessEmail
                ? 'border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E2E8E3] hover:border-[#166534]/50'
            }`}
          />
          {errors.businessEmail && (
            <p id="vendor-business-email-error" role="alert" className="text-xs font-medium text-[#DC2626] flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {errors.businessEmail}
            </p>
          )}
        </div>

        {/* Registered Mobile Number */}
        <PhoneField
          id="vendor-mobile"
          name="registeredMobile"
          label="Registered Mobile Number"
          value={registeredMobile}
          onChange={(val) => {
            setRegisteredMobile(val);
            if (errors.registeredMobile) setErrors((prev) => ({ ...prev, registeredMobile: undefined }));
            if (generalError) setGeneralError(null);
          }}
          disabled={isSubmitting}
          required
          error={errors.registeredMobile}
          helperText="Used for vendor verification and urgent order notifications"
        />

        {/* Password */}
        <PasswordField
          id="vendor-password"
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
          id="vendor-confirm-password"
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

        {/* Vendor Terms Checkbox */}
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
              <span className="text-[#17201A] font-semibold underline">Vendor Marketplace Guidelines</span>{' '}
              and{' '}
              <span className="text-[#17201A] font-semibold underline">Merchant Service Agreement</span>.
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
            {isSubmitting ? 'Creating Vendor Account...' : 'Create Vendor Account'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
