/**
 * UI Client Data Feed & Layer Decoupling Tests (Stage 3).
 *
 * Verifies:
 * 1. fetchPowerAdvisories parses successful responses with data_source.
 * 2. fetchEarthquakeEvents parses empty array as status: "empty" (valid state, never "error").
 * 3. Feed Decoupling: Simulated failure in earthquake fetch does not affect or throw power fetch.
 * 4. Error handling: HTTP error cleanly sets status: "error" without crashing.
 */

import { describe, it, expect, vi } from "vitest";
import { fetchPowerAdvisories, fetchEarthquakeEvents, fetchPagasaBulletin } from "../../src/ui/services/dataFeed.js";

describe("Client Data Feed Service", () => {
  it("fetchPowerAdvisories parses successful API response with data_source", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data_source: "live",
        fetched_at: "2026-09-06T00:00:00.000Z",
        data: [{ id: "advisory-1" }],
      }),
    });

    const state = await fetchPowerAdvisories(mockFetch as any);
    expect(state.status).toBe("success");
    expect(state.dataSource).toBe("live");
    expect(state.data).toHaveLength(1);
  });

  it("fetchEarthquakeEvents treats empty array as status: 'empty' (valid state, not error)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data_source: "live",
        fetched_at: "2026-09-06T00:00:00.000Z",
        data: [],
      }),
    });

    const state = await fetchEarthquakeEvents(mockFetch as any);
    expect(state.status).toBe("empty");
    expect(state.dataSource).toBe("live");
    expect(state.data).toEqual([]);
    expect(state.error).toBeUndefined();
  });

  it("handles HTTP error response with status: 'error'", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const state = await fetchPowerAdvisories(mockFetch as any);
    expect(state.status).toBe("error");
    expect(state.error).toContain("HTTP 500");
    expect(state.data).toEqual([]);
  });

  it("layer decoupling: one feed failure does not block or throw the other feed", async () => {
    const mockPowerFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data_source: "live",
        fetched_at: "2026-09-06T00:00:00.000Z",
        data: [{ id: "p1" }],
      }),
    });

    const mockEqFetch = vi.fn().mockRejectedValue(new Error("PHIVOLCS network timeout"));

    const [powerRes, eqRes] = await Promise.all([
      fetchPowerAdvisories(mockPowerFetch as any),
      fetchEarthquakeEvents(mockEqFetch as any),
    ]);

    // Power succeeds completely
    expect(powerRes.status).toBe("success");
    expect(powerRes.data).toHaveLength(1);

    // Earthquakes handles error gracefully
    expect(eqRes.status).toBe("error");
    expect(eqRes.error).toContain("PHIVOLCS network timeout");
  });

  it("fetchPagasaBulletin parses bulletin response and sets status: success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data_source: "live",
        fetched_at: "2026-10-14T00:00:00.000Z",
        data: {
          id: "pagasa-1",
          has_active_cyclone: true,
          cyclone_name: "KRISTINE",
          tcws_cebu: { active: true, signal_level: 1, wind_speed_kmh: "39-61", areas_affected: ["Northern Cebu"] },
          heavy_rainfall_alert: { level: "yellow", warning_type: "Heavy", description: "Flooding possible", advisory_areas: ["Metro Cebu"] },
          storm_center: { lat: 10.5, lon: 124.0, movement: "West at 15 km/h" },
          parse_confidence: "high",
        },
      }),
    });

    const state = await fetchPagasaBulletin(mockFetch as any);
    expect(state.status).toBe("success");
    expect(state.dataSource).toBe("live");
    expect(state.data?.has_active_cyclone).toBe(true);
    expect(state.data?.cyclone_name).toBe("KRISTINE");
    expect(state.data?.tcws_cebu.signal_level).toBe(1);
  });

  it("fetchPagasaBulletin handles null data with status: empty", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data_source: "fixture_fallback",
        fetched_at: "2026-10-14T00:00:00.000Z",
        data: null,
      }),
    });

    const state = await fetchPagasaBulletin(mockFetch as any);
    expect(state.status).toBe("empty");
    expect(state.data).toBeNull();
  });

  it("fetchPagasaBulletin handles network/HTTP errors cleanly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    const state = await fetchPagasaBulletin(mockFetch as any);
    expect(state.status).toBe("error");
    expect(state.error).toContain("HTTP 503 Service Unavailable");
    expect(state.data).toBeNull();
  });
});
