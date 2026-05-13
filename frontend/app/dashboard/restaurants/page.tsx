"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../auth/context/AuthContext";
import { getMyDocuments } from "../../auth/services/documentService";
import type { DocumentRecord } from "../../auth/services/documentService";
import {
  getMyRestaurants,
  createRestaurant,
  updateRestaurantProfile,
  updateOpeningHours,
  toggleRestaurantStatus,
  uploadRestaurantLogo,
} from "../../auth/services/restaurantService";
import { buildImageUrl } from "../../auth/services/http";
import type { RestaurantDto, CreateRestaurantInput, UpdateRestaurantProfileInput } from "../../auth/services/restaurantService";
import { ALL_DAYS, DAY_LABELS } from "../../types/restaurant";
import type { DayOfWeek, OpeningHoursMap, TimeSlot } from "../../types/restaurant";

const EMPTY_HOURS: OpeningHoursMap = Object.fromEntries(
  ALL_DAYS.map((day) => [day, null]),
) as OpeningHoursMap;

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      {isActive ? "Ouvert" : "Fermé"}
    </span>
  );
}

function OpeningHoursEditor({
  hours,
  onChange,
}: {
  hours: OpeningHoursMap;
  onChange: (hours: OpeningHoursMap) => void;
}) {
  const toggleDay = (day: DayOfWeek, enabled: boolean) => {
    onChange({
      ...hours,
      [day]: enabled ? { open: "09:00", close: "22:00" } : null,
    });
  };

  const updateSlot = (day: DayOfWeek, field: keyof TimeSlot, value: string) => {
    const current = hours[day];
    if (!current) return;
    onChange({ ...hours, [day]: { ...current, [field]: value } });
  };

  return (
    <div className="space-y-2">
      {ALL_DAYS.map((day) => {
        const slot = hours[day];
        const isOpen = slot !== null && slot !== undefined;
        return (
          <div key={day} className="flex items-center gap-3">
            <label className="flex items-center gap-2 w-28 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => toggleDay(day, e.target.checked)}
                className="accent-orange-500"
              />
              <span className="text-sm font-medium text-slate-700">{DAY_LABELS[day]}</span>
            </label>
            {isOpen && slot ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={slot.open}
                  onChange={(e) => updateSlot(day, "open", e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-slate-400 text-xs">→</span>
                <input
                  type="time"
                  value={slot.close}
                  onChange={(e) => updateSlot(day, "close", e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ) : (
              <span className="text-xs text-slate-400">Fermé</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const REQUIRED_DOCS_OWNER = ["kbis", "id_card", "food_hygiene"] as const;

function AccountPendingScreen({ documents }: { documents: DocumentRecord[] }) {
  const getLatest = (type: string) =>
    documents.filter((doc) => doc.type === type)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

  const statusLabel: Record<string, { label: string; color: string }> = {
    approved: { label: "✓ Validé",    color: "text-emerald-700 bg-emerald-100" },
    pending:  { label: "● En attente", color: "text-amber-700 bg-amber-100" },
    rejected: { label: "✕ Refusé",    color: "text-red-700 bg-red-100" },
    missing:  { label: "Non déposé",  color: "text-slate-500 bg-slate-100" },
  };
  const docLabels: Record<string, string> = {
    kbis:         "Extrait Kbis",
    id_card:      "Pièce d'identité",
    food_hygiene: "Attestation d'hygiène",
  };

  return (
    <div className="max-w-lg mx-auto mt-12 space-y-6 text-center">
      <div>
        <p className="text-4xl mb-3">⏳</p>
        <h1 className="text-xl font-black text-slate-900">Compte en cours de validation</h1>
        <p className="text-slate-500 text-sm mt-2">
          Votre compte sera activé une fois tous vos documents validés par notre équipe.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-left space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">État des documents</p>
        {REQUIRED_DOCS_OWNER.map((type) => {
          const doc = getLatest(type);
          const status = doc ? doc.status : "missing";
          const { label, color } = statusLabel[status] ?? statusLabel.missing;
          return (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{docLabels[type]}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>{label}</span>
            </div>
          );
        })}
      </div>
      <Link
        href="/dashboard/profile/documents"
        className="inline-block rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-700 transition"
      >
        Gérer mes documents →
      </Link>
    </div>
  );
}

export default function RestaurantsPage() {
  const { tokens } = useAuth();

  const [documents,        setDocuments]        = useState<DocumentRecord[]>([]);
  const [accountReady,     setAccountReady]     = useState(false);
  const [restaurants,      setRestaurants]      = useState<RestaurantDto[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [pageError,        setPageError]        = useState<string | null>(null);
  const [showCreateForm,   setShowCreateForm]   = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingHoursId,   setEditingHoursId]   = useState<string | null>(null);
  const [editProfileForm,  setEditProfileForm]  = useState<UpdateRestaurantProfileInput>({});
  const [togglingId,       setTogglingId]       = useState<string | null>(null);
  const [savingId,         setSavingId]         = useState<string | null>(null);
  const [uploadingLogoId,  setUploadingLogoId]  = useState<string | null>(null);
  const logoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [createForm, setCreateForm] = useState<CreateRestaurantInput>({
    name: "", address: "", lat: 0, lng: 0,
    cuisineType: "", prepTimeMin: 30, deliveryFee: 2.5,
  });
  const [editHours, setEditHours] = useState<OpeningHoursMap>(EMPTY_HOURS);

  const getToken = () => tokens?.accessToken ?? null;

  useEffect(() => {
    if (!tokens?.accessToken) return;
    Promise.all([
      getMyDocuments(tokens.accessToken),
      getMyRestaurants(tokens.accessToken),
    ]).then(([docsResult, restoResult]) => {
      const docs = docsResult.data ?? [];
      setDocuments(docs);
      const allApproved = REQUIRED_DOCS_OWNER.every((type) =>
        docs.some((doc) => doc.type === type && doc.status === "approved"),
      );
      setAccountReady(allApproved);
      if (restoResult.ok) setRestaurants(restoResult.data ?? []);
      else setPageError(restoResult.message ?? "Erreur de chargement");
      setLoading(false);
    });
  }, [tokens]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    if (!token) return;
    setSavingId("new");
    const result = await createRestaurant(createForm, token);
    if (result.ok && result.data) {
      setRestaurants((prev) => [...prev, result.data!]);
      setShowCreateForm(false);
      setCreateForm({ name: "", address: "", lat: 0, lng: 0, cuisineType: "", prepTimeMin: 30, deliveryFee: 2.5 });
    } else {
      setPageError(result.message ?? "Erreur lors de la création");
    }
    setSavingId(null);
  };

  const handleToggleStatus = async (restaurant: RestaurantDto) => {
    const token = await getToken();
    if (!token) return;
    setTogglingId(restaurant.id);
    const result = await toggleRestaurantStatus(restaurant.id, !restaurant.isActive, token);
    if (result.ok && result.data) {
      setRestaurants((prev) => prev.map((r) => r.id === restaurant.id ? result.data! : r));
    } else {
      setPageError(result.message ?? "Erreur");
    }
    setTogglingId(null);
  };

  const handleSaveProfile = async (restaurantId: string) => {
    const token = await getToken();
    if (!token) return;
    setSavingId(restaurantId + "-profile");
    const result = await updateRestaurantProfile(restaurantId, editProfileForm, token);
    if (result.ok && result.data) {
      setRestaurants((prev) => prev.map((r) => r.id === restaurantId ? result.data! : r));
      setEditingProfileId(null);
    } else {
      setPageError(result.message ?? "Erreur lors de la mise à jour");
    }
    setSavingId(null);
  };

  const handleSaveHours = async (restaurantId: string) => {
    const token = await getToken();
    if (!token) return;
    setSavingId(restaurantId);
    const result = await updateOpeningHours(restaurantId, editHours, token);
    if (result.ok && result.data) {
      setRestaurants((prev) => prev.map((r) => r.id === restaurantId ? result.data! : r));
      setEditingHoursId(null);
    } else {
      setPageError(result.message ?? "Erreur lors de la sauvegarde");
    }
    setSavingId(null);
  };

  const handleLogoUpload = async (restaurantId: string, file: File) => {
    const token = await getToken();
    if (!token) return;
    setUploadingLogoId(restaurantId);
    const result = await uploadRestaurantLogo(restaurantId, file, token);
    if (result.ok && result.data) {
      setRestaurants((prev) => prev.map((r) => r.id === restaurantId ? result.data! : r));
    } else {
      setPageError(result.message ?? "Erreur lors de l'upload");
    }
    setUploadingLogoId(null);
  };

  if (loading) return <p className="text-slate-400 text-sm">Chargement…</p>;
  if (!accountReady) return <AccountPendingScreen documents={documents} />;

  return (
    <div className="max-w-2xl space-y-6 mx-auto">

      {pageError && <p className="text-sm text-red-600 font-medium">{pageError}</p>}

      {restaurants.map((restaurant) => (
        <section key={restaurant.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          <div className="relative h-28 bg-gradient-to-r from-orange-50 to-amber-100 overflow-hidden group cursor-pointer"
            onClick={() => logoInputRefs.current[restaurant.id]?.click()}>
            {restaurant.logoUrl ? (
              <Image src={buildImageUrl(restaurant.logoUrl!)} alt={restaurant.name}
                fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl select-none opacity-30">🍽️</div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <span className="text-white text-xs font-bold bg-black/50 rounded-full px-3 py-1.5">
                {uploadingLogoId === restaurant.id ? "Upload…" : "📷 Changer la photo"}
              </span>
            </div>
            <input ref={(el) => { logoInputRefs.current[restaurant.id] = el; }}
              type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLogoUpload(restaurant.id, file); e.target.value = ""; }} />
          </div>

          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-slate-900">{restaurant.name}</h2>
                  <StatusBadge isActive={restaurant.isActive} />
                </div>
                <p className="text-xs text-slate-500">{restaurant.address}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {restaurant.cuisineType} · {restaurant.prepTimeMin} min · {restaurant.deliveryFee.toFixed(2)} €
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/dashboard/restaurants/menu?restaurantId=${restaurant.id}`}
                  className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 transition">
                  🍽️ Menu
                </Link>
                <button type="button" onClick={() => {
                  setEditingProfileId(restaurant.id);
                  setEditProfileForm({
                    name: restaurant.name, address: restaurant.address,
                    cuisineType: restaurant.cuisineType, prepTimeMin: restaurant.prepTimeMin,
                    deliveryFee: restaurant.deliveryFee,
                  });
                }} className="text-xs text-orange-600 font-semibold hover:underline">
                  Modifier
                </button>
                <button type="button" onClick={() => handleToggleStatus(restaurant)}
                  disabled={togglingId === restaurant.id}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                    restaurant.isActive
                      ? "bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}>
                  {togglingId === restaurant.id ? "…" : restaurant.isActive ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>

            {editingProfileId === restaurant.id && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nom</label>
                    <input type="text" value={editProfileForm.name ?? ""}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Adresse</label>
                    <input type="text" value={editProfileForm.address ?? ""}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, address: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Cuisine</label>
                    <input type="text" value={editProfileForm.cuisineType ?? ""}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, cuisineType: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Préparation (min)</label>
                    <input type="number" min={5} value={editProfileForm.prepTimeMin ?? 30}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, prepTimeMin: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Frais livraison (€)</label>
                    <input type="number" min={0} step={0.5} value={editProfileForm.deliveryFee ?? 0}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, deliveryFee: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => handleSaveProfile(restaurant.id)}
                    disabled={savingId === restaurant.id + "-profile"}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition">
                    {savingId === restaurant.id + "-profile" ? "Enregistrement…" : "Enregistrer"}
                  </button>
                  <button type="button" onClick={() => setEditingProfileId(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 mx-6" />

          <div className="p-6 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Horaires</p>
              <button type="button" onClick={() => {
                setEditingHoursId(restaurant.id);
                setEditHours({ ...EMPTY_HOURS, ...restaurant.openingHours });
              }} className="text-xs text-orange-600 font-semibold hover:underline">
                Modifier
              </button>
            </div>
            {editingHoursId === restaurant.id ? (
              <div className="space-y-4">
                <OpeningHoursEditor hours={editHours} onChange={setEditHours} />
                <div className="flex gap-3">
                  <button type="button" onClick={() => handleSaveHours(restaurant.id)}
                    disabled={savingId === restaurant.id}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition">
                    {savingId === restaurant.id ? "Enregistrement…" : "Enregistrer"}
                  </button>
                  <button type="button" onClick={() => setEditingHoursId(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {ALL_DAYS.map((day) => {
                  const slot = restaurant.openingHours[day];
                  return (
                    <div key={day} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 w-20">{DAY_LABELS[day]}</span>
                      <span className={slot ? "text-slate-800 font-medium" : "text-slate-300"}>
                        {slot ? `${slot.open} – ${slot.close}` : "Fermé"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>
      ))}

      {!showCreateForm && (
        <button type="button" onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-6 py-4 text-sm font-semibold text-slate-500 hover:border-orange-300 hover:text-orange-600 transition w-full">
          <span className="text-lg">+</span>
          {restaurants.length === 0 ? "Créer mon restaurant" : "Ajouter un établissement"}
        </button>
      )}

      {showCreateForm && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Nouvel établissement</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nom *</label>
                <input type="text" required value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Adresse *</label>
                <input type="text" required value={createForm.address}
                  onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Type de cuisine *</label>
                <input type="text" required value={createForm.cuisineType}
                  onChange={(e) => setCreateForm((f) => ({ ...f, cuisineType: e.target.value }))}
                  placeholder="Française, Italienne…"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Temps de prép. (min) *</label>
                <input type="number" required min={5} value={createForm.prepTimeMin}
                  onChange={(e) => setCreateForm((f) => ({ ...f, prepTimeMin: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Frais de livraison (€)</label>
                <input type="number" min={0} step={0.5} value={createForm.deliveryFee}
                  onChange={(e) => setCreateForm((f) => ({ ...f, deliveryFee: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={savingId === "new"}
                className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition">
                {savingId === "new" ? "Création…" : "Créer"}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
            </div>
          </form>
        </section>
      )}

    </div>
  );
}