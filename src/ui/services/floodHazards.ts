/**
 * Project NOAH Flood Hazard Data Service & Styling Palette.
 *
 * Provides:
 * - Lazy-loaded client fetcher for static Metro Cebu 100-year flood hazards GeoJSON.
 * - In-flight promise deduplication and memory caching.
 * - Official Project NOAH 3-tier depth classification color palette.
 * - Zero Node.js runtime imports (browser & PWA safe).
 */

import type { FloodHazardCollection, FloodHazardStyle, FloodHazardVar, FloodRegion } from "../types.js";

export const FLOOD_HAZARD_STYLES: Record<FloodHazardVar, FloodHazardStyle> = {
  1: {
    varCode: 1,
    tier: "low",
    label: "Low Hazard",
    depthRange: "0 – 0.5m",
    hex: "#FACC15", // Project NOAH Yellow
    strokeHex: "#CA8A04",
    fillOpacity: 0.35,
    description: "Low flood susceptibility (up to 0.5 meters / knee height).",
  },
  2: {
    varCode: 2,
    tier: "medium",
    label: "Medium Hazard",
    depthRange: "0.5 – 1.5m",
    hex: "#F97316", // Project NOAH Orange
    strokeHex: "#EA580C",
    fillOpacity: 0.42,
    description: "Medium flood susceptibility (0.5 to 1.5 meters / waist height).",
  },
  3: {
    varCode: 3,
    tier: "high",
    label: "High Hazard",
    depthRange: "> 1.5m",
    hex: "#EF4444", // Project NOAH Red
    strokeHex: "#DC2626",
    fillOpacity: 0.50,
    description: "High flood susceptibility (> 1.5 meters / chest height or higher).",
  },
};

/**
 * Maps a NOAH Var code (1, 2, 3) to its official style definition.
 * Safely defaults to Low Hazard (Var 1) for unexpected, null, or undefined codes (Review Focus #1).
 */
export function getFloodHazardStyle(varCode: number | null | undefined): FloodHazardStyle {
  if (varCode === 2) return FLOOD_HAZARD_STYLES[2];
  if (varCode === 3) return FLOOD_HAZARD_STYLES[3];
  return FLOOD_HAZARD_STYLES[1];
}

const REGIONAL_ASSET_PATHS: Record<FloodRegion, string> = {
  metro: "/data/cebu-flood-metro.geojson",
  north: "/data/cebu-flood-north.geojson",
  south: "/data/cebu-flood-south.geojson",
};

const cachedFloodHazards = new Map<FloodRegion, FloodHazardCollection>();
const inFlightFetches = new Map<FloodRegion, Promise<FloodHazardCollection>>();

/**
 * Returns the currently cached flood hazard collection in memory for a region, or null if not yet loaded.
 * Defaults to "metro" for backwards compatibility.
 */
export function getCachedFloodHazards(region: FloodRegion = "metro"): FloodHazardCollection | null {
  return cachedFloodHazards.get(region) ?? null;
}

/**
 * Returns all currently loaded regional flood hazard collections.
 */
export function getAllCachedFloodHazards(): FloodHazardCollection[] {
  return Array.from(cachedFloodHazards.values());
}

/**
 * Returns a list of all flood regions currently loaded into memory.
 */
export function getLoadedFloodRegions(): FloodRegion[] {
  return Array.from(cachedFloodHazards.keys());
}

/**
 * Resets the in-memory cache and in-flight promises across all regions (used for testing and cache-busting).
 */
export function resetFloodHazardsCache(): void {
  cachedFloodHazards.clear();
  inFlightFetches.clear();
}

/**
 * Lazily fetches and caches regional 100-year flood hazards GeoJSON assets (Metro, North, or South).
 * Deduplicates concurrent calls per region so multiple triggers share a single network request.
 * Resets in-flight state upon network error so subsequent user retries can succeed.
 * Fully backwards-compatible with `fetchFloodHazards(customFetch)` calls.
 */
export async function fetchFloodHazards(
  regionOrFetch?: FloodRegion | typeof fetch,
  customFetch?: typeof fetch
): Promise<FloodHazardCollection> {
  let region: FloodRegion = "metro";
  let fetchFn: typeof fetch = typeof window !== "undefined" ? window.fetch.bind(window) : fetch;

  if (typeof regionOrFetch === "function") {
    fetchFn = regionOrFetch;
  } else if (typeof regionOrFetch === "string") {
    region = regionOrFetch;
    if (customFetch) {
      fetchFn = customFetch;
    }
  } else if (customFetch) {
    fetchFn = customFetch;
  }

  const existing = cachedFloodHazards.get(region);
  if (existing) {
    return existing;
  }

  const inFlight = inFlightFetches.get(region);
  if (inFlight) {
    return inFlight;
  }

  const assetUrl = REGIONAL_ASSET_PATHS[region] ?? REGIONAL_ASSET_PATHS.metro;

  const fetchPromise = (async () => {
    try {
      const response = await fetchFn(assetUrl, {
        headers: { Accept: "application/geo+json, application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to load Project NOAH flood hazard data for ${region}: HTTP ${response.status}`);
      }

      const data = (await response.json()) as FloodHazardCollection;
      if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error(`Invalid flood hazard GeoJSON format received for ${region}.`);
      }

      cachedFloodHazards.set(region, data);
      return data;
    } catch (err) {
      inFlightFetches.delete(region);
      throw err;
    } finally {
      inFlightFetches.delete(region);
    }
  })();

  inFlightFetches.set(region, fetchPromise);
  return fetchPromise;
}

/**
 * Classifies a latitude/longitude pair into its corresponding Cebu flood region:
 * - "north": Northern Cebu & islands (lat >= 10.45)
 * - "south": Southern Cebu & West Coast (lat < 10.20 or lon < 123.75)
 * - "metro": Central Metro Cebu urban corridor (10.20 <= lat < 10.45, lon >= 123.75)
 */
export function getRegionForCoordinates(lat: number, lon: number): FloodRegion {
  if (lat >= 10.45) {
    return "north";
  }
  if (lat < 10.20 || lon < 123.75) {
    return "south";
  }
  return "metro";
}

export interface LatLngBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Determines which flood regions intersect the given map bounding box.
 * Accepts either Leaflet LatLngBounds instances or LatLngBoundsLiteral objects.
 */
export function getRegionsForBounds(
  bounds: LatLngBoundsLiteral | { getNorth(): number; getSouth(): number; getEast(): number; getWest(): number }
): FloodRegion[] {
  const n = typeof (bounds as any).getNorth === "function" ? (bounds as any).getNorth() : (bounds as LatLngBoundsLiteral).north;
  const s = typeof (bounds as any).getSouth === "function" ? (bounds as any).getSouth() : (bounds as LatLngBoundsLiteral).south;
  const e = typeof (bounds as any).getEast === "function" ? (bounds as any).getEast() : (bounds as LatLngBoundsLiteral).east;
  const w = typeof (bounds as any).getWest === "function" ? (bounds as any).getWest() : (bounds as LatLngBoundsLiteral).west;

  const regions: FloodRegion[] = [];

  // Metro bounds: lat ~10.18 to 10.48, lon ~123.72 to 124.08
  if (n >= 10.18 && s <= 10.48 && e >= 123.72 && w <= 124.08) {
    regions.push("metro");
  }

  // North bounds: lat >= 10.42
  if (n >= 10.42) {
    regions.push("north");
  }

  // South bounds: lat <= 10.22 or west coast lon <= 123.75
  if (s <= 10.22 || w <= 123.75) {
    regions.push("south");
  }

  return regions.length > 0 ? regions : ["metro"];
}
