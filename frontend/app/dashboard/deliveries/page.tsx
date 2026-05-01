"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { useAuthenticatedAPI } from "../../auth/hooks/useAuthenticatedAPI";
import { IconScooter, IconBicycle } from "../../components/Icons";
import DeliveryMap from "../../components/DeliveryMap";
import {
  toggleDriverStatus,
  getAvailableDeliveries,
  getActiveDelivery,
  acceptDelivery,
  pickupDelivery,
  completeDelivery,
  createDriverProfile,
  getDriverProfile,
} from "../../auth/services/driverService";
import type { AvailableDelivery, ActiveDelivery } from "../../auth/services/driverService";
import { connectSocket } from "../../auth/services/socketService";
import { geocodeBatch } from "../../auth/services/geocodingService";
import type { GeoCoord } from "../../auth/services/geocodingService";

/* ── Étapes de livraison du livreur ── */
type DeliveryStep = "accepted" | "at_restaurant" | "picking_up" | "arrived";

const TRANSPORT_LABELS: Record<string, string> = {
  bike:    "🚲 Vélo",
  scooter: "🛵 Scooter",
  car:     "🚗 Voiture",
};

export default function DeliveriesPage() {
  const { user, tokens, loading: authLoading } = useAuth();
  const { callWithRefresh } = useAuthenticatedAPI();

  const [profileMissing,  setProfileMissing]  = useState(false);
  const [transport,       setTransport]       = useState<"bike" | "scooter" | "car">("bike");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [isOnline,        setIsOnline]        = useState(false);
  const [deliveries,      setDeliveries]      = useState<AvailableDelivery[]>([]);
  const [activeDelivery,  setActiveDelivery]  = useState<ActiveDelivery | null>(null);
  const [deliveryStep,    setDeliveryStep]    = useState<DeliveryStep>("accepted");
  const [loading,         setLoading]         = useState(false);
  const [toggling,        setToggling]        = useState(false);
  const [acceptingId,     setAcceptingId]     = useState<string | null>(null);
  const [actionBusy,      setActionBusy]      = useState(false);
  const [pageError,       setPageError]       = useState<string | null>(null);
  const [geocodedDeliveries, setGeocodedDeliveries] = useState<Map<string, GeoCoord>>(new Map());
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  const loadDeliveries = async () => {
    const result = await callWithRefresh((token) => getAvailableDeliveries(token));
    if (result.ok) {
      const data = result.data ?? [];
      setDeliveries(data);
      // Geocode all addresses
      if (data.length > 0) {
        setGeocodingLoading(true);
        console.log(`🗺️  Geocoding ${data.length} deliveries...`);
        try {
          // Just pass raw address - geocodeAddress will clean it up
          const addresses = data.map((delivery) => delivery.deliveryAddress);
          console.log("Addresses to geocode:", addresses);
          const coords = await geocodeBatch(addresses);
          const geocoded = new Map<string, GeoCoord>();
          data.forEach((delivery, index) => {
            if (coords[index]) {
              geocoded.set(delivery.orderId, coords[index]);
            } else {
              console.warn(`✗ Failed: ${delivery.deliveryAddress}`);
            }
          });
          setGeocodedDeliveries(geocoded);
          console.log(`✓ ${geocoded.size}/${data.length} geocoded successfully`);
        } catch (err) {
          console.error("Geocoding batch error:", err);
        } finally {
          setGeocodingLoading(false);
        }
      }
    }
  };

  /* ── Initialisation : profil + statut online + livraison active ── */
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    void (async () => {
      const [profileResult, activeResult] = await Promise.all([
        callWithRefresh((token) => getDriverProfile(token)),
        callWithRefresh((token) => getActiveDelivery(token)),
      ]);

      if (cancelled) return;

      /* Profil : restaurer le statut online */
      if (profileResult.ok && profileResult.data) {
        setIsOnline(profileResult.data.isOnline);
        /* Si online, charger les courses disponibles */
        if (profileResult.data.isOnline && !activeResult.data) {
          void loadDeliveries();
        }
      } else if (!profileResult.ok) {
        setProfileMissing(true);
      }

      /* Livraison active : restaurer l'étape selon le vrai statut en base */
      if (activeResult.ok && activeResult.data) {
        setActiveDelivery(activeResult.data);
        const step: DeliveryStep =
          activeResult.data.orderStatus === "delivering" ? "picking_up" :
          "accepted";
        setDeliveryStep(step);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  /* ── Socket.io : courses en temps réel ── */
  useEffect(() => {
    if (!tokens?.accessToken || !isOnline) return;
    const socket = connectSocket(tokens.accessToken);
    socket.emit("driver:online");
    socket.on("delivery:new", (delivery: AvailableDelivery) => {
      setDeliveries((prev) => [delivery, ...prev]);
    });
    socket.on("delivery:taken", ({ orderId }: { orderId: string }) => {
      setDeliveries((previousDeliveries) => previousDeliveries.filter((delivery) => delivery.orderId !== orderId));
    });
    return () => {
      socket.emit("driver:offline");
      socket.off("delivery:new");
      socket.off("delivery:taken");
    };
  }, [isOnline, tokens?.accessToken]);

  /* ── Création du profil livreur ── */
  const handleCreateProfile = async () => {
    if (!user) return;
    setCreatingProfile(true);
    const result = await callWithRefresh((token) =>
      createDriverProfile(
        { name: user.name, email: user.email, phone: user.phone, transportType: transport },
        token,
      )
    );
    if (result.ok) {
      setProfileMissing(false);
    } else {
      setPageError(result.message ?? "Erreur lors de la création du profil");
    }
    setCreatingProfile(false);
  };

  /* ── Toggle en ligne ── */
  const handleToggle = async () => {
    if (authLoading) return;
    setToggling(true);
    setPageError(null);
    const nextStatus = !isOnline;
    const result = await callWithRefresh((token) => toggleDriverStatus(nextStatus, token));
    if (result.ok) {
      setIsOnline(nextStatus);
      if (nextStatus) {
        setLoading(true);
        await loadDeliveries();
        setLoading(false);
      } else {
        setDeliveries([]);
      }
    } else if (result.message?.toLowerCase().includes("not found") || result.message?.toLowerCase().includes("introuvable")) {
      setProfileMissing(true);
    } else {
      setPageError(result.message ?? "Erreur lors du changement de statut");
    }
    setToggling(false);
  };

  /* ── Accepter une course ── */
  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    const result = await callWithRefresh((token) => acceptDelivery(orderId, token));
    if (result.ok) {
      const activeResult = await callWithRefresh((token) => getActiveDelivery(token));
      if (activeResult.ok && activeResult.data) {
        setActiveDelivery(activeResult.data);
        setDeliveryStep("accepted");
        setDeliveries([]);
        setIsOnline(false);
      }
    } else if (result.status === 409) {
      /* Course déjà prise par un autre livreur → la retirer de la liste */
      setDeliveries((previousDeliveries) => previousDeliveries.filter((delivery) => delivery.orderId !== orderId));
      setPageError("Cette course a déjà été prise par un autre livreur.");
      setTimeout(() => setPageError(null), 4000);
    } else {
      setPageError(result.message ?? "Erreur lors de l'acceptation");
    }
    setAcceptingId(null);
  };

  /* ── Étapes locales ── */
  const handleAtRestaurant = () => setDeliveryStep("at_restaurant");
  const handleArrived      = () => setDeliveryStep("arrived");

  /* ── Récupérer la commande au restaurant (appel backend) ── */
  const handlePickup = async () => {
    if (!activeDelivery) return;
    setActionBusy(true);
    setPageError(null);
    const result = await callWithRefresh((token) => pickupDelivery(activeDelivery.orderId, token));
    if (result.ok) {
      setDeliveryStep("picking_up"); // Récupérée ✓ + Vers client devient courant
    } else {
      setPageError(result.message ?? "Erreur lors de la récupération");
      setTimeout(() => setPageError(null), 4000);
    }
    setActionBusy(false);
  };

  /* ── Valider la livraison ── */
  const handleComplete = async () => {
    if (!activeDelivery) return;
    setActionBusy(true);
    setPageError(null);
    const result = await callWithRefresh((token) => completeDelivery(activeDelivery.orderId, token));
    if (result.ok) {
      setActiveDelivery(null);
      setDeliveryStep("accepted");
      /* Rester en ligne et recharger les courses disponibles */
      setLoading(true);
      await loadDeliveries();
      setLoading(false);
    } else {
      setPageError(result.message ?? "Erreur lors de la validation");
      setTimeout(() => setPageError(null), 4000);
    }
    setActionBusy(false);
  };

  /* ── Refuser (retirer de la liste locale) ── */
  const handleReject = (orderId: string) => {
    setDeliveries((previousDeliveries) => previousDeliveries.filter((delivery) => delivery.orderId !== orderId));
  };

  /* ─────────────────────────────────────────────────────────────────────── */

  /* ── Écran de configuration du profil livreur ── */
  if (profileMissing) {
    return (
      <div className="max-w-sm space-y-6 mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="text-center">
            <div className="flex justify-center text-orange-400"><IconScooter className="h-14 w-14" /></div>
            <h2 className="text-lg font-black text-slate-900 mt-3">Configurez votre profil livreur</h2>
            <p className="text-sm text-slate-500 mt-1">Choisissez votre moyen de transport pour commencer à livrer.</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Moyen de transport</p>
            {(["bike", "scooter", "car"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTransport(type)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left ${
                  transport === type
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-2xl">{TRANSPORT_LABELS[type].split(" ")[0]}</span>
                <span className="text-sm font-semibold text-slate-900">{TRANSPORT_LABELS[type].split(" ")[1]}</span>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  transport === type ? "border-orange-500 bg-orange-500" : "border-slate-300"
                }`}>
                  {transport === type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          {pageError && <p className="text-sm text-red-600 font-medium">{pageError}</p>}

          <button
            type="button"
            onClick={handleCreateProfile}
            disabled={creatingProfile}
            className="w-full bg-orange-600 text-white rounded-2xl py-4 text-sm font-bold hover:bg-orange-700 disabled:opacity-50 transition"
          >
            {creatingProfile ? "Création…" : "Créer mon profil livreur"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6 mx-auto">

      {/* ── Livraison active ── */}
      {activeDelivery && (
        <div className="bg-white rounded-2xl border-2 border-orange-400 shadow-sm overflow-hidden">
          <div className="bg-orange-500 text-white px-5 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <p className="text-sm font-bold">Livraison en cours</p>
          </div>

          {/* Infos commande */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">{activeDelivery.restaurantName}</p>
                <p className="text-xs text-slate-500 mt-0.5">📍 {activeDelivery.restaurantAddress}</p>
              </div>
              <span className="text-base font-black text-orange-600">{activeDelivery.total.toFixed(2)} €</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span>👤 {activeDelivery.clientName}</span>
              <span>📦 {activeDelivery.itemCount} article{activeDelivery.itemCount > 1 ? "s" : ""}</span>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
              🏠 {activeDelivery.deliveryStreet}, {activeDelivery.deliveryCity}
            </div>
          </div>

          {/* ── Barre de progression 4 étapes ── */}
          {(() => {
            const STEPS = [
              "Course attribuée",
              "Course acceptée",
              "Vers restaurant",
              "Arrivé resto",
              "Récupérée",
              "Vers client",
              "Arrivé client",
              "Livrée",
            ];

            /*
             * picking_up → idx 5 : "Récupérée" ✓, "Vers client" courant, bouton "Je suis arrivé"
             * arrived    → idx 7 : "Arrivé client" ✓, "Livrée" courant, bouton "Valider la livraison"
             */
            const currentIdx =
              deliveryStep === "accepted"      ? 2 :
              deliveryStep === "at_restaurant" ? 3 :
              deliveryStep === "picking_up"    ? 5 :
              deliveryStep === "arrived"       ? 7 :
              /* completed */                   8;

            const progressPct = currentIdx >= STEPS.length
              ? 100
              : (currentIdx / (STEPS.length - 1)) * 100;

            const action =
              deliveryStep === "accepted"      ? { label: "Je suis au restaurant",         fn: handleAtRestaurant, color: "bg-orange-600 hover:bg-orange-700"  } :
              deliveryStep === "at_restaurant" ? { label: "Récupérer la commande",         fn: handlePickup,       color: "bg-orange-600 hover:bg-orange-700"  } :
              deliveryStep === "picking_up"    ? { label: "Je suis arrivé chez le client", fn: handleArrived,      color: "bg-orange-600 hover:bg-orange-700"  } :
              deliveryStep === "arrived"       ? { label: "Valider la livraison",          fn: handleComplete,     color: "bg-emerald-600 hover:bg-emerald-700" } :
              null;

            return (
              <div className="px-5 pb-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Progression</p>

                {/* Barre */}
                <div className="relative">
                  <div className="absolute top-3.5 left-3.5 right-3.5 h-1 bg-slate-200 rounded-full" />
                  <div
                    className="absolute top-3.5 left-3.5 h-1 bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `calc(${Math.min(progressPct, 100)}% * (100% - 28px) / 100)` }}
                  />
                  <div className="relative flex justify-between">
                    {STEPS.map((label, i) => {
                      const isDone    = i < currentIdx;
                      const isCurrent = i === currentIdx;
                      return (
                        <div key={i} className="flex flex-col items-center gap-2" style={{ width: `${100 / STEPS.length}%` }}>
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300 ${
                            isDone    ? "bg-orange-500 border-orange-500" :
                            isCurrent ? "bg-white border-orange-500 ring-2 ring-orange-200" :
                                        "bg-white border-slate-300"
                          }`}>
                            {isDone ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isCurrent ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                            )}
                          </div>
                          <p className={`text-center leading-tight ${isDone || isCurrent ? "text-slate-800 font-semibold" : "text-slate-400 font-medium"}`}
                            style={{ fontSize: "10px" }}>
                            {label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bouton d'action */}
                {action && (
                  <button type="button" onClick={action.fn} disabled={actionBusy}
                    className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 transition ${action.color}`}>
                    {actionBusy ? "…" : action.label}
                  </button>
                )}
              </div>
            );
          })()}

          {pageError && <p className="px-5 pb-4 text-sm text-red-600 font-medium">{pageError}</p>}
        </div>
      )}

      {/* ── Toggle statut (masqué si livraison en cours) ── */}
      {!activeDelivery && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-slate-900">
                {isOnline ? "🟢 Vous êtes en ligne" : "⚪ Vous êtes hors ligne"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isOnline ? "Vous recevez les nouvelles courses en temps réel." : "Activez votre statut pour recevoir des courses."}
              </p>
            </div>
            <button type="button" onClick={handleToggle} disabled={toggling || authLoading}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${
                isOnline ? "bg-emerald-500" : "bg-slate-200"
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                isOnline ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>
      )}

      {pageError && !activeDelivery && (
        <p className="text-sm text-red-600 font-medium">{pageError}</p>
      )}

      {/* ── Courses disponibles ── */}
      {isOnline && !activeDelivery && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Courses disponibles</p>
            <span className="text-xs text-slate-400">{deliveries.length} en attente</span>
          </div>

          {/* Carte des livraisons */}
          {deliveries.length > 0 && (
            <div className="mb-4">
              {geocodingLoading ? (
                <div className="w-full h-96 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-sm border border-slate-200">
                  Chargement de la carte…
                </div>
              ) : geocodedDeliveries.size > 0 ? (
                <DeliveryMap
                  deliveries={deliveries
                    .filter((delivery) => geocodedDeliveries.has(delivery.orderId))
                    .map((delivery) => ({
                      orderId: delivery.orderId,
                      coord: geocodedDeliveries.get(delivery.orderId)!,
                      restaurantName: delivery.restaurantName,
                      deliveryAddress: delivery.deliveryAddress,
                      total: delivery.total,
                    }))}
                  onMarkerClick={(orderId) => {
                    // Scroll to delivery item or highlight it
                    const elem = document.getElementById(`delivery-${orderId}`);
                    elem?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }}
                  height="450px"
                />
              ) : (
                <div className="w-full h-96 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 text-sm border border-slate-200">
                  Impossible de charger la carte (pas d&apos;accès internet?)
                </div>
              )}
            </div>
          )}

          {loading || geocodingLoading ? (
            <p className="text-slate-400 text-sm">Chargement…</p>
          ) : deliveries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <div className="flex justify-center mb-2 text-slate-300"><IconBicycle className="h-10 w-10" /></div>
              <p className="text-slate-400 text-sm">Aucune course disponible pour le moment.</p>
              <p className="text-slate-300 text-xs mt-1">Vous serez notifié dès qu&apos;une commande arrive.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div key={delivery.orderId} id={`delivery-${delivery.orderId}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 scroll-smooth transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{delivery.restaurantName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">📍 {delivery.restaurantAddress}</p>
                    </div>
                    <span className="text-base font-black text-orange-600 shrink-0">{delivery.total.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                    <span>🏠 {delivery.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    <span>📦 {delivery.itemCount} article{delivery.itemCount > 1 ? "s" : ""}</span>
                    <span>⏱ {new Date(delivery.estimatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => handleAccept(delivery.orderId)}
                      disabled={acceptingId === delivery.orderId}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                      {acceptingId === delivery.orderId ? "…" : "✓ Accepter"}
                    </button>
                    <button type="button" onClick={() => handleReject(delivery.orderId)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                      ✕ Passer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
