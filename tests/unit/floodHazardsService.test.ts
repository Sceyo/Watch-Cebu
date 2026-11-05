import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getFloodHazardStyle,
  fetchFloodHazards,
  getCachedFloodHazards,
  resetFloodHazardsCache,
} from "../../src/ui/services/floodHazards.js";

describe("Flood Hazards Service & Style Palette", () => {
  beforeEach(() => {
    resetFloodHazardsCache();
  });

  it("maps NOAH Var 1, 2, 3 to official Yellow, Orange, Red hazard styles", () => {
    expect(getFloodHazardStyle(1)).toMatchObject({
      varCode: 1,
      tier: "low",
      label: "Low Hazard",
      depthRange: "0 – 0.5m",
      hex: "#FACC15",
    });
    expect(getFloodHazardStyle(2)).toMatchObject({
      varCode: 2,
      tier: "medium",
      label: "Medium Hazard",
      depthRange: "0.5 – 1.5m",
      hex: "#F97316",
    });
    expect(getFloodHazardStyle(3)).toMatchObject({
      varCode: 3,
      tier: "high",
      label: "High Hazard",
      depthRange: "> 1.5m",
      hex: "#EF4444",
    });
  });

  it("falls back safely to Low Hazard style for unexpected or null Var values (Review Focus #1)", () => {
    expect(getFloodHazardStyle(0).tier).toBe("low");
    expect(getFloodHazardStyle(99).tier).toBe("low");
    expect(getFloodHazardStyle(null).tier).toBe("low");
    expect(getFloodHazardStyle(undefined).tier).toBe("low");
  });

  it("deduplicates concurrent in-flight fetches and caches the resolved FeatureCollection (Review Focus #2)", async () => {
    const sampleCollection = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { Var: 3 as const, hazard_level: "High" },
          geometry: {
            type: "Polygon" as const,
            coordinates: [[[123.88, 10.31], [123.89, 10.31], [123.89, 10.32], [123.88, 10.31]]],
          },
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleCollection,
    });

    const [res1, res2] = await Promise.all([
      fetchFloodHazards(mockFetch as unknown as typeof fetch),
      fetchFloodHazards(mockFetch as unknown as typeof fetch),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res1.features).toHaveLength(1);
    expect(res2.features).toHaveLength(1);
    expect(getCachedFloodHazards()).toEqual(sampleCollection);
  });

  it("clears in-flight promise on network error so subsequent retries succeed (Review Focus #3)", async () => {
    const failingFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchFloodHazards(failingFetch as unknown as typeof fetch)).rejects.toThrow(
      /Failed to load Project NOAH flood hazard data/
    );
    expect(getCachedFloodHazards()).toBeNull();

    const recoveryFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    });
    const recovered = await fetchFloodHazards(recoveryFetch as unknown as typeof fetch);
    expect(recovered.type).toBe("FeatureCollection");
  });
});
