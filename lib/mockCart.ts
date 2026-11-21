'use client';

import { useState, useEffect, useCallback } from 'react';
import { CartItem, CartStore, Product } from '@/types';
import { mockProducts, getStoreById } from '@/data/mockData';

export const DEFAULT_MOCK_CART_COUNT = 3;

const CART_STORAGE_KEY = 'vyaparhub_mock_cart';

const defaultStore: CartStore = {
  id: 'store-1',
  name: 'ABC Kirana & Daily Staples',
  deliveryTimeMin: '15-20 mins',
  distanceKm: 0.4,
  address: 'Shop 12, Main Market, Sector 14',
};

const initialDefaultItems: CartItem[] = [
  {
    product: mockProducts[0], // Aashirvaad Atta (store-1)
    quantity: 1,
  },
  {
    product: mockProducts[4], // Amul Milk (store-1)
    quantity: 1,
  },
  {
    product: mockProducts[6], // Farm Fresh Brown Eggs (store-1)
    quantity: 1,
  },
];

interface CartInternalState {
  items: CartItem[];
  store: CartStore | null;
}

const cartManager = {
  state: {
    items: initialDefaultItems,
    store: defaultStore,
  } as CartInternalState,
  isHydrated: false,
  listeners: new Set<() => void>(),

  notify() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify({
            items: this.state.items,
            store: this.state.store,
          })
        );
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
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items)) {
          // Enforce single-store invariant on loaded cart items
          const firstStoreId = parsed.items[0]?.product?.storeId;
          const sanitizedItems: CartItem[] = firstStoreId
            ? parsed.items.filter((i: CartItem) => i.product?.storeId === firstStoreId)
            : [];
          const resolvedStore =
            sanitizedItems.length > 0
              ? parsed.store && parsed.store.id === firstStoreId
                ? parsed.store
                : {
                    id: firstStoreId,
                    name: sanitizedItems[0].product.storeName,
                    deliveryTimeMin: getStoreById(firstStoreId)?.deliveryTimeMin,
                    distanceKm: getStoreById(firstStoreId)?.distanceKm,
                    address: getStoreById(firstStoreId)?.address,
                  }
              : null;

          this.state = {
            items: sanitizedItems,
            store: resolvedStore,
          };
        }
      }
    } catch {
      // keep default memory state
    }
  },

  addToCart(
    product: Product,
    quantity = 1
  ): { success: boolean; conflictStore?: CartStore } {
    this.initFromLocalStorage();
    const { items, store } = this.state;

    // If cart is empty or has no store
    if (items.length === 0 || !store) {
      const storeData = getStoreById(product.storeId);
      this.state = {
        store: {
          id: product.storeId,
          name: product.storeName,
          deliveryTimeMin: storeData?.deliveryTimeMin,
          distanceKm: storeData?.distanceKm,
          address: storeData?.address,
        },
        items: [{ product, quantity }],
      };
      this.notify();
      return { success: true };
    }

    // Enforce Single-Store Cart Rule: reject if product belongs to another store
    if (store.id !== product.storeId) {
      return {
        success: false,
        conflictStore: store,
      };
    }

    // Store matches, add or update item
    const existingIndex = items.findIndex((i) => i.product.id === product.id);
    let newItems: CartItem[];
    if (existingIndex > -1) {
      newItems = [...items];
      const maxStock = product.quantityAvailable ?? 99;
      const nextQty = Math.min(newItems[existingIndex].quantity + quantity, maxStock);
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: nextQty,
      };
    } else {
      newItems = [...items, { product, quantity }];
    }

    this.state = {
      ...this.state,
      items: newItems,
    };
    this.notify();
    return { success: true };
  },

  replaceCartWithProduct(product: Product, quantity = 1) {
    this.initFromLocalStorage();
    const storeData = getStoreById(product.storeId);
    this.state = {
      store: {
        id: product.storeId,
        name: product.storeName,
        deliveryTimeMin: storeData?.deliveryTimeMin,
        distanceKm: storeData?.distanceKm,
        address: storeData?.address,
      },
      items: [{ product, quantity }],
    };
    this.notify();
  },

  removeFromCart(productId: string) {
    this.initFromLocalStorage();
    const newItems = this.state.items.filter((item) => item.product.id !== productId);
    this.state = {
      items: newItems,
      store: newItems.length === 0 ? null : this.state.store,
    };
    this.notify();
  },

  updateQuantity(productId: string, quantity: number) {
    this.initFromLocalStorage();
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const newItems = this.state.items.map((item) => {
      if (item.product.id !== productId) return item;
      const maxStock = item.product.quantityAvailable ?? 99;
      return { ...item, quantity: Math.min(quantity, maxStock) };
    });

    this.state = {
      ...this.state,
      items: newItems,
    };
    this.notify();
  },

  clearCart() {
    this.initFromLocalStorage();
    this.state = {
      items: [],
      store: null,
    };
    this.notify();
  },
};

export function useMockCart() {
  const [, setTick] = useState(0);

  useEffect(() => {
    cartManager.initFromLocalStorage();
    const update = () => setTick((t) => t + 1);
    cartManager.listeners.add(update);
    update();
    return () => {
      cartManager.listeners.delete(update);
    };
  }, []);

  const items = cartManager.state.items;
  const store = cartManager.state.store;

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= 500 ? 0 : 25;
  const platformFee = subtotal === 0 ? 0 : 5;
  const taxes = 0;
  const grandTotal = subtotal === 0 ? 0 : subtotal + deliveryFee + platformFee;

  const addToCart = useCallback(
    (product: Product, quantity = 1) => cartManager.addToCart(product, quantity),
    []
  );

  const replaceCartWithProduct = useCallback(
    (product: Product, quantity = 1) => cartManager.replaceCartWithProduct(product, quantity),
    []
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => cartManager.updateQuantity(productId, quantity),
    []
  );

  const removeFromCart = useCallback(
    (productId: string) => cartManager.removeFromCart(productId),
    []
  );

  const clearCart = useCallback(() => cartManager.clearCart(), []);

  return {
    items,
    store,
    cartCount,
    subtotal,
    deliveryFee,
    platformFee,
    taxes,
    grandTotal,
    addToCart,
    replaceCartWithProduct,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
