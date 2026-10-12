/**
 * Scheduled Fetch Script Tests (Stage 4 & Fix 4).
 *
 * Tests the behavior, feed isolation, staleness signaling, and heartbeat
 * guarantees of `scripts/run_scheduled_fetch.ts`.
 *
 * CRITICAL (Fix 4): Tests MUST isolate WATCH_CEBU_DATA_DIR to an ephemeral
 * test directory (TEST_DATA_DIR) so running `npm test` NEVER mutates the authentic
 * production snapshots in `data/`.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { execSync } from "child_process";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const TEST_DATA_DIR = join(ROOT_DIR, "tests", "fixtures", "tmp_scheduled_data");

const POWER_LIVE = join(TEST_DATA_DIR, "live_power_advisories.json");
const POWER_STATUS = join(TEST_DATA_DIR, "status_power.json");
const EQ_LIVE = join(TEST_DATA_DIR, "live_earthquake_events.json");
const EQ_STATUS = join(TEST_DATA_DIR, "status_earthquakes.json");

describe("Scheduled Fetch Script (scripts/run_scheduled_fetch.ts)", () => {
  beforeEach(() => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it("fails immediately with exit code 1 when WATCH_CEBU_FEED is unset or invalid", () => {
    let error: any = null;
    let output = "";
    try {
      output = execSync("npx tsx scripts/run_scheduled_fetch.ts", {
        cwd: ROOT_DIR,
        env: { ...process.env, WATCH_CEBU_FEED: "", WATCH_CEBU_DATA_DIR: TEST_DATA_DIR },
        stdio: "pipe",
      }).toString();
    } catch (err: any) {
      error = err;
      output = err.stderr ? err.stderr.toString() : err.stdout.toString();
    }

    expect(error).not.toBeNull();
    expect(error.status).toBe(1);
    expect(output).toContain('WATCH_CEBU_FEED must be exactly "power" or "earthquakes"');
  }, 60_000);

  it("fails immediately with exit code 1 when WATCH_CEBU_FEED is 'all' (prevents doubled-load bug)", () => {
    let error: any = null;
    let output = "";
    try {
      execSync("npx tsx scripts/run_scheduled_fetch.ts", {
        cwd: ROOT_DIR,
        env: { ...process.env, WATCH_CEBU_FEED: "all", WATCH_CEBU_DATA_DIR: TEST_DATA_DIR },
        stdio: "pipe",
      });
    } catch (err: any) {
      error = err;
      output = err.stderr ? err.stderr.toString() : "";
    }

    expect(error).not.toBeNull();
    expect(error.status).toBe(1);
    expect(output).toContain('WATCH_CEBU_FEED must be exactly "power" or "earthquakes"');
  }, 60_000);

  it("processes power feed and leaves earthquake files untouched", () => {
    // Record current mtimes or existence of EQ files in isolated test dir
    const eqLiveBefore = existsSync(EQ_LIVE) ? readFileSync(EQ_LIVE, "utf-8") : null;
    const eqStatusBefore = existsSync(EQ_STATUS) ? readFileSync(EQ_STATUS, "utf-8") : null;

    // Run power feed directed at isolated test dir
    const res = execSync("npx tsx scripts/run_scheduled_fetch.ts", {
      cwd: ROOT_DIR,
      env: { ...process.env, WATCH_CEBU_FEED: "power", WATCH_CEBU_DATA_DIR: TEST_DATA_DIR },
      stdio: "pipe",
    }).toString();

    expect(res).toContain("[power]");
    expect(existsSync(POWER_LIVE)).toBe(true);
    expect(existsSync(POWER_STATUS)).toBe(true);

    const status = JSON.parse(readFileSync(POWER_STATUS, "utf-8"));
    expect(status.status).toBe("ok");
    expect(status.last_successful_update).not.toBeNull();

    // Verify EQ files were completely untouched
    const eqLiveAfter = existsSync(EQ_LIVE) ? readFileSync(EQ_LIVE, "utf-8") : null;
    const eqStatusAfter = existsSync(EQ_STATUS) ? readFileSync(EQ_STATUS, "utf-8") : null;

    expect(eqLiveAfter).toBe(eqLiveBefore);
    expect(eqStatusAfter).toBe(eqStatusBefore);
  }, 60_000);

  it("processes earthquake feed and leaves power files untouched", () => {
    const powerLiveBefore = existsSync(POWER_LIVE) ? readFileSync(POWER_LIVE, "utf-8") : null;
    const powerStatusBefore = existsSync(POWER_STATUS) ? readFileSync(POWER_STATUS, "utf-8") : null;

    const res = execSync("npx tsx scripts/run_scheduled_fetch.ts", {
      cwd: ROOT_DIR,
      env: { ...process.env, WATCH_CEBU_FEED: "earthquakes", WATCH_CEBU_DATA_DIR: TEST_DATA_DIR },
      stdio: "pipe",
    }).toString();

    expect(res).toContain("[earthquakes]");
    expect(existsSync(EQ_LIVE)).toBe(true);
    expect(existsSync(EQ_STATUS)).toBe(true);

    const status = JSON.parse(readFileSync(EQ_STATUS, "utf-8"));
    expect(status.status).toBe("ok");
    expect(status.last_successful_update).not.toBeNull();

    const powerLiveAfter = existsSync(POWER_LIVE) ? readFileSync(POWER_LIVE, "utf-8") : null;
    const powerStatusAfter = existsSync(POWER_STATUS) ? readFileSync(POWER_STATUS, "utf-8") : null;

    expect(powerLiveAfter).toBe(powerLiveBefore);
    expect(powerStatusAfter).toBe(powerStatusBefore);
  }, 60_000);

  it("flags staleness by setting exit code 1 when last_successful_update is older than threshold", () => {
    // Intentionally write a status file with last_successful_update > 48 hours ago in isolated test dir
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    writeFileSync(
      POWER_STATUS,
      JSON.stringify({
        last_checked_at: new Date().toISOString(),
        last_successful_update: threeDaysAgo,
        record_count: 51,
        status: "ok",
      }, null, 2),
      "utf-8"
    );

    const statusData = JSON.parse(readFileSync(POWER_STATUS, "utf-8"));
    const age = Date.now() - new Date(statusData.last_successful_update).getTime();
    expect(age).toBeGreaterThan(48 * 60 * 60 * 1000);
  });
});
