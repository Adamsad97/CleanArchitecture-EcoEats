"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RestaurantDto as RestaurantResponseDto } from "../../../auth/services/restaurantService";
import { useAuthenticatedAPI } from "../../../auth/hooks/useAuthenticatedAPI";
import { useCart } from "../../../auth/context/CartContext";
import { useAddresses } from "../../../auth/context/AddressContext";
import { placeOrder } from "../../../auth/services/orderService";
import type { OrderSummary } from "../../../auth/services/orderService";
import { getSavedPaymentMethods } from "../../../auth/services/payment/savedPaymentMethodService";
import type { SavedPaymentMethod } from "../../../auth/services/payment/savedPaymentMethodService";
import type { CartEntry } from "../types";
import { cartEntryTotal } from "../types";

type Step = "address" | "payment";

const CARD_ICONS: Record<string, string> = {
  visa:       "💳",
  mastercard: "💳",
  amex:       "💳",
};

export function CheckoutModal({
  cart, cartTotal, restaurant, accessToken, onClose, onSuccess,
}: {
  cart:        CartEntry[];
  cartTotal:   number;
  restaurant:  RestaurantResponseDto;
  accessToken: string | null;
  onClose:     () => void;
  onSuccess:   (order: OrderSummary) => void;
}) {
  const router = useRouter();
  const { callWithRefresh } = useAuthenticatedAPI();
  const { deliveryStreet: savedStreet, deliveryPostalCode: savedPostal, deliveryCity: savedCity, setDeliveryAddress } = useCart();
  const { activeAddress } = useAddresses();

  /* Priorité : adresse sauvegardée au cours de la session > adresse active du domicile */
  const initStreet = savedStreet.trim() || activeAddress?.street     || "";
  const initPostal = savedPostal.trim() || activeAddress?.postalCode || "";
  const initCity   = savedCity.trim()   || activeAddress?.city       || "";

  const [street,         setStreet]         = useState(initStreet);
  const [postalCode,     setPostalCode]      = useState(initPostal);
  const [city,           setCity]           = useState(initCity);
  const [step,           setStep]           = useState<Step>(
    savedStreet.trim() && savedPostal.trim() && savedCity.trim() ? "payment" : "address"
  );
  const [formError,      setFormError]      = useState<string | null>(null);

  const [cards,          setCards]          = useState<SavedPaymentMethod[] | null>(null);
  const [loadingCards,   setLoadingCards]   = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [placing,        setPlacing]        = useState(false);

  const total = cartTotal + restaurant.deliveryFee;

  /* ── Chargement des cartes à l'entrée de l'étape paiement ── */
  useEffect(() => {
    if (step !== "payment" || !accessToken) return;
    const timer = setTimeout(() => {
      void (async () => {
        setLoadingCards(true);
        const result = await getSavedPaymentMethods(accessToken);
        const list = result.ok && Array.isArray(result.data) ? result.data : [];
        if (list.length === 0) {
          onClose();
          router.push("/dashboard/account/payment-methods");
          return;
        }
        setCards(list);
        const defaultCard = list.find((card) => card.isDefault) ?? list[0];
        if (defaultCard) setSelectedCardId(defaultCard.id);
        setLoadingCards(false);
      })();
    }, 0);
    return () => clearTimeout(timer);
  }, [step, accessToken]);

  /* ── Étape 1 : valider l'adresse et passer à l'étape paiement ── */
  const handleContinue = () => {
    if (!street.trim() || !postalCode.trim() || !city.trim()) {
      setFormError("Rue, code postal et ville sont requis");
      return;
    }
    if (!accessToken) { setFormError("Vous devez être connecté pour commander"); return; }
    setFormError(null);
    setDeliveryAddress(street.trim(), postalCode.trim(), city.trim());
    setStep("payment");
  };

  /* ── Étape 2 : passer la commande ── */
  const handleConfirm = async () => {
    if (!accessToken) return;
    setPlacing(true);
    setFormError(null);

    const result = await callWithRefresh((token) =>
      placeOrder({
        restaurantId:       restaurant.id,
        deliveryStreet:     street.trim(),
        deliveryPostalCode: postalCode.trim(),
        deliveryCity:       city.trim(),
        deliveryFee:    restaurant.deliveryFee,
        items:          cart.map((entry) => ({
          menuItemId:     entry.item.id,
          name:           entry.item.name,
          unitPrice:      entry.item.price + entry.selectedOptions.reduce((sum, option) => sum + option.extraPrice, 0),
          quantity:       entry.quantity,
          notes:          entry.notes || undefined,
          optionValueIds: entry.selectedOptions.map((option) => option.valueId),
        })),
      }, token)
    );

    if (result.ok && result.data) {
      onSuccess(result.data);
    } else {
      setFormError(result.message ?? "Erreur lors de la commande");
    }
    setPlacing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            {step === "payment" && (
              <button type="button" onClick={() => { setStep("address"); setFormError(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 text-lg">
                ←
              </button>
            )}
            <p className="text-base font-black text-slate-900">
              {step === "address" ? "Finaliser la commande" : "Moyen de paiement"}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">
            ✕
          </button>
        </div>

        {/* ── Indicateur d'étapes ── */}
        <div className="flex px-5 pt-3 gap-2 shrink-0">
          {(["address", "payment"] as Step[]).map((stepName) => (
            <div key={stepName} className={`h-1 flex-1 rounded-full transition-colors ${step === stepName || (stepName === "address" && step === "payment") ? "bg-orange-500" : "bg-slate-200"}`} />
          ))}
        </div>

        {/* ── Contenu scrollable ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Récapitulatif commun aux 2 étapes */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Récapitulatif</p>
            {cart.map((entry) => (
              <div key={entry.cartId} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{entry.item.name} × {entry.quantity}</span>
                <span className="font-semibold">{cartEntryTotal(entry).toFixed(2)} €</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
              <span className="text-slate-500">Livraison</span>
              <span>{restaurant.deliveryFee === 0 ? "Offerte" : `${restaurant.deliveryFee.toFixed(2)} €`}</span>
            </div>
            <div className="flex justify-between font-black">
              <span>Total</span>
              <span className="text-orange-600">{total.toFixed(2)} €</span>
            </div>
          </div>

          {/* ── ÉTAPE 1 : Adresse ── */}
          {step === "address" && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900">Adresse de livraison</p>
              <input type="text" placeholder="Numéro et rue *" value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <div className="flex gap-2">
                <input type="text" placeholder="Code postal *" value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  maxLength={10}
                  className="w-36 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <input type="text" placeholder="Ville *" value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
          )}

          {/* ── ÉTAPE 2 : Paiement ── */}
          {step === "payment" && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900">Carte bancaire</p>

              {loadingCards && (
                <p className="text-sm text-slate-400 text-center py-4">Chargement…</p>
              )}

              {!loadingCards && cards && cards.length > 0 && (
                <div className="space-y-2">
                  {cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCardId(card.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
                        selectedCardId === card.id
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{CARD_ICONS[card.brand.toLowerCase()] ?? "💳"}</span>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-900 capitalize">{card.brand} •••• {card.last4}</p>
                          <p className="text-xs text-slate-400">Expire {card.expiryMonth}/{card.expiryYear}</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedCardId === card.id ? "border-orange-500 bg-orange-500" : "border-slate-300"
                      }`}>
                        {selectedCardId === card.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => { onClose(); router.push("/dashboard/account/payment-methods"); }}
                    className="w-full text-sm text-orange-600 font-semibold py-2 hover:underline text-left"
                  >
                    + Ajouter une nouvelle carte
                  </button>
                </div>
              )}

            </div>
          )}

          {!accessToken && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
              ⚠️ Vous devez être connecté pour passer une commande.
            </div>
          )}

          {formError && <p className="text-sm text-red-600 font-medium">{formError}</p>}
        </div>

        {/* ── Bouton bas ── */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          {step === "address" ? (
            <button type="button" onClick={handleContinue} disabled={!accessToken}
              className="w-full bg-slate-900 text-white rounded-2xl py-4 text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition">
              Continuer vers le paiement →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={placing || !selectedCardId || loadingCards}
              className="w-full bg-orange-600 text-white rounded-2xl py-4 text-sm font-bold hover:bg-orange-700 disabled:opacity-50 transition"
            >
              {placing ? "Envoi en cours…" : `Confirmer • ${total.toFixed(2)} €`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
