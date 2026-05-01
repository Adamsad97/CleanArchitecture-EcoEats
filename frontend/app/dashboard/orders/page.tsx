"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { useAuthenticatedAPI } from "../../auth/hooks/useAuthenticatedAPI";
import { connectSocket } from "../../auth/services/socketService";
import { getOrders, getRestaurantOrders, updateOrderStatus } from "../../auth/services/orderService";
import type { OrderDetail, RestaurantOrder } from "../../auth/services/orderService";
import { ClientOrderCard } from "./components/ClientOrderCard";
import { RestaurantOrderCard } from "./components/RestaurantOrderCard";
import { IconWarning, IconPackage, IconFood } from "../../components/Icons";

export default function OrdersPage() {
  const { user, tokens, loading: authLoading } = useAuth();
  const { callWithRefresh } = useAuthenticatedAPI();
  const isRestaurant = user?.role === "RESTAURANT_OWNER";

  const [clientOrders,     setClientOrders]     = useState<OrderDetail[]>([]);
  const [restaurantOrders, setRestaurantOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (isRestaurant) {
      const result = await callWithRefresh((token) => getRestaurantOrders(token));
      if (result.ok && result.data) setRestaurantOrders(result.data);
      else setError(result.message ?? "Impossible de charger les commandes.");
    } else {
      const result = await callWithRefresh((token) => getOrders(token));
      if (result.ok && result.data) setClientOrders(result.data);
      else setError(result.message ?? "Impossible de charger les commandes.");
    }
    setLoading(false);
  }, [isRestaurant, callWithRefresh]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    void (async () => {
      if (isRestaurant) {
        const result = await callWithRefresh((token) => getRestaurantOrders(token));
        if (cancelled) return;
        if (result.ok && result.data) setRestaurantOrders(result.data);
        else setError(result.message ?? "Impossible de charger les commandes.");
      } else {
        const result = await callWithRefresh((token) => getOrders(token));
        if (cancelled) return;
        if (result.ok && result.data) setClientOrders(result.data);
        else setError(result.message ?? "Impossible de charger les commandes.");
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isRestaurant, callWithRefresh]);

  useEffect(() => {
    if (authLoading || !tokens?.accessToken) return;
    const socket = connectSocket(tokens.accessToken);
    if (!isRestaurant) {
      socket.on("order:update", (update: { orderId: string; status: string; hasDriver: boolean }) => {
        setClientOrders((previousOrders) => previousOrders.map((order) => order.id === update.orderId ? { ...order, status: update.status, hasDriver: update.hasDriver } : order));
      });
    } else {
      socket.on("order:restaurant_update", (update: { orderId: string }) => {
        setRestaurantOrders((previousOrders) => previousOrders.map((order) => order.id === update.orderId ? { ...order, hasDriver: true } : order));
      });
    }
    return () => { socket.off("order:update"); socket.off("order:restaurant_update"); };
  }, [authLoading, isRestaurant, tokens?.accessToken]);

  const handleStatusChange = async (orderId: string, status: string) => {
    await callWithRefresh((token) => updateOrderStatus(orderId, status, token));
    const result = await callWithRefresh((token) => getRestaurantOrders(token));
    if (result.ok && result.data) setRestaurantOrders(result.data);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400 text-sm">Chargement…</p></div>;

  if (error) return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-red-100 p-8 text-center space-y-3">
        <div className="flex justify-center text-red-400"><IconWarning className="h-8 w-8" /></div>
        <p className="text-red-500 text-sm font-medium">{error}</p>
        <button type="button" onClick={() => { setError(null); setLoading(true); fetchOrders(); }}
          className="text-xs text-orange-600 font-semibold underline hover:no-underline">Réessayer</button>
      </div>
    </div>
  );

  if (!isRestaurant) {
    if (clientOrders.length === 0) return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="flex justify-center text-slate-200 mb-2"><IconPackage className="h-12 w-12" /></div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">Aucune commande</h2>
          <p className="text-slate-500 text-sm mt-2">Vous n&apos;avez pas encore passé de commande.</p>
        </div>
      </div>
    );
    return <div className="max-w-2xl mx-auto space-y-3">{clientOrders.map((order) => <ClientOrderCard key={order.id} order={order} />)}</div>;
  }

  const newOrders    = restaurantOrders.filter((order) => order.status === "created");
  const activeOrders = restaurantOrders.filter((order) => order.status === "confirmed");
  const closedOrders = restaurantOrders.filter((order) => !["created", "confirmed"].includes(order.status));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {restaurantOrders.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="flex justify-center text-slate-200 mb-2"><IconFood className="h-12 w-12" /></div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">Aucune commande</h2>
          <p className="text-slate-500 text-sm mt-2">Les nouvelles commandes apparaîtront ici.</p>
        </div>
      )}
      {newOrders.length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3">Nouvelles commandes ({newOrders.length})</p>
          <div className="space-y-3">{newOrders.map((order) => <RestaurantOrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />)}</div>
        </section>
      )}
      {activeOrders.length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3">En préparation ({activeOrders.length})</p>
          <div className="space-y-3">{activeOrders.map((order) => <RestaurantOrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />)}</div>
        </section>
      )}
      {closedOrders.length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Historique</p>
          <div className="space-y-3">{closedOrders.map((order) => <RestaurantOrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />)}</div>
        </section>
      )}
    </div>
  );
}
