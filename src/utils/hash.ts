/**
 * Server-only hashing utility.
 * NEVER import this file in client/browser code under src/ui/.
 */
import { createHash } from "crypto";

/**
 * Deterministic SHA-256 hex digest.
 * PowerAdvisory: hash(source_url + date + start_time + areas_affected_raw)
 * EarthquakeEvent: hash(source_url)
 */
export function makeId(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\x00")).digest("hex");
}
