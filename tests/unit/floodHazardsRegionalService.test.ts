import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchFloodHazards,
  getCachedFloodHazards,
  getAllCachedFloodHazards,
  getLoadedFloodRegions,
  resetFloodHazardsCache,
  getRegionForCoordinates,
  getRegionsForBounds,
} from "../../src/ui/services/floodHazards.js";

describe("Regional Flood Hazards Service & Coordinate Classifiers", () => {
  beforeEach(() => {
    resetFloodHazardsCache();
  });

  it("fetches, caches, and differentiates regional assets independently", async () => {
    const northData = {
      type: "FeatureCollection" as const,
      metadata: { region: "north" },
      features: [
        {
          type: "Feature" as const,
          properties: { Var: 2 as const, hazard_level: "Medium" },
          geometry: { type: "Polygon" as const, coordinates: [[[124.0, 10.5], [124.01, 10.5], [124.01, 10.51], [124.0, 10.5]]] },
        },
      ],
    };

    const southData = {
      type: "FeatureCollection" as const,
      metadata: { region: "south" },
      features: [
        {
          type: "Feature" as const,
          properties: { Var: 1 as const, hazard_level: "Low" },
          geometry: { type: "Polygon" as const, coordinates: [[[123.6, 10.1], [123.61, 10.1], [123.61, 10.11], [123.6, 10.1]]] },
        },
      ],
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("cebu-flood-north.geojson")) {
        return { ok: true, json: async () => northData };
      }
      if (url.includes("cebu-flood-south.geojson")) {
        return { ok: true, json: async () => southData };
      }
      throw new Error("Unexpected URL: " + url);
    });

    const northRes = await fetchFloodHazards("north", mockFetch as unknown as typeof fetch);
    expect(northRes.metadata?.region).toBe("north");
    expect(getCachedFloodHazards("north")).toEqual(northData);
    expect(getCachedFloodHazards("south")).toBeNull();
    expect(getLoadedFloodRegions()).toEqual(["north"]);

    const southRes = await fetchFloodHazards("south", mockFetch as unknown as typeof fetch);
    expect(southRes.metadata?.region).toBe("south");
    expect(getCachedFloodHazards("south")).toEqual(southData);
    expect(getLoadedFloodRegions()).toEqual(["north", "south"]);
    expect(getAllCachedFloodHazards()).toHaveLength(2);

    // Cache reset clears all regions
    resetFloodHazardsCache();
    expect(getCachedFloodHazards("north")).toBeNull();
    expect(getCachedFloodHazards("south")).toBeNull();
    expect(getLoadedFloodRegions()).toEqual([]);
  });

  it("correctly classifies provincial Cebu coordinates into regions", () => {
    // Metro Cebu Corridor
    expect(getRegionForCoordinates(10.3157, 123.8854)).toBe("metro"); // Cebu City
    expect(getRegionForCoordinates(10.3341, 123.9416)).toBe("metro"); // Mandaue
    expect(getRegionForCoordinates(10.3153, 123.9575)).toBe("metro"); // Lapu-Lapu
    expect(getRegionForCoordinates(10.2450, 123.8420)).toBe("metro"); // Talisay

    // North Cebu
    expect(getRegionForCoordinates(10.5283, 124.0267)).toBe("north"); // Danao
    expect(getRegionForCoordinates(11.0506, 124.0069)).toBe("north"); // Bogo
    expect(getRegionForCoordinates(11.2614, 124.0253)).toBe("north"); // Daanbantayan
    expect(getRegionForCoordinates(11.1681, 123.7239)).toBe("north"); // Bantayan Island
    expect(getRegionForCoordinates(10.6667, 124.3667)).toBe("north"); // Camotes

    // South & West Cebu
    expect(getRegionForCoordinates(10.1067, 123.6397)).toBe("south"); // Carcar
    expect(getRegionForCoordinates(9.8828, 123.5986)).toBe("south");  // Argao
    expect(getRegionForCoordinates(9.4217, 123.3364)).toBe("south");  // Santander
    expect(getRegionForCoordinates(10.3800, 123.6400)).toBe("south"); // Toledo (West Coast)
  });

  it("determines intersecting regions for bounding boxes", () => {
    // Metro viewport only
    const metroBounds = { north: 10.36, south: 10.28, east: 123.98, west: 123.82 };
    expect(getRegionsForBounds(metroBounds)).toEqual(["metro"]);

    // North viewport (Danao / Carmen)
    const northBounds = { north: 10.60, south: 10.50, east: 124.05, west: 123.95 };
    const northRegions = getRegionsForBounds(northBounds);
    expect(northRegions).toContain("north");

    // South viewport (Carcar / Argao)
    const southBounds = { north: 10.15, south: 9.85, east: 123.65, west: 123.50 };
    const southRegions = getRegionsForBounds(southBounds);
    expect(southRegions).toContain("south");

    // Full island view (spanning from Santander to Daanbantayan)
    const fullIslandBounds = { north: 11.35, south: 9.35, east: 124.45, west: 123.30 };
    const allRegions = getRegionsForBounds(fullIslandBounds);
    expect(allRegions).toContain("metro");
    expect(allRegions).toContain("north");
    expect(allRegions).toContain("south");

    // Supports Leaflet-style LatLngBounds objects
    const leafletMock = {
      getNorth: () => 10.55,
      getSouth: () => 10.25,
      getEast: () => 124.00,
      getWest: () => 123.80,
    };
    const leafletRegions = getRegionsForBounds(leafletMock);
    expect(leafletRegions).toContain("metro");
    expect(leafletRegions).toContain("north");
  });
});
