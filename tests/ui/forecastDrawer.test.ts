/**
 * Unit Tests for Forecast Drawer Component (Phase 6).
 */

import { describe, it, expect, vi } from "vitest";
import { renderForecastDrawer } from "../../src/ui/components/forecastDrawer.js";
import type { ForecastResult } from "../../src/ui/services/forecast.js";
import type { PagasaBulletin } from "../../src/types/index.js";

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
        return child;
      }
      return null;
    }),
  };
  return elem;
}

describe("Forecast Drawer Component — Accessibility and Rendering", () => {
  it("clears content and removes .open class when isOpen is false", () => {
    const container = createMockElement();
    const onClose = vi.fn();

    renderForecastDrawer(container, null, false, onClose);

    expect(container.classList.contains("open")).toBe(false);
    expect(container.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
    expect(container.innerHTML).toBe("");
  });

  it("sets accessible dialog ARIA attributes when open", () => {
    const container = createMockElement();
    const onClose = vi.fn();

    renderForecastDrawer(container, null, true, onClose);

    expect(container.classList.contains("open")).toBe(true);
    expect(container.setAttribute).toHaveBeenCalledWith("role", "dialog");
    expect(container.setAttribute).toHaveBeenCalledWith("aria-modal", "true");
    expect(container.setAttribute).toHaveBeenCalledWith("aria-labelledby", "forecast-drawer-title");
    expect(container.innerHTML).toContain("Fetching today's hourly weather forecast");
  });

  it("renders error card on service failure", () => {
    const container = createMockElement();
    const onClose = vi.fn();
    const errorResult: ForecastResult = {
      status: "error",
      fetchedAt: new Date().toISOString(),
      entries: [],
      error: "Network failure",
    };

    renderForecastDrawer(container, errorResult, true, onClose);

    expect(container.innerHTML).toContain("Forecast Temporarily Unavailable");
    expect(container.innerHTML).toContain("Unable to load atmospheric forecast data");
  });

  it("renders horizontal hour cards with rain probability and wind speed", () => {
    const container = createMockElement();
    const onClose = vi.fn();
    const mockData: ForecastResult = {
      status: "success",
      fetchedAt: new Date().toISOString(),
      entries: [
        {
          time: "2026-09-27T08:00",
          hourLabel: "8 AM",
          hour24: 8,
          isCurrentHour: true,
          precipitationProbability: 35,
          precipitationMm: 0.5,
          cloudCoverPercent: 40,
          windSpeedKmh: 16,
          weatherCode: 2,
          icon: "⛅",
          description: "Partly cloudy",
        },
        {
          time: "2026-09-27T09:00",
          hourLabel: "9 AM",
          hour24: 9,
          isCurrentHour: false,
          precipitationProbability: 80,
          precipitationMm: 3.2,
          cloudCoverPercent: 95,
          windSpeedKmh: 24,
          weatherCode: 63,
          icon: "🌧️",
          description: "Moderate rain",
        },
      ],
    };

    renderForecastDrawer(container, mockData, true, onClose);

    expect(container.innerHTML).toContain("forecast-hours-scroll");
    expect(container.innerHTML).toContain("8 AM");
    expect(container.innerHTML).toContain("9 AM");
    expect(container.innerHTML).toContain("35%");
    expect(container.innerHTML).toContain("80%");
    expect(container.innerHTML).toContain("16<small>km/h</small>");
    expect(container.innerHTML).toContain("24<small>km/h</small>");
    expect(container.innerHTML).toContain("current-hour-pill");
    expect(container.innerHTML).toContain("NOW");
  });

  it("renders PAGASA normal civic status banner when no severe weather alerts active", () => {
    const container = createMockElement();
    const mockBulletin: PagasaBulletin = {
      id: "pagasa-norm",
      source_url: "https://pagasa.dost.gov.ph",
      fetched_at: "2026-10-14T04:00:00Z",
      issued_at_pst: "12:00 PM, 14 October 2026",
      cyclone_name: null,
      has_active_cyclone: false,
      tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
      heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
      storm_center: null,
      parse_confidence: "high",
      parse_notes: null,
    };

    renderForecastDrawer(container, null, true, () => {}, mockBulletin);

    expect(container.innerHTML).toContain("PAGASA Civic Status: Normal");
    expect(container.innerHTML).toContain("No active Tropical Cyclone Wind Signals");
    expect(container.innerHTML).toContain("Oct 14, 2026 · 12:00 PM PHT");
  });

  it("renders PAGASA active cyclone monitored card when storm is in PAR but no signal is hoisted for Cebu", () => {
    const container = createMockElement();
    const mockBulletin: PagasaBulletin = {
      id: "pagasa-rosal",
      source_url: "https://pagasa.dost.gov.ph",
      fetched_at: "2026-10-20T08:00:00Z",
      issued_at_pst: "11:00 AM, 20 October 2026",
      cyclone_name: "ROSAL",
      has_active_cyclone: true,
      tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
      heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
      storm_center: {
        lat: 16.5,
        lon: 132.0,
        movement: "West Northwest at 15 km/h",
        max_sustained_winds_kmh: 185,
      },
      parse_confidence: "high",
      parse_notes: null,
    };

    renderForecastDrawer(container, null, true, () => {}, mockBulletin);

    expect(container.innerHTML).toContain("Active Cyclone Monitored: ROSAL");
    expect(container.innerHTML).toContain("Active inside the Philippine Area of Responsibility (PAR)");
    expect(container.innerHTML).toContain("No TCWS signals currently hoisted for Cebu Province");
    expect(container.innerHTML).toContain("16.5°N, 132.0°E");
    expect(container.innerHTML).toContain("West Northwest at 15 km/h");
    expect(container.innerHTML).toContain("Max Winds: 185 km/h");
  });

  it("renders PAGASA TCWS Signal card with storm details when active for Cebu", () => {
    const container = createMockElement();
    const mockBulletin: PagasaBulletin = {
      id: "pagasa-storm",
      source_url: "https://pagasa.dost.gov.ph",
      fetched_at: "2026-10-14T04:00:00Z",
      issued_at_pst: "11:00 AM, 14 October 2026",
      cyclone_name: "KRISTINE",
      has_active_cyclone: true,
      tcws_cebu: {
        active: true,
        signal_level: 2,
        wind_speed_kmh: "62–88 km/h",
        areas_affected: ["Northern Cebu", "Camotes Islands", "Bantayan Islands"],
      },
      heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
      storm_center: {
        lat: 10.8,
        lon: 124.5,
        movement: "West Northwest at 15 km/h",
        max_sustained_winds_kmh: 85,
      },
      parse_confidence: "high",
      parse_notes: null,
    };

    renderForecastDrawer(container, null, true, () => {}, mockBulletin);

    expect(container.innerHTML).toContain("SIGNAL #2");
    expect(container.innerHTML).toContain("Tropical Cyclone \"KRISTINE\"");
    expect(container.innerHTML).toContain("Expected Winds: 62–88 km/h");
    expect(container.innerHTML).toContain("Northern Cebu");
    expect(container.innerHTML).toContain("Camotes Islands");
    expect(container.innerHTML).toContain("10.8°N, 124.5°E");
    expect(container.innerHTML).toContain("Max Winds: 85 km/h");
    expect(container.innerHTML).toContain("Sea travel is hazardous");
  });

  it("renders PAGASA Heavy Rainfall alert card when alert level is orange or red", () => {
    const container = createMockElement();
    const mockBulletin: PagasaBulletin = {
      id: "pagasa-rain",
      source_url: "https://pagasa.dost.gov.ph",
      fetched_at: "2026-10-14T04:00:00Z",
      issued_at_pst: "11:00 AM, 14 October 2026",
      cyclone_name: null,
      has_active_cyclone: false,
      tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
      heavy_rainfall_alert: {
        level: "orange",
        warning_type: "Intense Rainfall & Flood Threat",
        description: "Flooding is threatening in low-lying areas and landslides along mountain slopes.",
        advisory_areas: ["Metro Cebu", "Talisay City", "Naga City"],
      },
      storm_center: null,
      parse_confidence: "high",
      parse_notes: null,
    };

    renderForecastDrawer(container, null, true, () => {}, mockBulletin);

    expect(container.innerHTML).toContain("ORANGE WARNING");
    expect(container.innerHTML).toContain("Intense Rainfall &amp; Flood Threat");
    expect(container.innerHTML).toContain("Flooding is threatening in low-lying areas");
    expect(container.innerHTML).toContain("Metro Cebu");
    expect(container.innerHTML).toContain("Talisay City");
  });
});
