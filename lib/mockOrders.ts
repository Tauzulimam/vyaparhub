'use client';

import { useState, useEffect, useCallback } from 'react';
import { Address, CartItem, Order, OrderStatus } from '@/types';
import { mockOrders } from '@/data/mockData';

const ORDERS_STORAGE_KEY = 'vyaparhub_mock_orders';

export interface PlaceOrderInput {
  storeId: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  taxes: number;
  total: number;
  deliveryAddress: Address;
  deliveryInstructions?: string;
  paymentMethod: 'COD' | 'MOCK_UPI' | 'MOCK_CARD';
}

const ordersManager = {
  orders: [...mockOrders] as Order[],
  isHydrated: false,
  listeners: new Set<() => void>(),

  notify() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(this.orders));
      } catch {
        // ignore storage errors
      }
    }
    this.listeners.forEach((callback) => callback());
  },

  initFromLocalStorage() {
    if (typeof window === 'undefined' || this.isHydrated) return;
    this.isHydrated = true;
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.orders = parsed.map((ord: Order) => ({
            ...ord,
            items: Array.isArray(ord.items)
              ? ord.items.map((it) => {
                  const defaultOrd = mockOrders.find((mo) => mo.id === ord.id);
                  const defaultItem = defaultOrd?.items.find(
                    (mi) => mi.productId === it.productId
                  );
                  return defaultItem &&
                    (!it.image || it.image === '/images/placeholder-product.svg')
                    ? { ...it, image: defaultItem.image }
                    : it;
                })
              : [],
          }));
        }
      }
    } catch {
      // keep default memory state
    }
  },

  getOrderById(id: string): Order | undefined {
    this.initFromLocalStorage();
    return this.orders.find((o) => o.id === id || o.orderNumber === id);
  },

  placeOrder(input: PlaceOrderInput): Order {
    this.initFromLocalStorage();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newOrder: Order = {
      id: `ord-${randomDigits}`,
      orderNumber: `VH-ORD-${randomDigits}`,
      createdAt: 'Just now',
      storeId: input.storeId,
      storeName: input.storeName,
      storeAddress: input.storeAddress,
      storePhone: input.storePhone,
      status: 'PLACED',
      items: input.items.map((ci, idx) => ({
        id: `item-${randomDigits}-${idx}`,
        productId: ci.product.id,
        name: ci.product.name,
        brand: ci.product.brand,
        unit: ci.product.unit,
        price: ci.product.price,
        mrp: ci.product.mrp,
        quantity: ci.quantity,
        image: ci.product.image,
      })),
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      platformFee: input.platformFee,
      taxes: input.taxes,
      total: input.total,
      deliveryAddress: input.deliveryAddress,
      deliveryInstructions: input.deliveryInstructions,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'COD' ? 'PENDING' : 'PAID',
      estimatedDeliveryTime: 'In 20–30 mins',
    };

    this.orders = [newOrder, ...this.orders];
    this.notify();
    return newOrder;
  },

  updateOrderStatus(orderId: string, status: OrderStatus) {
    this.initFromLocalStorage();
    this.orders = this.orders.map((o) => {
      if (o.id === orderId || o.orderNumber === orderId) {
        return {
          ...o,
          status,
          ...(status === 'DELIVERED' ? { paymentStatus: 'PAID' as const } : {}),
        };
      }
      return o;
    });
    this.notify();
  },

  cancelOrder(orderId: string): boolean {
    this.initFromLocalStorage();
    let cancelled = false;
    this.orders = this.orders.map((o) => {
      if (
        (o.id === orderId || o.orderNumber === orderId) &&
        (o.status === 'PLACED' || o.status === 'ACCEPTED')
      ) {
        cancelled = true;
        return {
          ...o,
          status: 'CANCELLED' as OrderStatus,
          estimatedDeliveryTime: 'Order cancelled',
        };
      }
      return o;
    });
    if (cancelled) {
      this.notify();
    }
    return cancelled;
  },

  resetOrdersToDefault() {
    this.orders = [...mockOrders];
    this.notify();
  },
};

export function useMockOrders() {
  const [, setTick] = useState(0);

  useEffect(() => {
    ordersManager.initFromLocalStorage();
    const update = () => setTick((t) => t + 1);
    ordersManager.listeners.add(update);
    update();
    return () => {
      ordersManager.listeners.delete(update);
    };
  }, []);

  const orders = ordersManager.orders;

  const getOrderById = useCallback((id: string) => ordersManager.getOrderById(id), []);
  const placeOrder = useCallback((input: PlaceOrderInput) => ordersManager.placeOrder(input), []);
  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus) => ordersManager.updateOrderStatus(orderId, status),
    []
  );
  const cancelOrder = useCallback((orderId: string) => ordersManager.cancelOrder(orderId), []);
  const resetOrdersToDefault = useCallback(() => ordersManager.resetOrdersToDefault(), []);

  return {
    orders,
    getOrderById,
    placeOrder,
    updateOrderStatus,
    cancelOrder,
    resetOrdersToDefault,
  };
}
