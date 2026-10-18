/**
 * Client Data Feed Service.
 *
 * Implements Stage 3 requirements:
 * - Calls same-origin `/api/power` and `/api/earthquakes` endpoints.
 * - Extracts `data_source` ("live" | "fixture_fallback") and `fetched_at`.
 * - Sets status: "empty" when array is empty (valid state for earthquakes).
 * - Fully decoupled: fetching Power never awaits Earthquakes, and vice versa.
 */

import type { PowerAdvisory, EarthquakeEvent, PagasaBulletin } from "../../types/index.js";
import type { FeedState } from "../types.js";

const timeoutSignal = (ms = 8000) =>
  typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;

async function fetchCivicEndpoint<T>(
  endpoint: string,
  fetchImpl: typeof fetch,
  fallbackData: T,
  isEmpty: (data: T) => boolean,
  transform: (json: any) => T
): Promise<FeedState<T>> {
  try {
    const res = await fetchImpl(endpoint, { signal: timeoutSignal() });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const data = transform(json);

    return {
      status: isEmpty(data) ? "empty" : "success",
      dataSource: json.data_source,
      fetchedAt: json.fetched_at,
      data,
      parseNotes: json.parse_notes,
    };
  } catch (err: any) {
    return {
      status: "error",
      error: err?.message || String(err),
      data: fallbackData,
    };
  }
}

export function fetchPowerAdvisories(
  fetchImpl: typeof fetch = fetch
): Promise<FeedState<PowerAdvisory[]>> {
  return fetchCivicEndpoint(
    "/api/power",
    fetchImpl,
    [],
    (d) => d.length === 0,
    (j) => (Array.isArray(j?.data) ? j.data : [])
  );
}

export function fetchEarthquakeEvents(
  fetchImpl: typeof fetch = fetch
): Promise<FeedState<EarthquakeEvent[]>> {
  return fetchCivicEndpoint(
    "/api/earthquakes",
    fetchImpl,
    [],
    (d) => d.length === 0,
    (j) => (Array.isArray(j?.data) ? j.data : [])
  );
}

export function fetchPagasaBulletin(
  fetchImpl: typeof fetch = fetch
): Promise<FeedState<PagasaBulletin | null>> {
  return fetchCivicEndpoint(
    "/api/pagasa",
    fetchImpl,
    null,
    (d) => !d,
    (j) => j?.data || null
  );
}
