"use client";

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
import { getCart, addToCart, updateCartItem, removeCartItem, checkoutCart, CartItem, CheckoutResult } from "./api";
import { useAuth } from "./auth";

interface CartState {
  items: CartItem[];
  total: number;
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (offerId: string, quantity?: number) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  checkout: (organizationId?: string | null) => Promise<CheckoutResult>;
}

const CartContext = createContext<CartState | null>(null);

// Panier persisté côté serveur (voir src/routes/cart.ts) : cet état ne fait que
// refléter GET /cart, resynchronisé à chaque connexion/déconnexion (token) et
// après chaque mutation — pas de duplication d'état local type localStorage.
export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const cart = await getCart(token);
      setItems(cart.items);
      setTotal(cart.total);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function add(offerId: string, quantity?: number) {
    if (!token) throw new Error("not_authenticated");
    await addToCart(token, offerId, quantity);
    await refresh();
  }

  async function updateQuantity(id: string, quantity: number) {
    if (!token) throw new Error("not_authenticated");
    await updateCartItem(token, id, quantity);
    await refresh();
  }

  async function remove(id: string) {
    if (!token) throw new Error("not_authenticated");
    await removeCartItem(token, id);
    await refresh();
  }

  async function checkout(organizationId?: string | null) {
    if (!token) throw new Error("not_authenticated");
    const result = await checkoutCart(token, organizationId);
    await refresh();
    return result;
  }

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, total, count, loading, refresh, add, updateQuantity, remove, checkout }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans CartProvider");
  return ctx;
}
