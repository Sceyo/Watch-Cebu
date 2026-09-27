/**
 * Fallback and Fixture Dataset Integrity Tests (Stage 3a).
 *
 * This test suite asserts against the actual JSON data files shipped in `data/`
 * to ensure no broken URLs, non-ISO timestamps, or false confidence labels
 * can silently enter the repository or be served to users.
 *
 * ARCHITECTURAL DISTINCTION:
 * - `data/sample_earthquake_events.json`: PRODUCTION FALLBACK DATA.
 *   Loaded directly by `server/api.ts`'s `getEarthquakeEventsFallback()` when PHIVOLCS is unreachable.
 *   Must strictly satisfy every contract of a verified live `EarthquakeEvent` record.
 *
 * - `data/sample_power_advisories.json`: TEST-ONLY FIXTURE DATA.
 *   Used by UI tests (e.g., `tests/ui/markerLogic.test.ts`) to verify map rendering logic and day tabs.
 *   The production power fallback in `server/api.ts` parses `tests/fixtures/veco_post_sample.html` live
 *   through `parsePostHtml` + `fanOutAndResolveAdvisories`. This file is tested here for parity and schema compliance.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { EarthquakeEvent, PowerAdvisory } from "../../src/types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const EQ_FALLBACK_PATH = join(ROOT_DIR, "data", "sample_earthquake_events.json");
const POWER_SAMPLE_PATH = join(ROOT_DIR, "data", "sample_power_advisories.json");

describe("Stage 3a: Earthquake Fallback Dataset Integrity (PRODUCTION FALLBACK)", () => {
  it("file exists in repository", () => {
    expect(existsSync(EQ_FALLBACK_PATH)).toBe(true);
  });

  const rawJson = readFileSync(EQ_FALLBACK_PATH, "utf-8");
  const events: EarthquakeEvent[] = JSON.parse(rawJson);

  it("contains representative events within the 300km watch radius", () => {
    expect(events.length).toBeGreaterThanOrEqual(10);
    for (const e of events) {
      expect(e.within_watch_radius).toBe(true);
      expect(e.distance_from_cebu_km).toBeLessThanOrEqual(300);
      expect(e.coordinate_source).toBe("bulletin");
    }
  });

  it("zero records contain backslashes in source_url (prevents 404s)", () => {
    for (const e of events) {
      expect(e.source_url).not.toContain("\\");
      expect(e.source_url).toMatch(/^https:\/\/earthquake\.phivolcs\.dost\.gov\.ph\//);
    }
  });

  it("100% of records have ISO 8601 timestamps in datetime_pst and datetime_utc", () => {
    // Expected ISO pattern e.g. 2026-09-05T23:15:20+08:00 or Z
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

    for (const e of events) {
      expect(e.datetime_pst).toMatch(iso8601Regex);
      expect(e.datetime_pst).toContain("+08:00");
      expect(e.datetime_utc).toMatch(iso8601Regex);
      expect(e.datetime_utc).toContain("Z");
    }
  });

  it("parse_confidence is honest and reflects data completeness, not uniformly 'high'", () => {
    const confidences = new Set(events.map((e) => e.parse_confidence));
    // Must contain both high and low to prove discernment
    expect(confidences.has("high")).toBe(true);
    expect(confidences.has("low")).toBe(true);

    // Records with parse_confidence: 'low' must carry an explanatory parse_notes
    for (const e of events) {
      if (e.parse_confidence === "low") {
        expect(e.parse_notes).not.toBeNull();
        expect(typeof e.parse_notes).toBe("string");
        expect(e.parse_notes!.length).toBeGreaterThan(0);
      }
    }
  });

  it("spans diverse magnitude tiers and includes strong (M6+) shockwave event", () => {
    const hasMinor = events.some((e) => e.magnitude < 3.0);
    const hasLight = events.some((e) => e.magnitude >= 3.0 && e.magnitude < 5.0);
    const hasModerate = events.some((e) => e.magnitude >= 5.0 && e.magnitude < 6.0);
    const hasStrong = events.some((e) => e.magnitude >= 6.0);

    expect(hasMinor).toBe(true);
    expect(hasLight).toBe(true);
    expect(hasModerate).toBe(true);
    expect(hasStrong).toBe(true);
  });
});

describe("Stage 3a: Power Advisories Sample Dataset Integrity (TEST-ONLY FIXTURE DATA)", () => {
  it("file exists in repository", () => {
    expect(existsSync(POWER_SAMPLE_PATH)).toBe(true);
  });

  const rawJson = readFileSync(POWER_SAMPLE_PATH, "utf-8");
  const advisories: PowerAdvisory[] = JSON.parse(rawJson);

  it("contains exactly 51 fanned-out records from the verified Sept 6–12 fixture", () => {
    expect(advisories.length).toBe(51);
  });

  it("zero records contain backslashes in source_url", () => {
    for (const a of advisories) {
      expect(a.source_url).not.toContain("\\");
      expect(a.source_url).toMatch(/^https:\/\/www\.visayanelectric\.com\//);
    }
  });

  it("every record has valid ISO date and HH:MM times", () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    for (const a of advisories) {
      expect(a.date).toMatch(dateRegex);
      expect(a.start_time).toMatch(timeRegex);
      expect(a.end_time).toMatch(timeRegex);
    }
  });

  it("100% of records have honest coordinate sources (osm_point: 48, manual_verified: 3)", () => {
    let osmCount = 0;
    let manualCount = 0;

    for (const a of advisories) {
      expect(a.lat).not.toBeNull();
      expect(a.lon).not.toBeNull();
      if (a.coordinate_source === "osm_point") osmCount++;
      if (a.coordinate_source === "manual_verified") manualCount++;
    }

    expect(osmCount).toBe(48);
    expect(manualCount).toBe(3);
    expect(osmCount + manualCount).toBe(51);
  });
});
