"use client";

import Image from "next/image";
import { useCart } from "../auth/context/CartContext";
import { cartEntryTotal } from "../restaurants/[restaurantId]/types";
import { buildImageUrl } from "../auth/services/http";
import { IconCart, IconFood, IconX } from "./Icons";

export function GlobalCartSidebar() {
  const {
    cart, restaurant, cartTotal,
    showCart, setShowCart, setShowCheckout,
    removeFromCart, updateQuantity, clearCart,
  } = useCart();

  if (!showCart) return null;

  const deliveryFee = restaurant?.deliveryFee ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
      <div className="relative z-10 bg-white w-full max-w-sm flex flex-col shadow-2xl">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-base font-black text-slate-900">Mon panier</p>
            {restaurant && <p className="text-xs text-slate-400 mt-0.5">{restaurant.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button type="button" onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-600 transition font-semibold px-2 py-1 rounded-lg hover:bg-red-50">
                Vider
              </button>
            )}
            <button type="button" onClick={() => setShowCart(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-500">
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Panier vide ── */}
        {cart.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="text-slate-200"><IconCart className="h-12 w-12" /></div>
            <p className="text-sm font-semibold text-slate-400">Votre panier est vide</p>
            <p className="text-xs text-slate-300">Parcourez les restaurants pour ajouter des articles.</p>
          </div>
        )}

        {/* ── Articles ── */}
        {cart.length > 0 && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {cart.map((entry) => {
              const photoUrl = entry.item.photoUrl ? buildImageUrl(entry.item.photoUrl) : null;
              return (
                <div key={entry.cartId} className="flex items-start gap-3">
                  {photoUrl ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative bg-slate-100">
                      <Image src={photoUrl} alt={entry.item.name} fill sizes="64px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl shrink-0 bg-slate-100 flex items-center justify-center text-slate-300">
                      <IconFood className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-bold text-slate-900 leading-tight">{entry.item.name}</p>
                      <button type="button" onClick={() => removeFromCart(entry.cartId)}
                        className="text-slate-300 hover:text-red-500 transition shrink-0 ml-1">
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>
                    {entry.selectedOptions.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                        {entry.selectedOptions.map((option) => option.valueName).join(", ")}
                      </p>
                    )}
                    {entry.notes && <p className="text-xs text-slate-400 italic mt-0.5">&quot;{entry.notes}&quot;</p>}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateQuantity(entry.cartId, entry.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700 hover:bg-slate-200 transition">
                          −
                        </button>
                        <span className="text-sm font-bold w-5 text-center text-slate-900">{entry.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(entry.cartId, entry.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-sm font-bold text-white hover:bg-slate-700 transition">
                          +
                        </button>
                      </div>
                      <p className="text-sm font-black text-slate-900">{cartEntryTotal(entry).toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pied ── */}
        {cart.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-3 shrink-0">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Sous-total</span>
                <span className="font-semibold text-slate-900">{cartTotal.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Livraison</span>
                <span className="font-semibold text-slate-900">
                  {deliveryFee === 0 ? "Offerte" : `${deliveryFee.toFixed(2)} €`}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-base font-black text-orange-600">{(cartTotal + deliveryFee).toFixed(2)} €</span>
              </div>
            </div>
            <button type="button" onClick={() => { setShowCart(false); setShowCheckout(true); }}
              className="w-full bg-orange-600 text-white rounded-2xl py-4 text-sm font-bold hover:bg-orange-700 transition">
              Passer la commande →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
