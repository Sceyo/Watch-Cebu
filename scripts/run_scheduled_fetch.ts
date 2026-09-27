/**
 * Watch Cebu — Scheduled Data Fetch Script
 *
 * Invoked by two independent GitHub Actions workflows:
 *   - refresh-power.yml     (WATCH_CEBU_FEED=power,       every 4 hours)
 *   - refresh-earthquakes.yml (WATCH_CEBU_FEED=earthquakes, every 10 minutes)
 *
 * CRITICAL: This script operates on exactly ONE feed per invocation, determined
 * by the WATCH_CEBU_FEED environment variable. If the variable is missing or
 * invalid, the script exits 1 immediately without touching any data files.
 * This is the design that prevents the "doubled-load" bug where two workflows
 * each scrape both sources — the script itself enforces the boundary, not just
 * workflow configuration that could drift.
 *
 * Per-feed file ownership (ADR 2 — eliminates race conditions):
 *   power feed:       data/live_power_advisories.json  +  data/status_power.json
 *   earthquake feed:  data/live_earthquake_events.json +  data/status_earthquakes.json
 *
 * Each feed's workflow owns a disjoint set of files. Two concurrent runs can
 * never race each other in git or in application logic.
 *
 * Atomic writes:
 *   Data is written to a _tmp file first, then renamed only on verified success.
 *   A failed run leaves the previous snapshot byte-for-byte intact.
 *
 * Heartbeat (ADR 1 §4.1):
 *   The status file is written on EVERY run — pass or fail — guaranteeing
 *   repository activity independent of whether the upstream source cooperates.
 *   This prevents GitHub's 60-day workflow auto-disable from stacking on top
 *   of an underlying outage.
 *
 * Staleness exit code:
 *   If the feed's last_successful_update is older than the threshold
 *   (48h power / 24h earthquakes), the script logs a STALE warning and sets
 *   process.exitCode = 1. The GitHub Actions workflow uses continue-on-error: true
 *   on this step so the heartbeat commit still runs even when the script exits 1.
 *
 * Security:
 *   Both VECO and PHIVOLCS are public, unauthenticated endpoints. No API keys,
 *   tokens, or secrets are needed. This is intentional and should not be "fixed"
 *   by adding credentials — document any future change that requires auth.
 *
 * Logging:
 *   All log lines include ISO timestamps and name which feed is being processed.
 *   No user PII is ever captured — logs contain only timestamps, URLs, record
 *   counts, and error messages, all of which are public information.
 */

import { writeFileSync, readFileSync, renameSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Import the same scrape-live functions used by the dev server — no logic duplication.
// The scheduled job IS the scrape-live path; the snapshot functions just read what this writes.
import { getPowerAdvisories, getEarthquakeEvents, FeedStatus } from "../server/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Project root resolution ───────────────────────────────────────────────────

function getProjectRoot(): string {
  let cur = __dirname;
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(cur, "data", "metro-cebu-barangays.geojson"))) return cur;
    cur = dirname(cur);
  }
  return process.cwd();
}

const ROOT_DIR = getProjectRoot();
const DATA_DIR = join(ROOT_DIR, "data");

// ─── Staleness thresholds (must match server/api.ts) ──────────────────────────

const STALE_POWER_MS = 48 * 60 * 60 * 1000; // 48 hours
const STALE_EQ_MS   = 24 * 60 * 60 * 1000;  // 24 hours

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] [${FEED}] ${msg}`);
}

function logErr(msg: string) {
  console.error(`[${new Date().toISOString()}] [${FEED}] ERROR: ${msg}`);
}

// ─── Feed validation ──────────────────────────────────────────────────────────

const FEED = process.env.WATCH_CEBU_FEED;

if (FEED !== "power" && FEED !== "earthquakes") {
  console.error(
    `[run_scheduled_fetch] FATAL: WATCH_CEBU_FEED must be exactly "power" or "earthquakes".` +
    ` Got: ${JSON.stringify(FEED)}. Exiting without touching any data files.`
  );
  process.exit(1);
}

// ─── File paths (per-feed — each feed owns exactly two files) ─────────────────

const LIVE_PATH   = FEED === "power"
  ? join(DATA_DIR, "live_power_advisories.json")
  : join(DATA_DIR, "live_earthquake_events.json");

const TMP_PATH    = LIVE_PATH.replace(".json", "_tmp.json");

const STATUS_PATH = FEED === "power"
  ? join(DATA_DIR, "status_power.json")
  : join(DATA_DIR, "status_earthquakes.json");

const STALE_MS    = FEED === "power" ? STALE_POWER_MS : STALE_EQ_MS;

// ─── Status file helpers ───────────────────────────────────────────────────────

function readPreviousStatus(): FeedStatus | null {
  if (!existsSync(STATUS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATUS_PATH, "utf-8")) as FeedStatus;
  } catch {
    return null;
  }
}

function writeStatus(status: FeedStatus): void {
  // Ensure data directory exists (first run)
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2) + "\n", "utf-8");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`Starting ${FEED} feed refresh`);

  const previousStatus = readPreviousStatus();
  const now = new Date().toISOString();

  // Track whether the fetch+write succeeded so we can update the status file correctly.
  let fetchSucceeded = false;
  let recordCount = previousStatus?.record_count ?? 0;
  let errorMessage: string | undefined;

  try {
    // Ensure data directory exists on first run
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

    if (FEED === "power") {
      log("Fetching VECO power advisories...");
      const result = await getPowerAdvisories();
      recordCount = result.data.length;
      log(`Fetched ${recordCount} power advisories (data_source: ${result.data_source})`);

      // Atomic write: write to _tmp first, rename only on success
      writeFileSync(TMP_PATH, JSON.stringify(result.data, null, 2) + "\n", "utf-8");
      renameSync(TMP_PATH, LIVE_PATH);
      log(`Wrote ${LIVE_PATH}`);

    } else {
      log("Fetching PHIVOLCS earthquake events...");
      const result = await getEarthquakeEvents();
      recordCount = result.data.length;
      log(`Fetched ${recordCount} earthquake events within 300km watch radius (data_source: ${result.data_source})`);

      // Atomic write
      writeFileSync(TMP_PATH, JSON.stringify(result.data, null, 2) + "\n", "utf-8");
      renameSync(TMP_PATH, LIVE_PATH);
      log(`Wrote ${LIVE_PATH}`);
    }

    fetchSucceeded = true;

  } catch (err: any) {
    errorMessage = err?.message || String(err);
    logErr(`Fetch or write failed: ${errorMessage}`);
    logErr("Previous snapshot left intact (atomic write guarantee: tmp file never renamed)");
  }

  // ─── Write heartbeat status file ────────────────────────────────────────────
  // This runs on EVERY invocation — pass or fail — to guarantee repository
  // activity and prevent the 60-day GitHub Actions auto-disable.
  // last_successful_update only advances on a genuine success.

  const newStatus: FeedStatus = {
    last_checked_at: now,
    last_successful_update: fetchSucceeded
      ? now
      : (previousStatus?.last_successful_update ?? null),
    record_count: fetchSucceeded ? recordCount : (previousStatus?.record_count ?? null),
    status: fetchSucceeded ? "ok" : "error",
    ...(errorMessage ? { error_message: errorMessage } : {}),
  };

  writeStatus(newStatus);
  log(`Wrote ${STATUS_PATH} (status: ${newStatus.status})`);

  // ─── Staleness check ────────────────────────────────────────────────────────
  // Check the last_successful_update regardless of whether this run succeeded.
  // A newly-failed run after a prior period of staleness should still flag.

  if (newStatus.last_successful_update) {
    const age = Date.now() - new Date(newStatus.last_successful_update).getTime();
    const ageHours = (age / 3_600_000).toFixed(1);
    const thresholdHours = STALE_MS / 3_600_000;

    if (age > STALE_MS) {
      logErr(`[STALE] ${FEED} feed has not updated in ${ageHours}h (threshold: ${thresholdHours}h)`);
      logErr("The GitHub Actions workflow notification step will fire for this failure.");
      process.exitCode = 1;
    } else {
      log(`Freshness OK: last successful update was ${ageHours}h ago (threshold: ${thresholdHours}h)`);
    }
  } else if (!fetchSucceeded) {
    // No successful update ever — definitely stale
    logErr(`[STALE] ${FEED} feed has never had a successful update`);
    process.exitCode = 1;
  }

  if (fetchSucceeded) {
    log(`${FEED} feed refresh complete`);
  } else {
    logErr(`${FEED} feed refresh failed — snapshot unchanged`);
  }
}

main().catch((err) => {
  console.error(`[${new Date().toISOString()}] Unhandled error in run_scheduled_fetch:`, err);
  process.exitCode = 1;
});
