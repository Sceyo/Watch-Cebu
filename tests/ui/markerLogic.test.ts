/**
 * UI Marker Styling and Classification Logic Tests (Stage 3).
 *
 * Verifies:
 * 1. Power Status Calculation:
 *    - Active now: Red (#EF4444)
 *    - Upcoming (< 2h): Amber (#F59E0B)
 *    - Later today: Blue (#3B82F6)
 *    - Restored / concluded: Green (#22C55E)
 * 2. Earthquake Severity Calculation:
 *    - < 3.0: #A78BFA (radius 8, no shockwave)
 *    - 3.0–4.9: #8B5CF6 (radius 12, no shockwave)
 *    - 5.0–5.9: #7C3AED (radius 16, no shockwave)
 *    - >= 6.0: #D946EF (radius 22, has shockwave)
 * 3. Day tab distribution calculation matches actual resolved fixture output (51 total: 4/2/8/16/9/6/6).
 */

import { describe, it, expect } from "vitest";
import { computePowerStatus, computeEarthquakeSeverity, cleanTownName } from "../../src/ui/map/markerStyles.js";
import { calculateDayDistribution } from "../../src/ui/components/dayTabs.js";
import {
  formatPhilippineDateTime,
  formatReadableDate,
  formatPhilippineTimeRange,
  normalizeStreetList,
} from "../../src/utils/index.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { PowerAdvisory } from "../../src/types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const SAMPLE_POWER_PATH = join(ROOT_DIR, "data", "sample_power_advisories.json");

describe("computePowerStatus", () => {
  it("classifies active outage now with #EF4444", () => {
    // Window: 08:00 - 18:00 on 2026-09-06
    // Reference now: 2026-09-06 10:00 PST (which is 02:00 UTC)
    const now = new Date("2026-09-06T02:00:00.000Z");
    const status = computePowerStatus("2026-09-06", "08:00", "18:00", now);
    expect(status.category).toBe("active");
    expect(status.hex).toBe("#EF4444");
  });

  it("classifies upcoming outage within 2 hours with #F59E0B", () => {
    // Window starts at 08:00 PST (00:00 UTC). Reference now: 07:00 PST (23:00 UTC previous day -> 1 hour away)
    const now = new Date("2026-09-05T23:00:00.000Z");
    const status = computePowerStatus("2026-09-06", "08:00", "18:00", now);
    expect(status.category).toBe("upcoming");
    expect(status.hex).toBe("#F59E0B");
  });

  it("classifies outage later today or future with #3B82F6", () => {
    // Reference now is 4 hours before start
    const now = new Date("2026-09-05T20:00:00.000Z");
    const status = computePowerStatus("2026-09-06", "08:00", "18:00", now);
    expect(status.category).toBe("later");
    expect(status.hex).toBe("#3B82F6");
  });

  it("classifies concluded outage with #22C55E", () => {
    // Window ended at 18:00 PST (10:00 UTC). Reference now is 20:00 PST (12:00 UTC)
    const now = new Date("2026-09-06T12:00:00.000Z");
    const status = computePowerStatus("2026-09-06", "08:00", "18:00", now);
    expect(status.category).toBe("restored");
    expect(status.hex).toBe("#22C55E");
  });
});

describe("computeEarthquakeSeverity", () => {
  it("classifies < 3.0 as minor with #A78BFA and radius 8", () => {
    const s = computeEarthquakeSeverity(2.2);
    expect(s.tier).toBe("minor");
    expect(s.hex).toBe("#A78BFA");
    expect(s.radius).toBe(8);
    expect(s.hasShockwave).toBe(false);
  });

  it("classifies 3.0 to 4.9 as light with #8B5CF6 and radius 12", () => {
    const s = computeEarthquakeSeverity(4.2);
    expect(s.tier).toBe("light");
    expect(s.hex).toBe("#8B5CF6");
    expect(s.radius).toBe(12);
    expect(s.hasShockwave).toBe(false);
  });

  it("classifies 5.0 to 5.9 as moderate with #7C3AED and radius 16", () => {
    const s = computeEarthquakeSeverity(5.4);
    expect(s.tier).toBe("moderate");
    expect(s.hex).toBe("#7C3AED");
    expect(s.radius).toBe(16);
    expect(s.hasShockwave).toBe(false);
  });

  it("classifies >= 6.0 as strong with #D946EF, radius 22, and pulsing shockwave ring", () => {
    const s = computeEarthquakeSeverity(6.7);
    expect(s.tier).toBe("strong");
    expect(s.hex).toBe("#D946EF");
    expect(s.radius).toBe(22);
    expect(s.hasShockwave).toBe(true);
  });
});

describe("Day Tabs Distribution", () => {
  it("matches real resolved fixture counts summing to exactly 51 records", () => {
    const raw = readFileSync(SAMPLE_POWER_PATH, "utf-8");
    const advisories: PowerAdvisory[] = JSON.parse(raw);
    expect(advisories.length).toBe(51);

    const dist = calculateDayDistribution(advisories);
    expect(dist["2026-09-06"]).toBe(4);
    expect(dist["2026-09-07"]).toBe(2);
    expect(dist["2026-09-08"]).toBe(8);
    expect(dist["2026-09-09"]).toBe(16);
    expect(dist["2026-09-10"]).toBe(9);
    expect(dist["2026-09-11"]).toBe(6);
    expect(dist["2026-09-12"]).toBe(6);

    const total = Object.values(dist).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(51);
  });
});

describe("formatPhilippineDateTime", () => {
  it("formats ISO timestamp to Philippine Standard Time format", () => {
    // 2026-09-05T23:15:20+08:00 (15:15:20 UTC)
    const result = formatPhilippineDateTime("2026-09-05T23:15:20+08:00", new Date("2026-09-20T00:00:00.000Z"));
    expect(result.date).toBe("Sep 5, 2026");
    expect(result.time).toBe("11:15 PM PHT");
    expect(result.full).toContain("Sep 5, 2026 · 11:15 PM PHT");
  });

  it("calculates relative time for recent events", () => {
    const now = new Date("2026-09-05T15:15:20.000Z"); // 23:15:20 PHT
    // 30 seconds ago
    const justNow = formatPhilippineDateTime("2026-09-05T23:14:55+08:00", now);
    expect(justNow.relative).toBe("Just now");

    // 10 minutes ago
    const minsAgo = formatPhilippineDateTime("2026-09-05T23:05:20+08:00", now);
    expect(minsAgo.relative).toBe("10m ago");

    // 2 hours ago
    const hoursAgo = formatPhilippineDateTime("2026-09-05T21:15:20+08:00", now);
    expect(hoursAgo.relative).toBe("2h ago");

    // Yesterday
    const yesterday = formatPhilippineDateTime("2026-09-04T23:15:20+08:00", now);
    expect(yesterday.relative).toBe("Yesterday");
  });

  it("handles empty or invalid inputs gracefully", () => {
    const empty = formatPhilippineDateTime("");
    expect(empty.date).toBe("Unknown date");
    expect(empty.time).toBe("Unknown time");

    const invalid = formatPhilippineDateTime("not-a-date");
    expect(invalid.date).toBe("not-a-date");
    expect(invalid.time).toBe("");
  });
});

describe("cleanTownName for Option C Wedge Pin", () => {
  it("strips 'City of ' and 'City Of ' prefixes", () => {
    expect(cleanTownName("City Of Bogo")).toBe("Bogo");
    expect(cleanTownName("City of Tagbilaran")).toBe("Tagbilar…");
    expect(cleanTownName("City Of Talisay")).toBe("Talisay");
    expect(cleanTownName("City Of Baybay")).toBe("Baybay");
  });

  it("strips parentheticals and municipality prefixes", () => {
    expect(cleanTownName("Municipality of Borbon")).toBe("Borbon");
    expect(cleanTownName("San Juan (Southern Leyte)")).toBe("San Juan");
    expect(cleanTownName("Borbon (Cebu)")).toBe("Borbon");
  });

  it("abbreviates common honorifics and truncates long names cleanly", () => {
    expect(cleanTownName("General Luna")).toBe("Gen. Luna");
    expect(cleanTownName("Santa Fe")).toBe("Sta. Fe");
    expect(cleanTownName("Santo Nino")).toBe("Sto. Nino");
    // Long names > 10 chars get 9 chars + ellipsis
    const longName = cleanTownName("VeryLongTownName");
    expect(longName.endsWith("…")).toBe(true);
    expect(longName.length).toBeLessThanOrEqual(10);
  });

  it("handles empty or falsy names with fallback", () => {
    expect(cleanTownName("")).toBe("Visayas");
  });
});

describe("formatReadableDate", () => {
  it("formats ISO date string into readable weekday and date", () => {
    expect(formatReadableDate("2026-09-27")).toBe("Sun, Sep 27");
    expect(formatReadableDate("2026-09-06")).toBe("Sun, Sep 6");
    expect(formatReadableDate("2026-09-21")).toBe("Mon, Sep 21");
  });

  it("handles empty or invalid date gracefully", () => {
    expect(formatReadableDate("")).toBe("");
    expect(formatReadableDate("invalid-date")).toBe("invalid-date");
  });
});

describe("formatPhilippineTimeRange", () => {
  it("formats 24h start/end times into 12h range with PHT suffix", () => {
    expect(formatPhilippineTimeRange("08:00", "17:00")).toBe("8:00 AM – 5:00 PM PHT");
    expect(formatPhilippineTimeRange("00:30", "06:00")).toBe("12:30 AM – 6:00 AM PHT");
    expect(formatPhilippineTimeRange("22:00", "06:00", true)).toBe("10:00 PM – 6:00 AM PHT (Overnight)");
  });
});

describe("normalizeStreetList", () => {
  it("deduplicates case variants and trims trailing punctuation", () => {
    const raw = [
      "M.L. Quezon St.",
      "M.L Quezon St",
      "m.l. quezon st",
      "A.S. Fortuna Ave,",
      "A.S. Fortuna Ave",
      "Banilad Rd.",
    ];
    const cleaned = normalizeStreetList(raw);
    expect(cleaned).toEqual([
      "M.L. Quezon St",
      "A.S. Fortuna Ave",
      "Banilad Rd",
    ]);
  });

  it("handles empty array gracefully", () => {
    expect(normalizeStreetList([])).toEqual([]);
  });
});


