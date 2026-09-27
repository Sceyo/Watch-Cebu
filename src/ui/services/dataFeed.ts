/**
 * Client Data Feed Service.
 *
 * Implements Stage 3 requirements:
 * - Calls same-origin `/api/power` and `/api/earthquakes` endpoints.
 * - Extracts `data_source` ("live" | "fixture_fallback") and `fetched_at`.
 * - Sets status: "empty" when array is empty (valid state for earthquakes).
 * - Fully decoupled: fetching Power never awaits Earthquakes, and vice versa.
 */

import type { PowerAdvisory, EarthquakeEvent } from "../../types/index.js";
import type { FeedState } from "../types.js";

export async function fetchPowerAdvisories(
  fetchImpl: typeof fetch = fetch
): Promise<FeedState<PowerAdvisory[]>> {
  try {
    const res = await fetchImpl("/api/power");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const data: PowerAdvisory[] = Array.isArray(json.data) ? json.data : [];

    return {
      status: data.length === 0 ? "empty" : "success",
      dataSource: json.data_source,
      fetchedAt: json.fetched_at,
      data,
      parseNotes: json.parse_notes,
    };
  } catch (err: any) {
    return {
      status: "error",
      error: err?.message || String(err),
      data: [],
    };
  }
}

export async function fetchEarthquakeEvents(
  fetchImpl: typeof fetch = fetch
): Promise<FeedState<EarthquakeEvent[]>> {
  try {
    const res = await fetchImpl("/api/earthquakes");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const data: EarthquakeEvent[] = Array.isArray(json.data) ? json.data : [];

    return {
      status: data.length === 0 ? "empty" : "success",
      dataSource: json.data_source,
      fetchedAt: json.fetched_at,
      data,
      parseNotes: json.parse_notes,
    };
  } catch (err: any) {
    return {
      status: "error",
      error: err?.message || String(err),
      data: [],
    };
  }
}
