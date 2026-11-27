'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/vendor/InventoryRow';
import { Icon } from '@/components/vendor/Icon';
import { Badge, Card, PageHeader, SectionTitle } from '@/components/vendor/ui';
import { isValidGstin, useVendorState } from '@/lib/vendorStore';
import type { CategoryOptionDto, GstStatus, UpdateStoreDetailsInput } from '@/types/vendor';

const Toggle: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, disabled = false, onChange }) => (
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
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#166534]' : 'bg-[#E2E8E3]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  </div>
);

const Field: React.FC<{
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, error, hint, children, className = '' }) => (
  <label className={`block text-xs font-semibold text-[#647067] ${className}`}>
    {label}
    <div className="mt-1">{children}</div>
    {hint && !error && <span className="block mt-1 text-[11px] font-normal text-[#647067]">{hint}</span>}
    {error && <span className="block mt-1 text-[#DC2626] font-normal">{error}</span>}
  </label>
);

const VerifiedReadOnlyField: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  verified?: boolean;
  badgeLabel?: string;
}> = ({ label, value, mono = false, verified = true, badgeLabel = 'Verified' }) => (
  <div className="block text-xs font-semibold text-[#647067]">
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      {verified && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#166534]">
          <Icon name="check" className="w-3.5 h-3.5" />
          {badgeLabel}
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

interface StoreDetailsFormProps {
  store: NonNullable<ReturnType<typeof useVendorState>['store']>;
  categories: CategoryOptionDto[];
  actions: ReturnType<typeof useVendorState>['actions'];
  isPending: boolean;
}

function StoreDetailsForm({ store, categories, actions, isPending }: StoreDetailsFormProps) {
  const isStoreVerified = store.verificationStatus === 'VERIFIED';
  const isBusinessLocked = store.gstVerified || isStoreVerified;
  const isSuspended =
    store.marketplaceStatus !== undefined && store.marketplaceStatus !== 'ACTIVE';
  const isRejected = store.verificationStatus === 'REJECTED';

  // Availability toggle state
  const [isTogglingOpen, setIsTogglingOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSavedMsg, setStatusSavedMsg] = useState<string | null>(null);

  // Identity & Business/GST form state (editable while unverified)
  const [identityForm, setIdentityForm] = useState({
    name: store.name,
    phone: store.phone,
    categoryId: store.categoryId || categories.find((c) => c.name === store.category)?.id || '',
    legalBusinessName: store.legalBusinessName ?? '',
    gstStatus: store.gstStatus as GstStatus,
    gstin: store.gstin ?? '',
  });
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityFieldErrors, setIdentityFieldErrors] = useState<Record<string, string>>({});

  // Operational, Location, Hours & Delivery form state
  const [opForm, setOpForm] = useState({
    description: store.description,
    email: store.email,
    addressLine1: store.addressLine1 ?? '',
    addressLine2: store.addressLine2 ?? '',
    area: store.area ?? '',
    city: store.city ?? '',
    state: store.state ?? '',
    postalCode: store.postalCode ?? '',
    latitude: store.latitude !== null && store.latitude !== undefined ? String(store.latitude) : '',
    longitude:
      store.longitude !== null && store.longitude !== undefined ? String(store.longitude) : '',
    openTime: store.openTime,
    closeTime: store.closeTime,
    deliveryRadiusKm: String(store.deliveryRadiusKm),
    minOrderAmount: String(store.minOrderAmount),
  });
  const [isSavingOp, setIsSavingOp] = useState(false);
  const [opSaved, setOpSaved] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [opFieldErrors, setOpFieldErrors] = useState<Record<string, string>>({});

  // Keep form inputs synchronized when authoritative server props update
  const storeSyncSignature = JSON.stringify({
    name: store.name,
    phone: store.phone,
    categoryId: store.categoryId,
    legalBusinessName: store.legalBusinessName,
    gstStatus: store.gstStatus,
    gstin: store.gstin,
    description: store.description,
    email: store.email,
    addressLine1: store.addressLine1,
    addressLine2: store.addressLine2,
    area: store.area,
    city: store.city,
    state: store.state,
    postalCode: store.postalCode,
    latitude: store.latitude,
    longitude: store.longitude,
    openTime: store.openTime,
    closeTime: store.closeTime,
    deliveryRadiusKm: store.deliveryRadiusKm,
    minOrderAmount: store.minOrderAmount,
  });
  const [prevSignature, setPrevSignature] = useState(storeSyncSignature);

  if (prevSignature !== storeSyncSignature) {
    setPrevSignature(storeSyncSignature);
    setIdentityForm({
      name: store.name,
      phone: store.phone,
      categoryId: store.categoryId || categories.find((c) => c.name === store.category)?.id || '',
      legalBusinessName: store.legalBusinessName ?? '',
      gstStatus: store.gstStatus,
      gstin: store.gstin ?? '',
    });
    setOpForm({
      description: store.description,
      email: store.email,
      addressLine1: store.addressLine1 ?? '',
      addressLine2: store.addressLine2 ?? '',
      area: store.area ?? '',
      city: store.city ?? '',
      state: store.state ?? '',
      postalCode: store.postalCode ?? '',
      latitude: store.latitude !== null && store.latitude !== undefined ? String(store.latitude) : '',
      longitude:
        store.longitude !== null && store.longitude !== undefined ? String(store.longitude) : '',
      openTime: store.openTime,
      closeTime: store.closeTime,
      deliveryRadiusKm: String(store.deliveryRadiusKm),
      minOrderAmount: String(store.minOrderAmount),
    });
  }

  const isMutatingStore = isTogglingOpen || isSavingIdentity || isSavingOp;

  const handleToggleOpen = async (nextOpen: boolean) => {
    if (isMutatingStore) return;
    setIsTogglingOpen(true);
    setStatusError(null);
    setStatusSavedMsg(null);
    const res = await actions.setStoreOpen(nextOpen);
    setIsTogglingOpen(false);
    if (!res.success) {
      setStatusError(res.error || 'Could not update store operating status.');
      return;
    }
    setStatusSavedMsg(nextOpen ? 'Store is now open ✓' : 'Store is now closed ✓');
  };

  const setIdentityField =
    (key: keyof typeof identityForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = key === 'gstin' ? e.target.value.toUpperCase() : e.target.value;
      setIdentityForm((prev) => ({ ...prev, [key]: value }));
      setIdentitySaved(false);
      setIdentityError(null);
      if (identityFieldErrors[key]) {
        setIdentityFieldErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    };

  const setOpField =
    (key: keyof typeof opForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setOpForm((prev) => ({ ...prev, [key]: e.target.value }));
      setOpSaved(false);
      setOpError(null);
      if (opFieldErrors[key] || opFieldErrors.hours || opFieldErrors.coordinates) {
        setOpFieldErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          if (key === 'openTime' || key === 'closeTime') delete next.hours;
          if (key === 'latitude' || key === 'longitude') delete next.coordinates;
          return next;
        });
      }
    };

  const trimmedGstin = identityForm.gstin.trim().toUpperCase();
  const clientGstinError =
    !isBusinessLocked && identityForm.gstStatus === 'REGISTERED'
      ? trimmedGstin === ''
        ? 'GSTIN is required for GST-registered stores.'
        : !isValidGstin(trimmedGstin)
        ? 'Enter a valid 15-character GSTIN (e.g. 06ABCDE1234F1Z5).'
        : ''
      : '';

  const saveIdentityAndBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutatingStore || (isStoreVerified && isBusinessLocked)) return;

    if (clientGstinError) {
      setIdentityFieldErrors({ gstin: clientGstinError });
      return;
    }

    const payload: UpdateStoreDetailsInput = {};
    if (!isStoreVerified) {
      payload.name = identityForm.name.trim();
      payload.phone = identityForm.phone.trim();
      if (identityForm.categoryId) {
        payload.categoryId = identityForm.categoryId;
      }
    }
    if (!isBusinessLocked) {
      payload.legalBusinessName = identityForm.legalBusinessName.trim() || null;
      payload.gstStatus = identityForm.gstStatus;
      payload.gstin = identityForm.gstStatus === 'REGISTERED' ? trimmedGstin : null;
    }

    setIsSavingIdentity(true);
    setIdentityError(null);
    setIdentityFieldErrors({});
    setIdentitySaved(false);

    const res = await actions.saveStoreDetails(payload);
    setIsSavingIdentity(false);

    if (!res.success) {
      setIdentityError(res.error || 'Could not save business details.');
      if (res.fieldErrors) {
        setIdentityFieldErrors(res.fieldErrors);
      }
      return;
    }

    setIdentitySaved(true);
  };

  // Client-side validation checks for operational form
  const radiusVal = Number(opForm.deliveryRadiusKm);
  const minOrderVal = Number(opForm.minOrderAmount);
  const latTrimmed = opForm.latitude.trim();
  const lngTrimmed = opForm.longitude.trim();
  const hasOneCoordOnly = (latTrimmed === '') !== (lngTrimmed === '');
  const latNum = latTrimmed === '' ? null : Number(latTrimmed);
  const lngNum = lngTrimmed === '' ? null : Number(lngTrimmed);

  const clientOpErrors: Record<string, string> = {};
  if (opForm.addressLine1.trim().length < 3) {
    clientOpErrors.addressLine1 = 'Shop / building / street address is required (min 3 characters).';
  }
  if (opForm.area.trim().length < 2) {
    clientOpErrors.area = 'Area or locality is required.';
  }
  if (opForm.city.trim().length < 2) {
    clientOpErrors.city = 'City is required.';
  }
  if (opForm.state.trim().length < 2) {
    clientOpErrors.state = 'State is required.';
  }
  if (!/^[1-9][0-9]{5}$/.test(opForm.postalCode.trim())) {
    clientOpErrors.postalCode = 'Enter a valid 6-digit Indian PIN code.';
  }
  if (
    opForm.email.trim() !== '' &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opForm.email.trim())
  ) {
    clientOpErrors.email = 'Enter a valid email address or leave blank.';
  }
  if (!opForm.openTime || !opForm.closeTime || opForm.openTime >= opForm.closeTime) {
    clientOpErrors.hours = 'Closing time must be strictly after opening time.';
  }
  if (
    opForm.deliveryRadiusKm.trim() === '' ||
    !Number.isFinite(radiusVal) ||
    radiusVal < 1 ||
    radiusVal > 10
  ) {
    clientOpErrors.deliveryRadiusKm = 'Delivery radius must be between 1 and 10 km.';
  }
  if (
    opForm.minOrderAmount.trim() === '' ||
    !Number.isFinite(minOrderVal) ||
    minOrderVal < 0
  ) {
    clientOpErrors.minimumOrderAmount = 'Minimum order amount cannot be negative.';
  }
  if (hasOneCoordOnly) {
    clientOpErrors.coordinates =
      'Provide both latitude and longitude together, or leave both blank.';
  } else if (latNum !== null && lngNum !== null) {
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      clientOpErrors.latitude = 'Latitude must be between -90 and 90.';
    }
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      clientOpErrors.longitude = 'Longitude must be between -180 and 180.';
    }
  }

  const saveOperationalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutatingStore) return;

    if (Object.keys(clientOpErrors).length > 0) {
      setOpFieldErrors(clientOpErrors);
      setOpError(Object.values(clientOpErrors)[0]);
      return;
    }

    setIsSavingOp(true);
    setOpError(null);
    setOpFieldErrors({});
    setOpSaved(false);

    const res = await actions.saveStoreDetails({
      description: opForm.description.trim(),
      email: opForm.email.trim(),
      addressLine1: opForm.addressLine1.trim(),
      addressLine2: opForm.addressLine2.trim(),
      area: opForm.area.trim(),
      city: opForm.city.trim(),
      state: opForm.state.trim(),
      postalCode: opForm.postalCode.trim(),
      latitude: latNum,
      longitude: lngNum,
      openingTime: opForm.openTime,
      closingTime: opForm.closeTime,
      deliveryRadiusKm: radiusVal,
      minimumOrderAmount: minOrderVal,
    });

    setIsSavingOp(false);

    if (!res.success) {
      setOpError(res.error || 'Could not save operational store settings.');
      if (res.fieldErrors) {
        setOpFieldErrors(res.fieldErrors);
      }
      return;
    }

    setOpSaved(true);
  };

  const formattedFullAddress = [
    store.addressLine1,
    store.addressLine2,
    store.area,
    store.city,
    store.state && store.postalCode ? `${store.state} - ${store.postalCode}` : store.state,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <PageHeader
        title="My Store"
        subtitle={`${store.name} — Manage real store details, business/GST information, operating hours, and delivery settings.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isSuspended && <Badge tone="red">Marketplace Suspended</Badge>}
            <Badge tone={store.isOpen && !isSuspended ? 'green' : 'red'}>
              {store.isOpen ? 'Open now' : 'Closed'}
            </Badge>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Real Operational Status & Authoritative Governance Summary */}
        <Card className="p-5 lg:col-span-1 self-start space-y-4">
          <div>
            <SectionTitle title="Availability & governance" />
            <div className="divide-y divide-[#E2E8E3]">
              <Toggle
                label="Store open"
                description={
                  isSuspended
                    ? 'Cannot open while store is suspended by marketplace admin.'
                    : isRejected
                    ? 'Cannot open while store verification is rejected.'
                    : 'Controls whether your store is currently open for customers.'
                }
                checked={store.isOpen}
                disabled={isMutatingStore || isPending || (!store.isOpen && (isSuspended || isRejected))}
                onChange={(v) => void handleToggleOpen(v)}
              />
            </div>

            {statusError && (
              <div
                role="alert"
                className="mt-2 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 p-3 text-xs font-medium text-[#DC2626]"
              >
                {statusError}
              </div>
            )}

            {statusSavedMsg && !statusError && (
              <p role="status" className="mt-2 text-xs font-semibold text-[#166534]">
                {statusSavedMsg}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-[#E2E8E3] space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#647067] font-medium">Order acceptance</span>
              <Badge tone={store.acceptingOrders ? 'green' : 'red'}>
                {store.acceptingOrders
                  ? 'Accepting orders'
                  : isSuspended
                  ? 'Suspended'
                  : 'Closed'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[#647067] font-medium">Marketplace status</span>
              <Badge tone={isSuspended ? 'red' : 'green'}>
                {isSuspended ? 'Suspended by Admin' : 'Active'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[#647067] font-medium">Store verification</span>
              <Badge
                tone={
                  isStoreVerified
                    ? 'green'
                    : isRejected
                    ? 'red'
                    : 'terracotta'
                }
              >
                {isStoreVerified
                  ? 'Verified'
                  : isRejected
                  ? 'Rejected'
                  : 'Pending'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[#647067] font-medium">GST verification</span>
              <Badge
                tone={
                  store.gstStatus === 'NOT_REGISTERED'
                    ? 'gray'
                    : store.gstVerified
                    ? 'green'
                    : 'terracotta'
                }
              >
                {store.gstStatus === 'NOT_REGISTERED'
                  ? 'Not GST Registered'
                  : store.gstVerified
                  ? 'GST Verified'
                  : 'Pending Verification'}
              </Badge>
            </div>
          </div>

          <p className="text-[11px] text-[#647067] leading-relaxed bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-3">
            <strong>Note:</strong> Closing your store pauses orders operationally and can be reopened anytime while your marketplace status is <strong>Active</strong>. Marketplace and verification statuses are managed by VyaparHub administration.
          </p>
        </Card>

        {/* Right Column: Business/GST Identity + Operational Store Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Store Identity & Business Details (StoreBusinessDetails) */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle title="Store identity & GST details" />
              <Badge
                tone={
                  isStoreVerified
                    ? 'green'
                    : isRejected
                    ? 'red'
                    : 'terracotta'
                }
              >
                {isStoreVerified
                  ? 'Verified Identity'
                  : isRejected
                  ? 'Verification Rejected'
                  : 'Pending Verification'}
              </Badge>
            </div>

            {identityError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-xs font-medium text-[#DC2626]"
              >
                {identityError}
              </div>
            )}

            <form onSubmit={saveIdentityAndBusiness} noValidate className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {isStoreVerified ? (
                  <VerifiedReadOnlyField label="Store Name" value={store.name} />
                ) : (
                  <Field label="Store Name *" error={identityFieldErrors.name}>
                    <input
                      className={inputClass}
                      value={identityForm.name}
                      onChange={setIdentityField('name')}
                      disabled={isSavingIdentity}
                    />
                  </Field>
                )}

                <VerifiedReadOnlyField
                  label="Owner Name"
                  value={store.ownerName}
                  badgeLabel="Profile"
                />

                {isStoreVerified ? (
                  <VerifiedReadOnlyField label="Store Contact Phone" value={store.phone} />
                ) : (
                  <Field label="Store Contact Phone *" error={identityFieldErrors.phone}>
                    <input
                      className={inputClass}
                      inputMode="tel"
                      value={identityForm.phone}
                      onChange={setIdentityField('phone')}
                      disabled={isSavingIdentity}
                    />
                  </Field>
                )}

                {isStoreVerified ? (
                  <VerifiedReadOnlyField label="Store Category" value={store.category} />
                ) : (
                  <Field label="Store Category *" error={identityFieldErrors.categoryId}>
                    <select
                      className={inputClass}
                      value={identityForm.categoryId}
                      onChange={setIdentityField('categoryId')}
                      disabled={isSavingIdentity}
                    >
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))
                      ) : (
                        <option value={store.categoryId ?? store.category}>
                          {store.category}
                        </option>
                      )}
                    </select>
                  </Field>
                )}

                {isBusinessLocked ? (
                  <>
                    <VerifiedReadOnlyField
                      label="Legal Business Name"
                      value={store.legalBusinessName || 'Not provided'}
                      verified={store.gstVerified || isStoreVerified}
                    />
                    <VerifiedReadOnlyField
                      label="GST Registration Status"
                      value={
                        store.gstStatus === 'REGISTERED'
                          ? 'GST Registered'
                          : 'Not GST Registered'
                      }
                      verified={store.gstVerified}
                    />
                    {store.gstStatus === 'REGISTERED' && store.gstin ? (
                      <div className="sm:col-span-2">
                        <VerifiedReadOnlyField
                          label="GSTIN"
                          value={store.gstin}
                          mono
                          verified={store.gstVerified}
                        />
                      </div>
                    ) : (
                      <div className="block text-xs font-semibold text-[#647067] sm:col-span-2">
                        <span>GSTIN</span>
                        <div className="mt-1 w-full rounded-lg border border-dashed border-[#E2E8E3] bg-[#F8FAF7] px-3 py-2 text-xs text-[#647067]">
                          Not applicable — store registered without GSTIN.
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Field
                      label="Legal Business Name"
                      error={identityFieldErrors.legalBusinessName}
                      hint="Registered trade or firm name as on tax/shop documents (optional)."
                      className="sm:col-span-2"
                    >
                      <input
                        className={inputClass}
                        placeholder="e.g. M/s Gupta Provision Enterprises"
                        value={identityForm.legalBusinessName}
                        onChange={setIdentityField('legalBusinessName')}
                        disabled={isSavingIdentity}
                      />
                    </Field>

                    <div className="sm:col-span-2 space-y-3">
                      <fieldset>
                        <legend className="text-xs font-semibold text-[#647067] mb-2">
                          GST Registration Status *
                        </legend>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {[
                            {
                              value: 'REGISTERED' as const,
                              title: 'GST Registered',
                              hint: 'Store has a valid 15-character GSTIN.',
                            },
                            {
                              value: 'NOT_REGISTERED' as const,
                              title: 'Not GST Registered',
                              hint: 'Exempt or below GST threshold — no GSTIN required.',
                            },
                          ].map((opt) => {
                            const active = identityForm.gstStatus === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                                  active
                                    ? 'border-[#166534] bg-[#166534]/5'
                                    : 'border-[#E2E8E3] bg-white hover:border-[#166534]/50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`gstStatus-${store.id}`}
                                  value={opt.value}
                                  checked={active}
                                  disabled={isSavingIdentity}
                                  onChange={() => {
                                    setIdentityForm((prev) => ({
                                      ...prev,
                                      gstStatus: opt.value,
                                    }));
                                    setIdentitySaved(false);
                                    setIdentityError(null);
                                  }}
                                  className="mt-0.5 accent-[#166534]"
                                />
                                <div>
                                  <p className="text-sm font-semibold text-[#17201A]">
                                    {opt.title}
                                  </p>
                                  <p className="text-xs text-[#647067]">{opt.hint}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>

                      {identityForm.gstStatus === 'REGISTERED' && (
                        <Field
                          label="GSTIN (15 characters) *"
                          error={identityFieldErrors.gstin || clientGstinError}
                          hint="Format: 2-digit state code + 10-character PAN + entity code + Z + check digit."
                        >
                          <input
                            className={`${inputClass} font-mono uppercase tracking-wider sm:max-w-md`}
                            maxLength={15}
                            placeholder="06ABCDE1234F1Z5"
                            value={identityForm.gstin}
                            onChange={setIdentityField('gstin')}
                            disabled={isSavingIdentity}
                          />
                        </Field>
                      )}
                    </div>
                  </>
                )}
              </div>

              {isStoreVerified && isBusinessLocked ? (
                <div className="flex items-start gap-2.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] px-3.5 py-2.5 text-xs text-[#647067]">
                  <Icon name="check" className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold text-[#17201A]">
                      Verified identity locked.
                    </span>{' '}
                    Store name, contact phone, category, legal business name, and GST registration details are verified and protected against modification.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E2E8E3]">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isMutatingStore || isPending || Boolean(clientGstinError)}
                  >
                    {isSavingIdentity ? 'Saving...' : 'Save identity & GST details'}
                  </Button>
                  {identitySaved && (
                    <span role="status" className="text-sm font-semibold text-[#166534]">
                      Identity & GST details saved to database ✓
                    </span>
                  )}
                  <span className="text-[11px] text-[#647067]">
                    Editable until verified by VyaparHub administration.
                  </span>
                </div>
              )}
            </form>
          </Card>

          {/* Card 2: Operational Store Information, Address, Coordinates, Hours & Delivery */}
          <Card className="p-5">
            <form onSubmit={saveOperationalSettings} noValidate className="space-y-5">
              <div>
                <SectionTitle title="Operational store information & location" />
                {opError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-xs font-medium text-[#DC2626]"
                  >
                    {opError}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Store description"
                    error={opFieldErrors.description}
                    className="sm:col-span-2"
                  >
                    <textarea
                      className={inputClass}
                      rows={3}
                      maxLength={500}
                      placeholder="Describe your store specialties and neighbourhood offerings..."
                      value={opForm.description}
                      onChange={setOpField('description')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field
                    label="Support / notification email"
                    error={opFieldErrors.email}
                    className="sm:col-span-2"
                  >
                    <input
                      type="email"
                      className={inputClass}
                      placeholder="store-support@example.com"
                      value={opForm.email}
                      onChange={setOpField('email')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field
                    label="Shop / Building / Street (Address Line 1) *"
                    error={opFieldErrors.addressLine1}
                    className="sm:col-span-2"
                  >
                    <input
                      className={inputClass}
                      placeholder="e.g. Shop 12, Main Market"
                      value={opForm.addressLine1}
                      onChange={setOpField('addressLine1')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field
                    label="Landmark / Floor / Block (Address Line 2)"
                    error={opFieldErrors.addressLine2}
                    className="sm:col-span-2"
                  >
                    <input
                      className={inputClass}
                      placeholder="e.g. Near Metro Gate 2 (optional)"
                      value={opForm.addressLine2}
                      onChange={setOpField('addressLine2')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field label="Area / Locality *" error={opFieldErrors.area}>
                    <input
                      className={inputClass}
                      placeholder="e.g. Sector 14"
                      value={opForm.area}
                      onChange={setOpField('area')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field label="City *" error={opFieldErrors.city}>
                    <input
                      className={inputClass}
                      placeholder="e.g. Gurugram"
                      value={opForm.city}
                      onChange={setOpField('city')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field label="State *" error={opFieldErrors.state}>
                    <input
                      className={inputClass}
                      placeholder="e.g. Haryana"
                      value={opForm.state}
                      onChange={setOpField('state')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field label="PIN Code (6 digits) *" error={opFieldErrors.postalCode}>
                    <input
                      className={inputClass}
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="e.g. 122001"
                      value={opForm.postalCode}
                      onChange={setOpField('postalCode')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field
                    label="Latitude (optional)"
                    error={opFieldErrors.latitude || opFieldErrors.coordinates}
                    hint="Decimal degrees (-90 to 90)"
                  >
                    <input
                      type="number"
                      step="0.000001"
                      min={-90}
                      max={90}
                      className={inputClass}
                      placeholder="e.g. 28.459497"
                      value={opForm.latitude}
                      onChange={setOpField('latitude')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field
                    label="Longitude (optional)"
                    error={opFieldErrors.longitude}
                    hint="Decimal degrees (-180 to 180)"
                  >
                    <input
                      type="number"
                      step="0.000001"
                      min={-180}
                      max={180}
                      className={inputClass}
                      placeholder="e.g. 77.026638"
                      value={opForm.longitude}
                      onChange={setOpField('longitude')}
                      disabled={isSavingOp}
                    />
                  </Field>
                </div>

                <p className="mt-2 text-[11px] text-[#647067]">
                  Current formatted address: <span className="font-medium text-[#17201A]">{formattedFullAddress}</span>
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2E8E3]">
                <SectionTitle title="Operating hours & delivery settings" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Opens at *" error={opFieldErrors.openingTime}>
                    <input
                      type="time"
                      className={inputClass}
                      value={opForm.openTime}
                      onChange={setOpField('openTime')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field
                    label="Closes at *"
                    error={opFieldErrors.closingTime || opFieldErrors.hours}
                  >
                    <input
                      type="time"
                      className={inputClass}
                      value={opForm.closeTime}
                      onChange={setOpField('closeTime')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field
                    label="Delivery radius (km, 1–10) *"
                    error={opFieldErrors.deliveryRadiusKm}
                  >
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step="0.5"
                      className={inputClass}
                      value={opForm.deliveryRadiusKm}
                      onChange={setOpField('deliveryRadiusKm')}
                      disabled={isSavingOp}
                    />
                  </Field>

                  <Field
                    label="Minimum order amount (₹) *"
                    error={opFieldErrors.minimumOrderAmount}
                  >
                    <input
                      type="number"
                      min={0}
                      step="1"
                      className={inputClass}
                      value={opForm.minOrderAmount}
                      onChange={setOpField('minOrderAmount')}
                      disabled={isSavingOp}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E2E8E3]">
                <Button type="submit" disabled={isMutatingStore || isPending}>
                  {isSavingOp ? 'Saving...' : 'Save operational changes'}
                </Button>
                {opSaved && (
                  <span role="status" className="text-sm font-semibold text-[#166534]">
                    Operational changes saved to database ✓
                  </span>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function VendorStorePage() {
  const { store, categories, actions, isPending } = useVendorState();

  if (!store) {
    return (
      <>
        <PageHeader
          title="My Store"
          subtitle="Manage store details and operational settings."
        />
        <Card className="p-8 text-center max-w-xl mx-auto space-y-4 border-2 border-dashed border-[#166534]/30 bg-white">
          <div className="w-16 h-16 rounded-2xl bg-[#166534]/10 text-[#166534] flex items-center justify-center mx-auto">
            <Icon name="store" className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#17201A]">No store registered</h2>
            <p className="text-sm text-[#647067]">
              You have not registered any store yet. Register your store to manage operating hours, delivery radius, and business details.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/vendor/stores/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#166534] text-white text-sm font-semibold hover:bg-[#14532d] shadow-sm transition-colors"
            >
              <Icon name="plus" className="w-4 h-4" />
              Register New Store
            </Link>
          </div>
        </Card>
      </>
    );
  }

  return (
    <StoreDetailsForm
      key={store.id}
      store={store}
      categories={categories}
      actions={actions}
      isPending={isPending}
    />
  );
}
