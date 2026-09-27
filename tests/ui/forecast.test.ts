/**
 * Unit Tests for Weather Forecast Service (Phase 6).
 */

import { describe, it, expect, vi } from "vitest";
import {
  fetchForecast,
  getWeatherCodeInfo,
  formatHourLabel,
} from "../../src/ui/services/forecast.js";

describe("Weather Forecast Service — WMO Code Mapping", () => {
  it("maps WMO code 0 to Clear sky with sun icon", () => {
    const res = getWeatherCodeInfo(0);
    expect(res.icon).toBe("☀️");
    expect(res.description).toBe("Clear sky");
  });

  it("maps WMO code 2 to Partly cloudy", () => {
    const res = getWeatherCodeInfo(2);
    expect(res.icon).toBe("⛅");
    expect(res.description).toBe("Partly cloudy");
  });

  it("maps WMO rain codes (61, 63, 65, 80) to rain icons", () => {
    expect(getWeatherCodeInfo(61).icon).toBe("🌧️");
    expect(getWeatherCodeInfo(63).icon).toBe("🌧️");
    expect(getWeatherCodeInfo(65).icon).toBe("🌧️");
    expect(getWeatherCodeInfo(80).icon).toBe("🌧️");
  });

  it("maps WMO thunderstorm codes (95, 96, 99) to storm icons", () => {
    expect(getWeatherCodeInfo(95).icon).toBe("⛈️");
    expect(getWeatherCodeInfo(96).icon).toBe("⛈️");
    expect(getWeatherCodeInfo(99).icon).toBe("⛈️");
  });

  it("provides fallback for unknown codes", () => {
    const res = getWeatherCodeInfo(999);
    expect(res.icon).toBe("🌤️");
    expect(res.description).toBe("Fair");
  });
});

describe("Weather Forecast Service — formatHourLabel", () => {
  it("formats 24h ISO times into 12h labels with AM/PM", () => {
    expect(formatHourLabel("2026-09-27T00:00")).toBe("12 AM");
    expect(formatHourLabel("2026-09-27T09:00")).toBe("9 AM");
    expect(formatHourLabel("2026-09-27T12:00")).toBe("12 PM");
    expect(formatHourLabel("2026-09-27T15:00")).toBe("3 PM");
    expect(formatHourLabel("2026-09-27T23:00")).toBe("11 PM");
  });

  it("returns original string on invalid date", () => {
    expect(formatHourLabel("not-a-date")).toBe("not-a-date");
  });
});

describe("Weather Forecast Service — fetchForecast", () => {
  it("queries Open-Meteo with forecast_days=1 and parses 24 hours", async () => {
    let capturedUrl = "";
    const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => ({
          hourly: {
            time: [
              "2026-09-27T00:00",
              "2026-09-27T01:00",
              "2026-09-27T02:00",
              "2026-09-27T03:00",
            ],
            precipitation_probability: [10, 25, 60, 0],
            precipitation: [0, 0.4, 2.1, 0],
            cloud_cover: [20, 50, 90, 10],
            wind_speed_10m: [12, 14, 22, 9],
            weather_code: [1, 2, 61, 0],
          },
        }),
      };
    });

    const result = await fetchForecast(mockFetcher as any);

    expect(capturedUrl).toContain("forecast_days=1");
    expect(capturedUrl).toContain("latitude=10.3157");
    expect(capturedUrl).toContain("longitude=123.8854");
    expect(capturedUrl).toContain("timezone=Asia%2FManila");

    expect(result.status).toBe("success");
    expect(result.entries).toHaveLength(4);
    expect(result.entries[2].precipitationProbability).toBe(60);
    expect(result.entries[2].precipitationMm).toBe(2.1);
    expect(result.entries[2].windSpeedKmh).toBe(22);
    expect(result.entries[2].icon).toBe("🌧️");
    expect(result.entries[2].hourLabel).toBe("2 AM");
  });

  it("returns resilient error result on HTTP error", async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const result = await fetchForecast(mockFetcher as any);
    expect(result.status).toBe("error");
    expect(result.entries).toHaveLength(0);
    expect(result.error).toContain("HTTP 503");
  });

  it("returns resilient error result on network failure", async () => {
    const mockFetcher = vi.fn().mockRejectedValue(new Error("Network connection dropped"));

    const result = await fetchForecast(mockFetcher as any);
    expect(result.status).toBe("error");
    expect(result.entries).toHaveLength(0);
    expect(result.error).toBe("Network connection dropped");
  });

  it("returns resilient error result on malformed JSON payload", async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invalid: {} }),
    });

    const result = await fetchForecast(mockFetcher as any);
    expect(result.status).toBe("error");
    expect(result.entries).toHaveLength(0);
  });
});
