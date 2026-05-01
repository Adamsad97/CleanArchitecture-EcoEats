"use client";

import { useState } from "react";
import Image from "next/image";
import type { OrderDetail } from "../../../auth/services/orderService";
import { IconFood, IconMapPin } from "../../../components/Icons";
import { buildImageUrl } from "../../../auth/services/http";
import { STATUS } from "../constants";
import { OrderTimeline } from "./OrderTimeline";

export function ClientOrderCard({ order }: { order: OrderDetail }) {
  const [open, setOpen] = useState(false);
  const st      = STATUS[order.status] ?? { label: order.status, color: "bg-slate-100 text-slate-600" };
  const date    = new Date(order.createdAt);
  const logoUrl = order.restaurantLogoUrl ? buildImageUrl(order.restaurantLogoUrl) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen((isOpen) => !isOpen)}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition">
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
          {logoUrl
            ? <Image src={logoUrl} alt={order.restaurantName} width={48} height={48} className="w-full h-full object-cover" />
            : <span className="text-slate-300"><IconFood className="h-6 w-6" /></span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-900 truncate">{order.restaurantName}</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-slate-400 font-mono">N° {order.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm font-black text-slate-900">{order.total.toFixed(2)} €</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {!["created", "cancelled"].includes(order.status) && (
            <OrderTimeline status={order.status} hasDriver={order.hasDriver} />
          )}
          <div className="border-t border-slate-50 px-5 py-4 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Articles commandés</p>
            {order.items.map((item) => {
              const photoUrl = item.photoUrl ? buildImageUrl(item.photoUrl) : null;
              return (
                <div key={item.id} className="flex items-start gap-4">
                  {photoUrl ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative bg-slate-100">
                      <Image src={photoUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl shrink-0 bg-slate-100 flex items-center justify-center text-slate-300"><IconFood className="h-8 w-8" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs text-orange-600 font-semibold">× {item.quantity}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900 shrink-0">{(item.unitPrice * item.quantity).toFixed(2)} €</p>
                    </div>
                    {item.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>}
                    {item.notes && <p className="text-xs text-slate-400 italic mt-1">💬 {item.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mx-5 mb-4 bg-slate-50 rounded-2xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Sous-total</span><span className="font-medium">{order.subtotal.toFixed(2)} €</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Livraison</span><span className="font-medium">{order.deliveryFee === 0 ? "Offerte" : `${order.deliveryFee.toFixed(2)} €`}</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-200"><span className="text-sm font-bold text-slate-900">Total</span><span className="text-sm font-black text-orange-600">{order.total.toFixed(2)} €</span></div>
          </div>
          <div className="px-5 pb-5 grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><IconMapPin /> Livraison</p>
              <p className="text-xs text-slate-700 font-medium">{order.deliveryStreet}</p>
              <p className="text-xs text-slate-700">{order.deliveryCity}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-400 mb-1">⏱ Estimation</p>
              <p className="text-xs text-slate-700 font-medium">{new Date(order.estimatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
