'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import { LogoutButton } from '@/components/auth/LogoutButton';
import {
  createCustomerAddressAction,
  deleteCustomerAddressAction,
  setDefaultCustomerAddressAction,
  updateCustomerAddressAction,
  updateCustomerProfileNameAction,
} from '@/lib/cart/actions';
import {
  type CreateCustomerAddressInput,
  type CustomerAddressDto,
  type CustomerAddressTag,
  type CustomerProfileDto,
  deriveDeliveryLocationLabel,
} from '@/lib/cart/types';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

type ProfileTab = 'details' | 'addresses' | 'orders';

interface AddressFormProps {
  initial?: CustomerAddressDto;
  defaultRecipientName: string;
  defaultPhone: string;
  onSave: (input: CreateCustomerAddressInput) => Promise<{
    success: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>;
  onCancel: () => void;
}

function AddressForm({
  initial,
  defaultRecipientName,
  defaultPhone,
  onSave,
  onCancel,
}: AddressFormProps) {
  const [tag, setTag] = useState<CustomerAddressTag>(initial?.tag || 'Home');
  const [recipientName, setRecipientName] = useState(
    initial?.recipientName || defaultRecipientName
  );
  const [phone, setPhone] = useState(initial?.phone || defaultPhone);
  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 || '');
  const [landmark, setLandmark] = useState(initial?.landmark || '');
  const [area, setArea] = useState(initial?.area || '');
  const [city, setCity] = useState(initial?.city || '');
  const [state, setState] = useState(initial?.state || '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode || '');
  const [isDefault, setIsDefault] = useState<boolean>(initial?.isDefault ?? true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});

    const res = await onSave({
      tag,
      recipientName,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      area,
      city,
      state,
      postalCode,
      isDefault,
    });

    setIsSaving(false);
    if (!res.success) {
      setFormError(res.error || 'Could not save address.');
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      }
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors';

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
      {formError && (
        <div
          role="alert"
          className="rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/25 p-3 text-xs font-medium text-[#DC2626]"
        >
          {formError}
        </div>
      )}

      {/* Tag */}
      <div>
        <label className="block text-xs font-semibold text-[#647067] mb-2">Address Type</label>
        <div className="flex gap-2">
          {(['Home', 'Work', 'Other'] as CustomerAddressTag[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                tag === t
                  ? 'bg-[#166534] text-white border-[#166534]'
                  : 'bg-white text-[#647067] border-[#E2E8E3] hover:border-[#166534]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">
            Recipient Name *
          </label>
          <input
            required
            className={inputCls}
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Full name"
          />
          {fieldErrors.recipientName && (
            <span className="block mt-1 text-xs text-[#DC2626]">{fieldErrors.recipientName}</span>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">
            Mobile Number (10 digits) *
          </label>
          <input
            required
            inputMode="tel"
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
          />
          {fieldErrors.phone && (
            <span className="block mt-1 text-xs text-[#DC2626]">{fieldErrors.phone}</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#647067] mb-1">
          House / Flat / Building / Street (Address Line 1) *
        </label>
        <input
          required
          className={inputCls}
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="House/Flat no., Building, Street"
        />
        {fieldErrors.addressLine1 && (
          <span className="block mt-1 text-xs text-[#DC2626]">{fieldErrors.addressLine1}</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">
            Address Line 2 (optional)
          </label>
          <input
            className={inputCls}
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Apartment / Block / Colony"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">
            Landmark (optional)
          </label>
          <input
            className={inputCls}
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="Near park, temple, school..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">
            Area / Locality *
          </label>
          <input
            required
            className={inputCls}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Gumpa"
          />
          {fieldErrors.area && (
            <span className="block mt-1 text-xs text-[#DC2626]">{fieldErrors.area}</span>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">City *</label>
          <input
            required
            className={inputCls}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Bidar"
          />
          {fieldErrors.city && (
            <span className="block mt-1 text-xs text-[#DC2626]">{fieldErrors.city}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">State *</label>
          <input
            required
            className={inputCls}
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. Karnataka"
          />
          {fieldErrors.state && (
            <span className="block mt-1 text-xs text-[#DC2626]">{fieldErrors.state}</span>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">
            PIN Code (6 digits) *
          </label>
          <input
            required
            inputMode="numeric"
            maxLength={6}
            className={inputCls}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="585401"
          />
          {fieldErrors.postalCode && (
            <span className="block mt-1 text-xs text-[#DC2626]">{fieldErrors.postalCode}</span>
          )}
        </div>
      </div>

      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#17201A]">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 rounded text-[#166534] border-[#E2E8E3] focus:ring-[#166534]"
        />
        <span>Set as my default delivery address</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" isLoading={isSaving} disabled={isSaving}>
          {initial ? 'Update Address' : 'Save Address'}
        </Button>
      </div>
    </form>
  );
}

interface ProfilePageClientProps {
  initialProfile: CustomerProfileDto;
  initialAddresses: CustomerAddressDto[];
}

export default function ProfilePageClient({
  initialProfile,
  initialAddresses,
}: ProfilePageClientProps) {
  const { cartCount, syncDeliveryLocation } = useCustomerCart({
    initialLocationLabel: deriveDeliveryLocationLabel(initialAddresses),
  });

  const [fullName, setFullName] = useState<string>(initialProfile.fullName);
  const [addresses, setAddresses] = useState<CustomerAddressDto[]>(initialAddresses);
  const deliveryLocationLabel = deriveDeliveryLocationLabel(addresses);
  const [activeTab, setActiveTab] = useState<ProfileTab>('details');

  const [editingDetails, setEditingDetails] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(initialProfile.fullName);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [isMutatingAddress, setIsMutatingAddress] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<{ text: string; isError?: boolean } | null>(
    null
  );

  const defaultAddress =
    addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  const locationSummary = defaultAddress
    ? `${defaultAddress.area}, ${defaultAddress.city} — ${defaultAddress.postalCode}`
    : 'No default delivery address saved';

  const avatarInitial = (
    fullName.trim().charAt(0) ||
    initialProfile.email.trim().charAt(0) ||
    'C'
  ).toUpperCase();

  const showFeedback = (text: string, isError = false) => {
    setSavedFeedback({ text, isError });
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingName) return;
    setIsSavingName(true);
    setNameError(null);

    const res = await updateCustomerProfileNameAction(editName);
    setIsSavingName(false);

    if (!res.success) {
      setNameError(res.error);
      return;
    }

    setFullName(res.fullName);
    setEditingDetails(false);
    showFeedback('Profile name saved to your account.');
  };

  const handleCreateAddress = async (input: CreateCustomerAddressInput) => {
    const res = await createCustomerAddressAction(input);
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        fieldErrors: res.fieldErrors,
      };
    }
    setAddresses(res.addresses);
    syncDeliveryLocation(deriveDeliveryLocationLabel(res.addresses));
    setShowAddressForm(false);
    showFeedback('New delivery address saved.');
    return { success: true };
  };

  const handleUpdateAddress = async (addressId: string, input: CreateCustomerAddressInput) => {
    const res = await updateCustomerAddressAction(addressId, input);
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        fieldErrors: res.fieldErrors,
      };
    }
    setAddresses(res.addresses);
    syncDeliveryLocation(deriveDeliveryLocationLabel(res.addresses));
    setEditingAddressId(null);
    showFeedback('Delivery address updated.');
    return { success: true };
  };

  const handleSetDefault = async (addressId: string) => {
    if (isMutatingAddress) return;
    setIsMutatingAddress(true);
    const res = await setDefaultCustomerAddressAction(addressId);
    setIsMutatingAddress(false);
    if (!res.success) {
      showFeedback(res.error, true);
      return;
    }
    setAddresses(res.addresses);
    syncDeliveryLocation(deriveDeliveryLocationLabel(res.addresses));
    showFeedback('Default delivery address updated.');
  };

  const handleConfirmDelete = async () => {
    if (!deletingAddressId || isMutatingAddress) return;
    setIsMutatingAddress(true);
    const res = await deleteCustomerAddressAction(deletingAddressId);
    setIsMutatingAddress(false);
    setDeletingAddressId(null);
    if (!res.success) {
      showFeedback(res.error, true);
      return;
    }
    setAddresses(res.addresses);
    syncDeliveryLocation(deriveDeliveryLocationLabel(res.addresses));
    showFeedback('Address deleted.');
  };

  const inputCls =
    'w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors';

  const TABS: { id: ProfileTab; label: string; icon: string }[] = [
    { id: 'details', label: 'Profile', icon: '👤' },
    { id: 'addresses', label: 'Addresses', icon: '📍' },
    { id: 'orders', label: 'Orders', icon: '📦' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar
        cartItemCount={cartCount}
        currentLocation={deliveryLocationLabel}
      />

      {/* Toast Feedback */}
      {savedFeedback && (
        <aside
          aria-live="polite"
          className={`fixed top-20 right-4 z-50 max-w-sm p-3.5 bg-white border rounded-xl shadow-lg flex items-center gap-3 ${
            savedFeedback.isError ? 'border-[#DC2626]' : 'border-[#166534]'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 text-xs font-bold ${
              savedFeedback.isError ? 'bg-[#DC2626]' : 'bg-[#166534]'
            }`}
          >
            {savedFeedback.isError ? '!' : '✓'}
          </div>
          <p className="text-xs font-medium text-[#17201A]">{savedFeedback.text}</p>
        </aside>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-16 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067]">
          <Link href="/" className="hover:text-[#166534] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">My Profile</span>
        </nav>

        {/* Profile Header Card */}
        <div className="bg-white border border-[#E2E8E3] rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-5 shadow-xs">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#166534] to-[#14532D] text-white flex items-center justify-center text-2xl font-black shrink-0">
            {avatarInitial}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-[#17201A]">{fullName}</h1>
            <p className="text-xs text-[#647067]">{initialProfile.email}</p>
            <p className="text-xs text-[#647067]">{initialProfile.phone}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1 text-xs text-[#647067] bg-[#F8FAF7] border border-[#E2E8E3] px-2.5 py-1 rounded-full">
                📍 {locationSummary}
              </span>
              <span className="text-xs text-[#647067]">
                Member since {initialProfile.memberSinceLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-col sm:items-end items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#166534] bg-[#166534]/10 px-2.5 py-1 rounded-full">
                {initialProfile.orderCount}{' '}
                {initialProfile.orderCount === 1 ? 'order' : 'orders'}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#166534] text-white'
                  : 'bg-white border border-[#E2E8E3] text-[#647067] hover:border-[#166534]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Profile Details ──────────────────────────────────── */}
        {activeTab === 'details' && (
          <section
            aria-labelledby="details-heading"
            className="bg-white border border-[#E2E8E3] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <h2 id="details-heading" className="text-base font-bold text-[#17201A]">
                Personal Details
              </h2>
              {!editingDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditName(fullName);
                    setNameError(null);
                    setEditingDetails(true);
                  }}
                >
                  Edit Name
                </Button>
              )}
            </div>

            {editingDetails ? (
              <form onSubmit={(e) => void handleSaveDetails(e)} className="space-y-4">
                {nameError && (
                  <div
                    role="alert"
                    className="rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/25 p-3 text-xs font-medium text-[#DC2626]"
                  >
                    {nameError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#647067] mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      className={inputCls}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#647067] mb-1">
                      Registered Mobile (Account ID)
                    </label>
                    <div className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#647067]">
                      {initialProfile.phone}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#647067] mb-1">
                    Registered Email (Account ID)
                  </label>
                  <div className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#647067]">
                    {initialProfile.email}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSavingName}
                    onClick={() => setEditingDetails(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingName}
                    disabled={isSavingName}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Full Name', value: fullName },
                  { label: 'Phone', value: initialProfile.phone },
                  { label: 'Email', value: initialProfile.email },
                  {
                    label: 'Default Delivery Address',
                    value: defaultAddress
                      ? defaultAddress.formattedAddress
                      : 'Not set — add one in the Addresses tab',
                  },
                  { label: 'Member Since', value: initialProfile.memberSinceLabel },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                      {label}
                    </dt>
                    <dd className="mt-0.5 font-semibold text-[#17201A]">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {!editingDetails && (
              <div className="pt-4 border-t border-[#E2E8E3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                    Account Session
                  </h3>
                  <p className="text-xs text-[#647067]">
                    Sign out of your active session on this device
                  </p>
                </div>
                <LogoutButton />
              </div>
            )}
          </section>
        )}

        {/* ── Tab: Addresses ────────────────────────────────────────── */}
        {activeTab === 'addresses' && (
          <section aria-labelledby="addresses-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="addresses-heading" className="text-base font-bold text-[#17201A]">
                Saved Addresses
                <span className="ml-2 text-xs font-normal text-[#647067]">
                  ({addresses.length})
                </span>
              </h2>
              {!showAddressForm && !editingAddressId && (
                <Button variant="outline" size="sm" onClick={() => setShowAddressForm(true)}>
                  + Add New
                </Button>
              )}
            </div>

            {showAddressForm && (
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-[#17201A] mb-4">New Delivery Address</h3>
                <AddressForm
                  defaultRecipientName={fullName}
                  defaultPhone={initialProfile.phone}
                  onSave={handleCreateAddress}
                  onCancel={() => setShowAddressForm(false)}
                />
              </div>
            )}

            {addresses.length === 0 && !showAddressForm && (
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-2xl">
                  📍
                </div>
                <p className="text-sm text-[#647067]">
                  No saved delivery addresses yet. Addresses added here appear automatically at checkout.
                </p>
                <Button variant="primary" size="sm" onClick={() => setShowAddressForm(true)}>
                  Add First Address
                </Button>
              </div>
            )}

            <ul className="space-y-3">
              {addresses.map((addr) => (
                <li
                  key={addr.id}
                  className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs"
                >
                  {editingAddressId === addr.id ? (
                    <div>
                      <h3 className="text-sm font-bold text-[#17201A] mb-4">Edit Address</h3>
                      <AddressForm
                        initial={addr}
                        defaultRecipientName={fullName}
                        defaultPhone={initialProfile.phone}
                        onSave={(input) => handleUpdateAddress(addr.id, input)}
                        onCancel={() => setEditingAddressId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0 font-bold text-xs">
                        {addr.tag === 'Home' ? '🏠' : addr.tag === 'Work' ? '🏢' : '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-white bg-[#166534] px-2 py-0.5 rounded-full">
                            {addr.tag}
                          </span>
                          {addr.isDefault && (
                            <span className="text-xs font-semibold text-[#166534]">Default</span>
                          )}
                          <span className="text-sm font-bold text-[#17201A]">
                            {addr.recipientName}
                          </span>
                        </div>
                        <p className="text-xs text-[#647067]">{addr.formattedAddress}</p>
                        {addr.landmark && (
                          <p className="text-xs text-[#647067]">Near: {addr.landmark}</p>
                        )}
                        <p className="text-xs text-[#647067]">📞 {addr.phone}</p>

                        <div className="flex flex-wrap gap-3 mt-3">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              disabled={isMutatingAddress}
                              onClick={() => void handleSetDefault(addr.id)}
                              className="text-xs font-semibold text-[#166534] hover:underline disabled:opacity-40"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isMutatingAddress}
                            onClick={() => setEditingAddressId(addr.id)}
                            className="text-xs font-semibold text-[#647067] hover:text-[#17201A] disabled:opacity-40"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isMutatingAddress}
                            onClick={() => setDeletingAddressId(addr.id)}
                            className="text-xs font-semibold text-[#DC2626] hover:underline disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Tab: Orders ───────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <section aria-labelledby="orders-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="orders-heading" className="text-base font-bold text-[#17201A]">
                Order History
              </h2>
              {initialProfile.orderCount > 0 && (
                <Link href="/orders">
                  <Button variant="outline" size="sm">
                    View All ({initialProfile.orderCount}) →
                  </Button>
                </Link>
              )}
            </div>

            {initialProfile.orderCount === 0 ? (
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-2xl">
                  📦
                </div>
                <p className="text-sm font-semibold text-[#17201A]">No orders placed yet</p>
                <p className="text-xs text-[#647067]">
                  Orders placed with your account will appear here.
                </p>
                <div className="pt-1">
                  <Link href="/stores">
                    <Button variant="primary" size="sm">
                      Start Shopping
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-6 flex items-center justify-between gap-4 shadow-xs">
                <div>
                  <p className="text-sm font-bold text-[#17201A]">
                    You have {initialProfile.orderCount}{' '}
                    {initialProfile.orderCount === 1 ? 'order' : 'orders'} on your account
                  </p>
                  <p className="text-xs text-[#647067]">
                    View order statuses and details on your Orders page.
                  </p>
                </div>
                <Link href="/orders">
                  <Button variant="primary" size="sm">
                    Open Orders →
                  </Button>
                </Link>
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
      <MobileNav cartItemCount={cartCount} />

      {/* Delete Address Confirm Dialog */}
      {deletingAddressId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-addr-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mx-auto text-xl">
                🗑
              </div>
              <h2 id="delete-addr-title" className="text-base font-bold text-[#17201A]">
                Delete address?
              </h2>
              <p className="text-sm text-[#647067]">
                This address will be permanently removed from your saved addresses.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                fullWidth
                disabled={isMutatingAddress}
                onClick={() => setDeletingAddressId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                fullWidth
                isLoading={isMutatingAddress}
                disabled={isMutatingAddress}
                onClick={() => void handleConfirmDelete()}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
