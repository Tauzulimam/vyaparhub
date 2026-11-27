'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
  addToCartAction,
  clearCustomerCartAction,
  getCustomerCartSummaryAction,
  removeCartItemAction,
  replaceCartWithItemAction,
  updateCartItemQuantityAction,
} from '@/lib/cart/actions';
import {
  type CartActionResult,
  type CartAuthStatus,
  createEmptyCustomerCartDto,
  type CustomerCartDto,
  DEFAULT_DELIVERY_LOCATION_LABEL,
} from '@/lib/cart/types';

interface SharedCartClientState {
  authStatus: CartAuthStatus;
  cart: CustomerCartDto;
  deliveryLocationLabel: string;
  loaded: boolean;
}

let clientState: SharedCartClientState = {
  authStatus: 'unauthenticated',
  cart: createEmptyCustomerCartDto(),
  deliveryLocationLabel: DEFAULT_DELIVERY_LOCATION_LABEL,
  loaded: false,
};

let sawAuthRouteSinceLoad = false;
let inflightFetch: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SharedCartClientState {
  return clientState;
}

export function hydrateCustomerCartState(
  cart: CustomerCartDto,
  authStatus: CartAuthStatus = 'authenticated_customer',
  deliveryLocationLabel?: string
) {
  clientState = {
    authStatus,
    cart,
    deliveryLocationLabel:
      deliveryLocationLabel !== undefined
        ? deliveryLocationLabel
        : clientState.deliveryLocationLabel,
    loaded: true,
  };
  sawAuthRouteSinceLoad = false;
  emitChange();
}

export function hydrateCustomerDeliveryLocation(deliveryLocationLabel: string) {
  if (clientState.deliveryLocationLabel === deliveryLocationLabel) {
    return;
  }
  clientState = {
    ...clientState,
    deliveryLocationLabel,
  };
  emitChange();
}

export function resetCustomerCartState() {
  clientState = {
    authStatus: 'unauthenticated',
    cart: createEmptyCustomerCartDto(),
    deliveryLocationLabel: DEFAULT_DELIVERY_LOCATION_LABEL,
    loaded: false,
  };
  emitChange();
}

async function ensureCartLoaded(force = false): Promise<void> {
  if (clientState.loaded && !force) {
    return;
  }
  if (inflightFetch && !force) {
    return inflightFetch;
  }

  const p = getCustomerCartSummaryAction()
    .then((res) => {
      clientState = {
        authStatus: res.authStatus,
        cart: res.cart,
        deliveryLocationLabel: res.deliveryLocationLabel,
        loaded: true,
      };
      sawAuthRouteSinceLoad = false;
      emitChange();
    })
    .finally(() => {
      if (inflightFetch === p) {
        inflightFetch = null;
      }
    });

  inflightFetch = p;
  return p;
}

function applyActionResult(res: CartActionResult) {
  if (res.success) {
    clientState = {
      ...clientState,
      authStatus: 'authenticated_customer',
      cart: res.cart,
      loaded: true,
    };
    sawAuthRouteSinceLoad = false;
    emitChange();
  } else if (res.cart) {
    clientState = {
      ...clientState,
      cart: res.cart,
      loaded: true,
    };
    emitChange();
  }
}

export function useCustomerCart(options?: {
  initialCart?: CustomerCartDto;
  initialAuthStatus?: CartAuthStatus;
  initialLocationLabel?: string;
  autoFetch?: boolean;
}) {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const autoFetch = options?.autoFetch ?? true;

  // Track fresh Server Component prop changes (`/cart` & `/checkout`) without first-frame lag
  const [prevInitialCart, setPrevInitialCart] = useState<CustomerCartDto | undefined>(
    options?.initialCart
  );
  const [hasMutatedSinceInitial, setHasMutatedSinceInitial] = useState<boolean>(false);

  if (options?.initialCart !== prevInitialCart) {
    setPrevInitialCart(options?.initialCart);
    setHasMutatedSinceInitial(false);
  }

  useEffect(() => {
    const isAuthFlowRoute =
      pathname === '/login' ||
      pathname.startsWith('/login/') ||
      pathname === '/register' ||
      pathname.startsWith('/register/') ||
      pathname === '/vendor/register' ||
      pathname.startsWith('/vendor/register/');

    if (isAuthFlowRoute) {
      sawAuthRouteSinceLoad = true;
      return;
    }

    if (options?.initialCart) {
      hydrateCustomerCartState(
        options.initialCart,
        options.initialAuthStatus ?? 'authenticated_customer',
        options.initialLocationLabel
      );
      return;
    }

    if (options?.initialLocationLabel !== undefined) {
      hydrateCustomerDeliveryLocation(options.initialLocationLabel);
    }

    if (autoFetch) {
      void ensureCartLoaded(sawAuthRouteSinceLoad);
    }
  }, [
    pathname,
    options?.initialCart,
    options?.initialAuthStatus,
    options?.initialLocationLabel,
    autoFetch,
  ]);

  const useServerPropDirectly =
    options?.initialCart !== undefined && !hasMutatedSinceInitial;

  const effectiveCart = useServerPropDirectly ? options.initialCart! : snapshot.cart;
  const effectiveAuthStatus = useServerPropDirectly
    ? options.initialAuthStatus ?? 'authenticated_customer'
    : snapshot.authStatus;
  const effectiveLocationLabel =
    options?.initialLocationLabel !== undefined && !snapshot.loaded
      ? options.initialLocationLabel
      : snapshot.deliveryLocationLabel;

  const refreshCart = useCallback(async () => {
    setHasMutatedSinceInitial(true);
    await ensureCartLoaded(true);
  }, []);

  const syncCart = useCallback(
    (
      nextCart: CustomerCartDto,
      nextAuthStatus: CartAuthStatus = 'authenticated_customer',
      nextLocationLabel?: string
    ) => {
      setHasMutatedSinceInitial(true);
      hydrateCustomerCartState(nextCart, nextAuthStatus, nextLocationLabel);
    },
    []
  );

  const syncDeliveryLocation = useCallback((nextLocationLabel: string) => {
    hydrateCustomerDeliveryLocation(nextLocationLabel);
  }, []);

  const addToCart = useCallback(
    async (storeProductId: string, quantity = 1): Promise<CartActionResult> => {
      const res = await addToCartAction(storeProductId, quantity);
      setHasMutatedSinceInitial(true);
      applyActionResult(res);
      return res;
    },
    []
  );

  const replaceCartWithProduct = useCallback(
    async (storeProductId: string, quantity = 1): Promise<CartActionResult> => {
      const res = await replaceCartWithItemAction(storeProductId, quantity);
      setHasMutatedSinceInitial(true);
      applyActionResult(res);
      return res;
    },
    []
  );

  const updateItemQuantity = useCallback(
    async (cartItemId: string, nextQuantity: number): Promise<CartActionResult> => {
      const res = await updateCartItemQuantityAction(cartItemId, nextQuantity);
      setHasMutatedSinceInitial(true);
      applyActionResult(res);
      return res;
    },
    []
  );

  const removeItem = useCallback(
    async (cartItemId: string): Promise<CartActionResult> => {
      const res = await removeCartItemAction(cartItemId);
      setHasMutatedSinceInitial(true);
      applyActionResult(res);
      return res;
    },
    []
  );

  const clearCart = useCallback(async (): Promise<CartActionResult> => {
    const res = await clearCustomerCartAction();
    setHasMutatedSinceInitial(true);
    applyActionResult(res);
    return res;
  }, []);

  return {
    authStatus: effectiveAuthStatus,
    cart: effectiveCart,
    items: effectiveCart.items,
    store: effectiveCart.store,
    cartCount: effectiveCart.itemCount,
    subtotal: effectiveCart.subtotal,
    canCheckout: effectiveCart.canCheckout,
    hasBlockingIssues: effectiveCart.hasBlockingIssues,
    blockingIssues: effectiveCart.blockingIssues,
    deliveryLocationLabel: effectiveLocationLabel,
    refreshCart,
    syncCart,
    syncDeliveryLocation,
    addToCart,
    replaceCartWithProduct,
    updateItemQuantity,
    removeItem,
    clearCart,
  };
}
