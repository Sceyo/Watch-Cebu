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
