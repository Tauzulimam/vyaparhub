'use client';

import React, { createContext, useContext, useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CategoryOptionDto,
  MasterProduct,
  StoreProduct,
  UpdateStoreDetailsInput,
  VendorOrder,
  VendorOrderStatus,
  VendorProfileDto,
  VendorStoreInfo,
} from '@/types/vendor';
import {
  addStoreProductStockAction,
  createStoreProductAction,
  removeStoreProductAction,
  setActiveStoreCookieAction,
  setStoreProductStockAction,
  transitionVendorOrderStatusAction,
  updateStoreDetailsAction,
  updateStoreOperatingStatusAction,
  updateStoreProductAvailabilityAction,
  updateStoreProductPriceAction,
} from '@/lib/vendor/actions';

export interface InventoryMutationResult {
  success: boolean;
  error?: string;
}

export interface OrderMutationResult {
  success: boolean;
  error?: string;
}

export interface StoreMutationResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
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
    setStoreOpen: (isOpen: boolean) => Promise<StoreMutationResult>;
    saveStoreDetails: (input: UpdateStoreDetailsInput) => Promise<StoreMutationResult>;
    updateStore: (patch: Partial<VendorStoreInfo>) => Promise<StoreMutationResult>;
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
    advanceOrder: (id: string) => Promise<OrderMutationResult>;
    updateOrderStatus: (
      orderId: string,
      nextStatus: VendorOrderStatus
    ) => Promise<OrderMutationResult>;
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
  initialOrders: VendorOrder[];
  children: React.ReactNode;
}

export const VendorProvider: React.FC<VendorProviderProps> = ({
  vendorProfile,
  initialStores,
  initialActiveStoreId,
  categories,
  masterCatalog,
  initialStoreProducts,
  initialOrders,
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

  const [prevInitialOrders, setPrevInitialOrders] = useState<VendorOrder[]>(initialOrders);
  const [allOrders, setAllOrders] = useState<VendorOrder[]>(initialOrders);

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

  if (prevInitialOrders !== initialOrders) {
    setPrevInitialOrders(initialOrders);
    setAllOrders(initialOrders);
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

    const replaceStoreInState = (updatedStore: VendorStoreInfo) => {
      setStores((prev) =>
        prev.map((s) => (s.id === updatedStore.id ? updatedStore : s))
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

      async setStoreOpen(isOpen: boolean): Promise<StoreMutationResult> {
        if (!store) {
          return { success: false, error: 'Please register and select a store first.' };
        }
        const res = await updateStoreOperatingStatusAction(store.id, isOpen);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        replaceStoreInState(res.data.store);
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },

      async saveStoreDetails(input: UpdateStoreDetailsInput): Promise<StoreMutationResult> {
        if (!store) {
          return { success: false, error: 'Please register and select a store first.' };
        }
        const res = await updateStoreDetailsAction(store.id, input);
        if (!res.success) {
          return {
            success: false,
            error: res.error,
            fieldErrors: res.fieldErrors,
          };
        }
        replaceStoreInState(res.data.store);
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },

      async updateStore(patch: Partial<VendorStoreInfo>): Promise<StoreMutationResult> {
        if (!store) {
          return { success: false, error: 'Please register and select a store first.' };
        }
        const targetId = store.id;

        if (patch.isOpen !== undefined) {
          const openRes = await updateStoreOperatingStatusAction(targetId, patch.isOpen);
          if (!openRes.success) {
            return { success: false, error: openRes.error };
          }
          replaceStoreInState(openRes.data.store);
        }

        const detailPayload: UpdateStoreDetailsInput = {};
        if (patch.name !== undefined) detailPayload.name = patch.name;
        if (patch.phone !== undefined) detailPayload.phone = patch.phone;
        if (patch.categoryId !== undefined) detailPayload.categoryId = patch.categoryId;
        if (patch.gstStatus !== undefined) detailPayload.gstStatus = patch.gstStatus;
        if (patch.gstin !== undefined) detailPayload.gstin = patch.gstin;
        if (patch.legalBusinessName !== undefined) {
          detailPayload.legalBusinessName = patch.legalBusinessName;
        }
        if (patch.description !== undefined) detailPayload.description = patch.description;
        if (patch.email !== undefined) detailPayload.email = patch.email;
        if (patch.addressLine1 !== undefined) detailPayload.addressLine1 = patch.addressLine1;
        if (patch.addressLine2 !== undefined) detailPayload.addressLine2 = patch.addressLine2;
        if (patch.area !== undefined) detailPayload.area = patch.area;
        if (patch.city !== undefined) detailPayload.city = patch.city;
        if (patch.state !== undefined) detailPayload.state = patch.state;
        if (patch.postalCode !== undefined) detailPayload.postalCode = patch.postalCode;
        if (patch.latitude !== undefined) detailPayload.latitude = patch.latitude;
        if (patch.longitude !== undefined) detailPayload.longitude = patch.longitude;
        if (patch.openTime !== undefined) detailPayload.openingTime = patch.openTime;
        if (patch.closeTime !== undefined) detailPayload.closingTime = patch.closeTime;
        if (patch.deliveryRadiusKm !== undefined) {
          detailPayload.deliveryRadiusKm = patch.deliveryRadiusKm;
        }
        if (patch.minOrderAmount !== undefined) {
          detailPayload.minimumOrderAmount = patch.minOrderAmount;
        }

        if (Object.keys(detailPayload).length > 0) {
          const detailRes = await updateStoreDetailsAction(targetId, detailPayload);
          if (!detailRes.success) {
            return {
              success: false,
              error: detailRes.error,
              fieldErrors: detailRes.fieldErrors,
            };
          }
          replaceStoreInState(detailRes.data.store);
        }

        startTransition(() => {
          router.refresh();
        });
        return { success: true };
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

      async advanceOrder(id: string): Promise<OrderMutationResult> {
        const current = allOrders.find((o) => o.id === id);
        if (!current) {
          return { success: false, error: 'Order not found in your active store.' };
        }
        const nextMap: Partial<Record<VendorOrderStatus, VendorOrderStatus>> = {
          PLACED: 'ACCEPTED',
          PENDING: 'ACCEPTED',
          ACCEPTED: 'PREPARING',
          PREPARING: 'READY_FOR_PICKUP',
        };
        const nextStatus = nextMap[current.status];
        if (!nextStatus) {
          return {
            success: false,
            error: 'This order cannot be advanced further by the store.',
          };
        }
        const res = await transitionVendorOrderStatusAction(id, nextStatus);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        setAllOrders((prev) =>
          prev.map((o) => (o.id === res.data.order.id ? res.data.order : o))
        );
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },

      async updateOrderStatus(
        orderId: string,
        nextStatus: VendorOrderStatus
      ): Promise<OrderMutationResult> {
        const res = await transitionVendorOrderStatusAction(orderId, nextStatus);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        setAllOrders((prev) =>
          prev.map((o) => (o.id === res.data.order.id ? res.data.order : o))
        );
        startTransition(() => {
          router.refresh();
        });
        return { success: true };
      },
    };
  }, [stores, store, currentActiveId, allOrders, router]);

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
