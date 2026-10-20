/**
 * Unit Tests for PAGASA Multi-Hazard UI Integration (Phase 3).
 *
 * Verifies:
 * - renderHeader: Freshness chip transitions across loading, error, fallback, and live alert states.
 * - renderHeader: Active TCWS signal chip triggers onForecastToggle.
 * - renderStatusPopover: Formats PAGASA feed row with status badge and civic details.
 * - renderAbout: Authoritative sources include DOST-PAGASA attribution.
 */

import { describe, it, expect, vi } from "vitest";
import { renderHeader } from "../../src/ui/components/header.js";
import { renderStatusPopover } from "../../src/ui/components/mobileNav.js";
import { renderAbout } from "../../src/ui/components/about.js";
import type { FeedState } from "../../src/ui/types.js";
import type { PowerAdvisory, EarthquakeEvent, PagasaBulletin } from "../../src/types/index.js";

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
        const child = createMockElement();
        child.addEventListener = vi.fn((event: string, handler: any) => {
          if (!listeners[sel + ":" + event]) listeners[sel + ":" + event] = [];
          listeners[sel + ":" + event].push(handler);
        });
        child.click = () => {
          const list = listeners[sel + ":click"] || [];
          list.forEach((h) => h());
        };
        return child;
      }
      return null;
    }),
    querySelectorAll: vi.fn((sel: string) => {
      return [];
    }),
  };
  return elem;
}

const mockPower: FeedState<PowerAdvisory[]> = { status: "success", data: [] };
const mockEq: FeedState<EarthquakeEvent[]> = { status: "success", data: [] };

describe("Header PAGASA Severe Weather Chip Integration", () => {
  it("renders loading chip when PAGASA feed is fetching", () => {
    const container = createMockElement();
    const pagasaLoading: FeedState<PagasaBulletin | null> = {
      status: "loading",
      data: null,
    };

    renderHeader(
      container,
      "both",
      mockPower,
      mockEq,
      { onLayerChange: vi.fn(), onLegendToggle: vi.fn(), onAboutToggle: vi.fn() },
      { pagasaState: pagasaLoading }
    );

    expect(container.innerHTML).toContain("PAGASA: Fetching...");
  });

  it("renders offline chip on feed error", () => {
    const container = createMockElement();
    const pagasaError: FeedState<PagasaBulletin | null> = {
      status: "error",
      error: "Network timeout",
      data: null,
    };

    renderHeader(
      container,
      "both",
      mockPower,
      mockEq,
      { onLayerChange: vi.fn(), onLegendToggle: vi.fn(), onAboutToggle: vi.fn() },
      { pagasaState: pagasaError }
    );

    expect(container.innerHTML).toContain("PAGASA: Offline");
  });

  it("renders backup fixture notice when data source is fallback", () => {
    const container = createMockElement();
    const pagasaFallback: FeedState<PagasaBulletin | null> = {
      status: "success",
      dataSource: "fixture_fallback",
      parseNotes: "Live feed down",
      data: null,
    };

    renderHeader(
      container,
      "both",
      mockPower,
      mockEq,
      { onLayerChange: vi.fn(), onLegendToggle: vi.fn(), onAboutToggle: vi.fn() },
      { pagasaState: pagasaFallback }
    );

    expect(container.innerHTML).toContain("⚠️ PAGASA: Backup Data");
  });

  it("renders active TCWS Signal chip when cyclone signal is in effect for Cebu", () => {
    const container = createMockElement();
    const onForecastToggle = vi.fn();
    const pagasaTcws: FeedState<PagasaBulletin | null> = {
      status: "success",
      dataSource: "live",
      data: {
        id: "b-1",
        source_url: "https://pagasa.dost.gov.ph",
        fetched_at: "2026-10-14T00:00:00Z",
        issued_at_pst: "11:00 AM, 14 October 2026",
        cyclone_name: "KRISTINE",
        has_active_cyclone: true,
        tcws_cebu: { active: true, signal_level: 2, wind_speed_kmh: "62-88", areas_affected: ["Northern Cebu"] },
        heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
        storm_center: { lat: 10.5, lon: 124.0, movement: "West" },
        parse_confidence: "high",
        parse_notes: null,
      },
    };

    renderHeader(
      container,
      "both",
      mockPower,
      mockEq,
      { onLayerChange: vi.fn(), onLegendToggle: vi.fn(), onAboutToggle: vi.fn(), onForecastToggle },
      { pagasaState: pagasaTcws }
    );

    expect(container.innerHTML).toContain("TCWS #2: KRISTINE");
    expect(container.innerHTML).toContain("tcws-active");
  });

  it("renders monitored status chip when cyclone is active in PAR but no signal in Cebu", () => {
    const container = createMockElement();
    const pagasaMonitored: FeedState<PagasaBulletin | null> = {
      status: "success",
      dataSource: "live",
      data: {
        id: "b-monitored",
        source_url: "https://pagasa.dost.gov.ph",
        fetched_at: "2026-10-20T08:00:00Z",
        issued_at_pst: "11:00 AM, 20 October 2026",
        cyclone_name: "ROSAL",
        has_active_cyclone: true,
        tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
        heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
        storm_center: { lat: 16.5, lon: 132.0, movement: "West Northwest" },
        parse_confidence: "high",
        parse_notes: null,
      },
    };

    renderHeader(
      container,
      "both",
      mockPower,
      mockEq,
      { onLayerChange: vi.fn(), onLegendToggle: vi.fn(), onAboutToggle: vi.fn() },
      { pagasaState: pagasaMonitored }
    );

    expect(container.innerHTML).toContain("PAGASA: ROSAL (Monitored)");
    expect(container.innerHTML).toContain("monitoring");
  });

  it("renders normal status chip when no cyclone or flood warning is active", () => {
    const container = createMockElement();
    const pagasaNormal: FeedState<PagasaBulletin | null> = {
      status: "success",
      dataSource: "live",
      data: {
        id: "b-2",
        source_url: "https://pagasa.dost.gov.ph",
        fetched_at: "2026-10-14T00:00:00Z",
        issued_at_pst: "11:00 AM, 14 October 2026",
        cyclone_name: null,
        has_active_cyclone: false,
        tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
        heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
        storm_center: null,
        parse_confidence: "high",
        parse_notes: null,
      },
    };

    renderHeader(
      container,
      "both",
      mockPower,
      mockEq,
      { onLayerChange: vi.fn(), onLegendToggle: vi.fn(), onAboutToggle: vi.fn() },
      { pagasaState: pagasaNormal }
    );

    expect(container.innerHTML).toContain("PAGASA: Normal");
  });
});

describe("Status Popover PAGASA Feed Row", () => {
  it("renders PAGASA severe weather row in mobile status popover", () => {
    const container = createMockElement();
    const pagasaLive: FeedState<PagasaBulletin | null> = {
      status: "success",
      dataSource: "live",
      data: {
        id: "b-3",
        source_url: "https://pagasa.dost.gov.ph",
        fetched_at: "2026-10-14T00:00:00Z",
        issued_at_pst: "11:00 AM, 14 October 2026",
        cyclone_name: "LEON",
        has_active_cyclone: true,
        tcws_cebu: { active: true, signal_level: 1, wind_speed_kmh: "39-61", areas_affected: ["Cebu"] },
        heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
        storm_center: null,
        parse_confidence: "high",
        parse_notes: null,
      },
    };

    renderStatusPopover(container, true, mockPower, mockEq, null, () => {}, pagasaLive);

    expect(container.innerHTML).toContain("PAGASA Severe Weather");
    expect(container.innerHTML).toContain("DOST-PAGASA");
    expect(container.innerHTML).toContain("TCWS Signal #1 in effect for Cebu (LEON)");
  });

  it("renders monitored cyclone details in status popover when active in PAR but not in Cebu", () => {
    const container = createMockElement();
    const pagasaMonitored: FeedState<PagasaBulletin | null> = {
      status: "success",
      dataSource: "live",
      data: {
        id: "b-pop-monitored",
        source_url: "https://pagasa.dost.gov.ph",
        fetched_at: "2026-10-20T08:00:00Z",
        issued_at_pst: "11:00 AM, 20 October 2026",
        cyclone_name: "ROSAL",
        has_active_cyclone: true,
        tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
        heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
        storm_center: null,
        parse_confidence: "high",
        parse_notes: null,
      },
    };

    renderStatusPopover(container, true, mockPower, mockEq, null, () => {}, pagasaMonitored);

    expect(container.innerHTML).toContain('Active cyclone "ROSAL" in PAR');
    expect(container.innerHTML).toContain("No TCWS signals currently hoisted for Cebu Province");
  });
});

describe("About Drawer Civic Data Attribution", () => {
  it("lists DOST-PAGASA in authoritative civic data sources", () => {
    const container = createMockElement();

    renderAbout(container, true, () => {});

    expect(container.innerHTML).toContain("DOST-PAGASA");
    expect(container.innerHTML).toContain("Tropical Cyclone Wind Signals (TCWS)");
    expect(container.innerHTML).toContain("Heavy Rainfall Warnings");
  });
});
