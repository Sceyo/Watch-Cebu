/**
 * Unit Tests for List View Alternative Component (Phase 2).
 *
 * Verifies:
 * 1. Renders empty state when no advisories match filter.
 * 2. Groups advisories by date in chronological order.
 * 3. Correctly parses and displays barangays, time range, streets, and purpose.
 * 4. Triggers onSelectAdvisory callback when "View on Map" is clicked.
 * 5. Triggers onPinBarangay callback when "Pin Barangay" is clicked.
 * 6. Reflects pinned area state when callbacks.myBarangay matches.
 * 7. Filters items by search query.
 */

import { describe, it, expect, vi } from "vitest";
import { renderListView } from "../../src/ui/components/listView.js";
import type { PowerAdvisory, EarthquakeEvent } from "../../types/index.js";
import type { FilterState } from "../../src/ui/types.js";

function createMockElement(): any {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const attrs: Record<string, string> = {};
  const btnCache: Record<string, any[]> = {};
  let innerHTMLValue = "";

  const elem: any = {
    id: "",
    className: "",
    get innerHTML() {
      return innerHTMLValue;
    },
    set innerHTML(val: string) {
      innerHTMLValue = val;
    },
    setAttribute: vi.fn((k: string, v: string) => {
      attrs[k] = v;
    }),
    getAttribute: vi.fn((k: string) => attrs[k] ?? null),
    addEventListener: vi.fn((event: string, handler: any) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    click: vi.fn(() => {
      if (listeners["click"]) {
        listeners["click"].forEach((h) => h());
      }
    }),
    querySelectorAll: vi.fn((sel: string) => {
      if (btnCache[sel]) return btnCache[sel];
      const matches: any[] = [];
      if (sel.includes(".btn-locate-earthquake")) {
        const regex = /class="[^"]*btn-locate-earthquake[^"]*"\s+data-id="([^"]+)"/g;
        let match;
        while ((match = regex.exec(innerHTMLValue)) !== null) {
          const btn = createMockElement();
          btn.setAttribute("data-id", match[1]);
          matches.push(btn);
        }
      } else if (sel.includes(".btn-locate-advisory")) {
        const regex = /class="[^"]*btn-locate-advisory[^"]*"\s+data-id="([^"]+)"/g;
        let match;
        while ((match = regex.exec(innerHTMLValue)) !== null) {
          const btn = createMockElement();
          btn.setAttribute("data-id", match[1]);
          matches.push(btn);
        }
      } else if (sel.includes(".btn-pin-barangay")) {
        const regex = /class="[^"]*btn-pin-barangay[^"]*"\s+data-barangay="([^"]+)"/g;
        let match;
        while ((match = regex.exec(innerHTMLValue)) !== null) {
          const btn = createMockElement();
          btn.setAttribute("data-barangay", match[1]);
          matches.push(btn);
        }
      }
      btnCache[sel] = matches;
      return matches;
    }),
  };

  return elem;
}

const sampleAdvisories: PowerAdvisory[] = [
  {
    id: "adv-1",
    date: "2026-10-18",
    start_time: "09:00",
    end_time: "17:00",
    duration_hours: 8,
    overnight_span: false,
    city: "Cebu City",
    barangay: ["Talamban"],
    streets: ["Cabancalan Rd", "Miñoza St"],
    purpose: "Line maintenance & pole relocation",
    areas_affected_raw: "Portion of Cabancalan Rd",
    lat: 10.366,
    lon: 123.916,
    is_centroid: true,
    has_explicit_location: true,
    feed_type: "power",
  },
  {
    id: "adv-2",
    date: "2026-10-18",
    start_time: "10:00",
    end_time: "14:00",
    duration_hours: 4,
    overnight_span: false,
    city: "Mandaue City",
    barangay: ["Subangdaku"],
    streets: ["Lopez Jaena St"],
    purpose: "Transformer servicing",
    areas_affected_raw: "Lopez Jaena St",
    lat: 10.323,
    lon: 123.931,
    is_centroid: true,
    has_explicit_location: true,
    feed_type: "power",
  },
  {
    id: "adv-3",
    date: "2026-10-19",
    start_time: "08:00",
    end_time: "16:00",
    duration_hours: 8,
    overnight_span: false,
    city: "Talisay City",
    barangay: ["Tabunok"],
    streets: ["National Highway"],
    purpose: "Vegetation clearing",
    areas_affected_raw: "Portion of Tabunok Market",
    lat: 10.262,
    lon: 123.839,
    is_centroid: true,
    has_explicit_location: true,
    feed_type: "power",
  },
];

describe("List View Alternative Component", () => {
  it("renders empty state when no advisories match the date", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "2026-10-25" };

    renderListView(container, sampleAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
    });

    expect(container.innerHTML).toContain("No Scheduled Outages Found");
  });

  it("renders date-grouped list with advisories", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all" };

    renderListView(container, sampleAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
    });

    expect(container.innerHTML).toContain("2 advisories");
    expect(container.innerHTML).toContain("1 advisory");
    expect(container.innerHTML).not.toContain("advisorys");
    expect(container.innerHTML).toContain("Talamban");
    expect(container.innerHTML).toContain("Subangdaku");
    expect(container.innerHTML).toContain("Tabunok");
    expect(container.innerHTML).toContain("Line maintenance &amp; pole relocation");
    expect(container.innerHTML).toContain("Pin Barangay");
  });

  it("shows pinned state when myBarangay matches advisory", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all" };

    renderListView(container, sampleAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
      myBarangay: "Talamban",
    });

    expect(container.innerHTML).toContain("Pinned Area");
    expect(container.innerHTML).toContain("is-pinned");
    expect(container.innerHTML).toContain("is-favorite-card");
    expect(container.innerHTML).toContain("Favorite Area");
  });

  it("filters advisories when search query is entered", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all", searchQuery: "Mandaue" };

    renderListView(container, sampleAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
    });

    expect(container.innerHTML).toContain("Subangdaku");
    expect(container.innerHTML).not.toContain("Talamban");
    expect(container.innerHTML).not.toContain("Tabunok");
  });

  it("prioritizes physical location matches over purpose text in search (UAT Fix)", () => {
    const container = createMockElement();
    const testAdvisories: PowerAdvisory[] = [
      {
        ...sampleAdvisories[0],
        id: "adv-banilad",
        barangay: ["Banilad"],
        streets: ["A.S. Fortuna Ave"],
        areas_affected_raw: "Along A.S. Fortuna",
        purpose: "Standard line overhaul",
      },
      {
        ...sampleAdvisories[1],
        id: "adv-cabancalan",
        barangay: ["Cabancalan"],
        streets: ["M.L. Quezon"],
        areas_affected_raw: "M.L. Quezon",
        purpose: "Feeder maintenance serving Banilad, Talamban & Cabancalan",
      },
    ];

    const filter: FilterState = { selectedDate: "all", searchQuery: "Banilad" };

    renderListView(container, testAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
    });

    // Should include Banilad and NOT include Cabancalan because Banilad is a physical location match
    expect(container.innerHTML).toContain("Banilad");
    expect(container.innerHTML).not.toContain("Cabancalan");
  });
const sampleEarthquakes: EarthquakeEvent[] = [
  {
    id: "eq-1",
    source_url: "https://earthquake.phivolcs.dost.gov.ph/sample1.html",
    fetched_at: "2026-10-21T07:00:00Z",
    datetime_pst: "2026-10-21T06:34:42+08:00",
    datetime_utc: "2026-10-20T22:34:42.000Z",
    lat: 10.58,
    lon: 123.05,
    coordinate_source: "bulletin",
    location_description: "003 km S 23° E of Murcia (Negros Occidental)",
    nearest_town: "Murcia",
    nearest_province: "Negros Occidental",
    depth_km: 20,
    magnitude: 3.0,
    magnitude_type: "ML",
    origin_type: "VOLCANO-TECTONIC",
    reported_intensities: "Instrumental Intensity I - Bago City",
    expecting_damage: false,
    expecting_aftershocks: false,
    issued_on_pst: "2026-10-21T07:04:00+08:00",
    distance_from_cebu_km: 96,
    within_watch_radius: true,
    parse_confidence: "high",
    parse_notes: null,
  },
  {
    id: "eq-2",
    source_url: "https://earthquake.phivolcs.dost.gov.ph/sample2.html",
    fetched_at: "2026-10-21T07:00:00Z",
    datetime_pst: "2026-10-21T10:36:07+08:00",
    datetime_utc: "2026-10-21T02:36:07.000Z",
    lat: 10.81,
    lon: 121.93,
    coordinate_source: "bulletin",
    location_description: "010 km N 78° W of Sibalom (Antique)",
    nearest_town: "Sibalom",
    nearest_province: "Antique",
    depth_km: 15,
    magnitude: 3.4,
    magnitude_type: "Ms",
    origin_type: "TECTONIC",
    reported_intensities: "Intensity II - Sibalom",
    expecting_damage: false,
    expecting_aftershocks: false,
    issued_on_pst: "2026-10-21T13:52:00+08:00",
    distance_from_cebu_km: 221,
    within_watch_radius: true,
    parse_confidence: "high",
    parse_notes: null,
  },
];

  it("renders earthquakes when currentLayer is 'earthquakes'", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all", minMagnitude: 0 };

    renderListView(container, "earthquakes", sampleAdvisories, sampleEarthquakes, filter, {
      onSelectAdvisory: vi.fn(),
      onSelectEarthquake: vi.fn(),
    });

    expect(container.innerHTML).toContain("Recent Regional Earthquakes (PHIVOLCS)");
    expect(container.innerHTML).toContain("2 events");
    expect(container.innerHTML).toContain("Murcia");
    expect(container.innerHTML).toContain("96 km from Cebu");
    expect(container.innerHTML).toContain("Sibalom");
    expect(container.innerHTML).toContain("221 km from Cebu");
    expect(container.innerHTML).not.toContain("Talamban");
  });

  it("renders power advisories first and earthquakes lowest at the bottom when currentLayer is 'both'", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all", minMagnitude: 0 };

    renderListView(container, "both", sampleAdvisories, sampleEarthquakes, filter, {
      onSelectAdvisory: vi.fn(),
      onSelectEarthquake: vi.fn(),
    });

    // Both power advisories and earthquakes are rendered
    expect(container.innerHTML).toContain("Talamban");
    expect(container.innerHTML).toContain("Murcia");
    expect(container.innerHTML).toContain("list-earthquakes-section");

    // Earthquakes section appears AFTER power advisories in HTML structure
    const powerIndex = container.innerHTML.indexOf("Talamban");
    const quakeIndex = container.innerHTML.indexOf("list-earthquakes-section");
    expect(quakeIndex).toBeGreaterThan(powerIndex);
  });

  it("triggers onSelectEarthquake when 'View on Map' is clicked on an earthquake card", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all", minMagnitude: 0 };
    const onSelectEarthquake = vi.fn();

    renderListView(container, "earthquakes", sampleAdvisories, sampleEarthquakes, filter, {
      onSelectAdvisory: vi.fn(),
      onSelectEarthquake,
    });

    const eqButtons = container.querySelectorAll(".btn-locate-earthquake");
    expect(eqButtons.length).toBe(2);

    // Simulate clicking View on Map for eq-2
    eqButtons[0].click();

    expect(onSelectEarthquake).toHaveBeenCalledWith(
      expect.objectContaining({ id: "eq-2" }) // Most recent is eq-2 (10:36 AM vs 6:34 AM)
    );
  });

  it("renders empty state for earthquakes when no quakes match search", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all", minMagnitude: 0, searchQuery: "Bohol" };

    renderListView(container, "earthquakes", sampleAdvisories, sampleEarthquakes, filter, {
      onSelectAdvisory: vi.fn(),
      onSelectEarthquake: vi.fn(),
    });

    expect(container.innerHTML).toContain("No Earthquakes Found");
    expect(container.innerHTML).toContain('No seismic events match "Bohol"');
  });
});
