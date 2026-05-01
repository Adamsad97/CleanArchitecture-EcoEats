"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../auth/context/AuthContext";
import { getAdminStats } from "../auth/services/adminStatsService";
import type { AdminStats } from "../auth/services/adminStatsService";

function StatCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 ${href ? "hover:shadow-md transition" : ""} ${color}`}>
      <p className="text-3xl font-black text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminDashboardPage() {
  const { tokens } = useAuth();
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    getAdminStats(tokens.accessToken).then((result) => {
      if (result.ok && result.data) setStats(result.data);
      setLoading(false);
    });
  }, [tokens]);

  if (loading) return <p className="text-slate-400 text-sm">Chargement…</p>;
  if (!stats)  return <p className="text-red-500 text-sm">Erreur de chargement des statistiques.</p>;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 text-sm mt-1">Vue d&apos;ensemble de la plateforme EcoEats</p>
      </div>

      {/* Dossiers */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Dossiers</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="En attente" value={stats.documents.pending}  color={stats.documents.pending > 0 ? "border-amber-200" : "border-slate-100"} href="/admin/documents" />
          <StatCard label="Validés"    value={stats.documents.approved} color="border-emerald-200" />
          <StatCard label="Refusés"    value={stats.documents.rejected} color="border-red-200" />
        </div>
      </section>

      {/* Utilisateurs */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Utilisateurs</h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total"         value={stats.users.total}            color="border-slate-100" />
          <StatCard label="Clients"       value={stats.users.clients}          color="border-slate-100" />
          <StatCard label="Restaurateurs" value={stats.users.restaurantOwners} color="border-slate-100" />
          <StatCard label="Livreurs"      value={stats.users.drivers}          color="border-slate-100" />
        </div>
      </section>

      {/* Restaurants */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Restaurants</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total"  value={stats.restaurants.total}  color="border-slate-100" />
          <StatCard label="Actifs" value={stats.restaurants.active} color="border-emerald-200" />
        </div>
      </section>

      {/* Alerte documents en attente */}
      {stats.documents.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-amber-800">
              {stats.documents.pending} dossier{stats.documents.pending > 1 ? "s" : ""} en attente
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Des utilisateurs attendent une réponse.</p>
          </div>
          <Link href="/admin/documents"
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition shrink-0">
            Traiter →
          </Link>
        </div>
      )}
    </div>
  );
}
