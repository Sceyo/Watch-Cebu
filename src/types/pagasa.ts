/**
 * Type definitions for PAGASA Severe Weather & Flood Advisories.
 * Corresponds strictly to docs/schemas/PagasaBulletin.schema.json.
 */

export type TcwsSignalLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type HeavyRainfallAlertLevel = "none" | "yellow" | "orange" | "red";

export interface TcwsStatus {
  active: boolean;
  signal_level: TcwsSignalLevel;
  wind_speed_kmh: string | null;
  areas_affected: string[];
}

export interface HeavyRainfallStatus {
  level: HeavyRainfallAlertLevel;
  warning_type: string | null;
  description: string;
  advisory_areas: string[];
}

export interface StormCenter {
  lat: number;
  lon: number;
  movement: string | null;
  max_sustained_winds_kmh?: number | null;
  gustiness_kmh?: number | null;
}

export interface PagasaBulletin {
  id: string; // SHA-256 deterministic hash
  source_url: string;
  fetched_at: string; // ISO 8601 UTC
  issued_at_pst: string; // ISO 8601 PST (UTC+8)
  cyclone_name: string | null;
  has_active_cyclone: boolean;
  tcws_cebu: TcwsStatus;
  heavy_rainfall_alert: HeavyRainfallStatus;
  storm_center: StormCenter | null;
  parse_confidence: "high" | "low";
  parse_notes: string | null;
}
