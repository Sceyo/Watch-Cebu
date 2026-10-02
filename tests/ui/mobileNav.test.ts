/**
 * Unit Tests for Mobile Navigation, Bottom Sheet, Map Controls, and Status Popover.
 */

import { describe, it, expect, vi } from "vitest";
import {
  renderMobileBottomBar,
  renderStatusPopover,
  renderMobileBottomSheet,
} from "../../src/ui/components/mobileNav.js";
import { renderMapControls } from "../../src/ui/components/mapControls.js";
import type { SelectedLocationDetails, FeedState } from "../../src/ui/types.js";
import type { PowerAdvisory, EarthquakeEvent } from "../../src/types/index.js";

function createMockElement(): any {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const attrs: Record<string, string> = {};
  const classListSet = new Set<string>();
  let innerHTMLValue = "";

  const elem: any = {
    className: "",
    classList: {
      add: (cls: string) => classListSet.add(cls),
      remove: (cls: string) => classListSet.delete(cls),
      contains: (cls: string) => classListSet.has(cls),
    },
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
    querySelector: vi.fn((sel: string) => {
      if (innerHTMLValue.includes(sel.replace(/^[#.]/, ""))) {
        return createMockElement();
      }
      return null;
    }),
    querySelectorAll: vi.fn((_sel: string) => {
      return [];
    }),
  };
  return elem;
}

describe("Mobile Navigation & Bottom Bar Component (C2)", () => {
  it("renders 4 action buttons (Forecast, Air, Legend, About) with accessible labels", () => {
    const container = createMockElement();
    const callbacks = {
      onForecastToggle: vi.fn(),
      onAirQualityToggle: vi.fn(),
      onLegendToggle: vi.fn(),
      onAboutToggle: vi.fn(),
    };

    renderMobileBottomBar(
      container,
      {
        isForecastOpen: false,
        isAirOpen: false,
        isLegendOpen: false,
        isAboutOpen: false,
      },
      callbacks
    );

    expect(container.innerHTML).toContain('id="btn-bottom-forecast"');
    expect(container.innerHTML).toContain('id="btn-bottom-air"');
    expect(container.innerHTML).toContain('id="btn-bottom-legend"');
    expect(container.innerHTML).toContain('id="btn-bottom-about"');
  });
});

describe("Mobile Bottom Sheet (C1 & H1)", () => {
  it("clears and marks closed when details is null", () => {
    const container = createMockElement();
    renderMobileBottomSheet(container, null, () => {});

    expect(container.classList.contains("closed")).toBe(true);
    expect(container.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
  });

  it("renders multi-advisory list for stacked pins sharing identical coordinates", () => {
    const container = createMockElement();
    const multiAdvisories: PowerAdvisory[] = [
      {
        id: "adv-1",
        date: "2026-09-08",
        start_time: "08:00",
        end_time: "12:00",
        city: "Cebu City",
        barangay: ["Basak San Nicolas"],
        streets: ["C. Padilla St."],
        areas_affected_raw: "Along C. Padilla St.",
        purpose: "Pole replacement",
        lat: 10.295,
        lon: 123.875,
        coordinate_source: "osm_point",
        geocoded_at: "2026-09-06T00:00:00Z",
        source_url: "https://veco.com.ph/1",
        fetched_at: "2026-09-06T00:00:00Z",
        overnight_span: false,
        is_emergency: false,
        business_confidence: "scheduled",
        parse_confidence: "high",
      },
      {
        id: "adv-2",
        date: "2026-09-08",
        start_time: "13:00",
        end_time: "17:00",
        city: "Cebu City",
        barangay: ["Basak San Nicolas"],
        streets: ["Mambaling Road"],
        areas_affected_raw: "Along Mambaling Road",
        purpose: "Transformer upgrade",
        lat: 10.295,
        lon: 123.875,
        coordinate_source: "osm_point",
        geocoded_at: "2026-09-06T00:00:00Z",
        source_url: "https://veco.com.ph/2",
        fetched_at: "2026-09-06T00:00:00Z",
        overnight_span: false,
        is_emergency: false,
        business_confidence: "scheduled",
        parse_confidence: "high",
      },
    ];

    const details: SelectedLocationDetails = {
      type: "power",
      advisories: multiAdvisories,
    };

    renderMobileBottomSheet(container, details, () => {});

    expect(container.classList.contains("open")).toBe(true);
    expect(container.innerHTML).toContain("Basak San Nicolas");
    expect(container.innerHTML).toContain("2 Advisories");
    expect(container.innerHTML).toContain("Advisory 1 of 2");
    expect(container.innerHTML).toContain("Advisory 2 of 2");
    expect(container.innerHTML).toContain("Pole replacement");
    expect(container.innerHTML).toContain("Transformer upgrade");
  });

  it("renders earthquake details with intensities and phivolcs link", () => {
    const container = createMockElement();
    const mockEq: EarthquakeEvent = {
      id: "eq-101",
      datetime_pst: "2026-09-28T14:30:00+08:00",
      lat: 10.5,
      lon: 124.0,
      depth_km: 15,
      magnitude: 4.8,
      magnitude_type: "ML",
      origin_type: "Tectonic",
      location_description: "012 km N 45° E of Catmon (Cebu)",
      nearest_town: "Catmon",
      nearest_province: "Cebu",
      distance_from_cebu_km: 55,
      within_watch_radius: true,
      reported_intensities: "Intensity IV - Catmon, Cebu",
      expecting_damage: false,
      expecting_aftershocks: true,
      source_url: "https://phivolcs.gov.ph/eq/101",
      bulletin_number: 1,
      fetched_at: "2026-09-28T14:35:00Z",
    };

    renderMobileBottomSheet(container, { type: "earthquake", event: mockEq }, () => {});

    expect(container.classList.contains("open")).toBe(true);
    expect(container.innerHTML).toContain("Catmon");
    expect(container.innerHTML).toContain("M4.8");
    expect(container.innerHTML).toContain("Intensity IV");
    expect(container.innerHTML).toContain("Verify Official PHIVOLCS Bulletin");
  });
});

describe("Map Controls Component (H5 & C2)", () => {
  it("renders search input, locate me button, and mobile layer toggle", () => {
    const container = createMockElement();
    const callbacks = {
      onSearchChange: vi.fn(),
      onLocateUser: vi.fn(),
      onLayerChange: vi.fn(),
      onToast: vi.fn(),
    };

    renderMapControls(container, "both", callbacks);

    expect(container.innerHTML).toContain('id="map-search-input"');
    expect(container.innerHTML).toContain('id="btn-locate-me"');
    expect(container.innerHTML).toContain("mobile-layer-segmented-bar");
  });
});

describe("Status Popover Component (C2)", () => {
  it("renders feed statuses for VECO, PHIVOLCS, and Air Quality", () => {
    const container = createMockElement();
    const mockPower: FeedState<PowerAdvisory[]> = { status: "success", data: [] };
    const mockEq: FeedState<EarthquakeEvent[]> = { status: "success", data: [] };

    renderStatusPopover(container, true, mockPower, mockEq, null, () => {});

    expect(container.classList.contains("open")).toBe(true);
    expect(container.innerHTML).toContain("System Feeds Status");
    expect(container.innerHTML).toContain("VECO Power Advisories");
    expect(container.innerHTML).toContain("PHIVOLCS Seismic Activity");
    expect(container.innerHTML).toContain("Air Quality &amp; Haze");
  });
});
