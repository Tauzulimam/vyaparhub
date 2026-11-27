'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge, Badge, formatINR, ORDER_STATUS_LABEL } from '@/components/vendor/ui';
import { DELIVERY_PARTNER_STATUSES, nextOrderStatus, ORDER_FLOW, useVendorState } from '@/lib/vendorStore';
import type { VendorOrder, VendorOrderStatus } from '@/types/vendor';

// Vendors can only advance an order up to "Ready for Pickup".
const ADVANCE_LABEL: Partial<Record<VendorOrderStatus, string>> = {
  PLACED: 'Accept order',
  PENDING: 'Accept order',
  ACCEPTED: 'Start preparing',
  PREPARING: 'Mark Ready for Pickup',
};

const HANDOFF_NOTE: Partial<Record<VendorOrderStatus, string>> = {
  READY_FOR_PICKUP: 'Ready for pickup — waiting for customer or delivery handoff.',
  READY: 'Ready for pickup — waiting for customer or delivery handoff.',
  PICKED_UP: 'Picked up by a delivery partner.',
  OUT_FOR_DELIVERY: 'With a delivery partner — out for delivery.',
  DELIVERED: 'Delivered to customer.',
};

export const OrderProgress: React.FC<{ status: VendorOrderStatus }> = ({ status }) => {
  if (status === 'CANCELLED') {
    return <p className="text-xs font-semibold text-[#DC2626]">This order was cancelled.</p>;
  }
  const normalizedStatus: VendorOrderStatus =
    status === 'PENDING' ? 'PLACED' : status === 'READY' ? 'READY_FOR_PICKUP' : status;
  const current = ORDER_FLOW.indexOf(normalizedStatus);
  return (
    <div>
      <ol className="flex items-center gap-1" aria-label="Order progress">
        {ORDER_FLOW.map((step, i) => {
          const isDelivery = DELIVERY_PARTNER_STATUSES.includes(step);
          return (
            <li
              key={step}
              className="flex-1 min-w-0"
              title={`${ORDER_STATUS_LABEL[step]}${isDelivery ? ' (delivery partner)' : ''}`}
            >
              <div
                className={`h-1.5 rounded-full ${
                  i <= current ? (isDelivery ? 'bg-[#B45309]' : 'bg-[#166534]') : 'bg-[#E2E8E3]'
                }`}
              />
              <span
                className={`hidden lg:block mt-1 text-[9px] truncate ${
                  i === current ? 'font-bold text-[#17201A]' : 'text-[#647067]'
                }`}
              >
                {ORDER_STATUS_LABEL[step]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-[10px] text-[#647067]">
        <span className="text-[#166534] font-semibold">Green</span> = your steps ·{' '}
        <span className="text-[#B45309] font-semibold">Terracotta</span> = delivery partner
      </p>
    </div>
  );
};

export const OrderCard: React.FC<{ order: VendorOrder; compact?: boolean }> = ({
  order,
  compact = false,
}) => {
  const { actions } = useVendorState();
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const next = nextOrderStatus(order.status);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  const handleAdvance = async () => {
    if (!next || isUpdating) return;
    setIsUpdating(true);
    setActionError(null);
    const res = await actions.advanceOrder(order.id);
    setIsUpdating(false);
    if (!res.success) {
      setActionError(res.error || 'Could not update order status.');
    }
  };

  return (
    <article className="bg-white border border-[#E2E8E3] rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#17201A]">{order.orderNumber}</p>
          <p className="text-xs text-[#647067]">
            {order.customerName} · {order.placedAt}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <OrderProgress status={order.status} />

      {compact ? (
        <p className="text-xs text-[#647067]">
          {itemCount} item{itemCount === 1 ? '' : 's'} ·{' '}
          <span className="font-semibold text-[#17201A]">{formatINR(order.total)}</span>
        </p>
      ) : (
        <>
          <ul className="divide-y divide-[#E2E8E3] text-sm">
            {order.items.map((it) => (
              <li key={it.id} className="py-1.5 flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-medium">{it.name}</span>
                  <span className="text-xs text-[#647067]"> · {it.unit}</span>
                </span>
                <span className="shrink-0 text-[#647067]">
                  {it.quantity} × {formatINR(it.price)}
                </span>
              </li>
            ))}
          </ul>
          <div className="grid sm:grid-cols-2 gap-3 text-xs text-[#647067]">
            <div>
              <p className="font-semibold text-[#17201A]">Deliver to</p>
              <p>
                {order.deliveryAddress.addressLine}
                {order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}
                {order.deliveryAddress.pincode ? ` ${order.deliveryAddress.pincode}` : ''}
              </p>
              {order.customerPhone && <p>📞 {order.customerPhone}</p>}
            </div>
            <div className="sm:text-right">
              <p>
                Subtotal {formatINR(order.subtotal)} · Delivery{' '}
                {order.deliveryFee === 0 ? 'FREE' : formatINR(order.deliveryFee)}
              </p>
              <p className="text-sm font-bold text-[#17201A]">Total {formatINR(order.total)}</p>
              <div className="mt-1 flex sm:justify-end gap-1.5">
                <Badge tone="gray">
                  {order.paymentMethod === 'COD'
                    ? 'Cash on Delivery'
                    : order.paymentMethod === 'UPI'
                    ? 'UPI'
                    : 'Card'}
                </Badge>
                <Badge tone={order.paymentStatus === 'PAID' ? 'green' : 'terracotta'}>
                  {order.paymentStatus === 'PAID' ? 'Paid' : 'Payment pending'}
                </Badge>
              </div>
            </div>
          </div>
          {order.note && (
            <p className="text-xs bg-[#F8FAF7] border border-[#E2E8E3] rounded-lg px-3 py-2 text-[#647067]">
              <span className="font-semibold text-[#17201A]">Note:</span> {order.note}
            </p>
          )}
        </>
      )}

      {HANDOFF_NOTE[order.status] && (
        <p className="text-xs bg-[#166534]/10 text-[#166534] rounded-lg px-3 py-2 font-medium">
          {HANDOFF_NOTE[order.status]}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/25 px-3 py-2 text-xs font-medium text-[#DC2626]"
        >
          {actionError}
        </div>
      )}

      {next && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            isLoading={isUpdating}
            disabled={isUpdating}
            onClick={() => void handleAdvance()}
          >
            {ADVANCE_LABEL[order.status]}
          </Button>
        </div>
      )}
    </article>
  );
};
