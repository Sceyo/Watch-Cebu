/**
 * PHIVOLCS Parser Tests
 *
 * All tests run against saved fixture HTML files — no live network calls.
 * Fixtures captured: 2026-09-06 from earthquake.phivolcs.dost.gov.ph
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  extractBulletinLinks,
  parseBulletinHtml,
  decodePhivolcsBuffer,
} from "../../src/parsers/phivolcs.js";
import {
  parsePHIVOLCSDateTime,
  parsePHIVOLCSIssuedOn,
  parsePHIVOLCSLocation,
  parseMagnitude,
  haversineKm,
  CEBU_CITY_REF,
} from "../../src/utils/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "../fixtures");

// ─── Fixtures ──────────────────────────────────────────────────────────────────

let indexHtml: string;
let bulletinHtml: string;

beforeAll(() => {
  indexHtml = readFileSync(join(fixtureDir, "phivolcs_index.html"), "utf-8");
  const bulletinBuf = readFileSync(join(fixtureDir, "phivolcs_bulletin_sample.html"));
  bulletinHtml = decodePhivolcsBuffer(bulletinBuf);
});

// ─── Index parsing ─────────────────────────────────────────────────────────────

describe("extractBulletinLinks", () => {
  it("returns at least one bulletin URL from the live-captured index fixture", () => {
    const links = extractBulletinLinks(indexHtml);
    expect(links.length).toBeGreaterThan(0);
  });

  it("returns absolute HTTPS URLs", () => {
    const links = extractBulletinLinks(indexHtml);
    for (const link of links) {
      expect(link).toMatch(/^https:\/\/earthquake\.phivolcs\.dost\.gov\.ph\//);
    }
  });

  it("normalises Windows backslash paths to forward slashes", () => {
    const fakeHtml = `
      <html><body>
        <a href="2026_Earthquake_Information\\September\\2026_0905_0946_B1.html">test</a>
      </body></html>
    `;
    const links = extractBulletinLinks(fakeHtml);
    expect(links[0]).not.toContain("\\");
    expect(links[0]).toContain("/September/");
  });

  it("returns [] when no bulletin links exist (zero-event index page)", () => {
    const emptyHtml = `<html><body><p>No recent events.</p></body></html>`;
    const links = extractBulletinLinks(emptyHtml);
    expect(links).toEqual([]);
  });

  it("does not include non-bulletin anchor tags", () => {
    const mixedHtml = `
      <html><body>
        <a href="https://www.phivolcs.dost.gov.ph/">Home</a>
        <a href="2026_Earthquake_Information\\September\\2026_0905_0946_B1.html">EQ</a>
      </body></html>
    `;
    const links = extractBulletinLinks(mixedHtml);
    expect(links).toHaveLength(1);
  });
});

// ─── Bulletin parsing ──────────────────────────────────────────────────────────

describe("parseBulletinHtml — happy path (live fixture)", () => {
  const SAMPLE_URL =
    "https://earthquake.phivolcs.dost.gov.ph/2026_Earthquake_Information/September/2026_0905_0946_B1.html";
  const FIXED_TIME = "2026-09-05T16:00:00.000Z";

  it("parses to type: ok", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    expect(result.type).toBe("ok");
  });

  it("extracts correct coordinates from bulletin", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    expect(result.event.lat).toBeCloseTo(12.9, 1);
    expect(result.event.lon).toBeCloseTo(123.13, 1);
    expect(result.event.coordinate_source).toBe("bulletin");
  });

  it("coordinate_source is always 'bulletin'", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    expect(result.event.coordinate_source).toBe("bulletin");
  });

  it("extracts origin type TECTONIC", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    expect(result.event.origin_type).toBe("TECTONIC");
  });

  it("parses magnitude and type correctly", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    expect(result.event.magnitude).toBeCloseTo(1.9, 1);
    expect(result.event.magnitude_type).toBe("Ms");
  });

  it("sets expecting_damage: false", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    expect(result.event.expecting_damage).toBe(false);
  });

  it("sets expecting_aftershocks: false", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    expect(result.event.expecting_aftershocks).toBe(false);
  });

  it("sets reported_intensities: null for this quiet bulletin", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    // This event had no reported intensities
    expect(result.event.reported_intensities).toBeNull();
  });

  it("sets source_url and fetched_at provenance fields", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    expect(result.event.source_url).toBe(SAMPLE_URL);
    expect(result.event.fetched_at).toBe(FIXED_TIME);
  });

  it("computes distance_from_cebu_km correctly (Masbate is ~300+ km away)", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    // Masbate is approximately 280-320 km from Cebu City
    expect(result.event.distance_from_cebu_km).toBeGreaterThan(200);
    expect(result.event.distance_from_cebu_km).toBeLessThan(450);
  });

  it("generates a stable SHA-256 id from source_url", () => {
    const r1 = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    const r2 = parseBulletinHtml(bulletinHtml, SAMPLE_URL, "2099-01-01T00:00:00Z");
    if (r1.type !== "ok" || r2.type !== "ok") throw new Error("Both must be ok");
    expect(r1.event.id).toBe(r2.event.id); // id is stable across fetched_at
    expect(r1.event.id).toHaveLength(64); // SHA-256 hex
  });

  it("extracts location_description with proper degree symbol and no replacement characters", () => {
    const result = parseBulletinHtml(bulletinHtml, SAMPLE_URL, FIXED_TIME);
    if (result.type !== "ok") throw new Error("Expected ok");
    expect(result.event.location_description).toContain("89° W");
    expect(result.event.location_description).not.toContain("\uFFFD");
  });
});

// ─── Bulletin parsing — failure modes ─────────────────────────────────────────

describe("parseBulletinHtml — malformed / missing data", () => {
  const BASE_URL = "https://earthquake.phivolcs.dost.gov.ph/test.html";
  const NOW = "2026-09-05T16:00:00.000Z";

  it("returns type:skip when bulletin has no location comment", () => {
    const html = `<html><body>
      <!-- 2 DateTime-Data  -->
      <span>05 Sep 2026 - 05:46:53 PM</span>
      <!-- NO Location here -->
    </body></html>`;
    const result = parseBulletinHtml(html, BASE_URL, NOW);
    expect(result.type).toBe("skip");
  });

  it("returns type:skip when lat/lon cannot be parsed from location string", () => {
    const html = `<html><body>
      <!-- 3 Location-Data  -->
      <span>Near Manila, Philippines (no coordinates given)</span>
    </body></html>`;
    const result = parseBulletinHtml(html, BASE_URL, NOW);
    expect(result.type).toBe("skip");
  });

  it("returns type:ok with parse_confidence:low when depth is missing", () => {
    // Provide valid location but missing depth comment
    const html = `<html><body>
      <!-- 2 DateTime-Data  -->
      <span>05 Sep 2026 - 05:46:53 PM</span>
      <!-- 3 Location-Data  -->
      <span>10.30N, 123.89E - 005 km NW of Cebu City</span>
      <!-- 5 Origin-Data  -->
      <span>TECTONIC</span>
      <!-- 6 Magnitude-Data  -->
      <span>Ms 3.2</span>
      <!-- 8 Damage-Data  -->
      <span>NO</span>
      <!-- 9 Aftershock-Data  -->
      <span>NO</span>
    </body></html>`;
    const result = parseBulletinHtml(html, BASE_URL, NOW);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.event.parse_confidence).toBe("low");
    expect(result.event.parse_notes).toContain("depth");
  });

  it("returns type:ok with parse_confidence:low when date/time is missing", () => {
    const html = `<html><body>
      <!-- 3 Location-Data  -->
      <span>10.30N, 123.89E - 005 km NW of Cebu City</span>
      <!-- 4 Depth-Data  -->
      <span>010</span>
      <!-- 5 Origin-Data  -->
      <span>TECTONIC</span>
      <!-- 6 Magnitude-Data  -->
      <span>Ms 3.2</span>
      <!-- 8 Damage-Data  -->
      <span>NO</span>
      <!-- 9 Aftershock-Data  -->
      <span>NO</span>
    </body></html>`;
    const result = parseBulletinHtml(html, BASE_URL, NOW);
    // Should still parse (coords present) but confidence low
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.event.parse_confidence).toBe("low");
  });

  it("returns type:ok for a minimal valid bulletin (only required fields)", () => {
    // ALL required fields present → parse_confidence: high
    const html = `<html><body>
      <!-- 2 DateTime-Data  -->
      <span>05 Sep 2026 - 09:00:00 AM</span>
      <!-- 3 Location-Data  -->
      <span>10.30N, 123.89E - 002 km NW of Cebu City</span>
      <!-- 4 Depth-Data  -->
      <span>010</span>
      <!-- 5 Origin-Data  -->
      <span>TECTONIC</span>
      <!-- 6 Magnitude-Data  -->
      <span>Ms 2.1</span>
      <!-- 8 Damage-Data  -->
      <span>NO</span>
      <!-- 9 Aftershock-Data  -->
      <span>NO</span>
    </body></html>`;
    const result = parseBulletinHtml(html, BASE_URL, NOW);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.event.parse_confidence).toBe("high");
    expect(result.event.within_watch_radius).toBe(true);
    expect(result.event.distance_from_cebu_km).toBeLessThan(10);
  });

  it("does not store events outside 300km radius (within_watch_radius: false)", () => {
    // Luzon — far from Cebu
    const html = `<html><body>
      <!-- 2 DateTime-Data  -->
      <span>05 Sep 2026 - 09:00:00 AM</span>
      <!-- 3 Location-Data  -->
      <span>16.00N, 120.00E - 010 km NW of Baguio City</span>
      <!-- 4 Depth-Data  -->
      <span>010</span>
      <!-- 5 Origin-Data  -->
      <span>TECTONIC</span>
      <!-- 6 Magnitude-Data  -->
      <span>Ms 4.1</span>
      <!-- 8 Damage-Data  -->
      <span>NO</span>
      <!-- 9 Aftershock-Data  -->
      <span>NO</span>
    </body></html>`;
    const result = parseBulletinHtml(html, BASE_URL, NOW);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.event.within_watch_radius).toBe(false);
    expect(result.event.distance_from_cebu_km).toBeGreaterThan(300);
  });
});

// ─── Utility unit tests ────────────────────────────────────────────────────────

describe("parsePHIVOLCSDateTime", () => {
  it("parses standard format correctly", () => {
    const r = parsePHIVOLCSDateTime("05 Sep 2026 - 05:46:53 PM");
    expect(r).not.toBeNull();
    expect(r!.pst).toBe("2026-09-05T17:46:53+08:00");
    expect(r!.utc).toBe("2026-09-05T09:46:53.000Z");
  });

  it("handles midnight (12:00:00 AM)", () => {
    const r = parsePHIVOLCSDateTime("01 Jan 2026 - 12:00:00 AM");
    expect(r).not.toBeNull();
    expect(r!.pst).toBe("2026-01-01T00:00:00+08:00");
  });

  it("handles noon (12:00:00 PM)", () => {
    const r = parsePHIVOLCSDateTime("01 Jan 2026 - 12:00:00 PM");
    expect(r).not.toBeNull();
    expect(r!.pst).toBe("2026-01-01T12:00:00+08:00");
  });

  it("returns null for garbage input", () => {
    expect(parsePHIVOLCSDateTime("not a date")).toBeNull();
    expect(parsePHIVOLCSDateTime("")).toBeNull();
  });
});

describe("parsePHIVOLCSLocation", () => {
  it("parses standard location with clean ° symbol", () => {
    const r = parsePHIVOLCSLocation("12.90°N, 123.13°E - 013 km N 89° W of Claveria (Masbate)");
    expect(r).not.toBeNull();
    expect(r!.lat).toBeCloseTo(12.9, 1);
    expect(r!.lon).toBeCloseTo(123.13, 1);
    expect(r!.location_description).toBe("013 km N 89° W of Claveria (Masbate)");
    expect(r!.nearest_town).toBe("Claveria");
    expect(r!.nearest_province).toBe("Masbate");
  });

  it("regression: parses exact failing string with replacement character \uFFFD and normalizes to °", () => {
    const raw = "12.90N, 123.13E - 013 km N 89\uFFFD W of Claveria (Masbate)";
    const r = parsePHIVOLCSLocation(raw);
    expect(r).not.toBeNull();
    expect(r!.lat).toBeCloseTo(12.9, 1);
    expect(r!.lon).toBeCloseTo(123.13, 1);
    expect(r!.location_description).toBe("013 km N 89° W of Claveria (Masbate)");
    expect(r!.location_description).not.toContain("\uFFFD");
    expect(r!.nearest_town).toBe("Claveria");
    expect(r!.nearest_province).toBe("Masbate");
  });

  it("parses location with ? variant without regression", () => {
    const r = parsePHIVOLCSLocation("10.30?N, 123.89?E - 002 km NW of Cebu City");
    expect(r).not.toBeNull();
    expect(r!.lat).toBeCloseTo(10.3, 1);
    expect(r!.lon).toBeCloseTo(123.89, 1);
    expect(r!.location_description).toBe("002 km NW of Cebu City");
  });

  it("returns null for string with no coordinates", () => {
    expect(parsePHIVOLCSLocation("Near Manila")).toBeNull();
    expect(parsePHIVOLCSLocation("")).toBeNull();
  });
});

describe("parseMagnitude", () => {
  it("parses 'Ms 1.9'", () => {
    const r = parseMagnitude("Ms 1.9");
    expect(r).toEqual({ magnitude: 1.9, magnitude_type: "Ms" });
  });

  it("parses 'Mw 5.2'", () => {
    const r = parseMagnitude("Mw 5.2");
    expect(r).toEqual({ magnitude: 5.2, magnitude_type: "Mw" });
  });

  it("parses bare number '2.1'", () => {
    const r = parseMagnitude("2.1");
    expect(r).toEqual({ magnitude: 2.1, magnitude_type: null });
  });

  it("returns null for empty or garbage", () => {
    expect(parseMagnitude("")).toBeNull();
    expect(parseMagnitude("not a mag")).toBeNull();
  });
});

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(10.3157, 123.8854, 10.3157, 123.8854)).toBe(0);
  });

  it("Cebu City to Cebu City is 0 km", () => {
    const d = haversineKm(CEBU_CITY_REF.lat, CEBU_CITY_REF.lon, CEBU_CITY_REF.lat, CEBU_CITY_REF.lon);
    expect(d).toBe(0);
  });

  it("Cebu City to Manila is ~560 km (> 300 km radius)", () => {
    // Manila: 14.5995, 120.9842
    const d = haversineKm(CEBU_CITY_REF.lat, CEBU_CITY_REF.lon, 14.5995, 120.9842);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(650);
  });

  it("Cebu City to Bohol (~70 km) is within watch radius", () => {
    // Tagbilaran: 9.6500, 123.8500
    const d = haversineKm(CEBU_CITY_REF.lat, CEBU_CITY_REF.lon, 9.65, 123.85);
    expect(d).toBeLessThan(100);
    expect(d).toBeLessThan(300);
  });
});
