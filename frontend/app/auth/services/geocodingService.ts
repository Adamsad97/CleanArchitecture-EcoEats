/**
 * Simple geocoding service using OpenStreetMap Nominatim API
 * Free, no API key required
 */

export type GeoCoord = {
  lat: number;
  lng: number;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/**
 * Convert an address string to [lng, lat] coordinates
 * Returns null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeoCoord | null> {
  try {
    // Clean up address (remove order info like "— Commande")
    const cleanAddress = address.split("—")[0].trim();
    const fullAddress = `${cleanAddress}, Île-de-France, France`;

    const params = new URLSearchParams({
      q: fullAddress,
      format: "json",
      limit: "1",
    });

    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "EcoEats-Delivery-App",
      },
    });

    if (!response.ok) {
      console.warn(`Nominatim HTTP ${response.status} for:`, fullAddress);
      return null;
    }

    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!data || data.length === 0) {
      console.warn("Nominatim returned empty for:", fullAddress);
      return null;
    }

    const coord = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };

    console.log(`✓ Geocoded: ${cleanAddress} →`, coord);
    return coord;
  } catch (err) {
    console.error("Geocoding error for:", address, err);
    return null;
  }
}

/**
 * Batch geocode multiple addresses
 * Returns array of coords in same order as input (null for failed geocodes)
 */
export async function geocodeBatch(addresses: string[]): Promise<(GeoCoord | null)[]> {
  return Promise.all(addresses.map((addr) => geocodeAddress(addr)));
}

/**
 * Get default center for a list of coordinates
 * Returns average lat/lng or fallback to Paris
 */
export function getCenterFromCoords(coords: (GeoCoord | null)[]): GeoCoord {
  const valid = coords.filter((coord): coord is GeoCoord => coord !== null);
  if (valid.length === 0) {
    return { lat: 48.8566, lng: 2.3522 }; // Paris default
  }

  const avgLat = valid.reduce((sum, coord) => sum + coord.lat, 0) / valid.length;
  const avgLng = valid.reduce((sum, coord) => sum + coord.lng, 0) / valid.length;

  return { lat: avgLat, lng: avgLng };
}
