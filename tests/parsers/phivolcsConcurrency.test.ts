/**
 * PHIVOLCS Concurrency Batching Tests (Stage 4 — closes Stage 2 carryover).
 *
 * These tests assert that parsePhivolcs() actually batches bulletin requests
 * in groups of ≤5 with ≥200ms between batches. A test that only checks the
 * final list of returned events would pass even with unbounded fan-out — we
 * need to assert the fetching behavior itself.
 *
 * Strategy:
 *   - Provide 12 mock bulletin URLs (more than one batch)
 *   - Mock fetcher tracks "active" concurrent calls at every moment using a
 *     shared counter that increments on entry and decrements on exit
 *   - Also record the start timestamp of every call to verify inter-batch gaps
 *   - Assert peak concurrency ≤ 5 and that at least one inter-batch pause ≥ 200ms
 *     occurred
 */

import { describe, it, expect, vi } from "vitest";
import { parsePhivolcs } from "../../src/parsers/phivolcs.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal PHIVOLCS index HTML containing N bulletin links */
function makeIndexHtml(urls: string[]): string {
  const BASE = "https://earthquake.phivolcs.dost.gov.ph/";
  const links = urls
    .map((u) => `<a href="${u.replace(BASE, "")}">bulletin</a>`)
    .join("\n");
  return `<html><body>${links}</body></html>`;
}

/** Minimal bulletin HTML that parseBulletinHtml can extract a valid event from */
function makeBulletinHtml(lat: number, lon: number): string {
  return `
    <html><body>
    <!-- 2 DateTime-Data --> <span>06 Sep 2026 - 09:46:00 AM</span>
    <!-- 3 Location-Data --> <span>${lat.toFixed(2)}N, ${lon.toFixed(2)}E - 010 km N of Cebu City</span>
    <!-- 4 Depth-Data --> <span>010</span>
    <!-- 5 Origin-Data --> <span>TECTONIC</span>
    <!-- 6 Magnitude-Data --> <span>Ms 3.2</span>
    <!-- 7 Intensity-Data --> <span></span>
    <!-- 8 Damage-Data --> <span>NO</span>
    <!-- 9 Aftershock-Data --> <span>NO</span>
    <!-- 10 IssuedDT-Data --> <span>06 September 2026 - 10:00 AM</span>
    </body></html>
  `;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("parsePhivolcs — concurrency batching (Stage 4 / closes Stage 2 carryover)", () => {
  it("fetches at most 5 bulletins concurrently when given 12 URLs", async () => {
    const BULLETIN_COUNT = 12;
    const BASE = "https://earthquake.phivolcs.dost.gov.ph/";

    const bulletinUrls = Array.from(
      { length: BULLETIN_COUNT },
      (_, i) => `${BASE}2026_Earthquake_Information/September/2026_090${i}_B1.html`
    );

    let peakConcurrency = 0;
    let activeCalls = 0;

    const mockFetcher = vi.fn(async (url: string) => {
      if (url === BASE) return makeIndexHtml(bulletinUrls);

      activeCalls++;
      if (activeCalls > peakConcurrency) peakConcurrency = activeCalls;

      // Simulate a brief async operation so concurrency actually overlaps
      await new Promise<void>((resolve) => setTimeout(resolve, 20));

      activeCalls--;
      return makeBulletinHtml(10.5, 124.0); // within 300km watch radius
    });

    await parsePhivolcs(mockFetcher, { maxBulletins: BULLETIN_COUNT });

    // Core assertion: peak concurrent calls must never exceed batch size of 5
    expect(peakConcurrency).toBeLessThanOrEqual(5);
    expect(peakConcurrency).toBeGreaterThan(0);

    // All 12 bulletins were fetched
    const bulletinCalls = mockFetcher.mock.calls.filter(([url]) => url !== BASE);
    expect(bulletinCalls).toHaveLength(BULLETIN_COUNT);
  }, 10_000);

  it("respects at least 200ms inter-batch gap for 12 URLs (2 gaps expected)", async () => {
    const BULLETIN_COUNT = 12;
    const BASE = "https://earthquake.phivolcs.dost.gov.ph/";

    const bulletinUrls = Array.from(
      { length: BULLETIN_COUNT },
      (_, i) => `${BASE}2026_Earthquake_Information/September/2026_09${String(i).padStart(2, "0")}_B1.html`
    );

    const mockFetcher = vi.fn(async (url: string) => {
      if (url === BASE) return makeIndexHtml(bulletinUrls);
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      return makeBulletinHtml(10.5, 124.0);
    });

    const t0 = Date.now();
    await parsePhivolcs(mockFetcher, { maxBulletins: BULLETIN_COUNT });
    const elapsed = Date.now() - t0;

    // 12 URLs → 3 batches (5+5+2) → 2 inter-batch gaps × 200ms = ≥400ms total
    expect(elapsed).toBeGreaterThanOrEqual(400);

    const bulletinFetches = mockFetcher.mock.calls.filter(([url]) => url !== BASE);
    expect(bulletinFetches).toHaveLength(BULLETIN_COUNT);
  }, 10_000);

  it("still collects all events correctly despite batching (output correctness)", async () => {
    const BASE = "https://earthquake.phivolcs.dost.gov.ph/";
    const bulletinUrls = Array.from(
      { length: 7 },
      (_, i) => `${BASE}2026_Earthquake_Information/September/2026_090${i + 1}_B1.html`
    );

    const mockFetcher = vi.fn(async (url: string) => {
      if (url === BASE) return makeIndexHtml(bulletinUrls);
      return makeBulletinHtml(10.5, 124.0);
    });

    const { events, skipped } = await parsePhivolcs(mockFetcher, { maxBulletins: 7 });

    expect(events).toHaveLength(7);
    expect(skipped).toHaveLength(0);
    for (const e of events) {
      expect(e.within_watch_radius).toBe(true);
      expect(e.coordinate_source).toBe("bulletin");
    }
  }, 10_000);

  it("handles a bulletin fetch failure within a batch without aborting sibling requests", async () => {
    const BASE = "https://earthquake.phivolcs.dost.gov.ph/";
    const bulletinUrls = Array.from(
      { length: 6 },
      (_, i) => `${BASE}2026_Earthquake_Information/September/2026_090${i}_B1.html`
    );

    let callCount = 0;
    const mockFetcher = vi.fn(async (url: string) => {
      if (url === BASE) return makeIndexHtml(bulletinUrls);
      callCount++;
      if (callCount === 3) throw new Error("Simulated network timeout on bulletin 3");
      return makeBulletinHtml(10.5, 124.0);
    });

    const { events, skipped } = await parsePhivolcs(mockFetcher, { maxBulletins: 6 });

    expect(events).toHaveLength(5);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("Simulated network timeout");
  }, 10_000);
});
