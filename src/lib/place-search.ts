import * as ExpoLocation from "expo-location";
import { Platform } from "react-native";

// Address lookup for the map picker. Nominatim is used on every platform so the
// suggestion list looks the same on web and native (expo-location's geocoder
// returns coordinates only, so it stays as a native fallback).

export type PlaceResult = {
  id: string;
  /** Short first line, e.g. the venue or street name. */
  primary: string;
  /** Remaining address parts, shown greyed under the primary line. */
  secondary: string;
  /** Full human-readable address, kept as the picked address. */
  full: string;
  lat: number;
  lng: number;
};

export const MIN_SEARCH_LENGTH = 3;

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
// Nominatim asks for at most one request per second from a single client.
const MIN_REQUEST_INTERVAL = 1000;
let lastRequestAt = 0;

type NominatimItem = {
  place_id?: number | string;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
};

function requestHeaders(): Record<string, string> {
  // Browsers set their own User-Agent and forbid writing it.
  return Platform.OS === "web"
    ? { "Accept-Language": "ar" }
    : { "Accept-Language": "ar", "User-Agent": "ashmoun-delivery/1.0 (address picker)" };
}

function toResult(item: NominatimItem, index: number): PlaceResult | null {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const full = (item.display_name ?? item.name ?? "").trim();
  const parts = full
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const name = item.name?.trim();
  const primary = name || parts[0] || full;
  const firstPart = parts[0];
  const rest =
    firstPart && primary.toLowerCase().startsWith(firstPart.toLowerCase()) ? parts.slice(1) : parts;

  return {
    id: item.place_id != null ? String(item.place_id) : `${lat},${lng},${index}`,
    primary,
    secondary: rest.join("، "),
    full: full || primary,
    lat,
    lng,
  };
}

// Nominatim can be blocked or slow; on native, fall back to the device geocoder
// so the user still gets coordinates (without a place name) instead of nothing.
async function fallbackGeocode(query: string, limit: number): Promise<PlaceResult[]> {
  const hits = await ExpoLocation.geocodeAsync(query);
  return hits.slice(0, limit).map((hit, index) => ({
    id: `${hit.latitude},${hit.longitude},${index}`,
    primary: query,
    secondary: "",
    full: query,
    lat: hit.latitude,
    lng: hit.longitude,
  }));
}

export async function searchPlaces(query: string, limit = 6): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < MIN_SEARCH_LENGTH) return [];

  try {
    const wait = MIN_REQUEST_INTERVAL - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const url =
      `${ENDPOINT}?format=jsonv2&addressdetails=1&accept-language=ar` +
      `&limit=${limit}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: requestHeaders() });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = (await res.json()) as NominatimItem[];
    return data
      .map(toResult)
      .filter((place): place is PlaceResult => place !== null)
      .slice(0, limit);
  } catch (error) {
    if (Platform.OS === "web") throw error;
    return fallbackGeocode(q, limit);
  }
}
