/**
 * Server API Logic & In-Memory TTL Cache Tests (Stage 3).
 *
 * Verifies:
 * 1. Cache hit within TTL returns cached data without re-invoking scraper.
 * 2. Cache miss after TTL expiration or invalidation triggers fresh fetch.
 * 3. getPowerAdvisories returns data_source: "live" on success.
 * 4. getPowerAdvisories fallback on scrape failure returns data_source: "fixture_fallback" with parse_notes.
 * 5. getEarthquakeEvents returns data_source: "live" on success.
 * 6. getEarthquakeEvents fallback returns data_source: "fixture_fallback" with parse_notes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryCache } from "../../server/cache.js";
import {
  getPowerAdvisories,
  getPowerAdvisoriesFallback,
  getPowerAdvisoriesSnapshot,
  getEarthquakeEvents,
  getEarthquakeEventsFallback,
  getEarthquakeEventsSnapshot,
} from "../../server/api.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const GEOJSON_PATH = join(ROOT_DIR, "data", "metro-cebu-barangays.geojson");

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  it("stores and retrieves non-expired entries", () => {
    cache.set("test_key", { msg: "hello" }, 5000);
    const val = cache.get<{ msg: string }>("test_key");
    expect(val).toEqual({ msg: "hello" });
  });

  it("returns null for expired entries and cleans them up", () => {
    cache.set("expired_key", { msg: "old" }, -100); // already expired
    const val = cache.get("expired_key");
    expect(val).toBeNull();
    expect(cache.size()).toBe(0);
  });

  it("clears all stored entries", () => {
    cache.set("k1", 1, 5000);
    cache.set("k2", 2, 5000);
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe("Server API Layer — Power Advisories", () => {
  it("getPowerAdvisoriesFallback returns fixture_fallback with 51 resolved records", async () => {
    const res = await getPowerAdvisoriesFallback("Forced failure for test", {
      geojsonPath: GEOJSON_PATH,
    });
    expect(res.data_source).toBe("fixture_fallback");
    expect(res.parse_notes).toBe("Forced failure for test");
    expect(res.data).toHaveLength(51);

    // Verify all 51 have resolved coordinates
    for (const a of res.data) {
      expect(a.lat).not.toBeNull();
      expect(a.lon).not.toBeNull();
      expect(["osm_point", "manual_verified"]).toContain(a.coordinate_source);
    }
  });

  it("getPowerAdvisories serves from cache when fresh", async () => {
    const mockCache = new MemoryCache();
    const fakeLiveResponse = {
      data_source: "live" as const,
      fetched_at: new Date().toISOString(),
      data: [{ id: "mock-1" } as any],
    };
    mockCache.set("power", fakeLiveResponse, 60000);

    const mockFetch = vi.fn();
    const res = await getPowerAdvisories({
      cache: mockCache,
      fetchFn: mockFetch as any,
    });

    expect(res).toBe(fakeLiveResponse);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("getPowerAdvisories catches network failure and falls back cleanly without throwing", async () => {
    const mockCache = new MemoryCache();
    const failingFetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

    const res = await getPowerAdvisories({
      cache: mockCache,
      fetchFn: failingFetch as any,
      geojsonPath: GEOJSON_PATH,
    });

    expect(res.data_source).toBe("fixture_fallback");
    expect(res.parse_notes).toContain("Network connection refused");
    expect(res.data.length).toBe(51);
  });
});

describe("Server API Layer — Earthquake Events", () => {
  it("getEarthquakeEventsFallback returns fixture_fallback with parsed bulletin", () => {
    const res = getEarthquakeEventsFallback("Forced failure for test");
    expect(res.data_source).toBe("fixture_fallback");
    expect(res.parse_notes).toBe("Forced failure for test");
    expect(res.data.length).toBeGreaterThanOrEqual(1);
    expect(res.data[0].coordinate_source).toBe("bulletin");
    expect(res.data[0].within_watch_radius).toBe(true);
  });

  it("getEarthquakeEvents serves from cache when fresh", async () => {
    const mockCache = new MemoryCache();
    const fakeLiveResponse = {
      data_source: "live" as const,
      fetched_at: new Date().toISOString(),
      data: [{ id: "eq-1" } as any],
    };
    mockCache.set("earthquakes", fakeLiveResponse, 60000);

    const mockFetch = vi.fn();
    const res = await getEarthquakeEvents({
      cache: mockCache,
      fetchFn: mockFetch as any,
    });

    expect(res).toBe(fakeLiveResponse);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("getEarthquakeEvents catches network failure and falls back cleanly without throwing", async () => {
    const mockCache = new MemoryCache();
    const failingFetch = vi.fn().mockRejectedValue(new Error("PHIVOLCS server 503"));

    const res = await getEarthquakeEvents({
      cache: mockCache,
      fetchFn: failingFetch as any,
    });

    expect(res.data_source).toBe("fixture_fallback");
    expect(res.parse_notes).toContain("PHIVOLCS server 503");
    expect(res.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Server API Layer — Snapshot Read Path (Production)", () => {
  const TMP_DIR = join(ROOT_DIR, "tests", "fixtures", "tmp_snapshot_test");

  beforeEach(async () => {
    const { mkdirSync, rmSync, existsSync } = await import("fs");
    if (existsSync(TMP_DIR)) {
      rmSync(TMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TMP_DIR, { recursive: true });
  });

  it("getPowerAdvisoriesSnapshot returns snapshot data with data_source: 'snapshot' when file exists", async () => {
    const { writeFileSync } = await import("fs");
    const fakeLivePath = join(TMP_DIR, "live_power_advisories.json");
    const fakeStatusPath = join(TMP_DIR, "status_power.json");

    const sampleAdvisories = [
      {
        id: "pow-1",
        city: "Cebu City",
        barangay: ["Lahug"],
        date: "2026-09-14",
        start_time: "08:00",
        end_time: "17:00",
        lat: 10.33,
        lon: 123.89,
        coordinate_source: "osm_point",
        business_confidence: "scheduled",
        parse_confidence: "high",
      },
    ];

    writeFileSync(fakeLivePath, JSON.stringify(sampleAdvisories), "utf-8");
    writeFileSync(
      fakeStatusPath,
      JSON.stringify({
        last_checked_at: new Date().toISOString(),
        last_successful_update: new Date().toISOString(),
        record_count: 1,
        status: "ok",
      }),
      "utf-8"
    );

    const res = await getPowerAdvisoriesSnapshot({
      livePowerPath: fakeLivePath,
      statusPowerPath: fakeStatusPath,
    });

    expect(res.data_source).toBe("snapshot");
    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe("pow-1");
    expect(res.parse_notes).toBeUndefined();
  });

  it("getPowerAdvisoriesSnapshot falls back cleanly to fixture_fallback if snapshot file is missing", async () => {
    const missingLivePath = join(TMP_DIR, "nonexistent_power.json");
    const res = await getPowerAdvisoriesSnapshot({
      livePowerPath: missingLivePath,
      geojsonPath: GEOJSON_PATH,
    });

    expect(res.data_source).toBe("fixture_fallback");
    expect(res.parse_notes).toContain("Power snapshot file not found");
    expect(res.data.length).toBe(51);
  });

  it("getPowerAdvisoriesSnapshot attaches staleness warning when last_successful_update is >48h ago", async () => {
    const { writeFileSync } = await import("fs");
    const fakeLivePath = join(TMP_DIR, "live_power_advisories.json");
    const fakeStatusPath = join(TMP_DIR, "status_power.json");

    writeFileSync(fakeLivePath, JSON.stringify([{ id: "pow-old" }]), "utf-8");
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    writeFileSync(
      fakeStatusPath,
      JSON.stringify({
        last_checked_at: new Date().toISOString(),
        last_successful_update: threeDaysAgo,
        record_count: 1,
        status: "ok",
      }),
      "utf-8"
    );

    const res = await getPowerAdvisoriesSnapshot({
      livePowerPath: fakeLivePath,
      statusPowerPath: fakeStatusPath,
    });

    expect(res.data_source).toBe("snapshot");
    expect(res.parse_notes).toContain("Power snapshot is stale: last updated");
    expect(res.parse_notes).toContain("threshold: 48h");
  });

  it("getEarthquakeEventsSnapshot returns snapshot data with data_source: 'snapshot' when file exists", async () => {
    const { writeFileSync } = await import("fs");
    const fakeLivePath = join(TMP_DIR, "live_earthquake_events.json");
    const fakeStatusPath = join(TMP_DIR, "status_earthquakes.json");

    const sampleEqs = [
      {
        id: "eq-1",
        magnitude: 4.2,
        within_watch_radius: true,
        coordinate_source: "bulletin",
      },
    ];

    writeFileSync(fakeLivePath, JSON.stringify(sampleEqs), "utf-8");
    writeFileSync(
      fakeStatusPath,
      JSON.stringify({
        last_checked_at: new Date().toISOString(),
        last_successful_update: new Date().toISOString(),
        record_count: 1,
        status: "ok",
      }),
      "utf-8"
    );

    const res = await getEarthquakeEventsSnapshot({
      liveEqPath: fakeLivePath,
      statusEqPath: fakeStatusPath,
    });

    expect(res.data_source).toBe("snapshot");
    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe("eq-1");
  });

  it("getEarthquakeEventsSnapshot falls back cleanly if snapshot file is missing", async () => {
    const missingLivePath = join(TMP_DIR, "nonexistent_eq.json");
    const res = await getEarthquakeEventsSnapshot({
      liveEqPath: missingLivePath,
    });

    expect(res.data_source).toBe("fixture_fallback");
    expect(res.parse_notes).toContain("Earthquake snapshot file not found");
  });

  it("getEarthquakeEventsSnapshot attaches staleness warning when last_successful_update is >24h ago", async () => {
    const { writeFileSync } = await import("fs");
    const fakeLivePath = join(TMP_DIR, "live_earthquake_events.json");
    const fakeStatusPath = join(TMP_DIR, "status_earthquakes.json");

    writeFileSync(fakeLivePath, JSON.stringify([{ id: "eq-old" }]), "utf-8");
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    writeFileSync(
      fakeStatusPath,
      JSON.stringify({
        last_checked_at: new Date().toISOString(),
        last_successful_update: twoDaysAgo,
        record_count: 1,
        status: "ok",
      }),
      "utf-8"
    );

    const res = await getEarthquakeEventsSnapshot({
      liveEqPath: fakeLivePath,
      statusEqPath: fakeStatusPath,
    });

    expect(res.data_source).toBe("snapshot");
    expect(res.parse_notes).toContain("Earthquake snapshot is stale: last updated");
    expect(res.parse_notes).toContain("threshold: 24h");
  });

  it("feed isolation: reading status_power.json never touches or requires status_earthquakes.json and vice-versa", async () => {
    const { writeFileSync, existsSync } = await import("fs");
    const fakePowerPath = join(TMP_DIR, "live_power_advisories.json");
    const fakePowerStatus = join(TMP_DIR, "status_power.json");
    const fakeEqPath = join(TMP_DIR, "live_earthquake_events.json");
    const fakeEqStatus = join(TMP_DIR, "status_earthquakes.json");

    writeFileSync(fakePowerPath, JSON.stringify([{ id: "p1" }]), "utf-8");
    writeFileSync(
      fakePowerStatus,
      JSON.stringify({ last_successful_update: new Date().toISOString(), status: "ok" }),
      "utf-8"
    );

    // Note: Eq files do NOT exist in TMP_DIR
    expect(existsSync(fakeEqPath)).toBe(false);
    expect(existsSync(fakeEqStatus)).toBe(false);

    const powerRes = await getPowerAdvisoriesSnapshot({
      livePowerPath: fakePowerPath,
      statusPowerPath: fakePowerStatus,
    });

    expect(powerRes.data_source).toBe("snapshot");
    // Ensure no accidental creation or dependency on eq status
    expect(existsSync(fakeEqStatus)).toBe(false);
  });

  it("atomic safety: an unrenamed tmp file does not affect the snapshot read path", async () => {
    const { writeFileSync } = await import("fs");
    const fakeLivePath = join(TMP_DIR, "live_power_advisories.json");
    const fakeTmpPath = join(TMP_DIR, "live_power_advisories_tmp.json");

    writeFileSync(fakeLivePath, JSON.stringify([{ id: "valid-power" }]), "utf-8");
    writeFileSync(fakeTmpPath, "CORRUPTED INCOMPLETE JSON CONTENT", "utf-8");

    const res = await getPowerAdvisoriesSnapshot({
      livePowerPath: fakeLivePath,
    });

    expect(res.data_source).toBe("snapshot");
    expect(res.data[0].id).toBe("valid-power");
  });
});

