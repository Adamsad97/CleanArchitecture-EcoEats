"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { buildImageUrl } from "../../auth/services/http";
import { IconFood, IconStar, IconHeart } from "../../components/Icons";
import { getActiveRestaurants } from "../../auth/services/restaurantService";
import type { RestaurantDto } from "../../auth/services/restaurantService";

export function ClientDashboard({ userName }: { userName: string }) {
  const [restaurants, setRestaurants] = useState<RestaurantDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveRestaurants().then((result) => {
      if (result.ok) setRestaurants(result.data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl space-y-6 mx-auto">
      <div>
        <p className="text-2xl font-black text-slate-900">Bonjour, {userName.split(" ")[0]}</p>
        <p className="text-slate-500 text-sm mt-1">Que voulez-vous manger aujourd&apos;hui ?</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((slot) => (
            <div key={slot} className="rounded-2xl bg-slate-100 animate-pulse">
              <div className="h-36 rounded-t-2xl bg-slate-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-2 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <div className="flex justify-center mb-3 text-slate-300"><IconFood className="h-10 w-10" /></div>
          <p className="text-slate-500 text-sm">Aucun restaurant disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {restaurants.map((restaurant, idx) => {
            const coverUrl = restaurant.logoUrl ? buildImageUrl(restaurant.logoUrl) : null;
            return (
              <Link key={restaurant.id} href={`/restaurants/${restaurant.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group">
                <div className="relative h-36 bg-slate-100 overflow-hidden">
                  {coverUrl ? (
                    <Image src={coverUrl} alt={restaurant.name} fill
                      sizes="(max-width: 640px) 50vw, 300px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      priority={idx < 2} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-orange-50 to-amber-100 text-orange-300"><IconFood className="h-10 w-10" /></div>
                  )}
                  <button type="button" onClick={(e) => e.preventDefault()}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-white transition"
                    aria-label="Ajouter aux favoris">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-slate-900 truncate">{restaurant.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{restaurant.cuisineType}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    {restaurant.ratingAvg && <><span className="font-semibold text-slate-700 flex items-center gap-0.5"><IconStar className="h-3 w-3 text-amber-400" filled /> {restaurant.ratingAvg.toFixed(1)}</span><span className="text-slate-300">·</span></>}
                    <span>{restaurant.deliveryFee === 0 ? "Livraison offerte" : `${restaurant.deliveryFee.toFixed(2)} € livraison`}</span>
                    <span className="text-slate-300">·</span>
                    <span>{restaurant.prepTimeMin} min</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
