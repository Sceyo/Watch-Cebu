/**
 * VECO Rate Detection Discovery Tests (Stage 5 Discovery)
 *
 * Verifies rate discovery and parsing heuristics across real historical posts.
 * Exit criteria for Stage 5 Discovery:
 * - isRatePost catches diverse headline patterns including the 3 required prompts.
 * - At least 5 real historical posts parse cleanly with high confidence.
 * - Raw billing-period labels are preserved verbatim (including bimonthly terminology).
 * - Extracts rate_per_kwh, previous_rate_per_kwh, delta, and paraphrased reason.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  isRatePost,
  extractBillingPeriod,
  extractRatePerKwh,
  extractDelta,
  extractPreviousRatePerKwh,
  parseRatePostHtml,
} from "../../src/parsers/vecoRates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ratesDir = join(__dirname, "../fixtures/rates");

describe("VECO Rate Detection Discovery — Heuristic Headline Validation", () => {
  it("matches all three required test headlines from Stage 5 specification", () => {
    const h1 = "Visayan Electric Keeps May Rate Increase Moderate Amid Fuel Cost Pressures and Grid Alerts";
    const h2 = "Residential rate up by P0.95/kWh for September-October billing";
    const h3 = "Visayan Electric Optimizes Supply Strategy to Cushion Impact on April Power Rates";

    expect(isRatePost(h1)).toBe(true);
    expect(isRatePost(h2)).toBe(true);
    expect(isRatePost(h3)).toBe(true);
  });

  it("matches diverse real rate slugs and headlines", () => {
    expect(isRatePost("visayan-electric-shields-consumers-limiting-august-rate-adjustment-to-p0-06-kwh-versus-projected-p")).toBe(true);
    expect(isRatePost("visayan-electric-secures-erc-approval-to-reduce-july-rate-impact-on-consumers")).toBe(true);
    expect(isRatePost("visayanelectricresidentialratedownby-1-00-kwhforoctober-novemberbilling")).toBe(true);
    expect(isRatePost("residential-rates-down-by-p0-49-kwh-for-mar-apr-billing")).toBe(true);
    expect(isRatePost("residential-rates-up-by-p1-14-kwh-for-april-may-billing")).toBe(true);
  });

  it("does not false-positive on unrelated company posts", () => {
    expect(isRatePost("corporate-photoshoot")).toBe(false);
    expect(isRatePost("visayan-electric-celebrates-5th-year-with-cebu-a-park")).toBe(false);
    expect(isRatePost("iso-certification-for-integrated-management-systems-ims")).toBe(false);
  });
});

describe("VECO Rate Detection Discovery — 5 Real Historical Posts Parsing", () => {
  let aug2026Html: string;
  let jul2026Html: string;
  let may2026Html: string;
  let sepOct2025Html: string;
  let octNov2025Html: string;

  beforeAll(() => {
    aug2026Html = readFileSync(join(ratesDir, "veco_rate_aug_2026.html"), "utf-8");
    jul2026Html = readFileSync(join(ratesDir, "veco_rate_jul_2026.html"), "utf-8");
    may2026Html = readFileSync(join(ratesDir, "veco_rate_may_2026.html"), "utf-8");
    sepOct2025Html = readFileSync(join(ratesDir, "veco_rate_sep_oct_2025.html"), "utf-8");
    octNov2025Html = readFileSync(join(ratesDir, "veco_rate_oct_nov_2025.html"), "utf-8");
  });

  it("Post 1 (August 2026): parses rate, minimal delta, and preserves August period", () => {
    const url = "https://www.visayanelectric.com/post/visayan-electric-shields-consumers-limiting-august-rate-adjustment-to-p0-06-kwh-versus-projected-p";
    const record = parseRatePostHtml(aug2026Html, url, "2026-08-20T00:00:00Z");

    expect(record.rate_per_kwh).toBe(14.96);
    expect(record.delta).toBe(0.06);
    expect(record.previous_rate_per_kwh).toBe(14.90);
    expect(record.billing_period_label).toBe("August");
    expect(record.parse_confidence).toBe("high");
    expect(record.reason).toMatch(/ERC cost deferment/i);
    expect(record.id).toMatch(/^[a-f0-9]{64}$/);
  });

  it("Post 2 (July 2026): parses capped rate, previous June rate, and July 2026 label", () => {
    const url = "https://www.visayanelectric.com/post/visayan-electric-secures-erc-approval-to-reduce-july-rate-impact-on-consumers";
    const record = parseRatePostHtml(jul2026Html, url, "2026-07-18T00:00:00Z");

    expect(record.rate_per_kwh).toBe(14.90);
    expect(record.previous_rate_per_kwh).toBe(13.74);
    expect(record.delta).toBe(1.16);
    expect(record.billing_period_label).toBe("July 2026");
    expect(record.parse_confidence).toBe("high");
    expect(record.reason).toMatch(/ERC cost deferment/i);
  });

  it("Post 3 (May 2026): parses May 2026 rate and fuel/grid pressure explanation", () => {
    const url = "https://www.visayanelectric.com/post/visayan-electric-keeps-may-rate-increase-moderate-amid-fuel-cost-pressures-and-grid-alerts";
    const record = parseRatePostHtml(may2026Html, url, "2026-05-22T00:00:00Z");

    expect(record.rate_per_kwh).toBe(12.88);
    expect(record.delta).toBe(0.31);
    expect(record.previous_rate_per_kwh).toBe(12.57);
    expect(record.billing_period_label).toBe("May 2026");
    expect(record.parse_confidence).toBe("high");
    expect(record.reason).toMatch(/fuel price pressures|grid supply/i);
  });

  it("Post 4 (September-October 2025): preserves raw bimonthly label and WESM rationale", () => {
    const url = "https://www.visayanelectric.com/post/residential-rate-up-by-p0-92-kwh-for-september-october-billing";
    const record = parseRatePostHtml(sepOct2025Html, url, "2025-09-16T00:00:00Z");

    expect(record.rate_per_kwh).toBe(12.51);
    expect(record.delta).toBe(0.92);
    expect(record.billing_period_label).toBe("September-October billing");
    expect(record.parse_confidence).toBe("high");
    expect(record.reason).toMatch(/WESM spot market/i);
  });

  it("Post 5 (October–November 2025): parses negative delta and raw bimonthly label", () => {
    const url = "https://www.visayanelectric.com/post/visayanelectricresidentialratedownby-1-00-kwhforoctober-novemberbilling";
    const record = parseRatePostHtml(octNov2025Html, url, "2025-10-22T00:00:00Z");

    expect(record.rate_per_kwh).toBe(11.51);
    expect(record.previous_rate_per_kwh).toBe(12.51);
    expect(record.delta).toBe(-1.00);
    expect(record.billing_period_label).toBe("October–November billing");
    expect(record.parse_confidence).toBe("high");
    expect(record.reason).toMatch(/lower WESM spot market/i);
  });
});
