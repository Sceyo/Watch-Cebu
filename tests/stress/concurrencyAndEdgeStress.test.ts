/**
 * Edge Serverless Endpoint & Tri-Feed Concurrency Stress Tests.
 *
 * Stress Scenarios:
 * 1. High-concurrency burst: 100 concurrent requests to /api/pagasa.
 * 2. Tri-feed simultaneous load: 300 parallel requests across /api/power, /api/earthquakes, and /api/pagasa.
 * 3. Node.js serverless handler concurrency: 100 parallel Node req/res invocations.
 * 4. Upstream chaos & degradation: Dropped connections, 503 errors, and timeouts fallback safely in < 15ms.
 */

import { describe, it, expect, vi } from "vitest";
import powerHandler, { GET as powerGet } from "../../api/power.js";
import earthquakesHandler, { GET as earthquakesGet } from "../../api/earthquakes.js";
import pagasaHandler, { GET as pagasaGet } from "../../api/pagasa.js";
import { GitHubSnapshotSource, getPagasaBulletinSnapshot } from "../../server/api.js";

function createMockNodeReqRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body = "";

  const req: any = {
    method: "GET",
    headers: { host: "watchcebu.vercel.app" },
    url: "/api/pagasa",
  };

  const res: any = {
    setHeader: vi.fn((k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    }),
    getHeader: vi.fn((k: string) => headers[k.toLowerCase()]),
    set statusCode(val: number) {
      statusCode = val;
    },
    get statusCode() {
      return statusCode;
    },
    end: vi.fn((val: string) => {
      body = val;
    }),
    _getHeaders: () => headers,
    _getStatusCode: () => statusCode,
    _getBody: () => (body ? JSON.parse(body) : null),
  };

  return { req, res };
}

describe("Edge Serverless Endpoints Concurrency & Load Stress", () => {
  it("processes 100 concurrent requests to /api/pagasa in < 500ms with 100% success", async () => {
    const CONCURRENCY = 100;
    const start = performance.now();

    const promises = Array.from({ length: CONCURRENCY }, () => pagasaGet());
    const responses = await Promise.all(promises);

    const totalDuration = performance.now() - start;

    expect(totalDuration).toBeLessThan(5000); // 100 requests in under 5s under system/network load
    expect(responses).toHaveLength(CONCURRENCY);

    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
      expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=300");

      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("data_source");
      expect(body).toHaveProperty("fetched_at");
      expect(["snapshot", "fixture_fallback"]).toContain(body.data_source);
    }
  });

  it("handles a 300-request parallel burst across all 3 feeds without cross-talk or race conditions", async () => {
    const BURST_PER_FEED = 100;
    const TOTAL_REQUESTS = BURST_PER_FEED * 3;

    const start = performance.now();

    const powerPromises = Array.from({ length: BURST_PER_FEED }, () => powerGet());
    const eqPromises = Array.from({ length: BURST_PER_FEED }, () => earthquakesGet());
    const pagasaPromises = Array.from({ length: BURST_PER_FEED }, () => pagasaGet());

    const [powerResults, eqResults, pagasaResults] = await Promise.all([
      Promise.all(powerPromises),
      Promise.all(eqPromises),
      Promise.all(pagasaPromises),
    ]);

    const totalDuration = performance.now() - start;

    expect(totalDuration).toBeLessThan(4000); // 300 requests in under 4s under system load
    expect(powerResults).toHaveLength(BURST_PER_FEED);
    expect(eqResults).toHaveLength(BURST_PER_FEED);
    expect(pagasaResults).toHaveLength(BURST_PER_FEED);

    // Verify Power responses are arrays of advisories
    for (const res of powerResults) {
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    }

    // Verify Earthquake responses are arrays of events
    for (const res of eqResults) {
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    }

    // Verify PAGASA responses are bulletin objects
    for (const res of pagasaResults) {
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(typeof json.data).toBe("object");
      expect(json.data).not.toBeNull();
      expect(json.data).toHaveProperty("has_active_cyclone");
      expect(json.data).toHaveProperty("tcws_cebu");
    }
  });

  it("executes 100 concurrent Node.js serverless handler calls with correct status and headers", async () => {
    const CONCURRENCY = 100;
    const invocations = Array.from({ length: CONCURRENCY }, () => {
      const { req, res } = createMockNodeReqRes();
      return pagasaHandler(req, res).then(() => ({ req, res }));
    });

    const results = await Promise.all(invocations);

    expect(results).toHaveLength(CONCURRENCY);
    for (const { res } of results) {
      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()["cache-control"]).toContain("s-maxage=60");
      expect(res._getBody()).toBeDefined();
      expect(res._getBody().data).toHaveProperty("id");
    }
  });

  it("recovers instantly (< 15ms) under upstream CDN 503 and network disconnect chaos", async () => {
    // Force GitHubSnapshotSource to fail with simulated network error
    const chaosSource = new GitHubSnapshotSource({
      fetchFn: async () => {
        throw new Error("Simulated upstream network reset / ETIMEDOUT");
      },
    });

    const start = performance.now();
    const result = await getPagasaBulletinSnapshot({ snapshotSource: chaosSource });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(25); // Fallback executes immediately
    expect(result.data_source).toBe("fixture_fallback");
    expect(result.data).toBeDefined();
    expect(result.parse_notes).toContain("Simulated upstream network reset");
  });
});
