"use client";

import { useState } from "react";
import Image from "next/image";
import type { RestaurantOrder } from "../../../auth/services/orderService";
import { buildImageUrl } from "../../../auth/services/http";
import { RestaurantProgressBar } from "./RestaurantProgressBar";

/* ── Icônes SVG ── */
const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
  </svg>
);
const IconCalendar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconBox = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
  </svg>
);
const IconPin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 14 6 14s6-8.75 6-14c0-3.314-2.686-6-6-6z" /><circle cx="12" cy="8" r="2" />
  </svg>
);
const IconCoin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v10M9.5 9.5C9.5 8.4 10.6 8 12 8s2.5.4 2.5 1.5S13.4 11 12 11s-2.5.6-2.5 1.5S10.6 15 12 15s2.5-.4 2.5-1.5" />
  </svg>
);
const IconUtensils = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6h3v7a1 1 0 001 1h1a1 1 0 001-1v-7h-1z" />
  </svg>
);
const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconChefHat = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20h12M6 20v-4a6 6 0 016-6 6 6 0 016 6v4M9 20v-2m6 2v-2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconChevron = ({ open }: { open: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

/* ── Config statuts ── */
const STATUS_CONFIG: Record<string, { label: string; color: string; accent: string }> = {
  created:    { label: "Nouvelle",       color: "bg-orange-100 text-orange-700",   accent: "bg-orange-500"  },
  confirmed:  { label: "En préparation", color: "bg-blue-100 text-blue-700",       accent: "bg-blue-500"    },
  prepared:   { label: "Prête",          color: "bg-green-100 text-green-700",     accent: "bg-green-500"   },
  delivering: { label: "En livraison",   color: "bg-indigo-100 text-indigo-700",   accent: "bg-indigo-500"  },
  delivered:  { label: "Livrée",         color: "bg-emerald-100 text-emerald-700", accent: "bg-emerald-500" },
  cancelled:  { label: "Annulée",        color: "bg-red-100 text-red-600",         accent: "bg-red-400"     },
};

export function RestaurantOrderCard({
  order, onStatusChange,
}: {
  order: RestaurantOrder;
  onStatusChange: (orderId: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const date        = new Date(order.createdAt);
  const isNew       = order.status === "created";
  const isConfirmed = order.status === "confirmed";
  const isClosed    = ["delivered", "cancelled"].includes(order.status);
  const st          = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.created;

  const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSummary = order.items.slice(0, 2).map((item) => `${item.name} ×${item.quantity}`).join(", ")
    + (order.items.length > 2 ? ` +${order.items.length - 2}` : "");

  const handle = async (newStatus: string) => {
    setBusy(true);
    await onStatusChange(order.id, newStatus);
    setBusy(false);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-all ${
      isNew ? "border-orange-200 ring-2 ring-orange-100" : "border-slate-100 hover:border-slate-200"
    }`}>
      <div className="flex">
        {/* Accent latéral coloré */}
        <div className={`w-1 shrink-0 rounded-l-2xl ${st.accent}`} />

        <div className="flex-1 min-w-0">

          {/* Badge nouvelle commande */}
          {isNew && (
            <div className="bg-orange-500 text-white text-xs font-bold px-4 py-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Nouvelle commande — en attente de votre réponse
            </div>
          )}

          {/* En-tête cliquable */}
          <button type="button" onClick={() => setOpen((isOpen) => !isOpen)}
            className="w-full text-left px-5 py-4 hover:bg-slate-50/60 transition">
            <div className="flex items-start justify-between gap-3">

              {/* Avatar initiale */}
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 text-sm font-black text-orange-600">
                {order.clientName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{order.clientName}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    <p className="text-base font-black text-orange-600">{order.total.toFixed(2)} €</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-0.5 truncate">{itemsSummary}</p>

                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><IconClock />{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="flex items-center gap-1"><IconCalendar />{date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  <span className="flex items-center gap-1"><IconBox />{totalQty} article{totalQty > 1 ? "s" : ""}</span>
                  <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <IconChevron open={open} />
            </div>
          </button>

          {/* Barre de progression */}
          {!isClosed && (
            <div className="border-t border-slate-50 mx-4">
              <RestaurantProgressBar status={order.status} hasDriver={order.hasDriver} />
            </div>
          )}

          {/* Détail */}
          {open && (
            <div className="border-t border-slate-100">
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Articles</p>
                {order.items.map((item) => {
                  const photoUrl = item.photoUrl ? buildImageUrl(item.photoUrl) : null;
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      {photoUrl ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative bg-slate-100">
                          <Image src={photoUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
                          <IconUtensils />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-400">× {item.quantity} · {item.unitPrice.toFixed(2)} € / unité</p>
                        {item.notes && <p className="text-xs text-slate-400 italic mt-0.5">&quot;{item.notes}&quot;</p>}
                      </div>
                      <p className="text-sm font-black text-slate-900 shrink-0">{(item.unitPrice * item.quantity).toFixed(2)} €</p>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1"><IconPin /> Livraison</p>
                  <p className="text-xs text-slate-700 font-medium">{order.deliveryStreet}</p>
                  <p className="text-xs text-slate-500">{order.deliveryCity}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1"><IconCoin /> Total</p>
                  <p className="text-lg font-black text-orange-600">{order.total.toFixed(2)} €</p>
                  <p className="text-[11px] text-slate-400">livraison : {order.deliveryFee === 0 ? "offerte" : `${order.deliveryFee.toFixed(2)} €`}</p>
                </div>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          {(isNew || isConfirmed) && (
            <div className="px-5 pb-4 flex gap-2">
              {isNew && (
                <>
                  <button type="button" onClick={() => handle("confirmed")} disabled={busy}
                    className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                    <IconCheck /> Accepter
                  </button>
                  <button type="button" onClick={() => handle("cancelled")} disabled={busy}
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-xl py-2.5 text-sm font-bold hover:bg-red-100 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                    <IconX /> Refuser
                  </button>
                </>
              )}
              {isConfirmed && (
                <button type="button" onClick={() => handle("prepared")} disabled={busy}
                  className="flex-1 bg-orange-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-orange-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                  <IconChefHat /> Commande prête
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
