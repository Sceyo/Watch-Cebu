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
import { fetchPowerAdvisories, fetchEarthquakeEvents } from "../../src/ui/services/dataFeed.js";

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
});
