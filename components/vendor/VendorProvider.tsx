'use client';

import React, { createContext, useContext, useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CategoryOptionDto,
  StoreProduct,
  VendorOrder,
  VendorOrderStatus,
  VendorProfileDto,
  VendorStoreInfo,
} from '@/types/vendor';
import {
  initialStoreProducts,
  initialVendorOrders,
} from '@/data/vendorData';
import {
  setActiveStoreCookieAction,
  updateStoreDetailsAction,
  updateStoreOperatingStatusAction,
} from '@/lib/vendor/actions';

export interface VendorContextValue {
  vendorProfile: VendorProfileDto;
  stores: VendorStoreInfo[];
  store: VendorStoreInfo | null;
  activeStoreId: string | null;
  categories: CategoryOptionDto[];
  products: StoreProduct[];
  orders: VendorOrder[];
  isPending: boolean;
  actions: {
    activateCreatedStore: (createdStore: VendorStoreInfo) => void;
    switchStore: (storeId: string) => Promise<void>;
    updateStore: (patch: Partial<VendorStoreInfo>) => Promise<void>;
    addProduct: (masterProductId: string, sellingPrice: number, quantity: number) => void;
    updateProduct: (
      id: string,
      patch: Partial<Pick<StoreProduct, 'sellingPrice' | 'quantity' | 'available'>>
    ) => void;
    addStock: (id: string, amount: number) => void;
    setStock: (id: string, quantity: number) => void;
    removeProduct: (id: string) => void;
    restockProduct: (id: string, additionalUnits: number) => void;
    advanceOrder: (id: string) => void;
    updateOrderStatus: (orderId: string, nextStatus: VendorOrderStatus) => void;
    cancelOrder: (orderId: string) => void;
  };
}

const VendorContext = createContext<VendorContextValue | null>(null);

export function useVendorContext(): VendorContextValue | null {
  return useContext(VendorContext);
}

interface VendorProviderProps {
  vendorProfile: VendorProfileDto;
  initialStores: VendorStoreInfo[];
  initialActiveStoreId: string | null;
  categories: CategoryOptionDto[];
  children: React.ReactNode;
}

export const VendorProvider: React.FC<VendorProviderProps> = ({
  vendorProfile,
  initialStores,
  initialActiveStoreId,
  categories,
  children,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [prevInitialStores, setPrevInitialStores] = useState<VendorStoreInfo[]>(initialStores);
  const [stores, setStores] = useState<VendorStoreInfo[]>(initialStores);
  const [prevInitialActiveStoreId, setPrevInitialActiveStoreId] = useState<string | null>(
    initialActiveStoreId
  );
  const [activeStoreId, setActiveStoreId] = useState<string | null>(initialActiveStoreId);
  const [pendingCreatedStore, setPendingCreatedStore] = useState<VendorStoreInfo | null>(null);

  if (prevInitialStores !== initialStores) {
    setPrevInitialStores(initialStores);
    if (pendingCreatedStore && !initialStores.some((s) => s.id === pendingCreatedStore.id)) {
      setStores([...initialStores, pendingCreatedStore]);
    } else {
      if (pendingCreatedStore) {
        setPendingCreatedStore(null);
      }
      setStores(initialStores);
    }
  }

  if (prevInitialActiveStoreId !== initialActiveStoreId) {
    setPrevInitialActiveStoreId(initialActiveStoreId);
    const awaitingCreatedStoreInServerProps =
      pendingCreatedStore !== null && !initialStores.some((s) => s.id === pendingCreatedStore.id);
    if (!awaitingCreatedStoreInServerProps) {
      setActiveStoreId(initialActiveStoreId);
    }
  }

  // In-memory products & orders for Phase 2 prototype continuity until Phase 5B
  const [allProducts, setAllProducts] = useState<StoreProduct[]>(initialStoreProducts);
  const [allOrders, setAllOrders] = useState<VendorOrder[]>(initialVendorOrders);

  // Compute active store
  const store = useMemo(() => {
    if (!stores.length) return null;
    return stores.find((s) => s.id === activeStoreId) ?? stores[0] ?? null;
  }, [stores, activeStoreId]);

  // Keep activeStoreId in sync if stores change
  const currentActiveId = store ? store.id : null;

  // Filter products and orders for active store
  const products = useMemo(() => {
    if (!currentActiveId) return [];
    return allProducts.filter((p) => p.storeId === currentActiveId);
  }, [allProducts, currentActiveId]);

  const orders = useMemo(() => {
    if (!currentActiveId) return [];
    return allOrders.filter((o) => o.storeId === currentActiveId);
  }, [allOrders, currentActiveId]);

  const actions = useMemo(() => {
    return {
      activateCreatedStore(createdStore: VendorStoreInfo) {
        setPendingCreatedStore(createdStore);
        setStores((prev) =>
          prev.some((s) => s.id === createdStore.id)
            ? prev.map((s) => (s.id === createdStore.id ? createdStore : s))
            : [...prev, createdStore]
        );
        setActiveStoreId(createdStore.id);
      },

      async switchStore(storeId: string) {
        if (!stores.some((s) => s.id === storeId)) return;
        setPendingCreatedStore(null);
        setActiveStoreId(storeId);
        startTransition(async () => {
          await setActiveStoreCookieAction(storeId);
          router.refresh();
        });
      },

      async updateStore(patch: Partial<VendorStoreInfo>) {
        if (!store) return;
        const targetId = store.id;

        // Optimistically update local state
        setStores((prev) =>
          prev.map((s) => (s.id === targetId ? { ...s, ...patch } : s))
        );

        startTransition(async () => {
          // If operating status (isOpen) changed, persist to PostgreSQL
          if (patch.isOpen !== undefined) {
            await updateStoreOperatingStatusAction(targetId, patch.isOpen);
          }

          // If editable details changed, persist to PostgreSQL
          const hasDetailUpdates =
            patch.description !== undefined ||
            patch.email !== undefined ||
            patch.addressLine1 !== undefined ||
            patch.addressLine2 !== undefined ||
            patch.area !== undefined ||
            patch.city !== undefined ||
            patch.state !== undefined ||
            patch.postalCode !== undefined ||
            patch.openTime !== undefined ||
            patch.closeTime !== undefined ||
            patch.deliveryRadiusKm !== undefined ||
            patch.minOrderAmount !== undefined;

          if (hasDetailUpdates) {
            await updateStoreDetailsAction(targetId, {
              description: patch.description,
              email: patch.email,
              addressLine1: patch.addressLine1,
              addressLine2: patch.addressLine2,
              area: patch.area,
              city: patch.city,
              state: patch.state,
              postalCode: patch.postalCode,
              openingTime: patch.openTime,
              closingTime: patch.closeTime,
              deliveryRadiusKm: patch.deliveryRadiusKm,
              minimumOrderAmount: patch.minOrderAmount,
            });
          }

          router.refresh();
        });
      },

      addProduct(masterProductId: string, sellingPrice: number, quantity: number) {
        if (!currentActiveId) return;
        if (allProducts.some((p) => p.storeId === currentActiveId && p.masterProductId === masterProductId)) return;
        const product: StoreProduct = {
          id: `sp-${Date.now()}`,
          storeId: currentActiveId,
          masterProductId,
          sellingPrice,
          quantity,
          available: quantity > 0,
        };
        setAllProducts((prev) => [product, ...prev]);
      },

      updateProduct(
        id: string,
        patch: Partial<Pick<StoreProduct, 'sellingPrice' | 'quantity' | 'available'>>
      ) {
        setAllProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
        );
      },

      addStock(id: string, amount: number) {
        if (!Number.isInteger(amount) || amount <= 0) return;
        setAllProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, quantity: p.quantity + amount, available: p.quantity <= 0 ? true : p.available }
              : p
          )
        );
      },

      setStock(id: string, quantity: number) {
        if (!Number.isInteger(quantity) || quantity < 0) return;
        setAllProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, quantity, available: quantity <= 0 ? false : p.quantity <= 0 ? true : p.available }
              : p
          )
        );
      },

      removeProduct(id: string) {
        setAllProducts((prev) => prev.filter((p) => p.id !== id));
      },

      restockProduct(id: string, additionalUnits: number) {
        setAllProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  quantity: p.quantity + additionalUnits,
                  available: true,
                }
              : p
          )
        );
      },

      advanceOrder(id: string) {
        const vendorFlow: VendorOrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'];
        setAllOrders((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const idx = vendorFlow.indexOf(o.status);
            if (idx < 0 || idx >= vendorFlow.length - 1) return o;
            return { ...o, status: vendorFlow[idx + 1] };
          })
        );
      },

      updateOrderStatus(orderId: string, nextStatus: VendorOrderStatus) {
        setAllOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      },

      cancelOrder(orderId: string) {
        setAllOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
        );
      },
    };
  }, [stores, store, currentActiveId, allProducts, router]);

  const value: VendorContextValue = {
    vendorProfile,
    stores,
    store,
    activeStoreId: currentActiveId,
    categories,
    products,
    orders,
    isPending,
    actions,
  };

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
};
