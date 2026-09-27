/**
 * Air Quality and Transboundary Haze Unit Tests (Phase 6).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeAqiCategory,
  parseAirQualityData,
  fetchAirQuality,
  getCachedAirQuality,
  setCachedAirQuality,
} from "../../src/ui/services/airQuality.js";
import { renderAirQualityDrawer } from "../../src/ui/components/airQualityDrawer.js";
import { renderEarthquakeMarkerSvg } from "../../src/ui/map/markerStyles.js";

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
  };
  return elem;
}

describe("Air Quality Service — AQI Categorization & WCAG Contrast", () => {
  it("categorizes 0-50 as Good (#22C55E) with white contrast", () => {
    const res = computeAqiCategory(35);
    expect(res.category).toBe("good");
    expect(res.label).toBe("Good");
    expect(res.hex).toBe("#22C55E");
    expect(res.contrastColor).toBe("#FFFFFF");
  });

  it("categorizes 51-100 as Moderate (#EAB308) with dark text (#0F172A) for WCAG 2.1 AA compliance", () => {
    const res = computeAqiCategory(75);
    expect(res.category).toBe("moderate");
    expect(res.label).toBe("Moderate");
    expect(res.hex).toBe("#EAB308");
    expect(res.contrastColor).toBe("#0F172A"); // Essential fix for WCAG AA contrast on yellow
  });

  it("categorizes 101-150 as Sensitive Groups (#F97316) with white contrast", () => {
    const res = computeAqiCategory(125);
    expect(res.category).toBe("sensitive");
    expect(res.contrastColor).toBe("#FFFFFF");
  });

  it("categorizes 151-200 as Unhealthy (#EF4444)", () => {
    const res = computeAqiCategory(180);
    expect(res.category).toBe("unhealthy");
    expect(res.hex).toBe("#EF4444");
  });

  it("categorizes 201-300 as Acutely Unhealthy (#A855F7) — historical Sept 2026 haze scenario", () => {
    const res = computeAqiCategory(296);
    expect(res.category).toBe("acutely_unhealthy");
    expect(res.label).toBe("Acutely Unhealthy");
    expect(res.hex).toBe("#A855F7");
  });

  it("categorizes >300 as Emergency (#7E22CE)", () => {
    const res = computeAqiCategory(350);
    expect(res.category).toBe("emergency");
    expect(res.hex).toBe("#7E22CE");
  });
});

describe("Air Quality Service — Humanized Status Descriptors & Timestamps", () => {
  it("humanizes Carbon Monoxide and AOD with clear qualitative statuses", () => {
    const payload = {
      current: {
        us_aqi: 65,
        pm2_5: 18.5,
        pm10: 25.0,
        carbon_monoxide: 1117,
        aerosol_optical_depth: 0.22,
        time: "2026-09-22T21:00",
      },
    };
    const res = parseAirQualityData(payload);
    expect(res.carbonMonoxideDesc).toBe("Normal baseline");
    expect(res.aerosolOpticalDepthDesc).toBe("Moderate turbidity");
    expect(res.pm2_5Desc).toBe("Moderate");
    expect(res.pm10Desc).toBe("Good");
    expect(res.observationTimePst).toContain("PST");
  });

  it("detects elevated combustion for CO >= 4000", () => {
    const payload = {
      current: {
        carbon_monoxide: 4500,
        aerosol_optical_depth: 0.45,
      },
    };
    const res = parseAirQualityData(payload);
    expect(res.carbonMonoxideDesc).toBe("Elevated combustion");
    expect(res.aerosolOpticalDepthDesc).toBe("Dense smoke haze");
    expect(res.isWildfireHazeDetected).toBe(true);
  });
});

describe("Air Quality Service — LocalStorage Optimistic Caching", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      clear: () => {
        store = {};
      },
    };
  });

  it("saves and retrieves air quality reading from cache", () => {
    expect(getCachedAirQuality()).toBeNull();

    const sample = parseAirQualityData({ current: { us_aqi: 55 } });
    setCachedAirQuality(sample);

    const cached = getCachedAirQuality();
    expect(cached).not.toBeNull();
    expect(cached?.aqi).toBe(55);
  });
});

describe("Air Quality Drawer — UI Component Rendering", () => {
  it("renders aligned header, close button, gradient gauge needle, and structured haze card", () => {
    const container = createMockElement();
    const sample = parseAirQualityData({
      current: {
        us_aqi: 72,
        pm2_5: 22.0,
        pm10: 30.0,
        carbon_monoxide: 800,
        aerosol_optical_depth: 0.18,
      },
    });

    renderAirQualityDrawer(container, sample, true, () => {});

    expect(container.classList.contains("open")).toBe(true);
    expect(container.innerHTML).toContain("drawer-header");
    expect(container.innerHTML).toContain("drawer-close-btn");
    expect(container.innerHTML).toContain("aqi-gauge-needle");
    expect(container.innerHTML).toContain("haze-context-card");
    expect(container.innerHTML).toContain('data-category="moderate"');
    expect(container.innerHTML).toContain("Normal baseline");
    expect(container.innerHTML).toContain("Clear atmosphere");
  });
});

describe("Air Quality Service — Wildfire Haze Detection & Advisories", () => {
  it("detects wildfire smoke when aerosol optical depth >= 0.35", () => {
    const payload = {
      current: {
        us_aqi: 145,
        pm2_5: 42.5,
        pm10: 60.0,
        carbon_monoxide: 450,
        aerosol_optical_depth: 0.42,
        time: "2026-09-05T08:00",
      },
    };
    const res = parseAirQualityData(payload);
    expect(res.isWildfireHazeDetected).toBe(true);
    expect(res.healthAdvisory.maskRecommendation).toContain("mask");
  });

  it("classifies clean conditions as normal airflow", () => {
    const payload = {
      current: {
        us_aqi: 28,
        pm2_5: 6.5,
        pm10: 12.0,
        carbon_monoxide: 180,
        aerosol_optical_depth: 0.1,
        time: "2026-09-20T12:00",
      },
    };
    const res = parseAirQualityData(payload);
    expect(res.isWildfireHazeDetected).toBe(false);
    expect(res.category).toBe("good");
  });

  it("gracefully falls back when fetch fails without throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network offline"));
    const res = await fetchAirQuality(mockFetch as any);
    expect(res.isFallback).toBe(true);
    expect(res.category).toBe("good");
    expect(res.aqi).toBeGreaterThan(0);
  });
});

describe("Option C Compound Earthquake Marker SVG", () => {
  it("renders SVG with bottom magnitude circle and top curved wedge", () => {
    const svg = renderEarthquakeMarkerSvg({
      magnitude: 3.3,
      locationLabel: "San Fernando",
      isRecentOrSignificant: false,
      hex: "#8B5CF6",
    });

    expect(svg).toContain('class="earthquake-compound-pin "');
    expect(svg).toContain('class="eq-circle"');
    expect(svg).toContain('class="eq-wedge"');
    expect(svg).toContain("3.3");
    expect(svg).toContain("San Fern…");
  });

  it("applies has-pulse class when isRecentOrSignificant is true", () => {
    const svg = renderEarthquakeMarkerSvg({
      magnitude: 6.2,
      locationLabel: "Catmon",
      isRecentOrSignificant: true,
      hex: "#D946EF",
    });

    expect(svg).toContain('class="earthquake-compound-pin has-pulse"');
    expect(svg).toContain("Catmon");
    expect(svg).toContain("6.2");
  });
});
