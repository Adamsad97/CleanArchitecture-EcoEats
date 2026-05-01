"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { IconCart, IconFood, IconBicycle, IconScooter, IconCar, IconWarning, IconInfo } from "../../components/Icons";
import type { RegisterInput, UserRole } from "../types";

type Role = Exclude<UserRole, "ADMIN">;

/* ── Icône œil ── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.22-3.592M9.878 9.878a3 3 0 014.243 4.243M9.88 9.88l-3.29-3.29M14.12 14.12l3.29 3.29M3 3l18 18" />
    </svg>
  );
}

/* ── Champ texte ── */
function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (nextValue: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-orange-300 transition"
      />
    </div>
  );
}

/* ── Champ mot de passe avec œil ── */
function PasswordField({
  label, value, onChange, show, onToggle, autoComplete, hint, mismatch,
}: {
  label: string; value: string; onChange: (nextValue: string) => void;
  show: boolean; onToggle: () => void; autoComplete: string;
  hint?: string; mismatch?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(changeEvent) => onChange(changeEvent.target.value)}
          placeholder="••••••••"
          required
          autoComplete={autoComplete}
          className={`w-full rounded-xl border px-4 py-3 pr-12 text-slate-900 outline-none focus:ring-2 transition ${
            mismatch
              ? "border-red-400 focus:ring-red-300 bg-red-50"
              : "border-slate-300 focus:ring-orange-300"
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? "Masquer" : "Afficher"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition"
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {mismatch && <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas.</p>}
    </div>
  );
}

/* ── Config des rôles ── */
const ROLES: { id: Role; icon: React.ReactNode; iconColor: string; title: string; subtitle: string; border: string }[] = [
  { id: "CLIENT",           icon: <IconCart />,     iconColor: "text-orange-500", title: "Client",     subtitle: "Je commande des repas",   border: "border-orange-300 hover:border-orange-500 hover:bg-orange-50" },
  { id: "RESTAURANT_OWNER", icon: <IconFood />,     iconColor: "text-emerald-500", title: "Restaurant", subtitle: "Je gère mon restaurant", border: "border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50" },
  { id: "DRIVER",           icon: <IconBicycle />,  iconColor: "text-blue-500", title: "Livreur",    subtitle: "Je livre des repas",      border: "border-blue-300 hover:border-blue-500 hover:bg-blue-50" },
];

const ROLE_BADGE: Record<Role, string> = {
  CLIENT:           "bg-orange-100 text-orange-700",
  RESTAURANT_OWNER: "bg-emerald-100 text-emerald-700",
  DRIVER:           "bg-blue-100 text-blue-700",
};

const ROLE_LABEL: Record<Role, string> = {
  CLIENT: "Client", RESTAURANT_OWNER: "Restaurant", DRIVER: "Livreur",
};

const VEHICLES: { id: "bike" | "scooter" | "car"; icon: React.ReactNode; label: string }[] = [
  { id: "bike",    icon: <IconBicycle className="h-4 w-4" />, label: "Vélo" },
  { id: "scooter", icon: <IconScooter className="h-4 w-4" />, label: "Scooter" },
  { id: "car",     icon: <IconCar className="h-4 w-4" />,     label: "Voiture" },
];

/* ══════════════════════════════════════════ */
export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);

  /* Champs communs */
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [showCfm,  setShowCfm]  = useState(false);

  /* Champs Restaurant */
  const [restName,    setRestName]    = useState("");
  const [restAddress, setRestAddress] = useState("");
  const [cuisine,     setCuisine]     = useState("");

  /* Champs Livreur */
  const [transport, setTransport] = useState<"bike" | "scooter" | "car">("bike");

  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!role) return;
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }

    setLoading(true);
    setError("");

    let input: RegisterInput;
    if (role === "RESTAURANT_OWNER") {
      input = { role, name, email, phone, password, restaurantName: restName, restaurantAddress: restAddress, cuisineType: cuisine };
    } else if (role === "DRIVER") {
      input = { role, name, email, phone, password, transportType: transport };
    } else {
      input = { role: "CLIENT", name, email, phone, password };
    }

    const result = await register(input);
    if (!result.ok) {
      setError(result.message ?? "Inscription échouée");
      setLoading(false);
      return;
    }
    router.push(role === "CLIENT" ? "/dashboard" : "/auth/documents");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50 to-blue-50 p-4">

      {/* ── Modal sélection de rôle ── */}
      {!role && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-xl">
            <div className="mb-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-1">EcoEats</p>
              <h2 className="text-2xl font-black text-slate-900">Quel type de compte ?</h2>
              <p className="text-slate-500 text-sm mt-1">Choisissez votre profil pour commencer.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ROLES.map((roleOption) => (
                <button
                  key={roleOption.id}
                  type="button"
                  onClick={() => setRole(roleOption.id)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition ${roleOption.border}`}
                >
                  <span className={`${roleOption.iconColor}`}>{roleOption.icon}</span>
                  <div className="text-center">
                    <p className="font-bold text-slate-900">{roleOption.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{roleOption.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-slate-500 mt-6">
              Déjà un compte ?{" "}
              <Link href="/auth/login" className="text-orange-600 font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Formulaire ── */}
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-1">EcoEats</p>
          <h1 className="text-3xl font-black text-slate-900">Inscription</h1>
          <p className="text-slate-500 mt-1">Rejoins EcoEats dès maintenant.</p>
        </div>

        {role && (
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${ROLE_BADGE[role]}`}>
              {ROLE_LABEL[role]}
            </span>
            <button
              type="button"
              onClick={() => setRole(null)}
              className="text-xs text-slate-400 hover:text-slate-600 underline transition"
            >
              Changer
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-4">

          {/* Champs communs */}
          <Field
            label={role === "RESTAURANT_OWNER" ? "Nom du responsable légal" : "Nom complet"}
            value={name} onChange={setName}
            placeholder={role === "RESTAURANT_OWNER" ? "Jean Dupont (gérant)" : "Alice Dupont"}
          />
          <Field label="Email"     value={email} onChange={setEmail} type="email" placeholder="contact@monrestaurant.fr" />
          <Field label="Téléphone" value={phone} onChange={setPhone} type="tel"   placeholder="+33600000000" />

          {/* Champs Restaurant */}
          {role === "RESTAURANT_OWNER" && (
            <>
              <hr className="border-slate-100" />
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Informations restaurant</p>
              <Field label="Nom du restaurant"    value={restName}    onChange={setRestName}    placeholder="Le Petit Vert" />
              <Field label="Adresse du restaurant" value={restAddress} onChange={setRestAddress} placeholder="12 rue de la Paix, Paris" />
              <Field label="Type de cuisine"       value={cuisine}     onChange={setCuisine}     placeholder="Végétarien, Sushi…" />
              <hr className="border-slate-100" />
            </>
          )}

          {/* Champs Livreur */}
          {role === "DRIVER" && (
            <>
              <hr className="border-slate-100" />
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Informations livreur</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type de véhicule</label>
                <div className="grid grid-cols-3 gap-2">
                  {VEHICLES.map((vehicleOption) => (
                    <button
                      key={vehicleOption.id}
                      type="button"
                      onClick={() => setTransport(vehicleOption.id)}
                      className={`rounded-xl border-2 py-2.5 text-sm font-medium transition ${
                        transport === vehicleOption.id
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">{vehicleOption.icon}{vehicleOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <hr className="border-slate-100" />
            </>
          )}

          {/* Mots de passe */}
          <PasswordField
            label="Mot de passe"
            value={password} onChange={setPassword}
            show={showPwd} onToggle={() => setShowPwd((isVisible) => !isVisible)}
            autoComplete="new-password"
            hint="8+ caractères, une majuscule, une minuscule, un chiffre."
          />
          <PasswordField
            label="Confirmer le mot de passe"
            value={confirm} onChange={setConfirm}
            show={showCfm} onToggle={() => setShowCfm((isVisible) => !isVisible)}
            autoComplete="new-password"
            mismatch={mismatch}
          />

          {role === "RESTAURANT_OWNER" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold flex items-center gap-1"><IconWarning className="h-3.5 w-3.5" /> Validation obligatoire avant toute activité</p>
              <p>Après inscription, vous devrez déposer vos documents justificatifs (Kbis, pièce d&apos;identité, attestation d&apos;hygiène). Votre compte sera activé uniquement après validation par notre équipe.</p>
            </div>
          )}

          {role === "DRIVER" && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
              <p className="font-semibold flex items-center gap-1"><IconInfo className="h-3.5 w-3.5" /> Validation requise</p>
              <p>Vos documents (permis, assurance, carte grise) seront vérifiés avant activation de votre compte livreur.</p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || mismatch || !role}
            className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-orange-600 font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
