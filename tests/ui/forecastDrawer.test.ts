/**
 * Unit Tests for Forecast Drawer Component (Phase 6).
 */

import { describe, it, expect, vi } from "vitest";
import { renderForecastDrawer } from "../../src/ui/components/forecastDrawer.js";
import type { ForecastResult } from "../../src/ui/services/forecast.js";

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
});
