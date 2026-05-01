"use client";

import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { GeoCoord } from "../../auth/services/geocodingService";
import "maplibre-gl/dist/maplibre-gl.css";

type DeliveryMarker = {
  orderId: string;
  coord: GeoCoord;
  restaurantName: string;
  deliveryAddress: string;
  total: number;
};

type DeliveryMapProps = {
  deliveries: DeliveryMarker[];
  userLocation?: GeoCoord | null;
  onMarkerClick?: (orderId: string) => void;
  height?: string | number;
};

export default function DeliveryMap({
  deliveries,
  userLocation,
  onMarkerClick,
  height = "400px",
}: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const style = {
        version: 8,
        sources: {
          stamen: {
            type: "raster" as const,
            tiles: ["https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© Stamen Design, © OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "stamen",
            type: "raster" as const,
            source: "stamen",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: userLocation ? [userLocation.lng, userLocation.lat] : [2.3522, 48.8566],
        zoom: userLocation ? 15 : 11,
        attributionControl: true,
      });

      mapRef.current = map;

      map.on("load", () => {
        console.log("✓ MapLibre style loaded");
        map.resize();
      });

      map.on("style.load", () => {
        console.log("✓ MapLibre style ready for markers");
        // Trigger marker update after style loads
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });

      map.on("error", (e) => {
        console.error("MapLibre error:", e);
      });
    } catch (err) {
      console.error("Failed to initialize MapLibre:", err);
    }

    return () => {
      try {
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current.clear();
        mapRef.current?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, [userLocation]);

  // Update markers when deliveries change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      console.warn("Map not initialized yet");
      return;
    }

    // Wait for style to be loaded
    if (!map.isStyleLoaded()) {
      console.log("Waiting for map style to load...");
      const onStyleLoad = () => {
        console.log("Style loaded, adding markers");
        addMarkers();
        map.off("style.load", onStyleLoad);
      };
      map.on("style.load", onStyleLoad);
      return;
    }

    addMarkers();

    function addMarkers() {
      try {
        // Remove old markers not in deliveries
        markersRef.current.forEach((marker, orderId) => {
          if (!deliveries.some((delivery) => delivery.orderId === orderId)) {
            marker.remove();
            markersRef.current.delete(orderId);
          }
        });

        // Add/update markers for deliveries
        deliveries.forEach((delivery) => {
          if (markersRef.current.has(delivery.orderId)) return; // Already exists

          const el = document.createElement("div");
          el.className = "w-8 h-8 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer hover:scale-110 transition";
          el.textContent = "📦";

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([delivery.coord.lng, delivery.coord.lat])
            .addTo(map);

          el.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("Marker clicked:", delivery.orderId);
            onMarkerClick?.(delivery.orderId);

            // Close all other popups first
            document.querySelectorAll(".maplibregl-popup").forEach((popupElement) => popupElement.remove());

            // Create popup with inline styles
            const popupContent = `
              <div style="padding: 12px; font-family: system-ui, -apple-system; min-width: 200px;">
                <p style="margin: 0 0 6px 0; font-weight: bold; font-size: 14px; color: #1f2937;">
                  ${delivery.restaurantName}
                </p>
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
                  📍 ${delivery.deliveryAddress}
                </p>
                <p style="margin: 8px 0 0 0; font-weight: bold; font-size: 14px; color: #ea580c;">
                  ${delivery.total.toFixed(2)} €
                </p>
              </div>
            `;

            new maplibregl.Popup({ offset: [0, -10], closeButton: true })
              .setHTML(popupContent)
              .setLngLat([delivery.coord.lng, delivery.coord.lat])
              .addTo(map);
          });

          markersRef.current.set(delivery.orderId, marker);
          console.log("✓ Marker added:", delivery.orderId);
        });

        // Fit bounds to all markers if no user location
        if (!userLocation && deliveries.length > 0 && markersRef.current.size > 0) {
          const bounds = new maplibregl.LngLatBounds();
          markersRef.current.forEach((marker) => {
            bounds.extend(marker.getLngLat());
          });
          map.fitBounds(bounds, { padding: 50 });
          console.log("✓ Bounds fitted");
        }
      } catch (err) {
        console.error("Error updating markers:", err);
      }
    }
  }, [deliveries, userLocation, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border-2 border-orange-400 shadow-lg bg-slate-100"
      style={{ height, minHeight: "300px" }}
    />
  );
}
