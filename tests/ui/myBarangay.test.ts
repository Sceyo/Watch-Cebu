/**
 * Unit Tests for My Barangay Service (Phase 2).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getMyBarangay, setMyBarangay, getMyBarangayStatus } from "../../src/ui/services/myBarangay.js";
import type { PowerAdvisory } from "../../src/types/index.js";

const mockAdvisories: PowerAdvisory[] = [
  {
    id: "adv-1",
    source_url: "https://visayanelectric.com",
    fetched_at: "2026-10-16T08:00:00Z",
    advisory_week_start: "2026-10-18",
    date: "2026-10-18",
    start_time: "08:00",
    end_time: "17:00",
    overnight_span: false,
    duration_hours: 9,
    purpose: "Line maintenance",
    city: "Cebu City",
    barangay: ["Talamban"],
    streets: ["Gov. Cuenco Ave"],
    areas_affected_raw: "Talamban",
    lat: 10.37,
    lon: 123.91,
    coordinate_source: "osm_point",
    geocode_query: null,
    geocode_provider: null,
    business_confidence: "scheduled",
    parse_confidence: "high",
    parse_notes: null,
  },
  {
    id: "adv-2",
    source_url: "https://visayanelectric.com",
    fetched_at: "2026-10-16T08:00:00Z",
    advisory_week_start: "2026-10-18",
    date: "2026-10-20",
    start_time: "09:00",
    end_time: "15:00",
    overnight_span: false,
    duration_hours: 6,
    purpose: "Transformer upgrade",
    city: "Cebu City",
    barangay: ["Talamban", "Banilad"],
    streets: ["Pasilan"],
    areas_affected_raw: "Talamban",
    lat: 10.36,
    lon: 123.91,
    coordinate_source: "osm_point",
    geocode_query: null,
    geocode_provider: null,
    business_confidence: "scheduled",
    parse_confidence: "high",
    parse_notes: null,
  },
  {
    id: "adv-3",
    source_url: "https://visayanelectric.com",
    fetched_at: "2026-10-16T08:00:00Z",
    advisory_week_start: "2026-10-18",
    date: "2026-10-19",
    start_time: "08:00",
    end_time: "12:00",
    overnight_span: false,
    duration_hours: 4,
    purpose: "Tree clearing",
    city: "Mandaue City",
    barangay: ["Subangdaku"],
    streets: ["Lopez Jaena"],
    areas_affected_raw: "Subangdaku",
    lat: 10.32,
    lon: 123.93,
    coordinate_source: "osm_point",
    geocode_query: null,
    geocode_provider: null,
    business_confidence: "scheduled",
    parse_confidence: "high",
    parse_notes: null,
  },
];

describe("My Barangay Service", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("persists and retrieves pinned barangay via localStorage", () => {
    expect(getMyBarangay()).toBeNull();
    setMyBarangay("Talamban");
    expect(getMyBarangay()).toBe("Talamban");
    setMyBarangay(null);
    expect(getMyBarangay()).toBeNull();
  });

  it("calculates status correctly when barangay has scheduled outages", () => {
    const status = getMyBarangayStatus("Talamban", mockAdvisories);
    expect(status.hasAdvisories).toBe(true);
    expect(status.count).toBe(2);
    expect(status.dates).toEqual(["2026-10-18", "2026-10-20"]);
  });

  it("calculates status correctly when barangay has no scheduled outages", () => {
    const status = getMyBarangayStatus("Guadalupe", mockAdvisories);
    expect(status.hasAdvisories).toBe(false);
    expect(status.count).toBe(0);
    expect(status.dates).toEqual([]);
    expect(status.advisories).toEqual([]);
  });

  it("supports multi-favorite barangays (up to 3) with add, remove, and isFavorite", async () => {
    const { getFavorites, addFavorite, removeFavorite, isFavorite } = await import(
      "../../src/ui/services/myBarangay.js"
    );

    expect(getFavorites()).toEqual([]);
    expect(isFavorite("Talamban")).toBe(false);

    expect(addFavorite("Talamban")).toBe(true);
    expect(addFavorite("Lahug")).toBe(true);
    expect(addFavorite("Banilad")).toBe(true);

    // 4th favorite should be rejected due to MAX_FAVORITES limit (3)
    expect(addFavorite("Guadalupe")).toBe(false);

    expect(getFavorites()).toEqual(["Talamban", "Lahug", "Banilad"]);
    expect(isFavorite("talamban")).toBe(true);
    expect(isFavorite("LAHUG")).toBe(true);
    expect(isFavorite("Banilad")).toBe(true);
    expect(isFavorite("Guadalupe")).toBe(false);

    // Primary favorite returns first item
    expect(getMyBarangay()).toBe("Talamban");

    // Remove one favorite
    removeFavorite("Lahug");
    expect(getFavorites()).toEqual(["Talamban", "Banilad"]);
    expect(isFavorite("Lahug")).toBe(false);
  });

  it("handles legacy plain string in localStorage transparently", async () => {
    const { getFavorites } = await import("../../src/ui/services/myBarangay.js");
    mockStorage["watch_cebu_my_barangay"] = "Mabolo";

    expect(getFavorites()).toEqual(["Mabolo"]);
    expect(getMyBarangay()).toBe("Mabolo");
  });
});
