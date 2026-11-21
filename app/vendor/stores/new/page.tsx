'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/vendor/InventoryRow';
import { Card, PageHeader, SectionTitle } from '@/components/vendor/ui';
import { STORE_CATEGORIES } from '@/data/vendorData';
import { isValidGstin, useVendorState } from '@/lib/vendorStore';
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
  const { store, actions } = useVendorState();
  const [submitted, setSubmitted] = useState(false);
  const [gstStatus, setGstStatus] = useState<GstStatus>('NOT_REGISTERED');
  const [gstin, setGstin] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: STORE_CATEGORIES[0],
    ownerName: store.ownerName,
    phone: store.phone,
    email: store.email,
    address: '',
    openTime: '09:00',
    closeTime: '21:00',
    description: '',
    deliveryRadiusKm: '3',
    minOrderAmount: '100',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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

  const errors = {
    name: form.name.trim() === '' ? 'Store name is required.' : '',
    ownerName: form.ownerName.trim() === '' ? 'Owner name is required.' : '',
    phone: form.phone.trim().replace(/\D/g, '').length < 10 ? 'Enter a valid 10-digit phone number.' : '',
    address: form.address.trim() === '' ? 'Store address is required.' : '',
    hours: form.openTime >= form.closeTime ? 'Closing time must be after opening time.' : '',
    radius: !(radius > 0 && radius <= 10) ? 'Radius must be between 1 and 10 km.' : '',
    minOrder: !(minOrder >= 0) ? 'Minimum order cannot be negative.' : '',
    gstin: gstinError,
  };
  const valid = Object.values(errors).every((e) => e === '');
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    actions.registerStore({
      name: form.name.trim(),
      category: form.category,
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      openTime: form.openTime,
      closeTime: form.closeTime,
      description: form.description.trim(),
      deliveryRadiusKm: radius,
      minOrderAmount: minOrder,
      gstStatus,
      gstin: gstStatus === 'REGISTERED' ? trimmedGstin : undefined,
    });
    router.push('/vendor/store');
  };

  return (
    <>
      <PageHeader
        title="Register New Store"
        subtitle="Add another store to your vendor account. Mock flow only — nothing is saved to a server."
        actions={
          <Link href="/vendor">
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      <Card className="p-5">
        <form onSubmit={submit} className="space-y-6" noValidate>
          <div>
            <SectionTitle title="Store details" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Store name *" error={show('name')}>
                <input className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. ABC Fresh Mart" />
              </Field>
              <Field label="Store category / type">
                <select className={inputClass} value={form.category} onChange={set('category')}>
                  {STORE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="About the store" className="sm:col-span-2">
                <textarea className={inputClass} rows={3} value={form.description} onChange={set('description')} placeholder="What does your store offer?" />
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle title="Owner & contact" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Owner name *" error={show('ownerName')}>
                <input className={inputClass} value={form.ownerName} onChange={set('ownerName')} />
              </Field>
              <Field label="Contact phone *" error={show('phone')}>
                <input className={inputClass} value={form.phone} onChange={set('phone')} inputMode="tel" />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input type="email" className={inputClass} value={form.email} onChange={set('email')} />
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle title="GST & tax information" />
            <div className="space-y-4">
              <fieldset>
                <legend className="text-xs font-semibold text-[#647067] mb-2">GST Registration Status *</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(
                    [
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
                    ]
                  ).map((opt) => {
                    const active = gstStatus === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                          active ? 'border-[#166534] bg-[#166534]/5' : 'border-[#E2E8E3] bg-white hover:border-[#166534]/50'
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
                  <Field label="GSTIN (15 characters) *" error={show('gstin') || (gstin !== '' && !isValidGstin(trimmedGstin) ? errors.gstin : '')}>
                    <input
                      className={`${inputClass} font-mono uppercase tracking-wider`}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      maxLength={15}
                      placeholder="06ABCDE1234F1Z5"
                    />
                  </Field>
                  <p className="mt-1 text-[11px] text-[#647067]">
                    Format: 2-digit state code + 10-character PAN + entity code + Z + check digit. Once verified, your GSTIN becomes read-only.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionTitle title="Location & hours" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Store address *" error={show('address')} className="sm:col-span-2">
                <input className={inputClass} value={form.address} onChange={set('address')} placeholder="Shop no., street, area, city" />
              </Field>
              <Field label="Opens at">
                <input type="time" className={inputClass} value={form.openTime} onChange={set('openTime')} />
              </Field>
              <Field label="Closes at" error={show('hours')}>
                <input type="time" className={inputClass} value={form.closeTime} onChange={set('closeTime')} />
              </Field>
              <Field label="Delivery radius (km, max 10)" error={show('radius')}>
                <input type="number" min={1} max={10} step={0.5} className={inputClass} value={form.deliveryRadiusKm} onChange={set('deliveryRadiusKm')} />
              </Field>
              <Field label="Minimum order (₹)" error={show('minOrder')}>
                <input type="number" min={0} className={inputClass} value={form.minOrderAmount} onChange={set('minOrderAmount')} />
              </Field>
            </div>
            <p className="mt-2 text-xs text-[#647067]">Map pin / exact location selection will arrive in a later phase.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E2E8E3]">
            <Button type="submit" size="lg">
              Register store
            </Button>
            <p className="text-xs text-[#647067]">The new store starts closed with an empty inventory — add products from the master catalog next.</p>
          </div>
        </form>
      </Card>
    </>
  );
}
