'use client';

import { useState, useEffect } from 'react';

export const DEFAULT_MOCK_CART_COUNT = 3;

let globalCartCount = DEFAULT_MOCK_CART_COUNT;
const listeners = new Set<() => void>();

export function useMockCart() {
  const [cartCount, setCartCount] = useState<number>(globalCartCount);

  useEffect(() => {
    const update = () => setCartCount(globalCartCount);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const incrementCart = () => {
    globalCartCount += 1;
    listeners.forEach((callback) => callback());
  };

  return { cartCount, incrementCart };
}
