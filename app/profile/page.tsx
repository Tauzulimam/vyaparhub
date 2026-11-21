'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/Button';
import { useMockCart } from '@/lib/mockCart';
import { useMockProfile } from '@/lib/mockProfile';
import { useMockOrders } from '@/lib/mockOrders';
import { Address } from '@/types';

type ProfileTab = 'details' | 'addresses' | 'orders' | 'preferences';

// ── Address Form ─────────────────────────────────────────────────────────────
interface AddressFormProps {
  initial?: Partial<Address>;
  onSave: (a: Omit<Address, 'id'>) => void;
  onCancel: () => void;
}

function AddressForm({ initial, onSave, onCancel }: AddressFormProps) {
  const [tag, setTag] = useState<Address['tag']>(initial?.tag || 'Home');
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [addressLine, setAddressLine] = useState(initial?.addressLine || '');
  const [landmark, setLandmark] = useState(initial?.landmark || '');
  const [city, setCity] = useState(initial?.city || 'Gurugram');
  const [pincode, setPincode] = useState(initial?.pincode || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ tag, name, phone, addressLine, landmark, city, pincode });
  };

  const inputCls =
    'w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Button type="submit" variant="primary" size="sm">{initial?.addressLine ? 'Update Address' : 'Save Address'}</Button>
      </div>
    </form>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { cartCount } = useMockCart();
  const { profile, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, updatePreferences } = useMockProfile();
  const { orders } = useMockOrders();

  const [activeTab, setActiveTab] = useState<ProfileTab>('details');
  const [editingDetails, setEditingDetails] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editLocation, setEditLocation] = useState(profile.currentLocation);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name: editName, email: editEmail, phone: editPhone, currentLocation: editLocation });
    setEditingDetails(false);
    showFeedback('Profile details updated.');
  };

  const handleAddressFormSave = (addrInput: Omit<Address, 'id'>) => {
    if (editingAddressId) {
      updateAddress(editingAddressId, addrInput);
      setEditingAddressId(null);
      showFeedback('Address updated.');
    } else {
      addAddress(addrInput);
      setShowAddressForm(false);
      showFeedback('New address saved.');
    }
  };

  const recentOrders = orders.slice(0, 3);

  const inputCls =
    'w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors';

  const TABS: { id: ProfileTab; label: string; icon: string }[] = [
    { id: 'details', label: 'Profile', icon: '👤' },
    { id: 'addresses', label: 'Addresses', icon: '📍' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF7] text-[#17201A]">
      <Navbar cartItemCount={cartCount} />

      {/* Toast Feedback */}
      {savedFeedback && (
        <aside
          aria-live="polite"
          className="fixed top-20 right-4 z-50 max-w-sm p-3.5 bg-white border border-[#166534] rounded-xl shadow-lg flex items-center gap-3"
        >
          <div className="w-6 h-6 rounded-full bg-[#166534] text-white flex items-center justify-center shrink-0 text-xs font-bold">✓</div>
          <p className="text-xs font-medium text-[#17201A]">{savedFeedback}</p>
        </aside>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-16 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#647067]">
          <Link href="/" className="hover:text-[#166534] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#17201A] font-semibold">My Profile</span>
        </nav>

        {/* Profile Header Card */}
        <div className="bg-white border border-[#E2E8E3] rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-5 shadow-xs">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#166534] to-[#14532D] text-white flex items-center justify-center text-2xl font-black shrink-0">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-[#17201A]">{profile.name}</h1>
            <p className="text-xs text-[#647067]">{profile.email}</p>
            <p className="text-xs text-[#647067]">{profile.phone}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1 text-xs text-[#647067] bg-[#F8FAF7] border border-[#E2E8E3] px-2.5 py-1 rounded-full">
                📍 {profile.currentLocation}
              </span>
              <span className="text-xs text-[#647067]">Member since {profile.memberSince}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#166534] bg-[#166534]/10 px-2.5 py-1 rounded-full">
              {orders.length} orders
            </span>
            <span className="text-xs text-[#647067] bg-[#F8FAF7] border border-[#E2E8E3] px-2.5 py-1 rounded-full">
              🔒 Prototype
            </span>
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
          <section aria-labelledby="details-heading" className="bg-white border border-[#E2E8E3] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 id="details-heading" className="text-base font-bold text-[#17201A]">Personal Details</h2>
              {!editingDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditName(profile.name);
                    setEditEmail(profile.email);
                    setEditPhone(profile.phone);
                    setEditLocation(profile.currentLocation);
                    setEditingDetails(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>

            {editingDetails ? (
              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#647067] mb-1">Full Name</label>
                    <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#647067] mb-1">Phone</label>
                    <input className={inputCls} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#647067] mb-1">Email</label>
                  <input type="email" className={inputCls} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#647067] mb-1">Current Delivery Location</label>
                  <input className={inputCls} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Sector 14, Gurugram" />
                </div>
                <aside className="text-xs text-[#647067] bg-[#F8FAF7] border border-[#E2E8E3] px-3 py-2 rounded-xl">
                  🔒 Prototype: profile changes are saved locally only. No real authentication.
                </aside>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingDetails(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm">Save Changes</Button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Full Name', value: profile.name },
                  { label: 'Phone', value: profile.phone },
                  { label: 'Email', value: profile.email },
                  { label: 'Location', value: profile.currentLocation },
                  { label: 'Member Since', value: profile.memberSince },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold text-[#647067] uppercase tracking-wide">{label}</dt>
                    <dd className="mt-0.5 font-semibold text-[#17201A]">{value}</dd>
                  </div>
                ))}
              </dl>
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
                  ({profile.savedAddresses.length})
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
                <h3 className="text-sm font-bold text-[#17201A] mb-4">New Address</h3>
                <AddressForm
                  onSave={handleAddressFormSave}
                  onCancel={() => setShowAddressForm(false)}
                />
              </div>
            )}

            {profile.savedAddresses.length === 0 && !showAddressForm && (
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-2xl">📍</div>
                <p className="text-sm text-[#647067]">No saved addresses yet.</p>
                <Button variant="primary" size="sm" onClick={() => setShowAddressForm(true)}>Add First Address</Button>
              </div>
            )}

            <ul className="space-y-3">
              {profile.savedAddresses.map((addr) => (
                <li key={addr.id} className="bg-white border border-[#E2E8E3] rounded-2xl p-4 sm:p-5 shadow-xs">
                  {editingAddressId === addr.id ? (
                    <div>
                      <h3 className="text-sm font-bold text-[#17201A] mb-4">Edit Address</h3>
                      <AddressForm
                        initial={addr}
                        onSave={handleAddressFormSave}
                        onCancel={() => setEditingAddressId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center shrink-0 font-bold text-xs">
                        {addr.tag === 'Home' ? '🏠' : addr.tag === 'Work' ? '🏢' : '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
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

                        <div className="flex flex-wrap gap-2 mt-3">
                          {!addr.isDefault && (
                            <button
                              onClick={() => { setDefaultAddress(addr.id); showFeedback('Default address updated.'); }}
                              className="text-xs font-semibold text-[#166534] hover:underline"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            onClick={() => setEditingAddressId(addr.id)}
                            className="text-xs font-semibold text-[#647067] hover:text-[#17201A]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingAddressId(addr.id)}
                            className="text-xs font-semibold text-[#DC2626] hover:underline"
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
              <h2 id="orders-heading" className="text-base font-bold text-[#17201A]">Recent Orders</h2>
              <Link href="/orders">
                <Button variant="outline" size="sm">View All →</Button>
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="bg-white border border-[#E2E8E3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#F8FAF7] border border-[#E2E8E3] flex items-center justify-center mx-auto text-2xl">📦</div>
                <p className="text-sm text-[#647067]">No orders placed yet.</p>
                <Link href="/stores">
                  <Button variant="primary" size="sm">Start Shopping</Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-4 bg-white border border-[#E2E8E3] rounded-2xl p-4 hover:border-[#166534] hover:shadow-sm transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#647067]">{order.orderNumber}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            order.status === 'DELIVERED' ? 'bg-[#16A34A] text-white' :
                            order.status === 'CANCELLED' ? 'bg-[#DC2626]/10 text-[#DC2626]' :
                            'bg-[#166534]/10 text-[#166534]'
                          }`}>
                            {order.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : order.status.charAt(0) + order.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#17201A] group-hover:text-[#166534] transition-colors mt-0.5">{order.storeName}</p>
                        <p className="text-xs text-[#647067]">{order.items.length} items · ₹{order.total} · {order.createdAt}</p>
                      </div>
                      <svg className="w-4 h-4 text-[#647067] group-hover:text-[#166534] shrink-0 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── Tab: Preferences ─────────────────────────────────────── */}
        {activeTab === 'preferences' && (
          <section aria-labelledby="prefs-heading" className="bg-white border border-[#E2E8E3] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs">
            <h2 id="prefs-heading" className="text-base font-bold text-[#17201A]">Preferences &amp; Settings</h2>

            {/* Toggles */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#647067] uppercase tracking-wider">Notifications</h3>

              {[
                { key: 'smsUpdates', label: 'SMS Order Updates', sub: 'Receive SMS for order status changes' },
                { key: 'whatsappUpdates', label: 'WhatsApp Updates', sub: 'Get order updates on WhatsApp' },
                { key: 'vegetarianOnly', label: 'Vegetarian Products Only', sub: 'Filter products to show vegetarian items' },
              ].map(({ key, label, sub }) => (
                <label key={key} className="flex items-start justify-between gap-4 cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-[#17201A] group-hover:text-[#166534] transition-colors">{label}</p>
                    <p className="text-xs text-[#647067]">{sub}</p>
                  </div>
                  <div className="relative shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={profile.preferences[key as keyof typeof profile.preferences] as boolean}
                      onChange={(e) => updatePreferences({ [key]: e.target.checked })}
                    />
                    <div
                      onClick={() => updatePreferences({ [key]: !profile.preferences[key as keyof typeof profile.preferences] })}
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        profile.preferences[key as keyof typeof profile.preferences] ? 'bg-[#166534]' : 'bg-[#E2E8E3]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${
                          profile.preferences[key as keyof typeof profile.preferences] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Default Notes */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8E3]">
              <label className="block text-sm font-bold text-[#17201A]" htmlFor="default-notes">
                Default Delivery Instructions
              </label>
              <p className="text-xs text-[#647067]">Applied to all orders unless overridden at checkout.</p>
              <textarea
                id="default-notes"
                rows={3}
                value={profile.preferences.defaultNotes}
                onChange={(e) => updatePreferences({ defaultNotes: e.target.value })}
                placeholder="E.g., Ring doorbell, leave at door..."
                className="w-full px-3 py-2.5 bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl text-sm text-[#17201A] placeholder:text-[#647067] focus:outline-none focus:border-[#166534] resize-none transition-colors"
              />
            </div>

            <aside className="bg-[#F8FAF7] border border-[#E2E8E3] rounded-xl p-3 text-xs text-[#647067]">
              🔒 <strong className="text-[#17201A]">Prototype:</strong> Settings are saved in your browser only. Authentication and account management are part of a later development phase.
            </aside>
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
              <div className="w-12 h-12 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mx-auto text-xl">🗑</div>
              <h2 id="delete-addr-title" className="text-base font-bold text-[#17201A]">Delete address?</h2>
              <p className="text-sm text-[#647067]">This address will be permanently removed from your saved addresses.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="md" fullWidth onClick={() => setDeletingAddressId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => {
                  deleteAddress(deletingAddressId);
                  setDeletingAddressId(null);
                  showFeedback('Address deleted.');
                }}
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
