"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../auth/context/AuthContext";
import { useAddresses } from "../auth/context/AddressContext";
import { getAvatarUrl } from "../auth/services/userService";
import { useRouter } from "next/navigation";
import type { UserRole } from "../auth/types";

type NavItem = {
  href:      string;
  label:     string;
  external?: boolean;
  icon:      React.ReactNode;
};

const CLIENT_ITEMS: NavItem[] = [
  {
    href:  "/dashboard/orders",
    label: "Commandes",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
  },
  {
    href:  "/dashboard/favorites",
    label: "Favoris",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  },
  {
    href:  "/dashboard/wallet",
    label: "Wallet",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
  {
    href:  "/dashboard/subscription",
    label: "Formule repas",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  },
  {
    href:  "/dashboard/promotions",
    label: "Promotions",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  },
  {
    href:  "/dashboard/help",
    label: "Aide",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
];

const RESTAURANT_ITEMS: NavItem[] = [
  {
    href:  "/dashboard/restaurants",
    label: "Mon restaurant",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    href:  "/dashboard/orders",
    label: "Commandes",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  },
  {
    href:  "/dashboard/promotions",
    label: "Promotions",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  },
  {
    href:  "/dashboard/help",
    label: "Aide",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
];

const DRIVER_ITEMS: NavItem[] = [
  {
    href:  "/dashboard/deliveries",
    label: "Livraisons",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  {
    href:  "/dashboard/earnings",
    label: "Gains",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    href:  "/dashboard/help",
    label: "Aide",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
];

const ITEMS_BY_ROLE: Record<UserRole, NavItem[]> = {
  CLIENT:           CLIENT_ITEMS,
  RESTAURANT_OWNER: RESTAURANT_ITEMS,
  DRIVER:           DRIVER_ITEMS,
  ADMIN: [
    {
      href:  "/admin/documents",
      label: "Validation documents",
      icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
  ],
};

const PROFILE_ITEMS: NavItem[] = [
  {
    href:  "/dashboard/profile/documents",
    label: "Documents",
    icon:  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
];

/* ── Section Domicile (CLIENT uniquement) ── */
function DomicileSection() {
  const { addresses, activeAddress, setActiveId, addAddress, removeAddress } = useAddresses();
  const [expanded,    setExpanded]    = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [formLabel,      setFormLabel]      = useState("");
  const [formStreet,     setFormStreet]     = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formCity,       setFormCity]       = useState("");

  const handleAdd = () => {
    if (!formStreet.trim() || !formPostalCode.trim() || !formCity.trim()) return;
    addAddress(formLabel, formStreet, formPostalCode, formCity);
    setFormLabel("");
    setFormStreet("");
    setFormPostalCode("");
    setFormCity("");
    setShowForm(false);
  };

  return (
    <div className="mx-3 mb-1">
      {/* ── Ligne principale ── */}
      <button
        type="button"
        onClick={() => setExpanded((isExpanded) => !isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        <span className="text-slate-500 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </span>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight">Domicile</p>
          {activeAddress ? (
            <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">
              {activeAddress.street}, {activeAddress.postalCode} {activeAddress.city}
            </p>
          ) : (
            <p className="text-xs text-orange-500 leading-tight mt-0.5">Aucune adresse</p>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Liste des adresses ── */}
      {expanded && (
        <div className="mx-2 mb-2 space-y-1">
          {addresses.length === 0 && !showForm && (
            <p className="text-xs text-slate-400 px-4 py-2">Aucune adresse enregistrée.</p>
          )}

          {addresses.map((addr, index) => (
            <div
              key={addr.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer group ${
                activeAddress?.id === addr.id ? "bg-orange-50" : "hover:bg-slate-50"
              }`}
              onClick={() => setActiveId(addr.id)}
            >
              {/* Radio */}
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
                activeAddress?.id === addr.id ? "border-orange-500 bg-orange-500" : "border-slate-300"
              }`}>
                {activeAddress?.id === addr.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800 truncate">{addr.label}</p>
                  {index === 0 && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      Principale
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{addr.street}, {addr.postalCode} {addr.city}</p>
              </div>

              {/* Supprimer */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAddress(addr.id); }}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition text-base shrink-0 leading-none mt-0.5"
                aria-label="Supprimer"
              >
                ×
              </button>
            </div>
          ))}

          {/* Formulaire d'ajout */}
          {showForm ? (
            <div className="px-3 py-3 space-y-2 bg-slate-50 rounded-xl">
              <input
                type="text"
                placeholder="Label (ex: Bureau)"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <input
                type="text"
                placeholder="Numéro et rue *"
                value={formStreet}
                onChange={(e) => setFormStreet(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Code postal *"
                  value={formPostalCode}
                  onChange={(e) => setFormPostalCode(e.target.value)}
                  maxLength={10}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="text"
                  placeholder="Ville *"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!formStreet.trim() || !formCity.trim()}
                  className="flex-1 rounded-lg bg-orange-600 text-white py-1.5 text-xs font-bold hover:bg-orange-700 disabled:opacity-40 transition"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50 rounded-xl transition"
            >
              <span className="text-base leading-none">+</span>
              Ajouter une adresse
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Composant principal ── */
export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  const mainItems = user ? (ITEMS_BY_ROLE[user.role] ?? CLIENT_ITEMS) : CLIENT_ITEMS;
  const firstName = user?.name?.split(" ")[0] ?? "";
  const avatarUrl = getAvatarUrl(user?.photo_url);
  const initiale  = user?.name?.charAt(0).toUpperCase() ?? "?";

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
    onClose();
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-4 px-4 py-3 rounded-xl text-base transition ${
          active ? "font-bold text-slate-900 bg-slate-100" : "font-medium text-slate-700 hover:bg-slate-50"
        }`}
      >
        <span className={active ? "text-slate-900" : "text-slate-500"}>{item.icon}</span>
        <span>{item.label}</span>
        {item.external && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Fermer */}
      <div className="flex justify-end p-4 shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Identité utilisateur */}
      <div className="px-6 pb-4 shrink-0 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={user?.name ?? ""} width={44} height={44} loading="eager" className="w-full h-full object-cover" />
          ) : (
            <span className="text-base font-black text-orange-600">{initiale}</span>
          )}
        </div>
        <div>
          <p className="text-base font-bold text-slate-900 leading-tight">{firstName}</p>
          <Link href="/dashboard/account" onClick={onClose} className="text-xs font-semibold text-emerald-600 hover:underline">
            Gérer le compte
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-100 mx-4 mb-2" />

      {/* Navigation principale + Domicile */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">

        {/* Section Domicile uniquement pour CLIENT */}
        {user?.role === "CLIENT" && (
          <>
            <DomicileSection />
            <div className="border-t border-slate-100 mx-1 my-2" />
          </>
        )}

        {mainItems.map((item) => <NavLink key={item.href} item={item} />)}

        <div className="border-t border-slate-100 my-3" />

        {PROFILE_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* Pied — déconnexion */}
      <div className="p-4 border-t border-slate-100 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
