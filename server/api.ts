import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { PowerAdvisory, EarthquakeEvent } from "../src/types/index.js";
import { extractCurrentPostUrl, parsePostHtml } from "../src/parsers/veco.js";
import { extractBulletinLinks, parseBulletinHtml, decodePhivolcsBuffer, runBatched } from "../src/parsers/phivolcs.js";
import { BarangayCentroidLookup, fanOutAndResolveAdvisories } from "../src/resolvers/coordinates.js";
import { MemoryCache, serverCache } from "./cache.js";
import { Agent } from "undici";
import tls from "tls";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find project root by locating data/metro-cebu-barangays.geojson
function getProjectRoot(): string {
  let cur = __dirname;
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(cur, "data", "metro-cebu-barangays.geojson"))) {
      return cur;
    }
    cur = dirname(cur);
  }
  return process.cwd();
}

const ROOT_DIR = getProjectRoot();
const CERT_PATH = join(ROOT_DIR, "certs", "phivolcs-intermediate.pem");

/**
 * Scoped dispatcher specifically for PHIVOLCS endpoints.
 *
 * Why this exists:
 * 1. TLS Chain Completion: DOST/PHIVOLCS web servers serve a leaf certificate issued by
 *    "GlobalSign RSA OV SSL CA 2018" without bundling the intermediate CA certificate.
 *    Node's default trust store lacks this intermediate in its root bundle, causing
 *    UNABLE_TO_VERIFY_LEAF_SIGNATURE. Supplying the intermediate CA directly completes
 *    the chain while KEEPING rejectUnauthorized: true (STRICT VERIFICATION ON).
 * 2. IPv4 Affinity: Avoids IPv6 routing stalls on local networks where DOST/PHIVOLCS does
 *    not respond to IPv6 handshakes.
 *
 * This agent is NEVER registered globally. VECO, Discord webhooks, and all other outbound
 * HTTPS requests continue using Node's default dispatcher.
 */
let phivolcsAgentInstance: Agent | null = null;
export function getPhivolcsDispatcher(): Agent {
  if (!phivolcsAgentInstance) {
    let caBundle: string[] | undefined;
    if (existsSync(CERT_PATH)) {
      const intermediatePem = readFileSync(CERT_PATH, "utf-8");
      caBundle = [...tls.rootCertificates, intermediatePem];
    }
    phivolcsAgentInstance = new Agent({
      connect: {
        ...(caBundle ? { ca: caBundle } : {}),
        family: 4, // Force IPv4 to prevent IPv6 routing stalls
        rejectUnauthorized: true, // Strict certificate verification ALWAYS preserved!
      },
    });
  }
  return phivolcsAgentInstance;
}

const GEOJSON_PATH = join(ROOT_DIR, "data", "metro-cebu-barangays.geojson");
const VECO_SAMPLE_PATH = join(ROOT_DIR, "tests", "fixtures", "veco_post_sample.html");
const PHIVOLCS_SAMPLE_PATH = join(ROOT_DIR, "tests", "fixtures", "phivolcs_bulletin_sample.html");
const PHIVOLCS_INDEX_PATH = join(ROOT_DIR, "tests", "fixtures", "phivolcs_index.html");
const SAMPLE_EQ_JSON_PATH = join(ROOT_DIR, "data", "sample_earthquake_events.json");

// Snapshot paths — written exclusively by scripts/run_scheduled_fetch.ts.
// Each feed owns its own pair of files; the two workflows never share a file,
// eliminating git-level and application-level race conditions (ADR 2).
const LIVE_POWER_PATH = join(ROOT_DIR, "data", "live_power_advisories.json");
const LIVE_EQ_PATH = join(ROOT_DIR, "data", "live_earthquake_events.json");
const STATUS_POWER_PATH = join(ROOT_DIR, "data", "status_power.json");
const STATUS_EQ_PATH = join(ROOT_DIR, "data", "status_earthquakes.json");

// Staleness thresholds for snapshot monitoring
const STALE_POWER_MS = 48 * 60 * 60 * 1000;     // 48 hours
const STALE_EQ_MS   = 24 * 60 * 60 * 1000;       // 24 hours

export interface ApiResponse<T> {
  /** "live" = freshly scraped; "snapshot" = read from scheduled-job file; "fixture_fallback" = bundled sample */
  data_source: "live" | "snapshot" | "fixture_fallback";
  fetched_at: string;
  data: T;
  parse_notes?: string;
}

export const CACHE_TTL_POWER_MS = 15 * 60 * 1000; // 15 minutes
export const CACHE_TTL_EARTHQUAKES_MS = 10 * 60 * 1000; // 10 minutes

export interface ServerApiOptions {
  cache?: MemoryCache;
  fetchFn?: typeof fetch;
  geojsonPath?: string;
  vecoFixturePath?: string;
  phivolcsFixturePath?: string;
  phivolcsIndexFixturePath?: string;
  sampleEqJsonPath?: string;
  /** Override path to live_power_advisories.json (for testing) */
  livePowerPath?: string;
  /** Override path to live_earthquake_events.json (for testing) */
  liveEqPath?: string;
  /** Override path to status_power.json (for testing) */
  statusPowerPath?: string;
  /** Override path to status_earthquakes.json (for testing) */
  statusEqPath?: string;
}


/**
 * Load power advisories from bundled fixture file as a transparent fallback.
 */
export async function getPowerAdvisoriesFallback(
  reason: string,
  options: ServerApiOptions = {}
): Promise<ApiResponse<PowerAdvisory[]>> {
  const fixturePath = options.vecoFixturePath || VECO_SAMPLE_PATH;
  const postHtml = readFileSync(fixturePath, "utf-8");
  const fallbackUrl = "https://www.visayanelectric.com/post/service-interruption-september-6-12-2026";
  const fetchedAt = new Date().toISOString();

  const raw = parsePostHtml(postHtml, fallbackUrl, fetchedAt);
  const lookup = new BarangayCentroidLookup(options.geojsonPath || GEOJSON_PATH);
  const resolved = await fanOutAndResolveAdvisories(raw, { centroidLookup: lookup });

  return {
    data_source: "fixture_fallback",
    fetched_at: fetchedAt,
    data: resolved,
    parse_notes: reason,
  };
}

/**
 * Fetch and resolve VECO power advisories.
 * 1. Cache hit -> return "live" from cache.
 * 2. Scrape live index + post -> resolve -> cache -> return "live".
 * 3. Scrape failure -> return "fixture_fallback" with caught error message.
 */
export async function getPowerAdvisories(
  options: ServerApiOptions = {}
): Promise<ApiResponse<PowerAdvisory[]>> {
  const cache = options.cache || serverCache;
  const fetchImpl = options.fetchFn || fetch;

  const cached = cache.get<ApiResponse<PowerAdvisory[]>>("power");
  if (cached) {
    return cached;
  }

  try {
    const INDEX_URL = "https://www.visayanelectric.com/customer-services/service-advisory";
    const indexRes = await fetchImpl(INDEX_URL, {
      headers: { "User-Agent": "WatchCebu/0.1.0 (Civic Awareness App)" },
    });
    if (!indexRes.ok) {
      throw new Error(`VECO index returned HTTP ${indexRes.status} ${indexRes.statusText}`);
    }
    const indexHtml = await indexRes.text();
    const postUrl = extractCurrentPostUrl(indexHtml);
    if (!postUrl) {
      throw new Error("No service interruption post URL found on VECO index page");
    }

    const postRes = await fetchImpl(postUrl, {
      headers: { "User-Agent": "WatchCebu/0.1.0 (Civic Awareness App)" },
    });
    if (!postRes.ok) {
      throw new Error(`VECO post page returned HTTP ${postRes.status} ${postRes.statusText}`);
    }
    const postHtml = await postRes.text();
    const fetchedAt = new Date().toISOString();

    const raw = parsePostHtml(postHtml, postUrl, fetchedAt);
    const lookup = new BarangayCentroidLookup(options.geojsonPath || GEOJSON_PATH);
    const resolved = await fanOutAndResolveAdvisories(raw, { centroidLookup: lookup });

    const response: ApiResponse<PowerAdvisory[]> = {
      data_source: "live",
      fetched_at: fetchedAt,
      data: resolved,
    };

    cache.set("power", response, CACHE_TTL_POWER_MS);
    return response;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    return getPowerAdvisoriesFallback(`Live scrape failed: ${errorMsg}`, options);
  }
}

/**
 * Load earthquake events from bundled fixtures as a transparent fallback.
 */
export function getEarthquakeEventsFallback(
  reason: string,
  options: ServerApiOptions = {}
): ApiResponse<EarthquakeEvent[]> {
  const fetchedAt = new Date().toISOString();

  // If pre-generated full sample file exists, load it
  const sampleJsonPath = options.sampleEqJsonPath || SAMPLE_EQ_JSON_PATH;
  if (existsSync(sampleJsonPath)) {
    try {
      const data: EarthquakeEvent[] = JSON.parse(readFileSync(sampleJsonPath, "utf-8"));
      return {
        data_source: "fixture_fallback",
        fetched_at: fetchedAt,
        data,
        parse_notes: reason,
      };
    } catch {}
  }

  // Fallback to single bulletin fixture
  const samplePath = options.phivolcsFixturePath || PHIVOLCS_SAMPLE_PATH;
  const buf = readFileSync(samplePath);
  const html = decodePhivolcsBuffer(buf);
  const sampleUrl =
    "https://earthquake.phivolcs.dost.gov.ph/2026_Earthquake_Information/September/2026_0905_0946_B1.html";

  const parsed = parseBulletinHtml(html, sampleUrl, fetchedAt);
  const events: EarthquakeEvent[] = [];
  if (parsed.type === "ok" && parsed.event.within_watch_radius) {
    events.push(parsed.event);
  }

  return {
    data_source: "fixture_fallback",
    fetched_at: fetchedAt,
    data: events,
    parse_notes: reason,
  };
}

/**
 * Fetch and parse PHIVOLCS earthquake events within 300km of Cebu.
 * 1. Cache hit -> return "live" from cache.
 * 2. Scrape index + bulletins with Promise.allSettled -> cache -> return "live".
 * 3. Scrape failure -> return "fixture_fallback" with caught error message.
 */
export async function getEarthquakeEvents(
  options: ServerApiOptions = {}
): Promise<ApiResponse<EarthquakeEvent[]>> {
  const cache = options.cache || serverCache;
  const fetchImpl = options.fetchFn || fetch;

  const cached = cache.get<ApiResponse<EarthquakeEvent[]>>("earthquakes");
  if (cached) {
    return cached;
  }

  try {
    const INDEX_URL = "https://earthquake.phivolcs.dost.gov.ph/";
    const isCustomFetch = !!options.fetchFn;
    const fetchOptions: any = {
      headers: { "User-Agent": "WatchCebu/0.1.0 (Civic Awareness App)" },
      ...(!isCustomFetch ? { dispatcher: getPhivolcsDispatcher() } : {}),
    };

    const indexRes = await fetchImpl(INDEX_URL, fetchOptions);
    if (!indexRes.ok) {
      throw new Error(`PHIVOLCS index returned HTTP ${indexRes.status} ${indexRes.statusText}`);
    }
    const indexBuf = Buffer.from(await indexRes.arrayBuffer());
    const indexHtml = decodePhivolcsBuffer(indexBuf);
    const bulletinUrls = extractBulletinLinks(indexHtml);

    const fetchedAt = new Date().toISOString();
    const events: EarthquakeEvent[] = [];

    // Limit to latest 30 bulletins to stay within rate limit guidelines
    // Fetch using runBatched (batch of 5, 200ms delay) to respect PHIVOLCS infrastructure
    const targetUrls = bulletinUrls.slice(0, 30);
    const tasks = targetUrls.map((url) => async () => {
      const bRes = await fetchImpl(url, fetchOptions);
      if (!bRes.ok) return null;
      const bBuf = Buffer.from(await bRes.arrayBuffer());
      const bHtml = decodePhivolcsBuffer(bBuf);
      return parseBulletinHtml(bHtml, url, fetchedAt);
    });

    const settled = await runBatched(tasks);

    for (const res of settled) {
      if (res.status === "fulfilled" && res.value && res.value.type === "ok") {
        if (res.value.event.within_watch_radius) {
          events.push(res.value.event);
        }
      }
    }

    const response: ApiResponse<EarthquakeEvent[]> = {
      data_source: "live",
      fetched_at: fetchedAt,
      data: events,
    };

    cache.set("earthquakes", response, CACHE_TTL_EARTHQUAKES_MS);
    return response;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    return getEarthquakeEventsFallback(`Live scrape failed: ${errorMsg}`, options);
  }
}

// ─── Snapshot read path (production) ──────────────────────────────────────────
// These functions are what a production adapter (added in Stage 5) wires to the
// /api/* routes. The scrape-live functions above remain for local development.

export interface FeedStatus {
  last_checked_at: string;
  last_successful_update: string | null;
  record_count: number | null;
  status: "ok" | "error";
  error_message?: string;
}

/**
 * Read the latest power advisories from the scheduled-job snapshot file.
 *
 * Returns data_source "snapshot" when a valid snapshot is present.
 * Attaches a staleness warning in parse_notes when last_successful_update
 * exceeds the 48-hour threshold (data still served — the UI banner handles
 * communicating this to the user).
 * Falls through to fixture_fallback when the snapshot file is absent or empty.
 *
 * Reading this function never touches status_earthquakes.json — per ADR 2,
 * each feed owns its own status file exclusively.
 */
export async function getPowerAdvisoriesSnapshot(
  options: ServerApiOptions = {}
): Promise<ApiResponse<PowerAdvisory[]>> {
  const livePath   = options.livePowerPath   || LIVE_POWER_PATH;
  const statusPath = options.statusPowerPath || STATUS_POWER_PATH;
  const fetchedAt  = new Date().toISOString();

  if (!existsSync(livePath)) {
    return getPowerAdvisoriesFallback("Power snapshot file not found — job has not run yet", options);
  }

  try {
    const data: PowerAdvisory[] = JSON.parse(readFileSync(livePath, "utf-8"));

    if (!Array.isArray(data) || data.length === 0) {
      return getPowerAdvisoriesFallback("Power snapshot file is empty or malformed", options);
    }

    // Read per-feed status (does NOT read status_earthquakes.json)
    let stalenessNote: string | undefined;
    if (existsSync(statusPath)) {
      const feedStatus: FeedStatus = JSON.parse(readFileSync(statusPath, "utf-8"));
      if (feedStatus.last_successful_update) {
        const age = Date.now() - new Date(feedStatus.last_successful_update).getTime();
        if (age > STALE_POWER_MS) {
          const ageHours = Math.round(age / 3_600_000);
          stalenessNote = `Power snapshot is stale: last updated ${ageHours}h ago (threshold: 48h)`;
        }
      }
    }

    return {
      data_source: "snapshot",
      fetched_at: fetchedAt,
      data,
      ...(stalenessNote ? { parse_notes: stalenessNote } : {}),
    };
  } catch (err: any) {
    return getPowerAdvisoriesFallback(
      `Power snapshot read failed: ${err?.message || String(err)}`,
      options
    );
  }
}

/**
 * Read the latest earthquake events from the scheduled-job snapshot file.
 *
 * Returns data_source "snapshot" when a valid snapshot is present.
 * Attaches a staleness warning in parse_notes when last_successful_update
 * exceeds the 24-hour threshold.
 * Falls through to fixture_fallback when the snapshot file is absent or empty.
 *
 * Reading this function never touches status_power.json — per ADR 2,
 * each feed owns its own status file exclusively.
 */
export async function getEarthquakeEventsSnapshot(
  options: ServerApiOptions = {}
): Promise<ApiResponse<EarthquakeEvent[]>> {
  const livePath   = options.liveEqPath   || LIVE_EQ_PATH;
  const statusPath = options.statusEqPath || STATUS_EQ_PATH;
  const fetchedAt  = new Date().toISOString();

  if (!existsSync(livePath)) {
    return getEarthquakeEventsFallback("Earthquake snapshot file not found — job has not run yet", options);
  }

  try {
    const data: EarthquakeEvent[] = JSON.parse(readFileSync(livePath, "utf-8"));

    if (!Array.isArray(data) || data.length === 0) {
      return getEarthquakeEventsFallback("Earthquake snapshot file is empty or malformed", options);
    }

    // Read per-feed status (does NOT read status_power.json)
    let stalenessNote: string | undefined;
    if (existsSync(statusPath)) {
      const feedStatus: FeedStatus = JSON.parse(readFileSync(statusPath, "utf-8"));
      if (feedStatus.last_successful_update) {
        const age = Date.now() - new Date(feedStatus.last_successful_update).getTime();
        if (age > STALE_EQ_MS) {
          const ageHours = Math.round(age / 3_600_000);
          stalenessNote = `Earthquake snapshot is stale: last updated ${ageHours}h ago (threshold: 24h)`;
        }
      }
    }

    return {
      data_source: "snapshot",
      fetched_at: fetchedAt,
      data,
      ...(stalenessNote ? { parse_notes: stalenessNote } : {}),
    };
  } catch (err: any) {
    return getEarthquakeEventsFallback(
      `Earthquake snapshot read failed: ${err?.message || String(err)}`,
      options
    );
  }
}

