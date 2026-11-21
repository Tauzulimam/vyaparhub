'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/vendor/InventoryRow';
import { Icon } from '@/components/vendor/Icon';
import { Badge, Card, PageHeader, SectionTitle } from '@/components/vendor/ui';
import { useVendorState } from '@/lib/vendorStore';

const Toggle: React.FC<{ label: string; description: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label,
  description,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-[#647067]">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] focus-visible:ring-offset-2 ${
        checked ? 'bg-[#166534]' : 'bg-[#E2E8E3]'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <label className={`block text-xs font-semibold text-[#647067] ${className}`}>
    {label}
    <div className="mt-1">{children}</div>
  </label>
);

const VerifiedReadOnlyField: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  verified?: boolean;
}> = ({ label, value, mono = false, verified = true }) => (
  <div className="block text-xs font-semibold text-[#647067]">
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      {verified && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#166534]">
          <Icon name="check" className="w-3.5 h-3.5" />
          Verified
        </span>
      )}
    </div>
    <div
      className={`mt-1 w-full rounded-lg border border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#17201A] select-all ${
        mono ? 'font-mono tracking-wider' : 'font-medium'
      }`}
      aria-readonly="true"
    >
      {value}
    </div>
  </div>
);

export default function VendorStorePage() {
  const { store, actions } = useVendorState();
  const [form, setForm] = useState({
    description: store.description,
    address: store.address,
    email: store.email,
    openTime: store.openTime,
    closeTime: store.closeTime,
    deliveryRadiusKm: String(store.deliveryRadiusKm),
    minOrderAmount: String(store.minOrderAmount),
  });
  const [saved, setSaved] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setSaved(false);
  };

  const radius = Number(form.deliveryRadiusKm);
  const minOrder = Number(form.minOrderAmount);
  const valid = form.address.trim() !== '' && radius > 0 && radius <= 10 && minOrder >= 0;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    actions.updateStore({
      description: form.description.trim(),
      address: form.address.trim(),
      email: form.email.trim(),
      openTime: form.openTime,
      closeTime: form.closeTime,
      deliveryRadiusKm: radius,
      minOrderAmount: minOrder,
    });
    setSaved(true);
  };

  const isGstRegistered = store.gstStatus === 'REGISTERED';

  return (
    <>
      <PageHeader
        title="My Store"
        subtitle="Manage store details and availability. Changes are mock-only in this prototype."
        actions={<Badge tone={store.isOpen ? 'green' : 'red'}>{store.isOpen ? 'Open now' : 'Closed'}</Badge>}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-1 self-start divide-y divide-[#E2E8E3]">
          <div className="pb-1">
            <SectionTitle title="Availability" />
          </div>
          <Toggle label="Store open" description="Shows your store as open to customers." checked={store.isOpen} onChange={(v) => actions.updateStore({ isOpen: v })} />
          <Toggle
            label="Accepting orders"
            description="Pause to stop new orders while staying visible."
            checked={store.acceptingOrders}
            onChange={(v) => actions.updateStore({ acceptingOrders: v })}
          />
          <Toggle label="Cash on Delivery" description="Allow COD payments." checked={store.codEnabled} onChange={(v) => actions.updateStore({ codEnabled: v })} />
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle title="Verified business & GST details" />
              <Badge tone="green">Verified Account</Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <VerifiedReadOnlyField label="Store Name" value={store.name} />
              <VerifiedReadOnlyField label="Owner Name" value={store.ownerName} />
              <VerifiedReadOnlyField label="Registered Mobile Number" value={store.phone} />
              <VerifiedReadOnlyField label="Store Category" value={store.category} />
              <VerifiedReadOnlyField
                label="GST Registration Status"
                value={isGstRegistered ? 'GST Registered' : 'Not GST Registered'}
                verified={false}
              />
              {isGstRegistered && store.gstin ? (
                <VerifiedReadOnlyField
                  label="Verified GSTIN"
                  value={store.gstin}
                  mono
                  verified={store.gstVerified}
                />
              ) : (
                <div className="block text-xs font-semibold text-[#647067]">
                  <span>GSTIN</span>
                  <div className="mt-1 w-full rounded-lg border border-dashed border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs text-[#647067]">
                    Not applicable — store registered without GSTIN.
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3.5 py-2.5 text-xs text-[#647067]">
              <Icon name="check" className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold text-[#17201A]">Verified account details.</span> Store name, owner name, registered mobile number{isGstRegistered ? ' and verified GSTIN' : ''} are locked after verification. Contact support to request changes or re-verification.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <form onSubmit={save} className="space-y-4">
              <SectionTitle title="Operational store information" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Description" className="sm:col-span-2">
                  <textarea className={inputClass} rows={3} value={form.description} onChange={set('description')} />
                </Field>
                <Field label="Store address" className="sm:col-span-2">
                  <input className={inputClass} value={form.address} onChange={set('address')} required />
                </Field>
                <Field label="Support / notification email" className="sm:col-span-2">
                  <input type="email" className={inputClass} value={form.email} onChange={set('email')} />
                </Field>
                <Field label="Opens at">
                  <input type="time" className={inputClass} value={form.openTime} onChange={set('openTime')} />
                </Field>
                <Field label="Closes at">
                  <input type="time" className={inputClass} value={form.closeTime} onChange={set('closeTime')} />
                </Field>
                <Field label="Delivery radius (km, max 10)">
                  <input type="number" min={1} max={10} step={0.5} className={inputClass} value={form.deliveryRadiusKm} onChange={set('deliveryRadiusKm')} />
                </Field>
                <Field label="Minimum order (₹)">
                  <input type="number" min={0} className={inputClass} value={form.minOrderAmount} onChange={set('minOrderAmount')} />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={!valid}>
                  Save operational changes
                </Button>
                {saved && <span className="text-sm font-semibold text-[#166534]">Saved ✓ (mock)</span>}
                {!valid && <span className="text-xs text-[#DC2626]">Check address, delivery radius and minimum order.</span>}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
