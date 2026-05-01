"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import type { CartEntry } from "../../restaurants/[restaurantId]/types";
import { cartEntryTotal } from "../../restaurants/[restaurantId]/types";
import type { RestaurantDto } from "../services/restaurantService";
import type { OrderSummary } from "../services/orderService";

const STORAGE_KEY = "ecoeats_cart";

const loadPersistedCart = (): PersistedData => {
  if (typeof window === "undefined") return DEFAULT_PERSISTED;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PERSISTED;

    const parsed = JSON.parse(stored) as Partial<PersistedData>;
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      restaurant: parsed.restaurant ?? null,
      deliveryStreet: parsed.deliveryStreet ?? "",
      deliveryPostalCode: parsed.deliveryPostalCode ?? "",
      deliveryCity: parsed.deliveryCity ?? "",
    };
  } catch {
    return DEFAULT_PERSISTED;
  }
};

type PendingEntry = { entry: Omit<CartEntry, "cartId">; restaurant: RestaurantDto };

type CartContextValue = {
  cart:               CartEntry[];
  restaurant:         RestaurantDto | null;
  cartTotal:          number;
  cartCount:          number;
  deliveryStreet:     string;
  deliveryPostalCode: string;
  deliveryCity:       string;
  showCart:           boolean;
  showCheckout:       boolean;
  orderSuccess:       OrderSummary | null;
  pendingEntry:       PendingEntry | null;
  setShowCart:        (v: boolean) => void;
  setShowCheckout:    (v: boolean) => void;
  setDeliveryAddress: (street: string, postalCode: string, city: string) => void;
  addToCart:          (entry: Omit<CartEntry, "cartId">, restaurant: RestaurantDto) => void;
  removeFromCart:     (cartId: string) => void;
  updateQuantity:     (cartId: string, qty: number) => void;
  clearCart:          () => void;
  onOrderSuccess:     (order: OrderSummary) => void;
  clearSuccess:       () => void;
  confirmReplace:     () => void;
  cancelReplace:      () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

type PersistedData = {
  cart:               CartEntry[];
  restaurant:         RestaurantDto | null;
  deliveryStreet:     string;
  deliveryPostalCode: string;
  deliveryCity:       string;
};

const DEFAULT_PERSISTED: PersistedData = {
  cart: [], restaurant: null, deliveryStreet: "", deliveryPostalCode: "", deliveryCity: "",
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  /* Un seul useState pour toutes les données persistées → 1 seul re-render à l'hydration */
  const [persisted, setPersisted] = useState<PersistedData>(loadPersistedCart);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<OrderSummary | null>(null);
  const [pendingEntry, setPendingEntry] = useState<PendingEntry | null>(null);

  const { cart, restaurant, deliveryStreet, deliveryPostalCode, deliveryCity } = persisted;

  const cartRef       = useRef(cart);
  const restaurantRef = useRef(restaurant);
  useEffect(() => { cartRef.current       = cart;       }, [cart]);
  useEffect(() => { restaurantRef.current = restaurant; }, [restaurant]);

  /* ── Persistance ── */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [persisted]);

  const cartTotal = cart.reduce((sum, e) => sum + cartEntryTotal(e), 0);
  const cartCount = cart.reduce((sum, e) => sum + e.quantity,        0);

  const addToCart = useCallback((entry: Omit<CartEntry, "cartId">, rest: RestaurantDto) => {
    const currentCart       = cartRef.current;
    const currentRestaurant = restaurantRef.current;
    if (currentCart.length > 0 && currentRestaurant && currentRestaurant.id !== rest.id) {
      setPendingEntry({ entry, restaurant: rest });
      return;
    }
    setPersisted((persistedData) => ({
      ...persistedData,
      restaurant: rest,
      cart: [...persistedData.cart, { ...entry, cartId: `${Date.now()}-${Math.random()}` }],
    }));
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setPersisted((persistedData) => ({
      ...persistedData,
      cart: persistedData.cart.filter((cartEntry) => cartEntry.cartId !== cartId),
    }));
  }, []);

  const updateQuantity = useCallback((cartId: string, qty: number) => {
    setPersisted((persistedData) => ({
      ...persistedData,
      cart: qty <= 0
        ? persistedData.cart.filter((cartEntry) => cartEntry.cartId !== cartId)
        : persistedData.cart.map((cartEntry) => cartEntry.cartId === cartId ? { ...cartEntry, quantity: qty } : cartEntry),
    }));
  }, []);

  const setDeliveryAddress = useCallback((street: string, postalCode: string, city: string) => {
    setPersisted((persistedData) => ({ ...persistedData, deliveryStreet: street, deliveryPostalCode: postalCode, deliveryCity: city }));
  }, []);

  const clearCart = useCallback(() => {
    setPersisted(DEFAULT_PERSISTED);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const onOrderSuccess = useCallback((order: OrderSummary) => {
    setPersisted(DEFAULT_PERSISTED);
    setShowCheckout(false);
    setOrderSuccess(order);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearSuccess = useCallback(() => setOrderSuccess(null), []);

  const confirmReplace = useCallback(() => {
    if (!pendingEntry) return;
    setPersisted((persistedData) => ({
      ...persistedData,
      restaurant: pendingEntry.restaurant,
      cart: [{ ...pendingEntry.entry, cartId: `${Date.now()}-${Math.random()}` }],
    }));
    setPendingEntry(null);
  }, [pendingEntry]);

  const cancelReplace = useCallback(() => setPendingEntry(null), []);

  return (
    <CartContext.Provider value={{
      cart, restaurant, cartTotal, cartCount,
      deliveryStreet, deliveryPostalCode, deliveryCity,
      showCart, showCheckout, orderSuccess, pendingEntry,
      setShowCart, setShowCheckout, setDeliveryAddress,
      addToCart, removeFromCart, updateQuantity, clearCart,
      onOrderSuccess, clearSuccess, confirmReplace, cancelReplace,
    }}>
      {children}
      {/* ── Dialog conflit de restaurant ── */}
      {pendingEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelReplace} />
          <div className="relative z-10 bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <p className="text-base font-black text-slate-900">Nouveau restaurant</p>
            <p className="text-sm text-slate-600">
              Votre panier contient des articles d&apos;un autre restaurant. Voulez-vous vider le panier et commander chez <span className="font-bold">{pendingEntry.restaurant.name}</span> ?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={cancelReplace}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Annuler
              </button>
              <button type="button" onClick={confirmReplace}
                className="flex-1 rounded-xl bg-orange-600 text-white py-2.5 text-sm font-bold hover:bg-orange-700 transition">
                Vider et continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans CartProvider");
  return ctx;
}
