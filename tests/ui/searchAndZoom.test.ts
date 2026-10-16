/**
 * Unit Tests for MapController searchAndZoom (Hybrid 3-Tier Strategy).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapController } from "../../src/ui/map/mapController.js";
import type { PowerAdvisory, EarthquakeEvent } from "../../src/types/index.js";
import * as cebuLocations from "../../src/ui/services/cebuLocations.js";

// Mock Leaflet
vi.mock("leaflet", () => {
  const dummyMap = {
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    setView: vi.fn(),
    hasLayer: vi.fn().mockReturnValue(true),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    createPane: vi.fn().mockReturnValue({ style: {} }),
    getPane: vi.fn().mockReturnValue({ style: {} }),
  };

  const dummyLayerGroup = {
    clearLayers: vi.fn(),
    addLayer: vi.fn(),
    addTo: vi.fn().mockReturnThis(),
    eachLayer: vi.fn((fn: any) => {
      fn({
        getLatLng: () => ({ lat: 10.3300, lng: 123.9000 }),
        openPopup: vi.fn(),
      });
    }),
    getLayers: vi.fn().mockReturnValue([]),
  };

  return {
    default: {
      map: vi.fn().mockReturnValue(dummyMap),
      layerGroup: vi.fn().mockReturnValue(dummyLayerGroup),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      control: { zoom: vi.fn().mockReturnValue({ addTo: vi.fn() }) },
      latLng: vi.fn((lat, lon) => ({ lat, lng: lon })),
      latLngBounds: vi.fn((arr) => ({
        isValid: () => true,
        getCenter: () => ({ lat: 10.33, lng: 123.90 }),
      })),
      point: vi.fn((x, y) => ({ x, y })),
      divIcon: vi.fn().mockReturnValue({}),
      marker: vi.fn().mockReturnValue({
        on: vi.fn(),
        bindPopup: vi.fn(),
      }),
      circleMarker: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      featureGroup: vi.fn().mockReturnValue({
        getBounds: vi.fn().mockReturnValue({ isValid: () => false }),
      }),
    },
  };
});

describe("MapController — searchAndZoom (Hybrid 3-Tier Strategy)", () => {
  let controller: MapController;

  const mockPowerAdvisory: PowerAdvisory = {
    id: "pow-1",
    city: "Cebu City",
    barangay: ["Lahug"],
    date: "2026-10-10",
    start_time: "09:00",
    end_time: "17:00",
    streets: ["Salinas Drive"],
    areas_affected_raw: "Along Salinas Drive, Brgy. Lahug",
    purpose: "Pole relocation and line maintenance",
    source_url: "https://example.com/advisory",
    fetched_at: "2026-10-10T00:00:00Z",
    parse_confidence: "high",
    business_confidence: "scheduled",
    lat: 10.3300,
    lon: 123.9000,
    coordinate_source: "boundary_centroid",
  };

  const mockEarthquake: EarthquakeEvent = {
    id: "eq-1",
    datetime_pst: "2026-10-10T12:00:00+08:00",
    lat: 10.1500,
    lon: 123.7000,
    depth_km: 10,
    magnitude: 4.5,
    magnitude_type: "ML",
    location_description: "010 km S 25° W of San Fernando (Cebu)",
    nearest_town: "San Fernando",
    nearest_province: "Cebu",
    distance_from_cebu_km: 30,
    origin_type: "tectonic",
    source_url: "https://example.com/bulletin",
    within_watch_radius: true,
  };

  beforeEach(() => {
    controller = new MapController("test-map");
  });

  it("returns error message when query is empty", async () => {
    const res = await controller.searchAndZoom("", [mockPowerAdvisory], [mockEarthquake]);
    expect(res.found).toBe(false);
    expect(res.tier).toBeNull();
    expect(res.message).toBe("Please enter a location to search.");
  });

  it("resolves via Tier 1 when a single active power advisory matches", async () => {
    const res = await controller.searchAndZoom("Lahug", [mockPowerAdvisory], [mockEarthquake]);
    expect(res.found).toBe(true);
    expect(res.tier).toBe(1);
    expect(res.message).toContain("Found 1 active outage advisory in Lahug");
    expect(res.coords).toEqual([10.33, 123.9]);
  });

  it("resolves via Tier 1 with bounds when multiple power advisories match", async () => {
    const secondAdv: PowerAdvisory = {
      ...mockPowerAdvisory,
      id: "pow-2",
      streets: ["Gorordo Ave"],
      lat: 10.3200,
      lon: 123.8900,
    };
    const res = await controller.searchAndZoom("Lahug", [mockPowerAdvisory, secondAdv], []);
    expect(res.found).toBe(true);
    expect(res.tier).toBe(1);
    expect(res.message).toContain("Found 2 active pins");
    expect((controller as any).map.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        paddingTopLeft: expect.any(Array),
        paddingBottomRight: expect.any(Array),
        maxZoom: 15,
      })
    );
  });

  it("resolves via Tier 1 when an active earthquake matches", async () => {
    const res = await controller.searchAndZoom("San Fernando", [], [mockEarthquake]);
    expect(res.found).toBe(true);
    expect(res.tier).toBe(1);
    expect(res.message).toContain("Found M4.5 earthquake in San Fernando");
  });

  it("resolves via Tier 2 (Offline Barangay / LGU) when no active pins match", async () => {
    // Guadalupe has no active outages in this mock list
    const res = await controller.searchAndZoom("Guadalupe", [mockPowerAdvisory], [mockEarthquake]);
    expect(res.found).toBe(true);
    expect(res.tier).toBe(2);
    expect(res.message).toContain("Centered on Guadalupe, Cebu City — No active advisories in this area.");
  });

  it("resolves via Tier 2 for major landmarks like Cebu IT Park", async () => {
    const res = await controller.searchAndZoom("Cebu IT Park", [], []);
    expect(res.found).toBe(true);
    expect(res.tier).toBe(2);
    expect(res.message).toContain("Centered on Cebu IT Park, Cebu City");
  });

  it("resolves via Tier 3 (Online Bounded Geocode) when not found locally", async () => {
    const spy = vi.spyOn(cebuLocations, "geocodeCebuOnline").mockResolvedValueOnce({
      displayName: "Colon Street",
      lat: 10.2974,
      lon: 123.8997,
      type: "street",
    });

    const res = await controller.searchAndZoom("Unknown Local Street", [], []);
    expect(res.found).toBe(true);
    expect(res.tier).toBe(3);
    expect(res.message).toContain("Centered on Colon Street — No active advisories found.");

    spy.mockRestore();
  });

  it("returns not found message when all tiers fail", async () => {
    const spy = vi.spyOn(cebuLocations, "geocodeCebuOnline").mockResolvedValueOnce(null);

    const res = await controller.searchAndZoom("NonExistentPlaceXYZ", [], []);
    expect(res.found).toBe(false);
    expect(res.tier).toBeNull();
    expect(res.message).toContain('No location found for "NonExistentPlaceXYZ" in Cebu.');

    spy.mockRestore();
  });
});
