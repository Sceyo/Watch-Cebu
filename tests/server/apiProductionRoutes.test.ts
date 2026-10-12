/**
 * Production API Routes & GitHub Snapshot Source Tests (Fix 2 & ADR-005).
 *
 * Verifies:
 * 1. GitHubSnapshotSource constructs URLs matching the pinned public repo and branch.
 * 2. Successful GitHub fetch returns data_source: "snapshot" with status parsed.
 * 3. Network or HTTP failure falls back cleanly to data_source: "fixture_fallback" with parse_notes.
 * 4. api/power.ts and api/earthquakes.ts set proper CDN caching headers
 *    (Cache-Control: s-maxage=60, stale-while-revalidate=300).
 * 5. Both Web standard GET() and Node handler(req, res) interfaces are supported.
 */

import { describe, it, expect, vi } from "vitest";
import {
  GitHubSnapshotSource,
  getPowerAdvisoriesSnapshot,
  getEarthquakeEventsSnapshot,
} from "../../server/api.js";
import powerHandler, { GET as powerGet } from "../../api/power.js";
import earthquakesHandler, { GET as earthquakesGet } from "../../api/earthquakes.js";

describe("GitHubSnapshotSource (ADR-005)", () => {
  it("defaults to pinned repo owner 'Sceyo', repo 'Watch-Cebu', and branch 'main'", () => {
    const source = new GitHubSnapshotSource();
    expect(source.getBaseUrl()).toBe(
      "https://raw.githubusercontent.com/Sceyo/Watch-Cebu/main/data"
    );
  });

  it("allows custom repo, branch, or baseUrl configuration", () => {
    const source = new GitHubSnapshotSource({
      repoOwner: "CustomUser",
      repoName: "CustomRepo",
      branch: "staging",
    });
    expect(source.getBaseUrl()).toBe(
      "https://raw.githubusercontent.com/CustomUser/CustomRepo/staging/data"
    );
  });

  it("successfully reads power snapshot and status via mock fetch", async () => {
    const mockAdvisories = [{ id: "pow-1", city: "Cebu City" }];
    const mockStatus = {
      last_checked_at: new Date().toISOString(),
      last_successful_update: new Date().toISOString(),
      record_count: 1,
      status: "ok",
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("live_power_advisories.json")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => mockAdvisories,
        };
      }
      if (url.includes("status_power.json")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => mockStatus,
        };
      }
      return { ok: false, status: 404, statusText: "Not Found" };
    });

    const source = new GitHubSnapshotSource({ fetchFn: mockFetch as any });
    const result = await source.readPowerSnapshot();

    expect(result).not.toBeNull();
    expect(result?.data).toEqual(mockAdvisories);
    expect(result?.status).toEqual(mockStatus);
  });

  it("successfully reads earthquake snapshot and status via mock fetch", async () => {
    const mockEvents = [{ id: "eq-1", magnitude: 4.2 }];
    const mockStatus = {
      last_checked_at: new Date().toISOString(),
      last_successful_update: new Date().toISOString(),
      record_count: 1,
      status: "ok",
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("live_earthquake_events.json")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => mockEvents,
        };
      }
      if (url.includes("status_earthquakes.json")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => mockStatus,
        };
      }
      return { ok: false, status: 404, statusText: "Not Found" };
    });

    const source = new GitHubSnapshotSource({ fetchFn: mockFetch as any });
    const result = await source.readEarthquakeSnapshot();

    expect(result).not.toBeNull();
    expect(result?.data).toEqual(mockEvents);
    expect(result?.status).toEqual(mockStatus);
  });
});

describe("Serverless Snapshot Fallback & Staleness Logic", () => {
  it("getPowerAdvisoriesSnapshot falls back cleanly to fixture_fallback when GitHub raw fetch fails", async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error("Network timeout contacting raw.githubusercontent.com"));
    const source = new GitHubSnapshotSource({ fetchFn: failingFetch as any });

    const res = await getPowerAdvisoriesSnapshot({ snapshotSource: source });

    expect(res.data_source).toBe("fixture_fallback");
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.parse_notes).toContain("Power snapshot read failed");
    expect(res.parse_notes).toContain("Network timeout contacting raw.githubusercontent.com");
  });

  it("getEarthquakeEventsSnapshot falls back cleanly to fixture_fallback when GitHub raw fetch fails", async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error("DNS lookup failure"));
    const source = new GitHubSnapshotSource({ fetchFn: failingFetch as any });

    const res = await getEarthquakeEventsSnapshot({ snapshotSource: source });

    expect(res.data_source).toBe("fixture_fallback");
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.parse_notes).toContain("Earthquake snapshot read failed");
  });

  it("attaches staleness note when remote status last_successful_update exceeds 48h for power", async () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("live_power_advisories.json")) {
        return { ok: true, status: 200, json: async () => [{ id: "p1" }] };
      }
      if (url.includes("status_power.json")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            last_checked_at: new Date().toISOString(),
            last_successful_update: threeDaysAgo,
            status: "ok",
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const source = new GitHubSnapshotSource({ fetchFn: mockFetch as any });
    const res = await getPowerAdvisoriesSnapshot({ snapshotSource: source });

    expect(res.data_source).toBe("snapshot");
    expect(res.parse_notes).toContain("Power snapshot is stale: last updated");
    expect(res.parse_notes).toContain("threshold: 48h");
  });
});

describe("Vercel Serverless Function Endpoints (/api/power & /api/earthquakes)", () => {
  it("api/power handler sets CDN caching headers for Node req/res", async () => {
    const headers: Record<string, string> = {};
    let statusCode = 0;
    let body = "";

    const mockRes = {
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
      },
      statusCode: 200,
      end: (data: string) => {
        body = data;
      },
    };

    await powerHandler({}, mockRes);

    expect(headers["content-type"]).toContain("application/json");
    expect(headers["cache-control"]).toBe("s-maxage=60, stale-while-revalidate=300");

    const json = JSON.parse(body);
    expect(json).toHaveProperty("data_source");
    expect(json).toHaveProperty("data");
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("api/earthquakes handler sets CDN caching headers for Node req/res", async () => {
    const headers: Record<string, string> = {};
    let body = "";

    const mockRes = {
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
      },
      statusCode: 200,
      end: (data: string) => {
        body = data;
      },
    };

    await earthquakesHandler({}, mockRes);

    expect(headers["content-type"]).toContain("application/json");
    expect(headers["cache-control"]).toBe("s-maxage=60, stale-while-revalidate=300");

    const json = JSON.parse(body);
    expect(json).toHaveProperty("data_source");
    expect(json).toHaveProperty("data");
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("api/power GET() returns standard Web Response with CDN cache header", async () => {
    const request = new Request("https://watch-cebu.vercel.app/api/power");
    const response = await powerGet(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("s-maxage=60, stale-while-revalidate=300");

    const json = await response.json();
    expect(json).toHaveProperty("data_source");
    expect(json).toHaveProperty("data");
  });

  it("api/earthquakes GET() returns standard Web Response with CDN cache header", async () => {
    const request = new Request("https://watch-cebu.vercel.app/api/earthquakes");
    const response = await earthquakesGet(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("s-maxage=60, stale-while-revalidate=300");

    const json = await response.json();
    expect(json).toHaveProperty("data_source");
    expect(json).toHaveProperty("data");
  });
});
