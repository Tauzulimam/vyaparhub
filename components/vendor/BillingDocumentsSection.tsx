'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/vendor/Icon';
import { Badge, Card, formatINR, SectionTitle } from '@/components/vendor/ui';
import { mockVendorInvoices, mockVendorStatements } from '@/data/vendorData';
import { useVendorState } from '@/lib/vendorStore';
import type { DocumentStatus, VendorInvoice, VendorSettlementStatement } from '@/types/vendor';

type DocTab = 'invoices' | 'statements';
type PeriodFilter = 'ALL' | 'FY 2026-27' | 'FY 2025-26';

const PERIOD_FILTERS: { id: PeriodFilter; label: string }[] = [
  { id: 'ALL', label: 'All monthly records' },
  { id: 'FY 2026-27', label: 'FY 2026-27 Summary' },
  { id: 'FY 2025-26', label: 'FY 2025-26 Summary' },
];

const STATUS_TONE: Record<DocumentStatus, 'green' | 'terracotta'> = {
  PAID: 'green',
  SETTLED: 'green',
  PENDING: 'terracotta',
};

export const BillingDocumentsSection: React.FC = () => {
  const { store } = useVendorState();
  const [tab, setTab] = useState<DocTab>('invoices');
  const [period, setPeriod] = useState<PeriodFilter>('ALL');
  const [previewInvoice, setPreviewInvoice] = useState<VendorInvoice | null>(null);
  const [previewStatement, setPreviewStatement] = useState<VendorSettlementStatement | null>(null);
  const [downloadNote, setDownloadNote] = useState('');

  const isGstRegistered = store.gstStatus === 'REGISTERED' && Boolean(store.gstin);

  const invoices = mockVendorInvoices.filter((inv) => period === 'ALL' || inv.financialYear === period);
  const storeStatements = mockVendorStatements.filter((st) => st.storeId === store.id);
  const statements = storeStatements.filter((st) => period === 'ALL' || st.financialYear === period);

  const invoiceSummary = invoices.reduce(
    (acc, inv) => ({
      count: acc.count + 1,
      base: acc.base + inv.baseAmount,
      tax: acc.tax + inv.taxAmount,
      total: acc.total + inv.totalAmount,
    }),
    { count: 0, base: 0, tax: 0, total: 0 }
  );

  const statementSummary = statements.reduce(
    (acc, st) => ({
      count: acc.count + 1,
      orders: acc.orders + st.ordersCount,
      sales: acc.sales + st.grossOrderSales,
      fees: acc.fees + st.platformServiceFees,
      refunds: acc.refunds + st.refundsAndCancellations,
      net: acc.net + st.netSettlementAmount,
    }),
    { count: 0, orders: 0, sales: 0, fees: 0, refunds: 0, net: 0 }
  );

  const handleMockDownload = (docNumber: string, kind: string) => {
    setDownloadNote(
      `Prepared sample ${kind} (${docNumber}) for ${store.name}. Real PDF generation is not enabled in this Phase 2 prototype.`
    );
  };

  return (
    <section aria-label="Billing and documents" className="mt-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#17201A]">Billing & Documents</h2>
          <p className="text-xs text-[#647067] mt-0.5">
            Sample subscription invoices and store settlement statements for <span className="font-semibold text-[#17201A]">{store.name}</span>.
          </p>
        </div>

        {/* Store Business / GST Pill */}
        <div className="flex flex-wrap items-center gap-2 text-xs bg-white border border-[#E2E8E3] rounded-xl px-3 py-2">
          <span className="font-semibold text-[#17201A]">{store.name}</span>
          <span className="text-[#E2E8E3]">|</span>
          {isGstRegistered ? (
            <span className="font-mono text-[#166534] font-semibold">GSTIN: {store.gstin}</span>
          ) : (
            <span className="text-[#647067]">Not GST Registered</span>
          )}
        </div>
      </div>

      {/* Prototype disclaimer */}
      <div className="rounded-xl bg-[#B45309]/10 border border-[#B45309]/25 px-4 py-2.5 text-xs text-[#B45309]">
        <span className="font-bold">Sample / Mock Prototype Documents:</span> All invoices and settlement statements shown below are illustrative mock records for Phase 2 UI demonstration only and are not legally valid GST tax invoices.
      </div>

      {/* Document Type Switcher + Financial Year Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div role="tablist" aria-label="Document categories" className="flex gap-1 p-1 bg-white border border-[#E2E8E3] rounded-xl w-full md:w-fit">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'invoices'}
            onClick={() => setTab('invoices')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'invoices' ? 'bg-[#166534] text-white' : 'text-[#647067] hover:text-[#17201A]'
            }`}
          >
            A. VyaparHub Subscription Invoices ({invoices.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'statements'}
            onClick={() => setTab('statements')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'statements' ? 'bg-[#166534] text-white' : 'text-[#647067] hover:text-[#17201A]'
            }`}
          >
            B. Sales & Settlement Statements ({statements.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Billing period or financial year filter">
          {PERIOD_FILTERS.map((pf) => (
            <button
              key={pf.id}
              type="button"
              onClick={() => setPeriod(pf.id)}
              aria-pressed={period === pf.id}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                period === pf.id
                  ? 'bg-[#17201A] border-[#17201A] text-white'
                  : 'bg-white border-[#E2E8E3] text-[#647067] hover:border-[#166534]'
              }`}
            >
              {pf.label}
            </button>
          ))}
        </div>
      </div>

      {downloadNote && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-[#166534]/10 border border-[#166534]/25 px-4 py-2.5 text-xs text-[#166534]">
          <span>{downloadNote}</span>
          <button type="button" onClick={() => setDownloadNote('')} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* A. VyaparHub Subscription / Service Invoices */}
      {tab === 'invoices' && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionTitle title="VyaparHub Subscription & Service Invoices" />
              <p className="text-xs text-[#647067] -mt-2">
                Charges paid by the vendor to VyaparHub for platform subscription plans.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleMockDownload(
                  period === 'ALL' ? 'VH-SUB-ANNUAL-SUMMARY' : `VH-SUB-${period.replace(/\s+/g, '-')}`,
                  'subscription invoice summary'
                )
              }
            >
              Download {period === 'ALL' ? 'Yearly' : period} Summary (Sample)
            </Button>
          </div>

          {/* Yearly / Filtered Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3]">
            <div>
              <p className="text-[11px] font-semibold text-[#647067]">Period view</p>
              <p className="text-sm font-bold text-[#17201A]">{period === 'ALL' ? 'All Records' : period}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#647067]">Invoices count</p>
              <p className="text-sm font-bold text-[#17201A]">{invoiceSummary.count}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#647067]">Subscription subtotal</p>
              <p className="text-sm font-bold text-[#17201A]">{formatINR(invoiceSummary.base)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#647067]">Total billed (incl. mock tax)</p>
              <p className="text-sm font-black text-[#166534]">{formatINR(invoiceSummary.total)}</p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <p className="text-sm text-[#647067] py-6 text-center">No subscription invoices for {period}.</p>
          ) : (
            <>
              {/* Mobile Adaptive Cards */}
              <div className="md:hidden divide-y divide-[#E2E8E3]">
                {invoices.map((inv) => (
                  <article key={inv.id} className="py-3.5 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[#17201A] block">
                          {inv.invoiceNumber}
                        </span>
                        <p className="font-semibold text-[#17201A] text-sm mt-0.5">
                          {inv.billingPeriod}
                        </p>
                        <p className="text-[#647067]">
                          {inv.planName} · {inv.financialYear} · Paid {inv.date}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div>
                        <span className="text-[#647067] block">
                          {store.name} ({isGstRegistered ? `GSTIN: ${store.gstin}` : 'Non-GST'})
                        </span>
                        <strong className="text-sm font-black text-[#166534]">
                          {formatINR(inv.totalAmount)}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Icon name="eye" className="w-3.5 h-3.5" />}
                          onClick={() => setPreviewInvoice(inv)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMockDownload(inv.invoiceNumber, 'subscription invoice')}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8E3] text-[11px] font-bold uppercase text-[#647067]">
                    <th className="py-2.5 pr-3">Invoice No.</th>
                    <th className="py-2.5 px-3">Billing Period</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Billed To</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E3]">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8FAF7]/70">
                      <td className="py-3 pr-3 font-mono text-xs font-bold text-[#17201A]">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-[#17201A]">{inv.billingPeriod}</p>
                        <p className="text-[11px] text-[#647067]">{inv.planName} · {inv.financialYear}</p>
                      </td>
                      <td className="py-3 px-3 text-xs text-[#647067]">{inv.date}</td>
                      <td className="py-3 px-3 text-xs">
                        <p className="font-semibold text-[#17201A]">{store.name}</p>
                        {isGstRegistered ? (
                          <p className="font-mono text-[11px] text-[#166534]">GSTIN: {store.gstin}</p>
                        ) : (
                          <p className="text-[11px] text-[#647067]">Unregistered vendor</p>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#17201A]">{formatINR(inv.totalAmount)}</td>
                      <td className="py-3 px-3">
                        <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Icon name="eye" className="w-3.5 h-3.5" />}
                            onClick={() => setPreviewInvoice(inv)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMockDownload(inv.invoiceNumber, 'subscription invoice')}
                          >
                            Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
      )}

      {/* B. Vendor Sales / Settlement Statements */}
      {tab === 'statements' && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionTitle title="Store Sales & Settlement Statements" />
              <p className="text-xs text-[#647067] -mt-2">
                Monthly summary of customer order revenue, platform fees, cancellations and net vendor earnings for <span className="font-semibold text-[#17201A]">{store.name}</span>.
              </p>
            </div>
            {statements.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleMockDownload(
                    period === 'ALL' ? 'VH-SET-ANNUAL-SUMMARY' : `VH-SET-${period.replace(/\s+/g, '-')}`,
                    'sales & settlement summary'
                  )
                }
              >
                Download {period === 'ALL' ? 'Yearly' : period} Statement (Sample)
              </Button>
            )}
          </div>

          {/* Yearly / Filtered Settlement Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3]">
            <div>
              <p className="text-[11px] font-semibold text-[#647067]">Orders fulfilled</p>
              <p className="text-sm font-bold text-[#17201A]">{statementSummary.orders}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#647067]">Gross order sales</p>
              <p className="text-sm font-bold text-[#17201A]">{formatINR(statementSummary.sales)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#647067]">Platform service fees</p>
              <p className="text-sm font-bold text-[#B45309]">- {formatINR(statementSummary.fees)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#647067]">Refunds / cancellations</p>
              <p className="text-sm font-bold text-[#DC2626]">- {formatINR(statementSummary.refunds)}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] font-semibold text-[#647067]">Net vendor settlement</p>
              <p className="text-sm font-black text-[#166534]">{formatINR(statementSummary.net)}</p>
            </div>
          </div>

          {statements.length === 0 ? (
            <p className="text-sm text-[#647067] py-6 text-center">
              No settlement statements recorded for {store.name} in this period yet.
            </p>
          ) : (
            <>
              {/* Mobile Adaptive Cards */}
              <div className="md:hidden divide-y divide-[#E2E8E3]">
                {statements.map((st) => (
                  <article key={st.id} className="py-3.5 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[#17201A] block">
                          {st.statementNumber}
                        </span>
                        <p className="font-semibold text-[#17201A] text-sm mt-0.5">
                          {st.billingPeriod}
                        </p>
                        <p className="text-[#647067]">
                          {st.ordersCount} orders · {st.financialYear} · {st.date}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[st.status]}>{st.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAF7] border border-[#E2E8E3] p-2.5">
                      <div>
                        <span className="text-[10px] text-[#647067] block">Gross Sales</span>
                        <strong className="font-bold text-[#17201A]">{formatINR(st.grossOrderSales)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#647067] block">Fees &amp; Refunds</span>
                        <strong className="font-semibold text-[#B45309]">
                          - {formatINR(st.platformServiceFees + st.refundsAndCancellations)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#647067] block">Net Settlement</span>
                        <strong className="font-black text-[#166534]">{formatINR(st.netSettlementAmount)}</strong>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Icon name="eye" className="w-3.5 h-3.5" />}
                        onClick={() => setPreviewStatement(st)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMockDownload(st.statementNumber, 'settlement statement')}
                      >
                        Download
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8E3] text-[11px] font-bold uppercase text-[#647067]">
                    <th className="py-2.5 pr-3">Statement No.</th>
                    <th className="py-2.5 px-3">Billing Period</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Gross Sales</th>
                    <th className="py-2.5 px-3">Platform Fees</th>
                    <th className="py-2.5 px-3">Refunds</th>
                    <th className="py-2.5 px-3">Net Settlement</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E3]">
                  {statements.map((st) => (
                    <tr key={st.id} className="hover:bg-[#F8FAF7]/70">
                      <td className="py-3 pr-3 font-mono text-xs font-bold text-[#17201A]">{st.statementNumber}</td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-[#17201A]">{st.billingPeriod}</p>
                        <p className="text-[11px] text-[#647067]">{st.ordersCount} orders · {st.financialYear}</p>
                      </td>
                      <td className="py-3 px-3 text-xs text-[#647067]">{st.date}</td>
                      <td className="py-3 px-3 font-medium">{formatINR(st.grossOrderSales)}</td>
                      <td className="py-3 px-3 text-xs text-[#B45309]">- {formatINR(st.platformServiceFees)}</td>
                      <td className="py-3 px-3 text-xs text-[#DC2626]">- {formatINR(st.refundsAndCancellations)}</td>
                      <td className="py-3 px-3 font-black text-[#166534]">{formatINR(st.netSettlementAmount)}</td>
                      <td className="py-3 px-3">
                        <Badge tone={STATUS_TONE[st.status]}>{st.status}</Badge>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Icon name="eye" className="w-3.5 h-3.5" />}
                            onClick={() => setPreviewStatement(st)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMockDownload(st.statementNumber, 'settlement statement')}
                          >
                            Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
      )}

      {/* Sample Subscription Invoice Modal */}
      {previewInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Sample invoice ${previewInvoice.invoiceNumber}`}
        >
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-black/40"
            onClick={() => setPreviewInvoice(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[#E2E8E3] p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-3">
              <div>
                <Badge tone="terracotta">SAMPLE PROTOTYPE INVOICE — NOT A VALID GST INVOICE</Badge>
                <h3 className="text-lg font-black mt-1.5">VyaparHub Subscription Invoice</h3>
                <p className="text-xs font-mono text-[#647067]">{previewInvoice.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-[#647067] hover:bg-[#F8FAF7]"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#F8FAF7] p-3 border border-[#E2E8E3]">
                <p className="font-bold text-[#647067] uppercase text-[10px]">Issued By (Platform)</p>
                <p className="font-bold text-[#17201A] mt-0.5">VyaparHub Marketplace (Prototype)</p>
                <p className="text-[#647067]">Hyperlocal Vendor Services</p>
              </div>
              <div className="rounded-xl bg-[#F8FAF7] p-3 border border-[#E2E8E3]">
                <p className="font-bold text-[#647067] uppercase text-[10px]">Billed To (Vendor Store)</p>
                <p className="font-bold text-[#17201A] mt-0.5">{store.name}</p>
                <p className="text-[#647067]">Owner: {store.ownerName}</p>
                {isGstRegistered ? (
                  <p className="font-mono font-semibold text-[#166534] mt-0.5">GSTIN: {store.gstin}</p>
                ) : (
                  <p className="text-[#647067] mt-0.5">GST Status: Not GST Registered</p>
                )}
              </div>
            </div>

            <dl className="text-xs space-y-2 border-t border-b border-[#E2E8E3] py-3">
              <div className="flex justify-between">
                <dt className="text-[#647067]">Billing Period</dt>
                <dd className="font-semibold text-[#17201A]">{previewInvoice.billingPeriod} ({previewInvoice.financialYear})</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#647067]">Invoice Date</dt>
                <dd className="font-semibold text-[#17201A]">{previewInvoice.date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#647067]">Description</dt>
                <dd className="font-semibold text-[#17201A]">{previewInvoice.description}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#647067]">Base Subscription Charge</dt>
                <dd>{formatINR(previewInvoice.baseAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#647067]">Illustrative Tax (Mock)</dt>
                <dd>{formatINR(previewInvoice.taxAmount)}</dd>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-[#E2E8E3]">
                <dt>Total Paid</dt>
                <dd className="text-[#166534]">{formatINR(previewInvoice.totalAmount)}</dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-2">
              <Badge tone={STATUS_TONE[previewInvoice.status]}>{previewInvoice.status}</Badge>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMockDownload(previewInvoice.invoiceNumber, 'subscription invoice')}
                >
                  Download Sample
                </Button>
                <Button size="sm" onClick={() => setPreviewInvoice(null)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Settlement Statement Modal */}
      {previewStatement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Sample settlement statement ${previewStatement.statementNumber}`}
        >
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-black/40"
            onClick={() => setPreviewStatement(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[#E2E8E3] p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8E3] pb-3">
              <div>
                <Badge tone="terracotta">SAMPLE SETTLEMENT STATEMENT — PROTOTYPE ONLY</Badge>
                <h3 className="text-lg font-black mt-1.5">Vendor Sales & Settlement Statement</h3>
                <p className="text-xs font-mono text-[#647067]">{previewStatement.statementNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStatement(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-[#647067] hover:bg-[#F8FAF7]"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#F8FAF7] p-3 border border-[#E2E8E3] text-xs space-y-1">
              <p className="font-bold text-[#647067] uppercase text-[10px]">Vendor Store Details</p>
              <p className="font-bold text-sm text-[#17201A]">{store.name}</p>
              <p className="text-[#647067]">{store.address}</p>
              {isGstRegistered ? (
                <p className="font-mono font-semibold text-[#166534]">GSTIN: {store.gstin}</p>
              ) : (
                <p className="text-[#647067]">GST Registration Status: Not GST Registered</p>
              )}
            </div>

            <dl className="text-xs space-y-2 border-t border-b border-[#E2E8E3] py-3">
              <div className="flex justify-between">
                <dt className="text-[#647067]">Settlement Period</dt>
                <dd className="font-semibold text-[#17201A]">{previewStatement.billingPeriod} ({previewStatement.financialYear})</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#647067]">Statement Date</dt>
                <dd className="font-semibold text-[#17201A]">{previewStatement.date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#647067]">Completed Customer Orders</dt>
                <dd className="font-semibold text-[#17201A]">{previewStatement.ordersCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#647067]">Gross Order Sales / Revenue</dt>
                <dd className="font-semibold text-[#17201A]">{formatINR(previewStatement.grossOrderSales)}</dd>
              </div>
              <div className="flex justify-between text-[#B45309]">
                <dt>Less: Platform / Service Fees</dt>
                <dd>- {formatINR(previewStatement.platformServiceFees)}</dd>
              </div>
              <div className="flex justify-between text-[#DC2626]">
                <dt>Less: Refunds & Cancellations</dt>
                <dd>- {formatINR(previewStatement.refundsAndCancellations)}</dd>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-[#E2E8E3]">
                <dt>Net Vendor Settlement / Earnings</dt>
                <dd className="text-[#166534]">{formatINR(previewStatement.netSettlementAmount)}</dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-2">
              <Badge tone={STATUS_TONE[previewStatement.status]}>{previewStatement.status}</Badge>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMockDownload(previewStatement.statementNumber, 'settlement statement')}
                >
                  Download Sample
                </Button>
                <Button size="sm" onClick={() => setPreviewStatement(null)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
