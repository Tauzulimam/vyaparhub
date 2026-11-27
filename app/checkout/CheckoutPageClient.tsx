'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import {
  createCustomerAddressAction,
  placeCustomerOrderAction,
} from '@/lib/cart/actions';
import type { AuthenticatedCustomerContext } from '@/lib/cart/server';
import {
  type CreateCustomerAddressInput,
  createEmptyCustomerCartDto,
  type CustomerAddressDto,
  type CustomerAddressTag,
  type CustomerCartDto,
  deriveDeliveryLocationLabel,
} from '@/lib/cart/types';
import { useCustomerCart } from '@/lib/cart/useCustomerCart';

type CheckoutStep = 'address' | 'delivery' | 'payment' | 'review';

const STEPS: { id: CheckoutStep; label: string; short: string }[] = [
  { id: 'address', label: 'Delivery Address', short: 'Address' },
  { id: 'delivery', label: 'Delivery Info', short: 'Delivery' },
  { id: 'payment', label: 'Payment Method', short: 'Payment' },
  { id: 'review', label: 'Review & Place Order', short: 'Place Order' },
];

interface AddressFormProps {
  defaultName: string;
  onSave: (input: CreateCustomerAddressInput) => Promise<{
    success: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>;
  onCancel: () => void;
  canCancel: boolean;
}

function AddressForm({ defaultName, onSave, onCancel, canCancel }: AddressFormProps) {
  const [tag, setTag] = useState<CustomerAddressTag>('Home');
  const [recipientName, setRecipientName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      className="space-y-4 bg-white border border-[#E2E8E3] rounded-2xl p-5 mt-4 shadow-xs"
    >
      <h3 className="text-sm font-bold text-[#17201A]">New Delivery Address</h3>

      {formError && (
        <div
          role="alert"
          className="rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/25 p-3 text-xs font-medium text-[#DC2626]"
        >
          {formError}
        </div>
      )}

      {/* Address Tag */}
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
        {canCancel && (
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" isLoading={isSaving} disabled={isSaving}>
          Save Address
        </Button>
      </div>
    </form>
  );
}

interface CheckoutPageClientProps {
  customer: AuthenticatedCustomerContext;
  initialCart: CustomerCartDto;
  initialAddresses: CustomerAddressDto[];
}

export default function CheckoutPageClient({
  customer,
  initialCart,
  initialAddresses,
}: CheckoutPageClientProps) {
  const initialLocationLabel = deriveDeliveryLocationLabel(initialAddresses);
  const {
    cart,
    items,
    store,
    cartCount,
    subtotal,
    canCheckout,
    hasBlockingIssues,
    blockingIssues,
    syncCart,
    syncDeliveryLocation,
  } = useCustomerCart({
    initialCart,
    initialAuthStatus: 'authenticated_customer',
    initialLocationLabel,
    autoFetch: false,
  });

  const router = useRouter();
  const submittingRef = useRef<boolean>(false);

  const [addresses, setAddresses] = useState<CustomerAddressDto[]>(initialAddresses);
  const deliveryLocationLabel = deriveDeliveryLocationLabel(addresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    initialAddresses.find((a) => a.isDefault)?.id || initialAddresses[0]?.id || ''
  );
  const [showAddressForm, setShowAddressForm] = useState<boolean>(initialAddresses.length === 0);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [placedOrderRedirecting, setPlacedOrderRedirecting] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  if (placedOrderRedirecting) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
        <Navbar cartItemCount={0} currentLocation={deliveryLocationLabel} />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#16A34A]/15 text-[#166534] border border-[#166534]/30 flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-[#17201A]">
              Order {placedOrderRedirecting.orderNumber} Placed!
            </h1>
            <p className="text-sm text-[#647067]">
              Taking you to your live order tracking page…
            </p>
          </div>
          <Link href={`/orders/${placedOrderRedirecting.orderId}?placed=1`}>
            <Button variant="primary" size="md">
              Open Order Details →
            </Button>
          </Link>
        </main>
        <Footer />
        <MobileNav cartItemCount={0} />
      </div>
    );
  }

  // Empty cart guard
  if (items.length === 0 || !store) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
        <Navbar cartItemCount={0} currentLocation={deliveryLocationLabel} />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-3xl">
            🛒
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#17201A]">Cart is Empty</h1>
            <p className="text-sm text-[#647067] mt-1">
              Add in-stock items from an open local store before checking out.
            </p>
          </div>
          <Link href="/stores">
            <Button variant="primary" size="md">
              Browse Open Stores
            </Button>
          </Link>
        </main>
        <Footer />
        <MobileNav cartItemCount={0} />
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goNext = () => {
    if (!canCheckout) return;
    setPlacementError(null);
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setCurrentStep(nextStep.id);
  };

  const handleSaveNewAddress = async (input: CreateCustomerAddressInput) => {
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
    setSelectedAddressId(res.address.id);
    setShowAddressForm(false);
    setPlacementError(null);
    return { success: true };
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || isPlacingOrder || submittingRef.current) return;
    submittingRef.current = true;
    setIsPlacingOrder(true);
    setPlacementError(null);

    const res = await placeCustomerOrderAction({
      addressId: selectedAddressId,
      expectedSubtotal: cart.subtotal,
      customerNote: deliveryInstructions,
    });

    if (!res.success) {
      submittingRef.current = false;
      setIsPlacingOrder(false);
      if (res.cart) {
        syncCart(res.cart, 'authenticated_customer');
      }
      setPlacementError(res.error);
      return;
    }

    setPlacedOrderRedirecting({
      orderId: res.orderId,
      orderNumber: res.orderNumber,
    });
    syncCart(createEmptyCustomerCartDto(), 'authenticated_customer');
    router.replace(`/orders/${res.orderId}?placed=1`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} currentLocation={deliveryLocationLabel} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067] mb-6">
          <Link href="/" className="hover:text-[#166534] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-[#166534] transition-colors">
            Cart
          </Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">Checkout</span>
        </nav>

        {/* Blocking Stale Cart Banner */}
        {hasBlockingIssues && (
          <div
            role="alert"
            className="mb-6 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 p-5 space-y-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#DC2626]">
                Checkout Blocked — Cart Needs Attention
              </p>
              <p className="text-xs text-[#17201A]">
                Store availability or item stock changed since items were added to your cart:
              </p>
              <ul className="list-disc list-inside text-xs text-[#17201A] space-y-1 pt-1">
                {blockingIssues.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
            <div>
              <Link href="/cart">
                <Button variant="danger" size="sm">
                  Return to Cart to Resolve →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Step Progress */}
        <nav aria-label="Checkout steps" className="mb-8">
          <ol className="flex items-center gap-0">
            {STEPS.map((step, idx) => {
              const isDone = idx < stepIndex;
              const isActive = idx === stepIndex;
              return (
                <li key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isDone && !isPlacingOrder) {
                          setPlacementError(null);
                          setCurrentStep(step.id);
                        }
                      }}
                      disabled={!isDone}
                      aria-current={isActive ? 'step' : undefined}
                      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#166534] text-white'
                          : isDone
                          ? 'bg-[#166534]/20 text-[#166534] cursor-pointer hover:bg-[#166534]/40'
                          : 'bg-[#E2E8E3] text-[#647067] cursor-not-allowed'
                      }`}
                    >
                      {isDone ? '✓' : idx + 1}
                    </button>
                    <span
                      className={`text-[10px] font-semibold hidden sm:block ${
                        isActive
                          ? 'text-[#166534]'
                          : isDone
                          ? 'text-[#647067]'
                          : 'text-[#647067]/50'
                      }`}
                    >
                      {step.short}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 ${
                        idx < stepIndex ? 'bg-[#166534]' : 'bg-[#E2E8E3]'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: Checkout Steps ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* STEP 1: Delivery Address */}
            {currentStep === 'address' && (
              <section aria-labelledby="address-heading" className="space-y-4">
                <h1 id="address-heading" className="text-xl font-extrabold text-[#17201A]">
                  Select Delivery Address
                </h1>

                {addresses.length === 0 && !showAddressForm && (
                  <p className="text-sm text-[#647067]">
                    No saved delivery addresses yet. Add one below to continue.
                  </p>
                )}

                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex gap-3 p-4 bg-white border rounded-2xl cursor-pointer transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-[#166534] ring-1 ring-[#166534]'
                        : 'border-[#E2E8E3] hover:border-[#166534]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery-address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => {
                        setSelectedAddressId(addr.id);
                        setPlacementError(null);
                      }}
                      className="mt-1 w-4 h-4 text-[#166534] focus:ring-[#166534]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
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
                    </div>
                  </label>
                ))}

                {showAddressForm ? (
                  <AddressForm
                    defaultName={customer.fullName}
                    onSave={handleSaveNewAddress}
                    onCancel={() => setShowAddressForm(false)}
                    canCancel={addresses.length > 0}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="flex items-center gap-2 text-sm font-semibold text-[#166534] hover:text-[#14532D] transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#166534]/10 flex items-center justify-center font-bold">
                      +
                    </span>
                    Add New Address
                  </button>
                )}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!selectedAddressId || !canCheckout}
                    onClick={goNext}
                  >
                    Continue to Delivery Info →
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 2: Delivery Info */}
            {currentStep === 'delivery' && (
              <section aria-labelledby="delivery-heading" className="space-y-4">
                <h1 id="delivery-heading" className="text-xl font-extrabold text-[#17201A]">
                  Delivery Information
                </h1>

                {selectedAddress && (
                  <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                      Delivering to
                    </p>
                    <p className="text-sm font-bold text-[#17201A]">
                      {selectedAddress.recipientName} ({selectedAddress.tag})
                    </p>
                    <p className="text-xs text-[#647067]">{selectedAddress.formattedAddress}</p>
                    {selectedAddress.landmark && (
                      <p className="text-xs text-[#647067]">Near: {selectedAddress.landmark}</p>
                    )}
                    <p className="text-xs text-[#647067]">📞 {selectedAddress.phone}</p>
                  </div>
                )}

                <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0">
                      ⏱️
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#647067]">Store Operating Hours</p>
                      <p className="text-sm font-bold text-[#17201A]">
                        {store.timing || store.deliveryTimeMin}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0">
                      🏪
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#647067]">Fulfilled by</p>
                      <p className="text-sm font-bold text-[#17201A]">{store.name}</p>
                      <p className="text-xs text-[#647067]">{store.address}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                  <label
                    className="block text-sm font-bold text-[#17201A]"
                    htmlFor="delivery-instructions"
                  >
                    Delivery Instructions (optional)
                  </label>
                  <textarea
                    id="delivery-instructions"
                    rows={3}
                    maxLength={250}
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="E.g., Ring bell twice, leave at gate, handle with care..."
                    className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] resize-none transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" size="md" onClick={() => setCurrentStep('address')}>
                    ← Back
                  </Button>
                  <Button variant="primary" size="md" disabled={!canCheckout} onClick={goNext}>
                    Continue to Payment →
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 3: Payment Method (Cash on Delivery Only) */}
            {currentStep === 'payment' && (
              <section aria-labelledby="payment-heading" className="space-y-4">
                <h1 id="payment-heading" className="text-xl font-extrabold text-[#17201A]">
                  Payment Method
                </h1>

                <label className="flex gap-3 p-4 bg-white border border-[#166534] ring-1 ring-[#166534] rounded-2xl cursor-pointer">
                  <input
                    type="radio"
                    name="payment-method"
                    value="COD"
                    checked
                    readOnly
                    className="mt-1 w-4 h-4 text-[#166534] focus:ring-[#166534]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💵</span>
                      <span className="text-sm font-bold text-[#17201A]">
                        Cash on Delivery (COD)
                      </span>
                      <span className="text-[10px] font-bold text-white bg-[#166534] px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-[#647067] mt-0.5">
                      Pay directly upon safe delivery from {store.name}.
                    </p>
                  </div>
                </label>

                <div className="flex gap-3">
                  <Button variant="outline" size="md" onClick={() => setCurrentStep('delivery')}>
                    ← Back
                  </Button>
                  <Button variant="primary" size="md" disabled={!canCheckout} onClick={goNext}>
                    Review Checkout →
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 4: Review & Place Order */}
            {currentStep === 'review' && (
              <section aria-labelledby="review-heading" className="space-y-4">
                <h1 id="review-heading" className="text-xl font-extrabold text-[#17201A]">
                  Review &amp; Place Order
                </h1>

                {placementError && (
                  <div
                    role="alert"
                    className="rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 p-4 text-xs font-medium text-[#DC2626]"
                  >
                    {placementError}
                  </div>
                )}

                {/* Items Summary */}
                <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                    Items from {store.name}
                  </p>
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={item.cartItemId} className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden shrink-0">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="40px"
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#17201A] line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[#647067]">
                            {item.unit} • ₹{item.unitPrice} × {item.quantity}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#17201A]">
                          ₹{item.lineSubtotal}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Delivery Address */}
                {selectedAddress && (
                  <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                        Deliver to
                      </p>
                      <button
                        type="button"
                        disabled={isPlacingOrder}
                        onClick={() => {
                          setPlacementError(null);
                          setCurrentStep('address');
                        }}
                        className="text-xs font-semibold text-[#166534] hover:underline disabled:opacity-40"
                      >
                        Change
                      </button>
                    </div>
                    <p className="text-sm font-bold text-[#17201A]">
                      {selectedAddress.recipientName} ({selectedAddress.tag})
                    </p>
                    <p className="text-xs text-[#647067]">{selectedAddress.formattedAddress}</p>
                    <p className="text-xs text-[#647067]">📞 {selectedAddress.phone}</p>
                    {deliveryInstructions && (
                      <p className="text-xs text-[#647067] italic pt-1">
                        &ldquo;{deliveryInstructions}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Summary */}
                <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4">
                  <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">
                    Payment Method
                  </p>
                  <p className="text-sm font-bold text-[#17201A] mt-1">
                    Cash on Delivery (COD) — Pay ₹{subtotal} on delivery
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="md"
                    disabled={isPlacingOrder}
                    onClick={() => setCurrentStep('payment')}
                  >
                    ← Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => void handlePlaceOrder()}
                    isLoading={isPlacingOrder}
                    disabled={isPlacingOrder || !selectedAddressId || !canCheckout}
                  >
                    {isPlacingOrder
                      ? 'Placing Order…'
                      : `Place Order (COD) • ₹${subtotal}`}
                  </Button>
                </div>
              </section>
            )}
          </div>

          {/* ── Right: Truthful Checkout Summary ────────────────────────── */}
          <div className="lg:w-80 xl:w-96 shrink-0">
            <div className="bg-white border border-[#E2E8E3] rounded-2xl p-5 shadow-xs sticky top-20 space-y-4">
              <h2 className="text-base font-bold text-[#17201A]">Checkout Summary</h2>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.cartItemId} className="flex justify-between text-xs">
                    <span className="text-[#647067] line-clamp-1 max-w-[70%]">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold text-[#17201A]">₹{item.lineSubtotal}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E2E8E3] space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#647067]">
                    Items ({cartCount} {cartCount === 1 ? 'unit' : 'units'})
                  </span>
                  <span className="font-semibold text-[#17201A]">₹{subtotal}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8E3] flex justify-between items-center">
                <span className="text-sm font-bold text-[#17201A]">Total (COD)</span>
                <span className="text-xl font-extrabold text-[#166534]">₹{subtotal}</span>
              </div>

              <div className="text-xs text-[#647067] space-y-1 pt-1 border-t border-[#E2E8E3]">
                <p>🏪 {store.name}</p>
                {selectedAddress && (
                  <p>
                    📍 {selectedAddress.area}, {selectedAddress.city} —{' '}
                    {selectedAddress.postalCode}
                  </p>
                )}
                <p>💵 Cash on Delivery</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav cartItemCount={cartCount} />
    </div>
  );
}
