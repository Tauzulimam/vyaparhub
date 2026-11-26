'use client';

import React, { startTransition, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/vendor/InventoryRow';
import { Card, PageHeader, SectionTitle } from '@/components/vendor/ui';
import { STORE_CATEGORIES } from '@/data/vendorData';
import { isValidGstin, useVendorState } from '@/lib/vendorStore';
import { createStoreAction } from '@/lib/vendor/actions';
import type { GstStatus } from '@/types/vendor';

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode; className?: string }> = ({
  label,
  error,
  children,
  className = '',
}) => (
  <label className={`block text-xs font-semibold text-[#647067] ${className}`}>
    {label}
    <div className="mt-1">{children}</div>
    {error && <span className="block mt-1 text-[#DC2626] font-normal">{error}</span>}
  </label>
);

export default function RegisterStorePage() {
  const router = useRouter();
  const { store, vendorProfile, categories, actions } = useVendorState();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [gstStatus, setGstStatus] = useState<GstStatus>('NOT_REGISTERED');
  const [gstin, setGstin] = useState('');

  const defaultCategory = categories.length > 0 ? categories[0].id : STORE_CATEGORIES[0];
  const defaultOwner = vendorProfile?.ownerName || store?.ownerName || '';
  const defaultPhone = vendorProfile?.registeredMobile || store?.phone || '';
  const defaultEmail = vendorProfile?.businessEmail || store?.email || '';

  const [form, setForm] = useState({
    name: '',
    categoryId: defaultCategory,
    ownerName: defaultOwner,
    phone: defaultPhone,
    email: defaultEmail,
    addressLine1: '',
    area: '',
    city: 'Gurugram',
    state: 'Haryana',
    postalCode: '',
    openTime: '09:00',
    closeTime: '21:00',
    description: '',
    deliveryRadiusKm: '3',
    minOrderAmount: '100',
  });

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (serverError) setServerError(null);
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const radius = Number(form.deliveryRadiusKm);
  const minOrder = Number(form.minOrderAmount);
  const trimmedGstin = gstin.trim().toUpperCase();

  const gstinError =
    gstStatus === 'REGISTERED'
      ? trimmedGstin === ''
        ? 'GSTIN is required for GST-registered stores.'
        : !isValidGstin(trimmedGstin)
        ? 'Enter a valid 15-character GSTIN (e.g. 06ABCDE1234F1Z5).'
        : ''
      : '';

  const clientErrors = {
    name: form.name.trim() === '' ? 'Store name is required.' : '',
    ownerName: form.ownerName.trim() === '' ? 'Owner name is required.' : '',
    phone: form.phone.trim().replace(/\D/g, '').length < 10 ? 'Enter a valid 10-digit phone number.' : '',
    addressLine1: form.addressLine1.trim() === '' ? 'Shop / street address is required.' : '',
    area: form.area.trim() === '' ? 'Area or locality is required.' : '',
    city: form.city.trim() === '' ? 'City is required.' : '',
    state: form.state.trim() === '' ? 'State is required.' : '',
    postalCode: !/^[1-9][0-9]{5}$/.test(form.postalCode.trim())
      ? 'Enter a valid 6-digit Indian PIN code.'
      : '',
    hours: form.openTime >= form.closeTime ? 'Closing time must be after opening time.' : '',
    radius: !(radius > 0 && radius <= 10) ? 'Radius must be between 1 and 10 km.' : '',
    minOrder: !(minOrder >= 0) ? 'Minimum order cannot be negative.' : '',
    gstin: gstinError,
  };

  const valid = Object.values(clientErrors).every((e) => e === '');
  const show = (key: keyof typeof clientErrors) =>
    fieldErrors[key] || (submitted ? clientErrors[key] : '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (!valid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await createStoreAction({
        name: form.name.trim(),
        categoryId: form.categoryId,
        description: form.description.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        addressLine1: form.addressLine1.trim(),
        area: form.area.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        openingTime: form.openTime,
        closingTime: form.closeTime,
        deliveryRadiusKm: radius,
        minimumOrderAmount: minOrder,
        gstStatus,
        gstin: gstStatus === 'REGISTERED' ? trimmedGstin : undefined,
      });

      if (!result.success) {
        setServerError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setIsSubmitting(false);
        return;
      }

      startTransition(() => {
        actions.activateCreatedStore(result.data.store);
        setIsSubmitting(false);
        router.push('/vendor');
        router.refresh();
      });
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Register New Store"
        subtitle="Add a store to your vendor account. Stores start closed with pending verification."
        actions={
          <Link href="/vendor">
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      <Card className="p-5">
        {serverError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] text-sm"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={submit} className="space-y-6" noValidate>
          <div>
            <SectionTitle title="Store details" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Store name *" error={show('name')}>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. ABC Fresh Mart"
                />
              </Field>
              <Field label="Store category / type">
                <select
                  className={inputClass}
                  value={form.categoryId}
                  onChange={set('categoryId')}
                >
                  {categories.length > 0
                    ? categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    : STORE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                </select>
              </Field>
              <Field label="About the store" className="sm:col-span-2">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="What does your store offer?"
                />
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle title="Owner & contact" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Owner name *" error={show('ownerName')}>
                <input
                  className={inputClass}
                  value={form.ownerName}
                  onChange={set('ownerName')}
                  readOnly={Boolean(vendorProfile?.ownerName)}
                />
              </Field>
              <Field label="Contact phone *" error={show('phone')}>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={set('phone')}
                  inputMode="tel"
                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={set('email')}
                />
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle title="GST & tax information" />
            <div className="space-y-4">
              <fieldset>
                <legend className="text-xs font-semibold text-[#647067] mb-2">
                  GST Registration Status *
                </legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    {
                      value: 'REGISTERED' as const,
                      title: 'GST Registered',
                      hint: 'Store has a 15-character GSTIN.',
                    },
                    {
                      value: 'NOT_REGISTERED' as const,
                      title: 'Not GST Registered',
                      hint: 'Exempt or below GST threshold — no GSTIN required.',
                    },
                  ].map((opt) => {
                    const active = gstStatus === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                          active
                            ? 'border-[#166534] bg-[#166534]/5'
                            : 'border-[#E2E8E3] bg-white hover:border-[#166534]/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="gstStatus"
                          value={opt.value}
                          checked={active}
                          onChange={() => setGstStatus(opt.value)}
                          className="mt-0.5 accent-[#166534]"
                        />
                        <div>
                          <p className="text-sm font-semibold text-[#17201A]">{opt.title}</p>
                          <p className="text-xs text-[#647067]">{opt.hint}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {gstStatus === 'REGISTERED' && (
                <div className="sm:max-w-md">
                  <Field
                    label="GSTIN (15 characters) *"
                    error={
                      show('gstin') ||
                      (gstin !== '' && !isValidGstin(trimmedGstin) ? clientErrors.gstin : '')
                    }
                  >
                    <input
                      className={`${inputClass} font-mono uppercase tracking-wider`}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      maxLength={15}
                      placeholder="06ABCDE1234F1Z5"
                    />
                  </Field>
                  <p className="mt-1 text-[11px] text-[#647067]">
                    Format: 2-digit state code + 10-character PAN + entity code + Z + check digit.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionTitle title="Location & operational parameters" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Shop / Building / Street *" error={show('addressLine1')} className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={form.addressLine1}
                  onChange={set('addressLine1')}
                  placeholder="e.g. Shop 12, Main Market"
                />
              </Field>
              <Field label="Area / Locality *" error={show('area')}>
                <input
                  className={inputClass}
                  value={form.area}
                  onChange={set('area')}
                  placeholder="e.g. Sector 14"
                />
              </Field>
              <Field label="City *" error={show('city')}>
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={set('city')}
                  placeholder="e.g. Gurugram"
                />
              </Field>
              <Field label="State *" error={show('state')}>
                <input
                  className={inputClass}
                  value={form.state}
                  onChange={set('state')}
                  placeholder="e.g. Haryana"
                />
              </Field>
              <Field label="PIN Code (6 digits) *" error={show('postalCode')}>
                <input
                  className={inputClass}
                  value={form.postalCode}
                  onChange={set('postalCode')}
                  placeholder="e.g. 122001"
                  maxLength={6}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Opens at">
                <input
                  type="time"
                  className={inputClass}
                  value={form.openTime}
                  onChange={set('openTime')}
                />
              </Field>
              <Field label="Closes at" error={show('hours')}>
                <input
                  type="time"
                  className={inputClass}
                  value={form.closeTime}
                  onChange={set('closeTime')}
                />
              </Field>
              <Field label="Delivery radius (km, max 10)" error={show('radius')}>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  className={inputClass}
                  value={form.deliveryRadiusKm}
                  onChange={set('deliveryRadiusKm')}
                />
              </Field>
              <Field label="Minimum order (₹)" error={show('minOrder')}>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.minOrderAmount}
                  onChange={set('minOrderAmount')}
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E2E8E3]">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Creating store...' : 'Register store'}
            </Button>
            <p className="text-xs text-[#647067]">
              The new store starts closed with an initial pending verification status.
            </p>
          </div>
        </form>
      </Card>
    </>
  );
}
