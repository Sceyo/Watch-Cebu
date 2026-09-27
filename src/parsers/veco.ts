/**
 * VECO Service Advisory Parser
 *
 * Fetches the VECO service advisory index page to discover the current week'"'"'s
 * post URL, then fetches that post and parses it into PowerAdvisory records.
 *
 * The VECO site is built on Wix/Ricos. The post content is server-side rendered
 * into the static HTML as a Ricos table with data-hook="table-plugin-cell" elements.
 * Each interruption event is one <table> block with 3-4 rows:
 *   Row 0: Time
 *   Row 1: Purpose
 *   Row 2: Areas Affected
 *   Row 3: Map (ignored)
 *
 * Day headings appear as <strong><u>September 6, 2026 (Sunday)</u></strong>
 * in the text immediately before each table group.
 *
 * Coordinates (lat/lon) are NOT set at this stage — that is Stage 3 work.
 * Every record gets lat: null, lon: null, coordinate_source: null.
 *
 * Parse failures:
 *   - Index page links not found: throws ParseError.
 *   - Post page unreachable: throws (caller handles).
 *   - Individual row malformed (missing Time/Purpose/Areas): parse_confidence "low".
 *   - City not in VECO enum: parse_confidence "low".
 */

import * as cheerio from "cheerio";
import type { PowerAdvisory, VECOCity } from "../types/index.js";
import { makeId } from "../utils/hash.js";
import {
  parseVECOTimeRange,
  extractCity,
  extractBarangay,
  extractStreets,
} from "../utils/index.js";

const INDEX_URL = "https://www.visayanelectric.com/customer-services/service-advisory";

// ─── Public API ────────────────────────────────────────────────────────────────

export type Fetcher = (url: string) => Promise<string>;

export interface ParseVECOResult {
  advisories: PowerAdvisory[];
  post_url: string;
}

/**
 * Parse the current VECO service advisory week.
 *
 * Step 1: Fetch index → extract first /post/service-interruption-* URL.
 * Step 2: Fetch that post → parse into PowerAdvisory[].
 *
 * @param fetcher - HTTP fetcher. Real HTTP in production; fixture in tests.
 */
export async function parseVECO(fetcher: Fetcher): Promise<ParseVECOResult> {
  const fetched_at = new Date().toISOString();

  // Step 1: discover current post URL
  const indexHtml = await fetcher(INDEX_URL);
  const postUrl = extractCurrentPostUrl(indexHtml);
  if (!postUrl) {
    throw new ParseError(
      "VECO index page structure changed: no service-interruption post links found",
      INDEX_URL
    );
  }

  // Step 2: fetch and parse the post
  const postHtml = await fetcher(postUrl);
  const advisories = parsePostHtml(postHtml, postUrl, fetched_at);

  return { advisories, post_url: postUrl };
}

// ─── Index parsing ─────────────────────────────────────────────────────────────

/**
 * Extract the URL of the current week'"'"'s service advisory post.
 * Strategy: find first <a> href matching /post/service-interruption-*
 */
export function extractCurrentPostUrl(html: string): string | null {
  const $ = cheerio.load(html);
  let found: string | null = null;
  $("a[href]").each((_i, el) => {
    if (found) return false; // break
    const href = $(el).attr("href") ?? "";
    if (/\/post\/service-interruption-/i.test(href)) {
      // Resolve to absolute URL
      try {
        found = new URL(href, INDEX_URL).href;
      } catch {
        found = href; // already absolute
      }
    }
  });
  return found;
}

// ─── Post parsing ──────────────────────────────────────────────────────────────

/**
 * Parse the Wix/Ricos-rendered VECO post HTML.
 *
 * The post renders as SSR HTML. Day headings are bold underlined paragraphs.
 * Each event is a Ricos table with data-hook="table-plugin-cell" cells.
 *
 * Algorithm:
 *  1. Walk all block-level elements in document order.
 *  2. When a day-heading paragraph is found, update the current day context.
 *  3. When a Ricos table is found, extract the Time/Purpose/Areas rows.
 *  4. Combine with current day context to build a PowerAdvisory.
 */
export function parsePostHtml(
  html: string,
  sourceUrl: string,
  fetched_at: string
): PowerAdvisory[] {
  const $ = cheerio.load(html);
  const advisories: PowerAdvisory[] = [];

  // Derive advisory_week_start from the post title
  const title = $("title").first().text();
  const weekStart = extractWeekStart(title, sourceUrl);

  // Walk elements in document order
  let currentDate: string | null = null;

  // We need to process heading paragraphs and tables in order.
  // Select the rendered content area — it renders after position ~700k in HTML.
  // We rely on the data-hook="rcv-block1" and table-plugin markers.
  //
  // Strategy: collect all <p> and <table> elements that appear within the
  // main post article container. In Wix SSR, this is an article with id
  // containing "post" or within the blog-post viewer.
  //
  // Simpler: select ALL elements in document order and filter.

  $("p, table").each((_i, el) => {
    const tag = el.type === "tag" ? el.name : "";
    if (tag === "p") {
      const text = $(el).text().trim();
      const date = parseDayHeading(text);
      if (date) {
        currentDate = date;
      }
    } else if (tag === "table") {
      // Only process Ricos table-plugin tables
      const cells = $(el).find('[data-hook="table-plugin-cell"]');
      if (cells.length === 0) return; // not a content table
      if (!currentDate) return; // no date context yet — shouldn'"'"'t happen but skip

      const advisory = extractAdvisoryFromTable($, el, sourceUrl, fetched_at, currentDate, weekStart);
      if (advisory) advisories.push(advisory);
    }
  });

  return advisories;
}

// ─── Table extraction ──────────────────────────────────────────────────────────

/**
 * Extract a PowerAdvisory from a single Ricos table element.
 * Returns null if the table is not a valid interruption event.
 */
function extractAdvisoryFromTable(
  $: cheerio.CheerioAPI,
  tableEl: any,
  sourceUrl: string,
  fetched_at: string,
  date: string,
  advisory_week_start: string
): PowerAdvisory | null {
  // Extract cell text by (visual-col, visual-row)
  function cellText(col: number, row: number): string {
    return $(tableEl)
      .find(`[data-visual-col="${col}"][data-visual-row="${row}"]`)
      .text()
      .replace(/\s+/g, " ")
      .trim();
  }

  const timeLabel = cellText(0, 0).toLowerCase();
  const timeValue = cellText(1, 0);
  const purposeLabel = cellText(0, 1).toLowerCase();
  const purposeValue = cellText(1, 1);
  const areasLabel = cellText(0, 2).toLowerCase();
  const areasValue = cellText(1, 2);

  // Validate that this looks like an interruption table
  if (!timeLabel.includes("time") || !areasLabel.includes("areas")) {
    return null; // Not a standard interruption table
  }

  const notes: string[] = [];
  let parse_confidence: "high" | "low" = "high";

  // Parse time range
  const parsedTime = parseVECOTimeRange(timeValue);
  if (!parsedTime) {
    parse_confidence = "low";
    notes.push(`Could not parse time range: ${JSON.stringify(timeValue)}`);
  }

  // Parse purpose
  const purpose = purposeValue.trim();
  if (!purpose) {
    parse_confidence = "low";
    notes.push("Purpose field is empty");
  }

  // Parse areas
  const areas_affected_raw = areasValue.trim();
  if (!areas_affected_raw) {
    parse_confidence = "low";
    notes.push("Areas Affected field is empty");
  }

  // Extract city
  const city = extractCity(areas_affected_raw);
  if (!city) {
    parse_confidence = "low";
    notes.push(`Could not identify VECO city in: ${JSON.stringify(areas_affected_raw.slice(0, 80))}`);
  }

  // Extract barangay and streets (best-effort, no confidence impact)
  const barangay = city ? extractBarangay(areas_affected_raw, city) : [];
  const streets = extractStreets(areas_affected_raw);

  // Build ID from stable components
  const id = makeId(
    sourceUrl,
    date,
    parsedTime?.start_time ?? timeValue,
    areas_affected_raw
  );

  const advisory: PowerAdvisory = {
    id,
    source_url: sourceUrl,
    fetched_at,
    advisory_week_start,
    date,
    start_time: parsedTime?.start_time ?? "",
    end_time: parsedTime?.end_time ?? "",
    overnight_span: parsedTime?.overnight_span ?? false,
    duration_hours: parsedTime?.duration_hours ?? null,
    purpose: purpose || purposeValue,
    city: (city ?? "Cebu City") as VECOCity, // fallback for typing; parse_confidence already "low"
    barangay,
    streets,
    areas_affected_raw,
    lat: null,
    lon: null,
    coordinate_source: null,
    geocode_query: null,
    geocode_provider: null,
    business_confidence: "scheduled",
    parse_confidence,
    parse_notes: notes.length > 0 ? notes.join("; ") : null,
  };

  return advisory;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};

/**
 * Detect a day heading like "September 6, 2026 (Sunday)" and return ISO date.
 * Also handles spans like "September 10-11, 2026 (Thursday to Friday)" — uses first date.
 * Returns null if not a day heading.
 */
export function parseDayHeading(text: string): string | null {
  const m = text.match(/^(\w+)\s+(\d{1,2})(?:-\d{1,2})?,\s+(\d{4})\s*\(/);
  if (!m) return null;
  const month = MONTH_NAMES[m[1]];
  if (month === undefined) return null;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Derive advisory_week_start from the post title.
 * "Service Interruption: September 6-12, 2026" → "2026-09-06"
 * Falls back to source_url slug parsing on failure.
 */
function extractWeekStart(title: string, sourceUrl: string): string {
  const m = title.match(/:\s*(\w+)\s+(\d{1,2})/);
  if (m) {
    const month = MONTH_NAMES[m[1]];
    if (month !== undefined) {
      // We need the year — search in the URL or title
      const yearMatch = title.match(/(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        const day = parseInt(m[2], 10);
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }
  // Fallback: return today
  return new Date().toISOString().slice(0, 10);
}

// ─── Errors ────────────────────────────────────────────────────────────────────

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly sourceUrl: string
  ) {
    super(message);
    this.name = "ParseError";
  }
}
