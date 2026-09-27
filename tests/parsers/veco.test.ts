/**
 * VECO Service Advisory Parser Tests
 *
 * All tests run against saved fixture HTML files — no live network calls.
 * Fixtures captured: 2026-09-06 from visayanelectric.com
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  extractCurrentPostUrl,
  parsePostHtml,
  parseDayHeading,
  ParseError,
} from "../../src/parsers/veco.js";
import { makeId } from "../../src/utils/hash.js";
import {
  parseVECOTimeRange,
  to24Hour,
  extractCity,
  extractBarangay,
  extractStreets,
} from "../../src/utils/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "../fixtures");

// ─── Fixtures ──────────────────────────────────────────────────────────────────

let indexHtml: string;
let postHtml: string;

beforeAll(() => {
  indexHtml = readFileSync(join(fixtureDir, "veco_index.html"), "utf-8");
  postHtml = readFileSync(join(fixtureDir, "veco_post_sample.html"), "utf-8");
});

// ─── Index parsing ─────────────────────────────────────────────────────────────

describe("extractCurrentPostUrl", () => {
  it("finds a service-interruption post URL from the live-captured index fixture", () => {
    const url = extractCurrentPostUrl(indexHtml);
    expect(url).not.toBeNull();
    expect(url).toMatch(/\/post\/service-interruption-/);
  });

  it("returns an absolute HTTPS URL", () => {
    const url = extractCurrentPostUrl(indexHtml);
    expect(url).toMatch(/^https:\/\/www\.visayanelectric\.com\//);
  });

  it("returns null when no service-interruption links exist", () => {
    const html = `<html><body><a href="/about">About</a></body></html>`;
    expect(extractCurrentPostUrl(html)).toBeNull();
  });

  it("returns null when page is completely empty", () => {
    expect(extractCurrentPostUrl("<html><body></body></html>")).toBeNull();
  });
});

// ─── Post parsing — structure ──────────────────────────────────────────────────

describe("parsePostHtml — live fixture (Sep 6-12, 2026)", () => {
  const SOURCE_URL = "https://www.visayanelectric.com/post/service-interruption-september-6-12-2026";
  const FIXED_TIME = "2026-09-06T00:00:00.000Z";

  it("returns an array of PowerAdvisory objects (non-empty)", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    expect(advisories.length).toBeGreaterThan(0);
  });

  it("every advisory has source_url and fetched_at set", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    for (const a of advisories) {
      expect(a.source_url).toBe(SOURCE_URL);
      expect(a.fetched_at).toBe(FIXED_TIME);
    }
  });

  it("every advisory has business_confidence: 'scheduled'", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    for (const a of advisories) {
      expect(a.business_confidence).toBe("scheduled");
    }
  });

  it("every advisory has lat: null and lon: null (geocoding not done at this stage)", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    for (const a of advisories) {
      expect(a.lat).toBeNull();
      expect(a.lon).toBeNull();
      expect(a.coordinate_source).toBeNull();
    }
  });

  it("every advisory has a non-empty id (SHA-256 hex)", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    for (const a of advisories) {
      expect(a.id).toHaveLength(64);
      expect(a.id).toMatch(/^[a-f0-9]+$/);
    }
  });

  it("no two advisories in the same post have the same id", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    const ids = advisories.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all advisories have a recognised VECO city", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    const validCities = new Set([
      "Cebu City", "Mandaue City", "Talisay City", "Naga City",
      "Consolacion", "Liloan", "Minglanilla", "San Fernando",
    ]);
    const highConfidence = advisories.filter((a) => a.parse_confidence === "high");
    for (const a of highConfidence) {
      expect(validCities.has(a.city)).toBe(true);
    }
  });

  it("all advisories have non-empty purpose text", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    const highConfidence = advisories.filter((a) => a.parse_confidence === "high");
    for (const a of highConfidence) {
      expect(a.purpose.length).toBeGreaterThan(10);
    }
  });

  it("all advisories have valid start_time and end_time in HH:MM format", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    const highConfidence = advisories.filter((a) => a.parse_confidence === "high");
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const a of highConfidence) {
      expect(a.start_time).toMatch(timeRegex);
      expect(a.end_time).toMatch(timeRegex);
    }
  });

  it("advisories cover multiple different dates in the week", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    const dates = new Set(advisories.map((a) => a.date));
    expect(dates.size).toBeGreaterThan(1);
  });

  it("finds at least one Sep-6 advisory", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    const sep6 = advisories.filter((a) => a.date === "2026-09-06");
    expect(sep6.length).toBeGreaterThan(0);
  });

  it("all dates are within the Sep 6-12 week", () => {
    const advisories = parsePostHtml(postHtml, SOURCE_URL, FIXED_TIME);
    for (const a of advisories) {
      const d = new Date(a.date);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8); // September (0-indexed)
      expect(d.getDate()).toBeGreaterThanOrEqual(6);
      expect(d.getDate()).toBeLessThanOrEqual(13); // Sep 12-13 overnight
    }
  });
});

// ─── Post parsing — failure modes ──────────────────────────────────────────────

describe("parsePostHtml — malformed inputs", () => {
  const SOURCE_URL = "https://www.visayanelectric.com/post/test";
  const NOW = "2026-09-06T00:00:00.000Z";

  it("returns [] for an empty page (post is missing entirely)", () => {
    const advisories = parsePostHtml("<html><body></body></html>", SOURCE_URL, NOW);
    expect(advisories).toEqual([]);
  });

  it("returns [] when tables exist but have no data-hook='table-plugin-cell' cells", () => {
    const html = `<html><body>
      <table><tr><td>Just a layout table</td></tr></table>
    </body></html>`;
    const advisories = parsePostHtml(html, SOURCE_URL, NOW);
    expect(advisories).toEqual([]);
  });

  it("returns parse_confidence:'low' when Time row is missing from table", () => {
    // A table where col 0, row 0 doesn't contain "Time"
    const html = `<html><body>
      <p><strong><u>September 6, 2026 (Sunday)</u></strong></p>
      <table>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="0">Broken</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="0">9:00 AM to 5:00 PM (8hrs)</td>
        </tr>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="1">Purpose:</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="1">Some work</td>
        </tr>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="2">Areas Affected:</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="2">Portion of Mambaling, Cebu City, along Test St.</td>
        </tr>
      </table>
    </body></html>`;
    const advisories = parsePostHtml(html, SOURCE_URL, NOW);
    // Table without "time" label should be skipped entirely (not a valid interruption table)
    expect(advisories).toEqual([]);
  });

  it("returns parse_confidence:'low' when time format is unrecognisable", () => {
    const html = `<html><body>
      <p><strong><u>September 6, 2026 (Sunday)</u></strong></p>
      <table>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="0">Time:</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="0">GARBLED TIME FORMAT XYZ</td>
        </tr>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="1">Purpose:</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="1">Test purpose</td>
        </tr>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="2">Areas Affected:</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="2">Portion of Mambaling, Cebu City, along Test St.</td>
        </tr>
      </table>
    </body></html>`;
    const advisories = parsePostHtml(html, SOURCE_URL, NOW);
    expect(advisories).toHaveLength(1);
    expect(advisories[0].parse_confidence).toBe("low");
    expect(advisories[0].parse_notes).toContain("time range");
  });

  it("returns parse_confidence:'low' when city is not in VECO enum", () => {
    const html = `<html><body>
      <p><strong><u>September 6, 2026 (Sunday)</u></strong></p>
      <table>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="0">Time:</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="0">9:00 AM to 5:00 PM (8hrs)</td>
        </tr>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="1">Purpose:</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="1">Test work</td>
        </tr>
        <tr>
          <td data-hook="table-plugin-cell" data-visual-col="0" data-visual-row="2">Areas Affected:</td>
          <td data-hook="table-plugin-cell" data-visual-col="1" data-visual-row="2">Portion of Somewhere, UnknownCity, along Road.</td>
        </tr>
      </table>
    </body></html>`;
    const advisories = parsePostHtml(html, SOURCE_URL, NOW);
    expect(advisories).toHaveLength(1);
    expect(advisories[0].parse_confidence).toBe("low");
    expect(advisories[0].parse_notes).toContain("city");
  });
});

// ─── Utility unit tests ────────────────────────────────────────────────────────

describe("parseDayHeading", () => {
  it("parses standard single-day heading", () => {
    expect(parseDayHeading("September 6, 2026 (Sunday)")).toBe("2026-09-06");
  });

  it("parses span heading — takes first date", () => {
    expect(parseDayHeading("September 10-11, 2026 (Thursday to Friday)")).toBe("2026-09-10");
  });

  it("parses overnight cross-day heading", () => {
    expect(parseDayHeading("September 12-13, 2026 (Saturday-Sunday)")).toBe("2026-09-12");
  });

  it("returns null for non-heading text", () => {
    expect(parseDayHeading("8:00 AM to 6:00 PM (10hrs)")).toBeNull();
    expect(parseDayHeading("")).toBeNull();
    expect(parseDayHeading("Portion of Mambaling, Cebu City")).toBeNull();
  });
});

describe("parseVECOTimeRange", () => {
  it("parses standard AM to PM range", () => {
    const r = parseVECOTimeRange("8:00 AM to 6:00 PM (10hrs)");
    expect(r).not.toBeNull();
    expect(r!.start_time).toBe("08:00");
    expect(r!.end_time).toBe("18:00");
    expect(r!.duration_hours).toBe(10);
    expect(r!.overnight_span).toBe(false);
  });

  it("parses overnight range (10 PM to 6 AM)", () => {
    const r = parseVECOTimeRange(
      "10:00 PM of September 10 to 6:00 AM of September 11 (8hrs)"
    );
    expect(r).not.toBeNull();
    expect(r!.start_time).toBe("22:00");
    expect(r!.end_time).toBe("06:00");
    expect(r!.overnight_span).toBe(true);
    expect(r!.duration_hours).toBe(8);
  });

  it("parses range without duration parenthetical", () => {
    const r = parseVECOTimeRange("9:00 AM to 5:00 PM");
    expect(r).not.toBeNull();
    expect(r!.duration_hours).toBeNull();
  });

  it("parses fractional duration (8.17hrs)", () => {
    const r = parseVECOTimeRange("8:50 AM to 5:00 PM (8.17hrs)");
    expect(r).not.toBeNull();
    expect(r!.duration_hours).toBeCloseTo(8.17, 1);
  });

  it("returns null for garbage input", () => {
    expect(parseVECOTimeRange("")).toBeNull();
    expect(parseVECOTimeRange("not a time")).toBeNull();
  });
});

describe("to24Hour", () => {
  it("converts 12:00 AM → 00:00", () => {
    expect(to24Hour("12:00 AM")).toBe("00:00");
  });

  it("converts 12:00 PM → 12:00", () => {
    expect(to24Hour("12:00 PM")).toBe("12:00");
  });

  it("converts 6:00 PM → 18:00", () => {
    expect(to24Hour("6:00 PM")).toBe("18:00");
  });

  it("converts 8:00 AM → 08:00", () => {
    expect(to24Hour("8:00 AM")).toBe("08:00");
  });

  it("returns null for invalid input", () => {
    expect(to24Hour("25:00 AM")).toBeNull();
    expect(to24Hour("")).toBeNull();
  });
});

describe("extractCity", () => {
  it("extracts Cebu City", () => {
    expect(extractCity("Portion of Mambaling & South Reclamation Area, Cebu City, along Road")).toBe("Cebu City");
  });

  it("extracts Mandaue City", () => {
    expect(extractCity("Portion of Alang-Alang, Mandaue City, along Street")).toBe("Mandaue City");
  });

  it("extracts Liloan (no City suffix)", () => {
    expect(extractCity("Portion of Tayud & Yati, Liloan, along Bayong-Yati Road")).toBe("Liloan");
  });

  it("returns null for unknown city", () => {
    expect(extractCity("Portion of Somewhere, UnknownPlace, along Road")).toBeNull();
  });
});

describe("makeId", () => {
  it("returns a 64-char hex string", () => {
    const id = makeId("a", "b", "c");
    expect(id).toHaveLength(64);
    expect(id).toMatch(/^[a-f0-9]+$/);
  });

  it("is deterministic for same inputs", () => {
    expect(makeId("x", "y")).toBe(makeId("x", "y"));
  });

  it("is different for different inputs", () => {
    expect(makeId("a", "b")).not.toBe(makeId("a", "c"));
  });
});

describe("extractStreets", () => {
  it("parses multiple streets with initials without truncating on periods (e.g. Basak example)", () => {
    const raw = "Portion of Basak, Pagsabungan & Tabok, Mandaue City, along portions of Es Dimpas Street & Z. Estreras Street.";
    const streets = extractStreets(raw);
    expect(streets).toEqual(["Es Dimpas Street", "Z. Estreras Street"]);
  });

  it("handles complex street names with titles and multiple initials", () => {
    const raw = "Portion of Talamban, Cebu City, along portion of Gov. M. Cuenco Avenue, Banilad Road, and Borbajo Street.";
    const streets = extractStreets(raw);
    expect(streets).toEqual(["Gov. M. Cuenco Avenue", "Banilad Road", "Borbajo Street"]);
  });

  it("extracts streets even when 'along' keyword is omitted by VECO", () => {
    const raw = "Portion of Alang-Alang, Mandaue City, R. Colina St., R. Colina Extn., and Marciano Quizon Road.";
    const streets = extractStreets(raw);
    expect(streets).toEqual(["R. Colina St", "R. Colina Extn", "Marciano Quizon Road"]);
  });

  it("extracts and tags landmarks following 'including'", () => {
    const raw = "Portion of South Reclamation Area, Cebu City, along Talabong Rd., including CCTO and DOH.";
    const streets = extractStreets(raw);
    expect(streets).toContain("Talabong Rd");
    expect(streets).toContain("CCTO (Landmark)");
    expect(streets).toContain("DOH (Landmark)");
  });
});

