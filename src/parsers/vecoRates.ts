/**
 * VECO Electricity Rate Announcement Parser (Stage 5 Discovery)
 *
 * Sourcing Discovery:
 * - VECO does not maintain a dedicated category page (e.g. /blog/rates returns 404).
 * - Rate announcements are published irregularly as blog posts under /post/...
 * - Deterministic discovery uses https://www.visayanelectric.com/blog-posts-sitemap.xml
 *   or content-matching heuristics on the advisory/blog index.
 */

import * as cheerio from "cheerio";
import { makeId } from "../utils/hash.js";
import type { ElectricityRate, ParseConfidence } from "../types/index.js";

/**
 * Heuristic to detect whether a blog title, heading, or slug corresponds to a rate adjustment.
 * Validated against historical post titles including:
 *   - 'Visayan Electric Keeps May Rate Increase Moderate Amid Fuel Cost Pressures and Grid Alerts'
 *   - 'Residential rate up by P0.95/kWh for September-October billing'
 *   - 'Visayan Electric Optimizes Supply Strategy to Cushion Impact on April Power Rates'
 *   - 'Visayan Electric shields consumers, limiting August rate adjustment to P0.06/kWh...'
 */
export function isRatePost(titleOrSlug: string): boolean {
  const norm = titleOrSlug.replace(/[-_]/g, " ");
  return (
    /(?:rate|rates|billing).*(?:kwh|per kilowatt-hour|increase|decrease|adjustment|impact|moderate|cushion|down|up|per kwh)/i.test(norm) ||
    /(?:residential rate|power rates|electricity rate)/i.test(norm)
  );
}

/**
 * Discover rate post URLs from VECO's blog-posts-sitemap.xml
 * Sorted by latest lastmod date descending.
 */
export function extractRateUrlsFromSitemap(sitemapXml: string): Array<{ url: string; lastmod?: string }> {
  const entries: Array<{ url: string; lastmod?: string }> = [];
  const matches = sitemapXml.matchAll(/<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g);
  for (const match of matches) {
    const url = match[1].trim();
    const lastmod = match[2] ? match[2].trim() : undefined;
    if (isRatePost(url)) {
      // Exclude unrelated procedural notices
      if (!/virtual-hearing|bidding|meters|photoshoot|erc-case/i.test(url)) {
        entries.push({ url, lastmod });
      }
    }
  }
  return entries.sort((a, b) => (b.lastmod || "").localeCompare(a.lastmod || ""));
}

/**
 * Clean HTML into plain text with normalised whitespace and decoded entities.
 * Isolates the first <article> element to prevent contamination from sidebar/footer widgets.
 */
export function cleanHtmlText(html: string): string {
  const $ = cheerio.load(html);
  const articleEl = $("article").first();
  const targetHtml = articleEl.length > 0 ? articleEl.html() ?? html : html;

  return targetHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract raw billing period label.
 * CRITICAL: Preserves verbatim bimonthly terminology ('September-October billing',
 * 'October–November billing', 'March to April billing') and calendar labels ('July 2026', 'May 2026', 'August').
 * Never force-normalises to a single calendar month when the source published a bimonthly cycle.
 */
export function extractBillingPeriod(text: string): string | null {
  // Pattern 1: 'for the October–November billing cycle' or 'for September-October billing'
  const p1 = text.match(/(?:for(?: the)?|in)\s+([A-Z][a-z]+(?:[–\-\s]+[A-Z][a-z]+)?\s+(?:billing(?: cycle)?|\d{4}))/i);
  if (p1) return p1[1].trim();

  // Pattern 2: 'for Mar-Apr billing' or 'for April - May billing'
  const p2 = text.match(/(?:for|in)\s+([A-Z][a-z]+(?:\s*[–\-]\s*[A-Z][a-z]+)?\s+billing)/i);
  if (p2) return p2[1].trim();

  // Pattern 3: 'residential electricity rate of Php 12.88 per kWh for May 2026'
  const p3 = text.match(/rate (?:of [^f]+ )?for\s+([A-Z][a-z]+(?:\s+\d{4})?)/i);
  if (p3) return p3[1].trim();

  // Pattern 4: 'limiting August rate adjustment' or 'push July 2026 residential rates'
  const p4 = text.match(/(?:limiting|rate for)\s+([A-Z][a-z]+)\s+rate adjustment/i) ||
             text.match(/(?:push|for)\s+([A-Z][a-z]+(?:\s+\d{4})?)\s+residential rates/i) ||
             text.match(/residential rate for\s+([A-Z][a-z]+)\s+settles at/i) ||
             text.match(/reduce\s+([A-Z][a-z]+)\s+rate impact/i);
  if (p4) return p4[1].trim();

  return null;
}

/**
 * Extract overall rate per kilowatt-hour (rate_per_kwh).
 */
export function extractRatePerKwh(text: string): number | null {
  // Pattern 1: 'overall residential rate ... settles at ₱14.96/kWh' or 'capped the rate at ₱14.90/kWh'
  const m1 = text.match(/(?:overall residential rate|total rate|residential rate)\s+(?:for\s+[A-Za-z]+\s+)?(?:settles at|down to|up to|to|at)\s+(?:Php|₱|P)\s*([\d\.]+)\s*(?:\/|\s*per\s*)kWh/i)
    || text.match(/capped the rate at\s+(?:Php|₱|P)\s*([\d\.]+)\s*\/kWh/i)
    || text.match(/(?:residential electricity rate of|rate of)\s+(?:Php|₱|P)\s*([\d\.]+)\s*(?:\/|\s*per\s*)kWh/i)
    || text.match(/(?:down to|up to)\s+(?:Php|₱|P)\s*([\d\.]+)\s*\/kWh/i);
  if (m1) return parseFloat(m1[1]);

  return null;
}

/**
 * Extract previous rate per kilowatt-hour when stated.
 */
export function extractPreviousRatePerKwh(text: string): number | null {
  const m = text.match(/(?:up from|down from|from last month['’]s|from)\s+(?:last month['’]s\s+)?(?:Php|₱|P)\s*([\d\.]+)\s*(?:\/|\s*per\s*)kWh/i);
  if (m) return parseFloat(m[1]);
  return null;
}

/**
 * Extract adjustment delta (e.g. +0.06 or -1.00 per kWh).
 */
export function extractDelta(text: string): number | null {
  const m1 = text.match(/(increase|reduction|decrease|adjustment|down by|up by)\s+(?:of|to)?\s*(?:a minimal\s+)?(?:Php|₱|P)\s*([\d\.]+)\s*(?:\/|\s*per\s*)(?:kWh|kilowatt-hour)/i)
    || text.match(/rate down by\s+(?:Php|₱|P)\s*([\d\.]+)\s*\/kWh/i);
  const m2 = text.match(/(?:Php|₱|P)\s*([\d\.]+)\s*(?:\/|\s*per\s*)kWh\s+(increase|reduction|decrease|adjustment)/i);

  if (m1) {
    const direction = m1[1].toLowerCase();
    const val = parseFloat(m1[2]);
    const isNegative = /reduction|decrease|down/.test(direction);
    return isNegative ? -val : val;
  } else if (m2) {
    const val = parseFloat(m2[1]);
    const direction = m2[2].toLowerCase();
    const isNegative = /reduction|decrease|down/.test(direction);
    return isNegative ? -val : val;
  }

  return null;
}

/**
 * Generate a short, copyright-safe paraphrased explanation for the rate adjustment.
 */
export function extractParaphrasedReason(text: string): string | null {
  const causes: string[] = [];
  if (/WESM|Wholesale Electricity Spot Market/i.test(text)) {
    if (/declined|lower|reduction/i.test(text)) {
      causes.push("lower WESM spot market generation charges");
    } else {
      causes.push("higher WESM spot market generation costs");
    }
  }
  if (/ERC|Energy Regulatory Commission/i.test(text)) {
    causes.push("ERC cost deferment mitigation");
  }
  if (/fuel/i.test(text)) {
    causes.push("global fuel price pressures");
  }
  if (/grid alerts|operating reserves|tight (?:supply|conditions)|shortages/i.test(text)) {
    causes.push("tight regional grid supply and operating reserve alerts");
  }
  if (/transmission/i.test(text)) {
    causes.push("transmission charge adjustments");
  }

  if (causes.length === 0) {
    return "Regular monthly utility rate adjustment.";
  }

  const summary = causes.join(", ");
  return summary.charAt(0).toUpperCase() + summary.slice(1) + ".";
}

/**
 * Parse a VECO rate announcement post HTML into an ElectricityRate record.
 */
export function parseRatePostHtml(
  html: string,
  url: string,
  fetched_at = new Date().toISOString()
): ElectricityRate {
  const notes: string[] = [];
  const text = cleanHtmlText(html);

  const billing_period_label = extractBillingPeriod(text);
  if (!billing_period_label) {
    notes.push("Missing billing period label");
  }

  const rate_per_kwh = extractRatePerKwh(text);
  if (rate_per_kwh === null) {
    notes.push("Missing rate per kWh");
  }

  let previous_rate_per_kwh = extractPreviousRatePerKwh(text);
  let delta = extractDelta(text);

  // Cross-compute delta or previous rate if one was stated and the other can be derived
  if (rate_per_kwh !== null && previous_rate_per_kwh !== null && delta === null) {
    delta = Math.round((rate_per_kwh - previous_rate_per_kwh) * 100) / 100;
  } else if (rate_per_kwh !== null && delta !== null && previous_rate_per_kwh === null) {
    previous_rate_per_kwh = Math.round((rate_per_kwh - delta) * 100) / 100;
  }

  const reason = extractParaphrasedReason(text);

  const isComplete = billing_period_label !== null && rate_per_kwh !== null;
  const parse_confidence: ParseConfidence = isComplete ? "high" : "low";

  const id = makeId(url, billing_period_label ?? "unknown-period");

  return {
    id,
    source_url: url,
    fetched_at,
    billing_period_label: billing_period_label ?? "Unknown",
    rate_per_kwh: rate_per_kwh ?? 0,
    previous_rate_per_kwh,
    delta,
    reason,
    parse_confidence,
    parse_notes: notes.length > 0 ? notes.join("; ") : null,
  };
}
