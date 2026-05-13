"use client";

import { useEffect, useState, useCallback } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "../../../auth/context/AuthContext";
import { getStoredAccessToken } from "../../../auth/services/tokenHelper";
import { getStripe } from "../../../auth/services/payment/stripeClient";
import { createSetupIntent } from "../../../auth/services/payment/paymentIntentService";
import { refreshService } from "../../../auth/services/refreshService";
import type { ApiResult } from "../../../auth/types";
import {
  getSavedPaymentMethods,
  confirmAndSavePaymentMethod,
  removePaymentMethod,
} from "../../../auth/services/payment/savedPaymentMethodService";
import type { SavedPaymentMethod } from "../../../auth/services/payment/savedPaymentMethodService";

const CARD_BRAND_ICONS: Record<string, string> = {
  visa:       "VISA",
  mastercard: "MC",
  amex:       "AMEX",
  unknown:    "ðŸ’³",
};

function AddCardForm({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: (method: SavedPaymentMethod) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const { tokens } = useAuth();

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !tokens?.accessToken) return;

    setSaving(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(
      clientSecret,
      { payment_method: { card: cardElement } },
    );

    if (stripeError) {
      setError(stripeError.message ?? "Erreur Stripe");
      setSaving(false);
      return;
    }

    if (!setupIntent?.payment_method) {
      setError("Impossible de rÃ©cupÃ©rer la mÃ©thode de paiement");
      setSaving(false);
      return;
    }

    const result = await confirmAndSavePaymentMethod(String(setupIntent.payment_method), tokens.accessToken);

    if (result.ok && result.data) {
      onSuccess(result.data);
    } else {
      setError(result.message ?? "Erreur lors de l'enregistrement");
    }

    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 px-4 py-3 bg-white">
        <CardElement
          options={{
            style: {
              base:     { fontSize: "14px", color: "#0f172a", "::placeholder": { color: "#94a3b8" } },
              invalid:  { color: "#ef4444" },
            },
          }}
        />
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || saving}
        className="w-full rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition"
      >
        {saving ? "Enregistrementâ€¦" : "Enregistrer la carte"}
      </button>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const { tokens } = useAuth();

  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [pageError,      setPageError]      = useState<string | null>(null);
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [clientSecret,   setClientSecret]   = useState<string | null>(null);
  const [removingId,     setRemovingId]     = useState<string | null>(null);

  const executeWithRefresh = useCallback(async <T,>(
    request: (accessToken: string) => Promise<ApiResult<T>>,
  ): Promise<ApiResult<T> | null> => {
    const currentAccessToken = tokens?.accessToken ?? getStoredAccessToken();
    if (!currentAccessToken) return null;

    let result = await request(currentAccessToken);
    if (!result.ok && result.status === 401) {
      const storedRefreshToken = typeof window !== "undefined"
        ? localStorage.getItem("refreshToken")
        : null;
      if (!storedRefreshToken) return result;

      const refreshed = await refreshService(storedRefreshToken);
      if (!refreshed) return result;

      const refreshedAccessToken = getStoredAccessToken();
      if (!refreshedAccessToken) return result;
      result = await request(refreshedAccessToken);
    }

    return result;
  }, [tokens]);

  useEffect(() => {
    let isMounted = true;

    const loadPaymentMethods = async () => {
      if (!tokens?.accessToken) {
        if (isMounted) setLoading(false);
        return;
      }

      const result = await executeWithRefresh((accessToken) => getSavedPaymentMethods(accessToken));
      if (!isMounted) return;

      if (result?.ok) {
        setPaymentMethods(result.data ?? []);
      } else if (result) {
        setPageError(result.message ?? "Erreur de chargement");
      }
      setLoading(false);
    };

    void loadPaymentMethods();
    return () => { isMounted = false; };
  }, [tokens, executeWithRefresh]);

  const handleShowAddForm = async () => {
    const result = await executeWithRefresh((accessToken) => createSetupIntent(accessToken));
    if (!result || !result.ok || !result.data) {
      setPageError(result?.message ?? "Impossible d'initialiser le formulaire");
      return;
    }

    setClientSecret(result.data.clientSecret);
    setShowAddForm(true);
  };

  const handleCardSaved = (newMethod: SavedPaymentMethod) => {
    setPaymentMethods((previous) => [...previous, newMethod]);
    setShowAddForm(false);
    setClientSecret(null);
  };

  const handleRemove = async (paymentMethodId: string) => {
    setRemovingId(paymentMethodId);
    const result = await executeWithRefresh((accessToken) => removePaymentMethod(paymentMethodId, accessToken));

    if (result?.ok) {
      setPaymentMethods((previous) => previous.filter((method) => method.id !== paymentMethodId));
    } else {
      setPageError(result?.message ?? "Erreur lors de la suppression");
    }
    setRemovingId(null);
  };

  if (loading) return <p className="text-slate-400 text-sm">Chargementâ€¦</p>;

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Liste des cartes */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
        {paymentMethods.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-400">
            Aucune carte enregistrÃ©e.
          </p>
        ) : (
          paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center gap-4 px-6 py-4">
              <span className="w-10 h-7 flex items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-600 shrink-0">
                {CARD_BRAND_ICONS[method.brand] ?? "ðŸ’³"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ {method.last4}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Expire {String(method.expiryMonth).padStart(2, "0")}/{method.expiryYear}
                </p>
                {method.isDefault && (
                  <span className="inline-block mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Par dÃ©faut
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(method.id)}
                disabled={removingId === method.id}
                className="text-xs text-red-500 hover:text-red-700 font-medium transition disabled:opacity-50 shrink-0"
              >
                {removingId === method.id ? "â€¦" : "Supprimer"}
              </button>
            </div>
          ))
        )}
      </section>

      {pageError && <p className="text-sm text-red-600 font-medium">{pageError}</p>}

      {/* Formulaire d'ajout Stripe */}
      {showAddForm && clientSecret ? (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Nouvelle carte
          </h3>
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <AddCardForm clientSecret={clientSecret} onSuccess={handleCardSaved} />
          </Elements>
          <button
            type="button"
            onClick={() => { setShowAddForm(false); setClientSecret(null); }}
            className="w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Annuler
          </button>
        </section>
      ) : (
        paymentMethods.length < 5 && (
          <button
            type="button"
            onClick={handleShowAddForm}
            className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-6 py-4 text-sm font-semibold text-slate-500 hover:border-orange-300 hover:text-orange-600 transition w-full"
          >
            <span className="text-lg">+</span>
            Ajouter une carte
          </button>
        )
      )}

    </div>
  );
}

