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
      divIcon: vi.fn((opts) => opts || {}),
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

  it("prioritizes physical location matches over purpose descriptions (Banilad UAT Fix)", async () => {
    const baniladPhysical: PowerAdvisory = {
      ...mockPowerAdvisory,
      id: "pow-banilad",
      barangay: ["Banilad"],
      streets: ["Gov. Cuenco"],
      lat: 10.3400,
      lon: 123.9100,
      purpose: "Maintenance work",
    };

    const cabancalanPurposeOnly: PowerAdvisory = {
      ...mockPowerAdvisory,
      id: "pow-cabancalan",
      city: "Mandaue City",
      barangay: ["Cabancalan"],
      streets: ["M.L. Quezon"],
      lat: 10.3550,
      lon: 123.9250,
      purpose: "Feeder load transfer serving customers in Banilad, Talamban & Cabancalan",
    };

    const res = await controller.searchAndZoom("Banilad", [baniladPhysical, cabancalanPurposeOnly], []);
    expect(res.found).toBe(true);
    expect(res.tier).toBe(1);
    // Should match ONLY the 1 physical advisory in Banilad, ignoring Cabancalan
    expect(res.message).toContain("Found 1 active outage advisory in Banilad");
    expect(res.coords).toEqual([10.34, 123.91]);
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

describe("MapController — Favorite Barangay & Earthquake Enhancements", () => {
  let controller: MapController;

  const mockAdvisory: PowerAdvisory = {
    id: "pow-lahug",
    city: "Cebu City",
    barangay: ["Lahug"],
    date: "2026-10-20",
    start_time: "09:00",
    end_time: "17:00",
    duration_hours: 8,
    overnight_span: false,
    streets: ["Gorordo Ave"],
    areas_affected_raw: "Gorordo Ave",
    purpose: "Upgrading feeder lines",
    source_url: "https://example.com/advisory",
    fetched_at: "2026-10-18T00:00:00Z",
    parse_confidence: "high",
    business_confidence: "scheduled",
    lat: 10.3300,
    lon: 123.9000,
    coordinate_source: "boundary_centroid",
    feed_type: "power",
  };

  const mockMicroQuake: EarthquakeEvent = {
    event_id: "eq-micro-1",
    datetime_pst: "2026-10-16T10:00:00+08:00",
    lat: 10.85,
    lon: 124.95,
    depth_km: 15,
    magnitude: 2.1,
    magnitude_type: "ML",
    origin_type: "Tectonic",
    location_description: "025 km N 10° E of Hinunangan (Southern Leyte)",
    nearest_town: "Hinunangan",
    nearest_province: "Southern Leyte",
    distance_from_cebu_km: 143,
    within_watch_radius: true,
    reported_intensities: null,
    instrumental_intensities: null,
    expecting_damage: false,
    expecting_aftershocks: false,
    source_url: "https://example.com/phivolcs",
    fetched_at: "2026-10-16T10:05:00Z",
    feed_type: "earthquake",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MapController("map");
  });

  it("highlights favorite barangay in yellow (#F59E0B) with is-favorite class and star icon", async () => {
    const L = (await import("leaflet")).default;
    controller.renderPowerAdvisories([mockAdvisory], { selectedDate: "all" }, "Lahug");

    const calls = (L.divIcon as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.html).toContain("--pin-color: #F59E0B");
    expect(lastCall.html).toContain("is-favorite");

    // Verify favorite popup receives amber balloon class and solid badge without wrapping gap
    const markerMock = (L.marker as any).mock.results[0]?.value;
    expect(markerMock.bindPopup).toHaveBeenCalledWith(
      expect.stringContaining("favorite-badge-solid"),
      expect.objectContaining({
        className: "is-favorite-popup-wrapper",
        autoPanPaddingBottomRight: expect.anything(),
      })
    );
  });

  it("offsets desktop target latitude when focusing with openPopup to show marker and info card simultaneously", () => {
    const dummyMap = (controller as any).map;
    dummyMap.setView.mockClear();

    // Call panToLocation with openPopup = true
    controller.panToLocation({ lat: 10.33, lon: 123.90 }, 15, true);

    expect(dummyMap.setView).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Number), 123.90]),
      15,
      { animate: true }
    );
  });

  it("renders distant microquakes when showMicroQuakes is true", async () => {
    const L = (await import("leaflet")).default;
    controller.renderEarthquakeEvents([mockMicroQuake], { showMicroQuakes: true, minMagnitude: 0 });

    const calls = (L.divIcon as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.html).toContain("2.1");
  });

  it("hides distant microquakes when showMicroQuakes is explicitly false", async () => {
    const L = (await import("leaflet")).default;
    (L.divIcon as any).mockClear();
    controller.renderEarthquakeEvents([mockMicroQuake], { showMicroQuakes: false, minMagnitude: 0 });

    const calls = (L.divIcon as any).mock.calls;
    expect(calls.length).toBe(0);
  });

  describe("Search Suggestions from Database (User Request)", () => {
    it("returns prefix matches for barangays like Banilad and Cabancalan", () => {
      const suggestions = cebuLocations.getCebuSearchSuggestions("Ban");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.name === "Banilad")).toBe(true);

      const cabSuggestions = cebuLocations.getCebuSearchSuggestions("Cabancalan");
      expect(cabSuggestions.length).toBeGreaterThan(0);
      expect(cabSuggestions[0].name).toBe("Cabancalan");
      expect(cabSuggestions[0].city).toBe("Mandaue City");
    });

    it("flags locations with active outages when advisoryBarangays are provided", () => {
      const suggestions = cebuLocations.getCebuSearchSuggestions("Ban", ["Banilad"]);
      const banilad = suggestions.find((s) => s.name === "Banilad");
      expect(banilad?.hasOutage).toBe(true);
    });

    it("returns empty array for empty query and respects maxResults limit", () => {
      expect(cebuLocations.getCebuSearchSuggestions("")).toEqual([]);
      expect(cebuLocations.getCebuSearchSuggestions("   ")).toEqual([]);

      const limited = cebuLocations.getCebuSearchSuggestions("Cebu", undefined, 3);
      expect(limited.length).toBeLessThanOrEqual(3);
    });
  });
});

