'use client';

import { useSyncExternalStore } from 'react';
import {
  initialStoreProducts,
  initialVendorOrders,
  LOW_STOCK_THRESHOLD,
  masterById,
  masterCatalog,
  mockVendorStores,
  VENDOR_STORE_ID,
} from '@/data/vendorData';
import type {
  GstStatus,
  StockState,
  StoreProduct,
  UpdateStoreDetailsInput,
  VendorOrder,
  VendorOrderStatus,
  VendorStoreInfo,
} from '@/types/vendor';

/**
 * Phase 2 mock vendor state. In-memory only (no database, no persistence):
 * it is shared between vendor pages during client-side navigation and resets
 * on a full page refresh. A vendor may own several stores; products and orders
 * are tagged with a storeId and filtered by the active store.
 */
interface VendorState {
  stores: VendorStoreInfo[];
  activeStoreId: string;
  allProducts: StoreProduct[];
  allOrders: VendorOrder[];
}

let state: VendorState = {
  stores: mockVendorStores,
  activeStoreId: VENDOR_STORE_ID,
  allProducts: initialStoreProducts,
  allOrders: initialVendorOrders,
};

const listeners = new Set<() => void>();

function setState(next: Partial<VendorState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

/** Statuses the VENDOR controls. Everything after READY_FOR_PICKUP belongs to delivery partners. */
export const VENDOR_FLOW: VendorOrderStatus[] = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
];

/** Full lifecycle, used only for display (progress bar). */
export const ORDER_FLOW: VendorOrderStatus[] = [
  ...VENDOR_FLOW,
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const DELIVERY_PARTNER_STATUSES: VendorOrderStatus[] = [
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** Next status a vendor may set. Returns null once the order is Ready for Pickup. */
export function nextOrderStatus(status: VendorOrderStatus): VendorOrderStatus | null {
  const normalized: VendorOrderStatus =
    status === 'PENDING' ? 'PLACED' : status === 'READY' ? 'READY_FOR_PICKUP' : status;
  const idx = VENDOR_FLOW.indexOf(normalized);
  if (idx < 0 || idx >= VENDOR_FLOW.length - 1) return null;
  return VENDOR_FLOW[idx + 1];
}

export function getStockState(quantity: number): StockState {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(value: string): boolean {
  return GSTIN_REGEX.test(value.trim().toUpperCase());
}

export interface NewStoreInput {
  name: string;
  category: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  openTime: string;
  closeTime: string;
  description: string;
  deliveryRadiusKm: number;
  minOrderAmount: number;
  gstStatus: GstStatus;
  gstin?: string;
}

export const vendorActions = {
  async setStoreOpen(isOpen: boolean): Promise<StoreMutationResult> {
    setState({
      stores: state.stores.map((s) =>
        s.id === state.activeStoreId ? { ...s, isOpen, acceptingOrders: isOpen } : s
      ),
    });
    return { success: true };
  },

  async saveStoreDetails(input: UpdateStoreDetailsInput): Promise<StoreMutationResult> {
    setState({
      stores: state.stores.map((s) =>
        s.id === state.activeStoreId
          ? {
              ...s,
              ...(input.name !== undefined ? { name: input.name } : {}),
              ...(input.phone !== undefined ? { phone: input.phone } : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
              ...(input.email !== undefined ? { email: input.email } : {}),
              ...(input.openingTime !== undefined ? { openTime: input.openingTime } : {}),
              ...(input.closingTime !== undefined ? { closeTime: input.closingTime } : {}),
              ...(input.deliveryRadiusKm !== undefined
                ? { deliveryRadiusKm: input.deliveryRadiusKm }
                : {}),
              ...(input.minimumOrderAmount !== undefined
                ? { minOrderAmount: input.minimumOrderAmount }
                : {}),
              ...(input.gstStatus !== undefined ? { gstStatus: input.gstStatus } : {}),
              ...(input.gstin !== undefined ? { gstin: input.gstin ?? undefined } : {}),
              ...(input.legalBusinessName !== undefined
                ? { legalBusinessName: input.legalBusinessName ?? '' }
                : {}),
            }
          : s
      ),
    });
    return { success: true };
  },

  async updateStore(patch: Partial<VendorStoreInfo>): Promise<StoreMutationResult> {
    setState({
      stores: state.stores.map((s) => (s.id === state.activeStoreId ? { ...s, ...patch } : s)),
    });
    return { success: true };
  },

  switchStore(storeId: string) {
    if (state.stores.some((s) => s.id === storeId)) setState({ activeStoreId: storeId });
  },

  activateCreatedStore(createdStore: VendorStoreInfo) {
    setState({
      stores: state.stores.some((s) => s.id === createdStore.id)
        ? state.stores.map((s) => (s.id === createdStore.id ? createdStore : s))
        : [...state.stores, createdStore],
      activeStoreId: createdStore.id,
    });
  },

  /** Mock registration: adds an empty store and makes it the active one. */
  registerStore(input: NewStoreInput) {
    const cleanGstin =
      input.gstStatus === 'REGISTERED' && input.gstin ? input.gstin.trim().toUpperCase() : undefined;
    const store: VendorStoreInfo = {
      ...input,
      id: `vstore-${Date.now()}`,
      acceptingOrders: true,
      isOpen: false,
      codEnabled: true,
      gstStatus: input.gstStatus,
      gstin: cleanGstin,
      gstVerified: Boolean(cleanGstin),
    };
    setState({ stores: [...state.stores, store], activeStoreId: store.id });
  },

  async addProduct(
    masterProductId: string,
    sellingPrice: number,
    quantity: number
  ): Promise<InventoryMutationResult> {
    const storeId = state.activeStoreId;
    if (state.allProducts.some((p) => p.storeId === storeId && p.masterProductId === masterProductId)) {
      return { success: false, error: 'This product is already listed in your active store.' };
    }
    const product: StoreProduct = {
      id: `sp-${Date.now()}`,
      storeId,
      masterProductId,
      sellingPrice,
      quantity,
      available: quantity > 0,
      masterProduct: masterById[masterProductId],
    };
    setState({ allProducts: [product, ...state.allProducts] });
    return { success: true };
  },

  async updateProduct(
    id: string,
    patch: Partial<Pick<StoreProduct, 'sellingPrice' | 'quantity' | 'available'>>
  ): Promise<InventoryMutationResult> {
    setState({ allProducts: state.allProducts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    return { success: true };
  },

  /** Restock: increases current stock. Re-enables a product that was auto-hidden at zero stock. */
  async addStock(id: string, amount: number): Promise<InventoryMutationResult> {
    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: 'Quantity to add must be a whole number of 1 or more.' };
    }
    setState({
      allProducts: state.allProducts.map((p) =>
        p.id === id
          ? { ...p, quantity: p.quantity + amount, available: p.quantity <= 0 ? true : p.available }
          : p
      ),
    });
    return { success: true };
  },

  /** Correction: sets exact stock. Zero stock forces the product unavailable. */
  async setStock(id: string, quantity: number): Promise<InventoryMutationResult> {
    if (!Number.isInteger(quantity) || quantity < 0) {
      return { success: false, error: 'Stock quantity cannot be negative or fractional.' };
    }
    setState({
      allProducts: state.allProducts.map((p) =>
        p.id === id
          ? { ...p, quantity, available: quantity <= 0 ? false : p.quantity <= 0 ? true : p.available }
          : p
      ),
    });
    return { success: true };
  },

  async removeProduct(id: string): Promise<InventoryMutationResult> {
    setState({ allProducts: state.allProducts.filter((p) => p.id !== id) });
    return { success: true };
  },

  async restockProduct(id: string, additionalUnits: number): Promise<InventoryMutationResult> {
    return vendorActions.addStock(id, additionalUnits);
  },

  /** Vendors can only move an order up to READY_FOR_PICKUP (Ready for Pickup). */
  async advanceOrder(id: string): Promise<OrderMutationResult> {
    setState({
      allOrders: state.allOrders.map((o) => {
        if (o.id !== id) return o;
        const next = nextOrderStatus(o.status);
        return next ? { ...o, status: next } : o;
      }),
    });
    return { success: true };
  },

  async updateOrderStatus(
    orderId: string,
    nextStatus: VendorOrderStatus
  ): Promise<OrderMutationResult> {
    setState({
      allOrders: state.allOrders.map((o) =>
        o.id === orderId ? { ...o, status: nextStatus } : o
      ),
    });
    return { success: true };
  },
};

import {
  type InventoryMutationResult,
  type OrderMutationResult,
  type StoreMutationResult,
  useVendorContext,
} from '@/components/vendor/VendorProvider';

export function useVendorState() {
  const ctx = useVendorContext();
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (ctx) {
    return {
      store: ctx.store,
      stores: ctx.stores,
      activeStoreId: ctx.activeStoreId,
      vendorProfile: ctx.vendorProfile,
      categories: ctx.categories,
      masterCatalog: ctx.masterCatalog,
      masterCatalogById: ctx.masterCatalogById,
      products: ctx.products,
      orders: ctx.orders,
      hasStores: ctx.stores.length > 0,
      isPending: ctx.isPending,
      actions: {
        ...vendorActions,
        activateCreatedStore: ctx.actions.activateCreatedStore,
        switchStore: ctx.actions.switchStore,
        setStoreOpen: ctx.actions.setStoreOpen,
        saveStoreDetails: ctx.actions.saveStoreDetails,
        updateStore: ctx.actions.updateStore,
        addProduct: ctx.actions.addProduct,
        updateProduct: ctx.actions.updateProduct,
        addStock: ctx.actions.addStock,
        setStock: ctx.actions.setStock,
        removeProduct: ctx.actions.removeProduct,
        restockProduct: ctx.actions.restockProduct,
        advanceOrder: ctx.actions.advanceOrder,
        updateOrderStatus: ctx.actions.updateOrderStatus,
      },
    };
  }

  const store = s.stores.find((x) => x.id === s.activeStoreId) ?? s.stores[0] ?? null;
  return {
    store,
    stores: s.stores,
    activeStoreId: s.activeStoreId,
    vendorProfile: null,
    categories: [],
    masterCatalog,
    masterCatalogById: masterById,
    products: store ? s.allProducts.filter((p) => p.storeId === store.id) : [],
    orders: store ? s.allOrders.filter((o) => o.storeId === store.id) : [],
    hasStores: s.stores.length > 0,
    isPending: false,
    actions: vendorActions,
  };
}
