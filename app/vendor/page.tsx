'use client';

import React from 'react';
import Link from 'next/link';
import { OrderCard } from '@/components/vendor/OrderCard';
import { StoreStatusControl } from '@/components/vendor/StoreStatusControl';
import { Icon, type IconName } from '@/components/vendor/Icon';
import { Badge, Card, formatINR, PageHeader, SectionTitle, StockBadge } from '@/components/vendor/ui';
import { masterById } from '@/data/vendorData';
import { getStockState, useVendorState } from '@/lib/vendorStore';

const StatCard: React.FC<{ label: string; value: string; hint?: string; icon: IconName; tone?: 'green' | 'terracotta' | 'red' }> = ({
  label,
  value,
  hint,
  icon,
  tone = 'green',
}) => {
  const toneClass = { green: 'bg-[#166534]/10 text-[#166534]', terracotta: 'bg-[#B45309]/10 text-[#B45309]', red: 'bg-[#DC2626]/10 text-[#DC2626]' }[tone];
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneClass}`}>
        <Icon name={icon} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#647067]">{label}</p>
        <p className="text-2xl font-black leading-tight">{value}</p>
        {hint && <p className="text-[11px] text-[#647067]">{hint}</p>}
      </div>
    </Card>
  );
};

const QUICK_ACTIONS: { href: string; label: string; icon: IconName }[] = [
  { href: '/vendor/catalog', label: 'Add products from catalog', icon: 'plus' },
  { href: '/vendor/orders', label: 'Manage orders', icon: 'orders' },
  { href: '/vendor/inventory', label: 'Update stock & prices', icon: 'inventory' },
  { href: '/vendor/store', label: 'Edit store details', icon: 'store' },
];

export default function VendorDashboardPage() {
  const { store, stores, vendorProfile, products, orders } = useVendorState();

  if (!store || stores.length === 0) {
    const ownerFirst = vendorProfile?.ownerName?.split(' ')[0] || 'Partner';
    return (
      <>
        <PageHeader
          title={`Welcome, ${ownerFirst}`}
          subtitle="VyaparHub Hyperlocal Vendor Portal"
        />

        <div className="mt-4">
          <Card className="p-8 text-center max-w-xl mx-auto space-y-4 border-2 border-dashed border-[#166534]/30 bg-white">
            <div className="w-16 h-16 rounded-2xl bg-[#166534]/10 text-[#166534] flex items-center justify-center mx-auto">
              <Icon name="store" className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#17201A]">Register your first store</h2>
              <p className="text-sm text-[#647067]">
                You have not registered any store yet. Set up your store location, categories, and business details to start selling to nearby customers.
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
        </div>
      </>
    );
  }

  const activeOrders = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const pending = orders.filter((o) => o.status === 'PENDING');
  const delivered = orders.filter((o) => o.status === 'DELIVERED');
  const revenue = orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter((p) => getStockState(p.quantity) !== 'IN_STOCK');
  const outCount = products.filter((p) => p.quantity <= 0).length;

  return (
    <>
      <PageHeader title={`Welcome back, ${store.ownerName.split(' ')[0]}`} subtitle={store.name} />

      <div className="mb-4">
        <StoreStatusControl />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="New orders" value={String(pending.length)} hint="Awaiting your response" icon="alert" tone="terracotta" />
        <StatCard label="Active orders" value={String(activeOrders.length)} hint="In progress today" icon="orders" />
        <StatCard label="Sales today" value={formatINR(revenue)} hint={`${delivered.length} delivered`} icon="rupee" />
        <StatCard label="Products listed" value={String(products.length)} hint={`${outCount} out of stock`} icon="inventory" tone={outCount ? 'red' : 'green'} />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <SectionTitle
            title="Recent orders"
            action={
              <Link href="/vendor/orders" className="text-xs font-semibold text-[#166534] hover:underline">
                View all
              </Link>
            }
          />
          {orders.slice(0, 4).map((o) => (
            <OrderCard key={o.id} order={o} compact />
          ))}
        </div>

        <div className="space-y-6">
          <div>
            <SectionTitle title="Quick actions" />
            <div className="grid gap-2">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 bg-white border border-[#E2E8E3] rounded-xl px-3 py-2.5 text-sm font-medium hover:border-[#166534] hover:text-[#166534] transition-colors"
                >
                  <Icon name={a.icon} className="w-4 h-4 text-[#B45309]" />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          <Card className="p-4">
            <SectionTitle
              title="Inventory alerts"
              action={
                <Link href="/vendor/inventory" className="text-xs font-semibold text-[#166534] hover:underline">
                  Manage
                </Link>
              }
            />
            {lowStock.length === 0 ? (
              <p className="text-sm text-[#647067]">All products are well stocked.</p>
            ) : (
              <ul className="space-y-2">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{masterById[p.masterProductId]?.name}</span>
                    <StockBadge state={getStockState(p.quantity)} quantity={p.quantity} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle title="Store overview" />
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-[#647067]">Hours</dt><dd>{store.openTime} – {store.closeTime}</dd></div>
              <div className="flex justify-between"><dt className="text-[#647067]">Delivery radius</dt><dd>{store.deliveryRadiusKm} km</dd></div>
              <div className="flex justify-between items-center"><dt className="text-[#647067]">Accepting orders</dt><dd><Badge tone={store.acceptingOrders ? 'green' : 'red'}>{store.acceptingOrders ? 'Yes' : 'Paused'}</Badge></dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
