'use client';

import React, { createContext, useContext, useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CategoryOptionDto,
  MasterProduct,
  StoreProduct,
  VendorOrder,
  VendorOrderStatus,
  VendorProfileDto,
  VendorStoreInfo,
} from '@/types/vendor';
import { initialVendorOrders } from '@/data/vendorData';
import {
  addStoreProductStockAction,
  createStoreProductAction,
  removeStoreProductAction,
  setActiveStoreCookieAction,
  setStoreProductStockAction,
  updateStoreDetailsAction,
  updateStoreOperatingStatusAction,
  updateStoreProductAvailabilityAction,
  updateStoreProductPriceAction,
} from '@/lib/vendor/actions';

export interface InventoryMutationResult {
  success: boolean;
  error?: string;
}

export interface VendorContextValue {
  vendorProfile: VendorProfileDto;
  stores: VendorStoreInfo[];
  store: VendorStoreInfo | null;
  activeStoreId: string | null;
  categories: CategoryOptionDto[];
  masterCatalog: MasterProduct[];
  masterCatalogById: Record<string, MasterProduct>;
  products: StoreProduct[];
  orders: VendorOrder[];
  isPending: boolean;
  actions: {
    activateCreatedStore: (createdStore: VendorStoreInfo) => void;
    switchStore: (storeId: string) => Promise<void>;
    updateStore: (patch: Partial<VendorStoreInfo>) => Promise<void>;
    addProduct: (
      masterProductId: string,
      sellingPrice: number,
      quantity: number
    ) => Promise<InventoryMutationResult>;
    updateProduct: (
      id: string,
      patch: Partial<Pick<StoreProduct, 'sellingPrice' | 'quantity' | 'available'>>
    ) => Promise<InventoryMutationResult>;
    addStock: (id: string, amount: number) => Promise<InventoryMutationResult>;
    setStock: (id: string, quantity: number) => Promise<InventoryMutationResult>;
    removeProduct: (id: string) => Promise<InventoryMutationResult>;
    restockProduct: (id: string, additionalUnits: number) => Promise<InventoryMutationResult>;
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
  masterCatalog: MasterProduct[];
  initialStoreProducts: StoreProduct[];
  children: React.ReactNode;
}

export const VendorProvider: React.FC<VendorProviderProps> = ({
  vendorProfile,
  initialStores,
  initialActiveStoreId,
  categories,
  masterCatalog,
  initialStoreProducts,
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

  const [prevInitialStoreProducts, setPrevInitialStoreProducts] =
    useState<StoreProduct[]>(initialStoreProducts);
  const [allProducts, setAllProducts] = useState<StoreProduct[]>(initialStoreProducts);

  // In-memory orders remain mock for Phase 2 prototype continuity until Phase 5C+
  const [allOrders, setAllOrders] = useState<VendorOrder[]>(initialVendorOrders);

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

  if (prevInitialStoreProducts !== initialStoreProducts) {
    setPrevInitialStoreProducts(initialStoreProducts);
    setAllProducts(initialStoreProducts);
  }

  // Compute active store
  const store = useMemo(() => {
    if (!stores.length) return null;
    return stores.find((s) => s.id === activeStoreId) ?? stores[0] ?? null;
  }, [stores, activeStoreId]);

  const currentActiveId = store ? store.id : null;

  const masterCatalogById = useMemo<Record<string, MasterProduct>>(() => {
    const map: Record<string, MasterProduct> = {};
    for (const mp of masterCatalog) {
      map[mp.id] = mp;
    }
    return map;
  }, [masterCatalog]);

  // Filter real PostgreSQL StoreProducts strictly for the current active store
  const products = useMemo(() => {
    if (!currentActiveId) return [];
    return allProducts.filter((p) => p.storeId === currentActiveId);
  }, [allProducts, currentActiveId]);

  const orders = useMemo(() => {
    if (!currentActiveId) return [];
    return allOrders.filter((o) => o.storeId === currentActiveId);
  }, [allOrders, currentActiveId]);

  const actions = useMemo(() => {
    const upsertLocalProduct = (updatedProduct: StoreProduct) => {
      setAllProducts((prev) =>
        prev.some((p) => p.id === updatedProduct.id)
          ? prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
          : [updatedProduct, ...prev]
      );
    };

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

        setStores((prev) =>
          prev.map((s) => (s.id === targetId ? { ...s, ...patch } : s))
        );

        startTransition(async () => {
          if (patch.isOpen !== undefined) {
            await updateStoreOperatingStatusAction(targetId, patch.isOpen);
          }

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

      async addProduct(
        masterProductId: string,
        sellingPrice: number,
        quantity: number
      ): Promise<InventoryMutationResult> {
        if (!currentActiveId) {
          return { success: false, error: 'Please register and select a store first.' };
        }
        const result = await createStoreProductAction({
          masterProductId,
          sellingPrice,
          stockQuantity: quantity,
          expectedStoreId: currentActiveId,
        });
        if (!result.success) {
          return { success: false, error: result.error };
        }
        upsertLocalProduct(result.data.product);
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },

      async updateProduct(
        id: string,
        patch: Partial<Pick<StoreProduct, 'sellingPrice' | 'quantity' | 'available'>>
      ): Promise<InventoryMutationResult> {
        if (patch.sellingPrice !== undefined) {
          const res = await updateStoreProductPriceAction(id, patch.sellingPrice);
          if (!res.success) {
            return { success: false, error: res.error };
          }
          upsertLocalProduct(res.data.product);
        }

        if (patch.quantity !== undefined) {
          const res = await setStoreProductStockAction(id, patch.quantity);
          if (!res.success) {
            return { success: false, error: res.error };
          }
          upsertLocalProduct(res.data.product);
        }

        if (patch.available !== undefined) {
          const res = await updateStoreProductAvailabilityAction(id, patch.available);
          if (!res.success) {
            return { success: false, error: res.error };
          }
          upsertLocalProduct(res.data.product);
        }

        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },

      async addStock(id: string, amount: number): Promise<InventoryMutationResult> {
        const res = await addStoreProductStockAction(id, amount);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        upsertLocalProduct(res.data.product);
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },

      async setStock(id: string, quantity: number): Promise<InventoryMutationResult> {
        const res = await setStoreProductStockAction(id, quantity);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        upsertLocalProduct(res.data.product);
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },

      async removeProduct(id: string): Promise<InventoryMutationResult> {
        const res = await removeStoreProductAction(id);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        setAllProducts((prev) => prev.filter((p) => p.id !== res.data.deletedId));
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },

      async restockProduct(id: string, additionalUnits: number): Promise<InventoryMutationResult> {
        const res = await addStoreProductStockAction(id, additionalUnits);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        upsertLocalProduct(res.data.product);
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
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
  }, [stores, store, currentActiveId, router]);

  const value: VendorContextValue = {
    vendorProfile,
    stores,
    store,
    activeStoreId: currentActiveId,
    categories,
    masterCatalog,
    masterCatalogById,
    products,
    orders,
    isPending,
    actions,
  };

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>;
};
