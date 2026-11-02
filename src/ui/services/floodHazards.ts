/**
 * Project NOAH Flood Hazard Data Service & Styling Palette.
 *
 * Provides:
 * - Lazy-loaded client fetcher for static Metro Cebu 100-year flood hazards GeoJSON.
 * - In-flight promise deduplication and memory caching.
 * - Official Project NOAH 3-tier depth classification color palette.
 * - Zero Node.js runtime imports (browser & PWA safe).
 */

import type { FloodHazardCollection, FloodHazardStyle, FloodHazardVar } from "../types.js";

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

let cachedFloodHazards: FloodHazardCollection | null = null;
let inFlightFetch: Promise<FloodHazardCollection> | null = null;

/**
 * Returns the currently cached flood hazard collection in memory, or null if not yet loaded.
 */
export function getCachedFloodHazards(): FloodHazardCollection | null {
  return cachedFloodHazards;
}

/**
 * Resets the in-memory cache and in-flight promise (used for testing and cache-busting).
 */
export function resetFloodHazardsCache(): void {
  cachedFloodHazards = null;
  inFlightFetch = null;
}

/**
 * Lazily fetches and caches the Metro Cebu 100-year flood hazards GeoJSON asset.
 * Deduplicates concurrent calls so multiple triggers share a single network request (Review Focus #2).
 * Resets in-flight state upon network error so subsequent user retries can succeed (Review Focus #3).
 */
export async function fetchFloodHazards(
  customFetch: typeof fetch = typeof window !== "undefined" ? window.fetch.bind(window) : fetch
): Promise<FloodHazardCollection> {
  if (cachedFloodHazards) {
    return cachedFloodHazards;
  }

  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const response = await customFetch("/data/cebu-flood-hazards.geojson", {
        headers: { Accept: "application/geo+json, application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to load Project NOAH flood hazard data: HTTP ${response.status}`);
      }

      const data = (await response.json()) as FloodHazardCollection;
      if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("Invalid flood hazard GeoJSON format received.");
      }

      cachedFloodHazards = data;
      return data;
    } catch (err) {
      // Clear in-flight promise on error to allow clean retries
      inFlightFetch = null;
      throw err;
    } finally {
      // After completion, clear in-flight pointer so subsequent calls read cachedFloodHazards
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}
