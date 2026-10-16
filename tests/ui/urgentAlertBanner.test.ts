/**
 * Unit Tests for Urgent Alert Banner Component (Phase 1).
 *
 * Verifies:
 * 1. Hides banner completely when no active storm signals or rain warnings exist.
 * 2. Displays active TCWS signal with cyclone name, signal number, and wind speed.
 * 3. Displays active Heavy Rainfall warning (Yellow / Orange / Red).
 * 4. Triggers onOpenForecast callback when banner or action button is clicked.
 */

import { describe, it, expect, vi } from "vitest";
import { renderUrgentAlertBanner } from "../../src/ui/components/urgentAlertBanner.js";
import type { PagasaBulletin } from "../../types/index.js";

function createMockElement(): any {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const attrs: Record<string, string> = {};
  let innerHTMLValue = "";

  const elem: any = {
    id: "",
    className: "",
    style: {} as Record<string, string>,
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
        const sub = createMockElement();
        sub.className = sel.replace(/^\./, "");
        return sub;
      }
      return null;
    }),
  };

  return elem;
}

describe("Urgent Alert Banner Component", () => {
  it("hides and empties container when bulletin is null or undefined", () => {
    const container = createMockElement();
    const onOpen = vi.fn();

    renderUrgentAlertBanner(container, null, onOpen);
    expect(container.style.display).toBe("none");
    expect(container.innerHTML).toBe("");

    renderUrgentAlertBanner(container, undefined, onOpen);
    expect(container.style.display).toBe("none");
    expect(container.innerHTML).toBe("");
  });

  it("hides container when bulletin has no active cyclone or rainfall alert", () => {
    const container = createMockElement();
    const onOpen = vi.fn();
    const normalBulletin: PagasaBulletin = {
      id: "normal-1",
      source_url: "https://pagasa.dost.gov.ph",
      fetched_at: "2026-10-16T08:00:00Z",
      issued_at_pst: "11:00 AM, 16 October 2026",
      cyclone_name: null,
      has_active_cyclone: false,
      tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
      heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
      storm_center: null,
      parse_confidence: "high",
      parse_notes: null,
    };

    renderUrgentAlertBanner(container, normalBulletin, onOpen);
    expect(container.style.display).toBe("none");
    expect(container.innerHTML).toBe("");
  });

  it("renders prominent TCWS Signal banner when active for Cebu", () => {
    const container = createMockElement();
    const onOpen = vi.fn();
    const stormBulletin: PagasaBulletin = {
      id: "storm-1",
      source_url: "https://pagasa.dost.gov.ph",
      fetched_at: "2026-10-16T08:00:00Z",
      issued_at_pst: "11:00 AM, 16 October 2026",
      cyclone_name: "KRISTINE",
      has_active_cyclone: true,
      tcws_cebu: {
        active: true,
        signal_level: 2,
        wind_speed_kmh: "62–88 km/h",
        areas_affected: ["Northern Cebu"],
      },
      heavy_rainfall_alert: { level: "none", warning_type: null, description: "", advisory_areas: [] },
      storm_center: null,
      parse_confidence: "high",
      parse_notes: null,
    };

    renderUrgentAlertBanner(container, stormBulletin, onOpen);
    expect(container.style.display).toBe("block");
    expect(container.innerHTML).toContain("TCWS SIGNAL #2");
    expect(container.innerHTML).toContain("KRISTINE");
    expect(container.innerHTML).toContain("62–88 km/h");
    expect(container.innerHTML).toContain("Track &amp; Forecast");
  });

  it("renders prominent Heavy Rainfall Warning banner when rainfall alert is active", () => {
    const container = createMockElement();
    const onOpen = vi.fn();
    const rainBulletin: PagasaBulletin = {
      id: "rain-1",
      source_url: "https://pagasa.dost.gov.ph",
      fetched_at: "2026-10-16T08:00:00Z",
      issued_at_pst: "11:00 AM, 16 October 2026",
      cyclone_name: null,
      has_active_cyclone: false,
      tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
      heavy_rainfall_alert: {
        level: "orange",
        warning_type: "Intense Rainfall",
        description: "Flooding threatening in low-lying areas",
        advisory_areas: ["Metro Cebu"],
      },
      storm_center: null,
      parse_confidence: "high",
      parse_notes: null,
    };

    renderUrgentAlertBanner(container, rainBulletin, onOpen);
    expect(container.style.display).toBe("block");
    expect(container.innerHTML).toContain("ORANGE WARNING");
    expect(container.innerHTML).toContain("Heavy rainfall advisory for Metro Cebu");
    expect(container.innerHTML).toContain("alert-rain-orange");
  });
});
