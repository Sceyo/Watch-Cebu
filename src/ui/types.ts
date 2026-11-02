/**
 * UI State and Domain Types for Watch Cebu.
 */

import type { PowerAdvisory, EarthquakeEvent } from "../types/index.js";

export type LayerSelection = "power" | "earthquakes" | "both";

export type FeedStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface FeedState<T> {
  status: FeedStatus;
  error?: string;
  dataSource?: "live" | "fixture_fallback";
  fetchedAt?: string;
  data: T;
  parseNotes?: string;
}

export interface FilterState {
  selectedDate: string; // "all" or specific ISO date like "2026-09-09"
  minMagnitude: number; // 0 for all
  searchQuery?: string;
  showMicroQuakes?: boolean; // Controls whether quakes < M3.0 farther than 100km are included (true by default)
}


export type SelectedLocationDetails =
  | { type: "power"; advisories: PowerAdvisory[] }
  | { type: "earthquake"; event: EarthquakeEvent };

export type PowerStatusCategory = "active" | "upcoming" | "later" | "restored";

export interface PowerStatusStyle {
  category: PowerStatusCategory;
  label: string;
  hex: string;
  glyph?: string;
  iconName?: "bolt" | "clock" | "calendar" | "check";
  opacity?: number;
  description: string;
}

export type EarthquakeSeverityTier = "minor" | "light" | "moderate" | "strong";

export interface EarthquakeSeverityStyle {
  tier: EarthquakeSeverityTier;
  label: string;
  hex: string;
  radius: number;
  hasShockwave: boolean;
  description: string;
}


export type FloodHazardVar = 1 | 2 | 3;
export type FloodHazardTier = "low" | "medium" | "high";

export interface FloodHazardStyle {
  varCode: FloodHazardVar;
  tier: FloodHazardTier;
  label: string;
  depthRange: string;
  hex: string;
  strokeHex: string;
  fillOpacity: number;
  description: string;
}

export interface FloodHazardFeature {
  type: "Feature";
  properties: {
    Var: FloodHazardVar;
    hazard_level?: string;
    depth_range?: string;
    return_period?: string;
    zone_name?: string;
    [key: string]: any;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface FloodHazardCollection {
  type: "FeatureCollection";
  metadata?: {
    source: string;
    return_period: string;
    license: string;
    coverage?: string;
    total_features?: number;
    retrieved_at?: string;
  };
  features: FloodHazardFeature[];
}
