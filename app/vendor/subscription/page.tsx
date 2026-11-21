'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { BillingDocumentsSection } from '@/components/vendor/BillingDocumentsSection';
import { Badge, Card, formatINR, PageHeader } from '@/components/vendor/ui';
import { mockVendorSubscription, subscriptionPlans } from '@/data/vendorData';

export default function VendorSubscriptionPage() {
  const sub = mockVendorSubscription;
  const [message, setMessage] = useState('');
  const currentPlan = subscriptionPlans.find((p) => p.id === sub.planId);
  const total = sub.planId === 'monthly' ? 30 : 365;
  const pct = Math.max(0, Math.min(100, Math.round((sub.daysRemaining / total) * 100)));

  return (
    <>
      <PageHeader title="Subscription" subtitle="Prototype only — no real payments are processed." />

      <Card className="p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#647067]">Current plan</p>
            <p className="text-xl font-black">
              {currentPlan?.name} · {currentPlan && formatINR(currentPlan.price)}/{currentPlan?.period}
            </p>
          </div>
          <Badge tone={sub.status === 'ACTIVE' ? 'green' : 'red'}>{sub.status}</Badge>
        </div>
        <div className="mt-4 h-2 rounded-full bg-[#E2E8E3] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Plan time remaining">
          <div className="h-full bg-[#166534]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-[#647067]">
          Started {sub.startDate} · Renews/expires {sub.expiryDate} · <span className="font-semibold text-[#17201A]">{sub.daysRemaining} days left</span>
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {subscriptionPlans.map((plan) => {
          const isCurrent = plan.id === sub.planId;
          return (
            <Card key={plan.id} className={`p-5 flex flex-col ${isCurrent ? 'border-[#166534] ring-1 ring-[#166534]' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">{plan.name}</h2>
                {isCurrent ? <Badge tone="green">Current</Badge> : plan.savingsNote && <Badge tone="terracotta">{plan.savingsNote}</Badge>}
              </div>
              <p className="mt-2">
                <span className="text-3xl font-black">{formatINR(plan.price)}</span>
                <span className="text-sm text-[#647067]"> / {plan.period}</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-sm flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#166534]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5"
                fullWidth
                variant={isCurrent ? 'outline' : 'primary'}
                disabled={isCurrent}
                onClick={() => setMessage(`Switching to the ${plan.name} plan is a prototype action. Payment is not implemented yet.`)}
              >
                {isCurrent ? 'Current plan' : `Switch to ${plan.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      {message && (
        <p role="status" className="mt-4 text-sm bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20 rounded-xl px-4 py-3">
          {message}
        </p>
      )}

      <BillingDocumentsSection />
    </>
  );
}
