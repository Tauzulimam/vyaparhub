'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import { useMockCart } from '@/lib/mockCart';
import { useMockOrders } from '@/lib/mockOrders';
import { useMockProfile } from '@/lib/mockProfile';
import { Address } from '@/types';

type PaymentMethod = 'COD' | 'MOCK_UPI' | 'MOCK_CARD';
type CheckoutStep = 'address' | 'delivery' | 'payment' | 'review';

const STEPS: { id: CheckoutStep; label: string; short: string }[] = [
  { id: 'address', label: 'Delivery Address', short: 'Address' },
  { id: 'delivery', label: 'Delivery Info', short: 'Delivery' },
  { id: 'payment', label: 'Payment Method', short: 'Payment' },
  { id: 'review', label: 'Review Order', short: 'Review' },
];

// ── Address Form ─────────────────────────────────────────────────────────────
interface AddressFormProps {
  onSave: (a: Omit<Address, 'id'>) => void;
  onCancel: () => void;
}

function AddressForm({ onSave, onCancel }: AddressFormProps) {
  const [tag, setTag] = useState<Address['tag']>('Home');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Gurugram');
  const [pincode, setPincode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ tag, name, phone, addressLine, landmark, city, pincode });
  };

  const inputCls =
    'w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-[#E2E8E3] rounded-2xl p-5 mt-4">
      <h3 className="text-sm font-bold text-[#17201A]">New Delivery Address</h3>

      {/* Tag */}
      <div>
        <label className="block text-xs font-semibold text-[#647067] mb-2">Address Type</label>
        <div className="flex gap-2">
          {(['Home', 'Work', 'Other'] as Address['tag'][]).map((t) => (
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
          <label className="block text-xs font-semibold text-[#647067] mb-1">Full Name *</label>
          <input required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipient name" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">Phone *</label>
          <input required className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#647067] mb-1">Address Line *</label>
        <input required className={inputCls} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="House/Flat no., Street, Area" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#647067] mb-1">Landmark (optional)</label>
        <input className={inputCls} value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near school, opposite park..." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">City *</label>
          <input required className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#647067] mb-1">Pincode *</label>
          <input required className={inputCls} value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="122001" maxLength={6} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm">Save Address</Button>
      </div>
    </form>
  );
}

// ── Main Checkout Page ────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { items, store, cartCount, subtotal, deliveryFee, platformFee, grandTotal } = useMockCart();
  const { placeOrder } = useMockOrders();
  const { profile, addAddress } = useMockProfile();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    profile.savedAddresses.find((a) => a.isDefault)?.id || profile.savedAddresses[0]?.id || ''
  );
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    profile.preferences.defaultNotes || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  const selectedAddress = profile.savedAddresses.find((a) => a.id === selectedAddressId);

  // Guard: empty cart
  if (items.length === 0 || !store) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-3xl">🛒</div>
          <div>
            <h1 className="text-xl font-bold text-[#17201A]">Cart is Empty</h1>
            <p className="text-sm text-[#647067] mt-1">Add items to your cart before checking out.</p>
          </div>
          <Link href="/stores">
            <Button variant="primary" size="md">Browse Stores</Button>
          </Link>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goNext = () => {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setCurrentStep(nextStep.id);
  };

  const handlePlaceOrder = () => {
    if (!selectedAddress) return;
    setIsPlacing(true);
    setTimeout(() => {
      const newOrder = placeOrder({
        storeId: store.id,
        storeName: store.name,
        storeAddress: store.address,
        items,
        subtotal,
        deliveryFee,
        platformFee,
        taxes: 0,
        total: grandTotal,
        deliveryAddress: selectedAddress,
        deliveryInstructions,
        paymentMethod,
      });
      setIsPlacing(false);
      router.push(`/orders/${newOrder.id}?placed=1`);
    }, 1200);
  };

  const handleAddressFormSave = (addrInput: Omit<Address, 'id'>) => {
    const newAddr = addAddress(addrInput);
    setSelectedAddressId(newAddr.id);
    setShowAddressForm(false);
  };

  const paymentLabel = {
    COD: 'Cash on Delivery',
    MOCK_UPI: 'UPI (Mock)',
    MOCK_CARD: 'Debit / Credit Card (Mock)',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067] mb-6">
          <Link href="/" className="hover:text-[#166534] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-[#166534] transition-colors">Cart</Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">Checkout</span>
        </nav>

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
                      onClick={() => isDone && setCurrentStep(step.id)}
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
                    <span className={`text-[10px] font-semibold hidden sm:block ${isActive ? 'text-[#166534]' : isDone ? 'text-[#647067]' : 'text-[#647067]/50'}`}>
                      {step.short}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${idx < stepIndex ? 'bg-[#166534]' : 'bg-[#E2E8E3]'}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: Steps ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* STEP 1: Address */}
            {currentStep === 'address' && (
              <section aria-labelledby="address-heading" className="space-y-4">
                <h1 id="address-heading" className="text-xl font-extrabold text-[#17201A]">Select Delivery Address</h1>

                {profile.savedAddresses.length === 0 && !showAddressForm && (
                  <p className="text-sm text-[#647067]">No saved addresses. Add one below.</p>
                )}

                {profile.savedAddresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex gap-3 p-4 bg-white border rounded-2xl cursor-pointer transition-colors ${
                      selectedAddressId === addr.id ? 'border-[#166534] ring-1 ring-[#166534]' : 'border-[#E2E8E3] hover:border-[#166534]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery-address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 w-4 h-4 text-[#166534] focus:ring-[#166534]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white bg-[#166534] px-2 py-0.5 rounded-full">{addr.tag}</span>
                        {addr.isDefault && (
                          <span className="text-xs font-semibold text-[#166534]">Default</span>
                        )}
                        <span className="text-sm font-bold text-[#17201A]">{addr.name}</span>
                      </div>
                      <p className="text-xs text-[#647067]">{addr.addressLine}</p>
                      {addr.landmark && <p className="text-xs text-[#647067]">Near: {addr.landmark}</p>}
                      <p className="text-xs text-[#647067]">{addr.city} — {addr.pincode}</p>
                      <p className="text-xs text-[#647067]">{addr.phone}</p>
                    </div>
                  </label>
                ))}

                {showAddressForm ? (
                  <AddressForm onSave={handleAddressFormSave} onCancel={() => setShowAddressForm(false)} />
                ) : (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="flex items-center gap-2 text-sm font-semibold text-[#166534] hover:text-[#14532D] transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#166534]/10 flex items-center justify-center font-bold">+</span>
                    Add New Address
                  </button>
                )}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!selectedAddressId}
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
                <h1 id="delivery-heading" className="text-xl font-extrabold text-[#17201A]">Delivery Information</h1>

                {selectedAddress && (
                  <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">Delivering to</p>
                    <p className="text-sm font-bold text-[#17201A]">{selectedAddress.name}</p>
                    <p className="text-xs text-[#647067]">{selectedAddress.addressLine}</p>
                    {selectedAddress.landmark && <p className="text-xs text-[#647067]">Near: {selectedAddress.landmark}</p>}
                    <p className="text-xs text-[#647067]">{selectedAddress.city} — {selectedAddress.pincode}</p>
                  </div>
                )}

                <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0">⏱️</div>
                    <div>
                      <p className="text-xs font-semibold text-[#647067]">Estimated Delivery</p>
                      <p className="text-sm font-bold text-[#17201A]">{store.deliveryTimeMin || '20–30 mins'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0">🏪</div>
                    <div>
                      <p className="text-xs font-semibold text-[#647067]">Fulfilled by</p>
                      <p className="text-sm font-bold text-[#17201A]">{store.name}</p>
                      {store.address && <p className="text-xs text-[#647067]">{store.address}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-2">
                  <label className="block text-sm font-bold text-[#17201A]" htmlFor="delivery-instructions">
                    Delivery Instructions (optional)
                  </label>
                  <textarea
                    id="delivery-instructions"
                    rows={3}
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="E.g., Ring bell twice, leave at door, handle with care..."
                    className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] resize-none transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" size="md" onClick={() => setCurrentStep('address')}>← Back</Button>
                  <Button variant="primary" size="md" onClick={goNext}>Continue to Payment →</Button>
                </div>
              </section>
            )}

            {/* STEP 3: Payment */}
            {currentStep === 'payment' && (
              <section aria-labelledby="payment-heading" className="space-y-4">
                <h1 id="payment-heading" className="text-xl font-extrabold text-[#17201A]">Select Payment Method</h1>

                {[
                  {
                    id: 'COD' as PaymentMethod,
                    label: 'Cash on Delivery',
                    sub: 'Pay the delivery person when your order arrives',
                    icon: '💵',
                    recommended: true,
                  },
                  {
                    id: 'MOCK_UPI' as PaymentMethod,
                    label: 'UPI',
                    sub: 'Mock UPI payment (prototype only — not real)',
                    icon: '📱',
                    recommended: false,
                  },
                  {
                    id: 'MOCK_CARD' as PaymentMethod,
                    label: 'Debit / Credit Card',
                    sub: 'Mock card payment (prototype only — not real)',
                    icon: '💳',
                    recommended: false,
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex gap-3 p-4 bg-white border rounded-2xl cursor-pointer transition-colors ${
                      paymentMethod === opt.id
                        ? 'border-[#166534] ring-1 ring-[#166534]'
                        : 'border-[#E2E8E3] hover:border-[#166534]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={opt.id}
                      checked={paymentMethod === opt.id}
                      onChange={() => setPaymentMethod(opt.id)}
                      className="mt-1 w-4 h-4 text-[#166534] focus:ring-[#166534]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{opt.icon}</span>
                        <span className="text-sm font-bold text-[#17201A]">{opt.label}</span>
                        {opt.recommended && (
                          <span className="text-[10px] font-bold text-white bg-[#166534] px-2 py-0.5 rounded-full">Recommended</span>
                        )}
                      </div>
                      <p className="text-xs text-[#647067] mt-0.5">{opt.sub}</p>
                      {opt.id !== 'COD' && (
                        <p className="text-xs text-[#B45309] mt-1">
                          ⚠ This is a prototype. No real payment is processed.
                        </p>
                      )}
                    </div>
                  </label>
                ))}

                <div className="flex gap-3">
                  <Button variant="outline" size="md" onClick={() => setCurrentStep('delivery')}>← Back</Button>
                  <Button variant="primary" size="md" onClick={goNext}>Review Order →</Button>
                </div>
              </section>
            )}

            {/* STEP 4: Review */}
            {currentStep === 'review' && (
              <section aria-labelledby="review-heading" className="space-y-4">
                <h1 id="review-heading" className="text-xl font-extrabold text-[#17201A]">Review Your Order</h1>

                {/* Items Summary */}
                <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">Items from {store.name}</p>
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={item.product.id} className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg bg-[#F8FAF7] border border-[#E2E8E3] overflow-hidden shrink-0">
                          <Image src={item.product.image} alt={item.product.name} fill sizes="40px" className="object-contain p-1" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#17201A] line-clamp-1">{item.product.name}</p>
                          <p className="text-[11px] text-[#647067]">{item.product.unit} × {item.quantity}</p>
                        </div>
                        <span className="text-sm font-bold text-[#17201A]">₹{item.product.price * item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Delivery Address */}
                {selectedAddress && (
                  <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">Deliver to</p>
                      <button onClick={() => setCurrentStep('address')} className="text-xs font-semibold text-[#166534] hover:underline">Change</button>
                    </div>
                    <p className="text-sm font-bold text-[#17201A]">{selectedAddress.name} ({selectedAddress.tag})</p>
                    <p className="text-xs text-[#647067]">{selectedAddress.addressLine}, {selectedAddress.city}</p>
                    {deliveryInstructions && (
                      <p className="text-xs text-[#647067] italic">&ldquo;{deliveryInstructions}&rdquo;</p>
                    )}
                  </div>
                )}

                {/* Payment */}
                <div className="bg-white border border-[#E2E8E3] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#647067] uppercase tracking-wide">Payment</p>
                    <button onClick={() => setCurrentStep('payment')} className="text-xs font-semibold text-[#166534] hover:underline">Change</button>
                  </div>
                  <p className="text-sm font-bold text-[#17201A] mt-1">{paymentLabel[paymentMethod]}</p>
                  {paymentMethod !== 'COD' && (
                    <p className="text-xs text-[#B45309] mt-1">⚠ Prototype: no real payment processed.</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" size="md" onClick={() => setCurrentStep('payment')}>← Back</Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handlePlaceOrder}
                    isLoading={isPlacing}
                    disabled={isPlacing || !selectedAddressId}
                  >
                    {isPlacing ? 'Placing Order…' : 'Place Order →'}
                  </Button>
                </div>
              </section>
            )}
          </div>

          {/* ── Right: Order Summary (Sticky) ───────────────────────────── */}
          <div className="lg:w-80 xl:w-96 shrink-0">
            <div className="bg-white border border-[#E2E8E3] rounded-2xl p-5 shadow-xs sticky top-20 space-y-4">
              <h2 className="text-base font-bold text-[#17201A]">Order Summary</h2>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-xs">
                    <span className="text-[#647067] line-clamp-1 max-w-[70%]">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-semibold text-[#17201A]">₹{item.product.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E2E8E3] space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#647067]">Subtotal</span>
                  <span className="font-semibold text-[#17201A]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#647067]">Delivery</span>
                  {deliveryFee === 0 ? (
                    <span className="font-semibold text-[#166534]">FREE</span>
                  ) : (
                    <span className="font-semibold text-[#17201A]">₹{deliveryFee}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-[#647067]">Platform fee</span>
                  <span className="font-semibold text-[#17201A]">₹{platformFee}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8E3] flex justify-between items-center">
                <span className="text-sm font-bold text-[#17201A]">Total</span>
                <span className="text-xl font-extrabold text-[#166534]">₹{grandTotal}</span>
              </div>

              <div className="text-xs text-[#647067] space-y-0.5 pt-1">
                {selectedAddress && (
                  <p>📍 {selectedAddress.addressLine}, {selectedAddress.city}</p>
                )}
                <p>💳 {paymentLabel[paymentMethod]}</p>
                <p>⏱️ {store.deliveryTimeMin || '20–30 mins'}</p>
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
