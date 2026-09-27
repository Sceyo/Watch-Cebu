/**
 * PHIVOLCS Earthquake Parser
 *
 * Fetches the PHIVOLCS earthquake index page, resolves bulletin links,
 * fetches each bulletin, and returns structured EarthquakeEvent records.
 *
 * Only events within 300 km of Cebu City (within_watch_radius: true) are returned.
 *
 * Coordinate provenance: always "bulletin". If a bulletin lacks lat/lon, the record
 * is skipped entirely (not stored with null coords).
 *
 * Parse failures:
 *   - Missing lat/lon: record skipped, URL logged.
 *   - Optional field malformed: parse_confidence "low", record stored.
 *   - Index page unreachable: throws ParseError (caller handles).
 *   - Bulletin page unreachable: record skipped, logged.
 *   - Zero events on index: returns [] (not an error).
 */

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { EarthquakeEvent } from "../types/index.js";
import { makeId } from "../utils/hash.js";
import {
  haversineKm,
  CEBU_CITY_REF,
  WATCH_RADIUS_KM,
  parsePHIVOLCSDateTime,
  parsePHIVOLCSIssuedOn,
  parsePHIVOLCSLocation,
  parseMagnitude,
} from "../utils/index.js";

const INDEX_URL = "https://earthquake.phivolcs.dost.gov.ph/";

// ─── Public API ────────────────────────────────────────────────────────────────

export interface ParsePhivolcsOptions {
  /** Override the base URL for tests (allows passing raw HTML without fetching) */
  fetcher?: Fetcher;
  /** Limit how many bulletins to follow from the index (default: all) */
  maxBulletins?: number;
}

export type Fetcher = (url: string) => Promise<string>;

/**
 * Decode raw bytes from PHIVOLCS into a string.
 * PHIVOLCS bulletins explicitly declare `charset=windows-1252` in their meta tag
 * and encode the degree symbol (°) as byte 0xb0.
 * Decoding as UTF-8 causes mojibake with the replacement character (\uFFFD / ).
 */
export function decodePhivolcsBuffer(buffer: ArrayBuffer | Uint8Array | Buffer): string {
  return new TextDecoder("windows-1252").decode(buffer);
}

// ─── Concurrency helpers ───────────────────────────────────────────────────────

const BATCH_SIZE = 5;
const INTER_BATCH_DELAY_MS = 200;

/**
 * Run an array of async tasks in batches of at most `batchSize`, waiting
 * `delayMs` between each batch. Within a batch, all tasks run concurrently
 * via Promise.allSettled, so one failure does not abort its siblings.
 *
 * This is the "batch-of-5, 200ms backoff" pattern specified in Stage 2 and
 * carried forward to Stage 4 — it limits peak concurrent requests to PHIVOLCS
 * legacy infrastructure regardless of how many bulletins the index contains.
 */
export async function runBatched<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number = BATCH_SIZE,
  delayMs: number = INTER_BATCH_DELAY_MS
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...batchResults);

    // Delay between batches (not after the final batch)
    if (i + batchSize < tasks.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Parse seismic events from the PHIVOLCS index.
 *
 * @param fetcher - HTTP fetcher. In production: real HTTP. In tests: fixture loader.
 * @param options
 * @returns Filtered list of EarthquakeEvent within watch radius.
 */
export async function parsePhivolcs(
  fetcher: Fetcher,
  options: ParsePhivolcsOptions = {}
): Promise<{ events: EarthquakeEvent[]; skipped: SkippedRecord[] }> {
  const fetched_at = new Date().toISOString();
  const indexHtml = await fetcher(INDEX_URL);
  const bulletinLinks = extractBulletinLinks(indexHtml);

  if (bulletinLinks.length === 0) {
    // Zero events is not a parse error — PHIVOLCS can be quiet
    return { events: [], skipped: [] };
  }

  const limit = options.maxBulletins ?? bulletinLinks.length;
  const toFetch = bulletinLinks.slice(0, limit);

  const events: EarthquakeEvent[] = [];
  const skipped: SkippedRecord[] = [];

  // Fetch bulletins in batches of BATCH_SIZE with INTER_BATCH_DELAY_MS between
  // batches — limits concurrent connections to PHIVOLCS legacy infrastructure
  // regardless of how many bulletins the index contains.
  const tasks = toFetch.map((url) => async () => {
    let html: string;
    try {
      html = await fetcher(url);
    } catch (err) {
      skipped.push({
        url,
        reason: `Bulletin unreachable: ${String(err)}`,
      });
      return;
    }

    const result = parseBulletinHtml(html, url, fetched_at);
    if (result.type === "skip") {
      skipped.push({ url, reason: result.reason });
      return;
    }

    const event = result.event;
    // Only store within-radius events
    if (event.within_watch_radius) {
      events.push(event);
    }
  });

  await runBatched(tasks);

  return { events, skipped };
}

// ─── Index parsing ─────────────────────────────────────────────────────────────

/**
 * Extract absolute bulletin URLs from the PHIVOLCS index HTML.
 * The index uses relative Windows-style backslash paths in href attributes.
 * e.g. href="2026_Earthquake_Information\September\2026_0905_0946_B1.html"
 */
export function extractBulletinLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    // Match bulletin links: year_Earthquake_Information\Month\filename.html
    if (/\d{4}_Earthquake_Information/i.test(href)) {
      // Normalise backslashes → forward slashes
      const path = href.replace(/\\/g, "/").trim();
      const absolute = new URL(path, INDEX_URL).href;
      links.push(absolute);
    }
  });
  return links;
}

// ─── Bulletin parsing ──────────────────────────────────────────────────────────

type ParseResult =
  | { type: "ok"; event: EarthquakeEvent }
  | { type: "skip"; reason: string };

/**
 * Parse a single PHIVOLCS bulletin HTML page into an EarthquakeEvent.
 *
 * Structure: Word-generated HTML with numbered HTML comments as field anchors.
 *   <!-- 2 DateTime-Data  --> <span> value </span>
 *   <!-- 3 Location-Data  --> <span> value </span>
 *   <!-- 4 Depth-Data     --> ...
 *   <!-- 5 Origin-Data    --> ...
 *   <!-- 6 Magnitude-Data --> ...
 *   <!-- 7 Intensity-Data --> (may be empty)
 *   <!-- 8 Damage-Data    --> ...
 *   <!-- 9 Aftershock-Data --> ...
 *   <!-- 10 IssuedDT-Data --> ...
 *
 * If lat/lon cannot be extracted, returns type: "skip".
 */
export function parseBulletinHtml(
  html: string,
  sourceUrl: string,
  fetchedAt: string
): ParseResult {
  const $ = cheerio.load(html);
  const notes: string[] = [];
  let parseConfidence: "high" | "low" = "high";

    // Helper: extract text after an HTML comment anchor
    function extractAfterComment(commentPattern: RegExp): string | null {
      const match = html.match(commentPattern);
      if (!match) return null;
      const afterIdx = html.indexOf(match[0]) + match[0].length;
      const remaining = html.slice(afterIdx);
      // Stop at the next HTML comment or table cell end
      const nextBoundary = remaining.search(/<!--|<\/td>/i);
      const sliceLen = nextBoundary !== -1 ? nextBoundary : Math.min(500, remaining.length);
      const fragment = remaining.slice(0, sliceLen);
      const $frag = cheerio.load(fragment);
      return $frag.root().text().trim().replace(/\s+/g, " ") || null;
    }

  // --- Date/Time (required) ---
  const dateTimeRaw = extractAfterComment(/<!--\s*2\s+DateTime-Data\s*-->/);
  const parsedDT = dateTimeRaw ? parsePHIVOLCSDateTime(dateTimeRaw) : null;
  if (!parsedDT) {
    // No valid date — still try to continue, mark low
    parseConfidence = "low";
    notes.push(`Could not parse Date/Time: ${JSON.stringify(dateTimeRaw)}`);
  }

  // --- Location (required for coordinates) ---
  const locationRaw = extractAfterComment(/<!--\s*3\s+Location-Data\s*-->/);
  if (!locationRaw) {
    return { type: "skip", reason: `No location data found in bulletin: ${sourceUrl}` };
  }
  const parsedLoc = parsePHIVOLCSLocation(locationRaw);
  if (!parsedLoc) {
    return {
      type: "skip",
      reason: `Could not extract lat/lon from location string: ${JSON.stringify(locationRaw)} in ${sourceUrl}`,
    };
  }

  // --- Depth ---
  const depthRaw = extractAfterComment(/<!--\s*4\s+Depth-Data\s*-->/);
  const depth_km = depthRaw ? parseInt(depthRaw.replace(/\D/g, ""), 10) : NaN;
  if (isNaN(depth_km)) {
    parseConfidence = "low";
    notes.push(`Could not parse depth: ${JSON.stringify(depthRaw)}`);
  }

  // --- Origin ---
  const originRaw = extractAfterComment(/<!--\s*5\s+Origin-Data\s*-->/);
  const origin_type = originRaw?.trim().toUpperCase() ?? "UNKNOWN";
  if (!originRaw) {
    parseConfidence = "low";
    notes.push("Origin field missing");
  }

  // --- Magnitude ---
  const magRaw = extractAfterComment(/<!--\s*6\s+Magnitude-Data\s*-->/);
  const parsedMag = magRaw ? parseMagnitude(magRaw) : null;
  if (!parsedMag) {
    parseConfidence = "low";
    notes.push(`Could not parse magnitude: ${JSON.stringify(magRaw)}`);
  }

  // --- Intensities (optional — blank for most events) ---
  const intensitiesRaw = extractAfterComment(/<!--\s*7\s+Intensity-Data\s*-->/);
  const reported_intensities = intensitiesRaw && intensitiesRaw.length > 0 ? intensitiesRaw : null;

  // --- Damage ---
  const damageRaw = extractAfterComment(/<!--\s*8\s+Damage-Data\s*-->/);
  const expecting_damage = damageRaw?.trim().toUpperCase() === "YES";

  // --- Aftershocks ---
  const aftershockRaw = extractAfterComment(/<!--\s*9\s+Aftershock-Data\s*-->/);
  const expecting_aftershocks = aftershockRaw?.trim().toUpperCase() === "YES";

  // --- Issued On ---
  const issuedRaw = extractAfterComment(/<!--\s*10\s+IssuedDT-Data\s*-->/);
  const issued_on_pst = issuedRaw ? parsePHIVOLCSIssuedOn(issuedRaw) : null;

  // --- Distance from Cebu ---
  const distance_from_cebu_km = haversineKm(
    CEBU_CITY_REF.lat,
    CEBU_CITY_REF.lon,
    parsedLoc.lat,
    parsedLoc.lon
  );
  const within_watch_radius = distance_from_cebu_km <= WATCH_RADIUS_KM;

  const event: EarthquakeEvent = {
    id: makeId(sourceUrl),
    source_url: sourceUrl,
    fetched_at: fetchedAt,
    datetime_pst: parsedDT?.pst ?? "",
    datetime_utc: parsedDT?.utc ?? "",
    lat: parsedLoc.lat,
    lon: parsedLoc.lon,
    coordinate_source: "bulletin",
    location_description: parsedLoc.location_description,
    nearest_town: parsedLoc.nearest_town,
    nearest_province: parsedLoc.nearest_province,
    depth_km: isNaN(depth_km) ? 0 : depth_km,
    magnitude: parsedMag?.magnitude ?? 0,
    magnitude_type: parsedMag?.magnitude_type ?? null,
    origin_type,
    reported_intensities,
    expecting_damage,
    expecting_aftershocks,
    issued_on_pst,
    distance_from_cebu_km: Math.round(distance_from_cebu_km),
    within_watch_radius,
    parse_confidence: parseConfidence,
    parse_notes: notes.length > 0 ? notes.join("; ") : null,
  };

  return { type: "ok", event };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SkippedRecord {
  url: string;
  reason: string;
}
