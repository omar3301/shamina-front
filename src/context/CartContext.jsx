'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const CartContext = createContext(undefined);
const STORAGE_KEY = 'shamina_cart_v1';

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const isFirstRender = useRef(true);

  // Hydrate from localStorage on mount (client-only, no SSR mismatch since initial state is [])
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCartItems(JSON.parse(saved));
    } catch (err) {
      console.error('CartContext: failed to parse stored cart', err);
    }
  }, []);

  // Persist on every change, skip the write on the very first render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  /**
   * item: { id, name, images } — the base MenuItem (or its mapped shape)
   * options: [{ groupId, groupTitle, id, name, priceModifier }] — flattened selected options, for display
   * quantity: number
   * totalItemPrice: number — unit price INCLUDING selected option modifiers (basePrice + Σ priceModifier)
   *
   * Identical item+options combos are merged (quantity summed) instead of duplicated as separate lines.
   */
  const addToCart = useCallback((item, options, quantity, totalItemPrice) => {
    setCartItems((prev) => {
      const optionsKey = JSON.stringify(options ?? []);
      const existingIndex = prev.findIndex(
        (ci) => ci.itemId === item.id && JSON.stringify(ci.options ?? []) === optionsKey
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }

      return [
        ...prev,
        {
          cartItemId: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          itemId: item.id,
          name: item.name,
          image: item.image ?? item.images?.[0],
          options: options ?? [],
          quantity,
          unitPrice: totalItemPrice,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((cartItemId) => {
    setCartItems((prev) => prev.filter((ci) => ci.cartItemId !== cartItemId));
  }, []);

  // quantity <= 0 removes the line entirely
  const updateQuantity = useCallback((cartItemId, quantity) => {
    setCartItems((prev) => {
      if (quantity <= 0) return prev.filter((ci) => ci.cartItemId !== cartItemId);
      return prev.map((ci) => (ci.cartItemId === cartItemId ? { ...ci, quantity } : ci));
    });
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.unitPrice * ci.quantity, 0),
    [cartItems]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.quantity, 0),
    [cartItems]
  );

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (ctx === undefined) {
    throw new Error('useCart must be used within a <CartProvider>');
  }
  return ctx;
}
