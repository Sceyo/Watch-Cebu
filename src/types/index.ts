/**
 * Types for Watch Cebu data layer.
 * These TypeScript interfaces mirror the JSON Schema definitions in docs/schemas/.
 * Stage 1 — Data Standards defines the canonical source of truth.
 */

// ─── Shared ────────────────────────────────────────────────────────────────────

export type ParseConfidence = "high" | "low";
export type CoordinateSourceVECO = "osm_point" | "boundary_centroid" | "manual_verified" | "geocoded";

/** Eight LGUs served by VECO. Any other string is a parse error. */
export const VECO_CITIES = [
  "Cebu City",
  "Mandaue City",
  "Talisay City",
  "Naga City",
  "Consolacion",
  "Liloan",
  "Minglanilla",
  "San Fernando",
] as const;
export type VECOCity = (typeof VECO_CITIES)[number];

// ─── PowerAdvisory ─────────────────────────────────────────────────────────────

/**
 * One scheduled power interruption event from a VECO weekly Service Advisory post.
 * Coordinates (lat/lon) are null until the geocoding stage (Stage 2 does not geocode).
 */
export interface PowerAdvisory {
  // Identity
  /** SHA-256 hex of (source_url + date + start_time + areas_affected_raw) */
  id: string;

  // Provenance — required, never null
  source_url: string;
  fetched_at: string; // ISO 8601 UTC

  // Scheduling
  /** ISO date of the Sunday that opens the advisory week */
  advisory_week_start: string;
  /** ISO date of the actual interruption day */
  date: string;
  /** HH:MM 24-hour PST */
  start_time: string;
  /** HH:MM 24-hour PST */
  end_time: string;
  /** True when the window crosses midnight (end on date+1) */
  overnight_span: boolean;
  /** From parenthetical "(Xhrs)". Null if not stated. */
  duration_hours: number | null;

  // Work details
  purpose: string;

  // Location (text — coordinates come later)
  city: VECOCity;
  barangay: string[];
  streets: string[];
  /** Verbatim "Areas Affected:" text preserved for re-parsing */
  areas_affected_raw: string;

  // Coordinates (null at ingestion stage)
  lat: number | null;
  lon: number | null;
  coordinate_source: CoordinateSourceVECO | null;
  geocode_query: string | null;
  geocode_provider: string | null;

  // Quality
  business_confidence: "scheduled";
  parse_confidence: ParseConfidence;
  parse_notes: string | null;
}

// ─── EarthquakeEvent ───────────────────────────────────────────────────────────

/**
 * One seismic event from a PHIVOLCS Earthquake Bulletin.
 * Only events within 300 km of Cebu City are stored.
 * Coordinates MUST come from the bulletin; absence invalidates the record.
 */
export interface EarthquakeEvent {
  // Identity
  /** SHA-256 hex of source_url */
  id: string;

  // Provenance — required, never null
  source_url: string;
  fetched_at: string; // ISO 8601 UTC

  // Event data
  /** ISO 8601 with +08:00 offset */
  datetime_pst: string;
  /** ISO 8601 UTC */
  datetime_utc: string;

  // Coordinates — bulletin only, never null
  lat: number;
  lon: number;
  /** Always "bulletin". Hardcoded. */
  coordinate_source: "bulletin";

  // Location
  location_description: string;
  nearest_town: string | null;
  nearest_province: string | null;

  // Physical parameters
  depth_km: number;
  magnitude: number;
  /** e.g. "Ms", "Mw", "ML". Null if bulletin omits scale prefix. */
  magnitude_type: string | null;
  /** "TECTONIC" | "VOLCANIC" or raw string for unknowns */
  origin_type: string;

  // Impact
  /** Verbatim intensity string. Null if blank in bulletin. */
  reported_intensities: string | null;
  expecting_damage: boolean;
  expecting_aftershocks: boolean;
  /** ISO 8601 +08:00. Null if unparseable. */
  issued_on_pst: string | null;

  // Cebu proximity (computed)
  distance_from_cebu_km: number;
  /** true when distance_from_cebu_km <= 300 */
  within_watch_radius: boolean;

  // Quality
  parse_confidence: ParseConfidence;
  parse_notes: string | null;
}

// ─── ElectricityRate (Stage 5) ──────────────────────────────────────────────────

/**
 * Residential electricity rate advisory published periodically by VECO.
 */
export interface ElectricityRate {
  id: string;
  source_url: string;
  fetched_at: string;
  billing_period_label: string;
  rate_per_kwh: number;
  previous_rate_per_kwh: number | null;
  delta: number | null;
  reason: string | null;
  parse_confidence: ParseConfidence;
  parse_notes: string | null;
}
