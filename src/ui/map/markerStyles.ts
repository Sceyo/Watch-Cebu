/**
 * Marker Styling and Status Classification.
 *
 * Implements Stage 3 Section 5.1 & 5.2:
 * 1. Power Status:
 *    - Active now: Red (#EF4444)
 *    - Upcoming (< 2h): Amber (#F59E0B)
 *    - Later today / future date: Blue (#3B82F6)
 *    - Restored / past: Translucent Green (#22C55E, 0.4 opacity)
 * 2. Earthquake Severity (Violet/Fuchsia family):
 *    - < 3.0: Pale violet (#A78BFA, radius 8px)
 *    - 3.0–4.9: Violet (#8B5CF6, radius 12px)
 *    - 5.0–5.9: Deep violet (#7C3AED, radius 16px)
 *    - >= 6.0: Fuchsia (#D946EF, radius 22px + pulsing shockwave ring)
 * 3. Provenance Encoding:
 *    - osm_point: Solid fill pin
 *    - manual_verified: Double-ring / dashed outline pin
 */

import type { PowerStatusCategory, PowerStatusStyle, EarthquakeSeverityTier, EarthquakeSeverityStyle } from "../types.js";

/**
 * Pure function to calculate power advisory status relative to a reference "now" timestamp (in PST or local).
 * Start and end times are in "HH:MM" (PST), date is "YYYY-MM-DD".
 */
export function computePowerStatus(
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string,
  now: Date = new Date()
): PowerStatusStyle {
  // Construct Date objects in local context or PST
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const [startH, startM] = startTimeStr.split(":").map(Number);
  const [endH, endM] = endTimeStr.split(":").map(Number);

  // We compare timestamps by projecting into Philippine Standard Time (UTC+8)
  // Get current PST time
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const pstNowMs = utcNow + 8 * 3600000;
  const pstNow = new Date(pstNowMs);

  const startMs = Date.UTC(year, month - 1, day, startH, startM) - 8 * 3600000;
  let endMs = Date.UTC(year, month - 1, day, endH, endM) - 8 * 3600000;
  if (endMs <= startMs) {
    // Overnight span crosses midnight
    endMs += 24 * 3600000;
  }

  const currentMs = now.getTime();
  const diffToStartMs = startMs - currentMs;
  const TWO_HOURS_MS = 2 * 3600000;

  if (currentMs >= startMs && currentMs < endMs) {
    return {
      category: "active",
      label: "Active Outage Now",
      hex: "#EF4444",
      glyph: "⚡",
      iconName: "bolt",
      opacity: 1.0,
      description: "Scheduled interruption currently underway",
    };
  } else if (diffToStartMs > 0 && diffToStartMs <= TWO_HOURS_MS) {
    return {
      category: "upcoming",
      label: "Upcoming (< 2h)",
      hex: "#F59E0B",
      glyph: "⏱",
      iconName: "clock",
      opacity: 1.0,
      description: "Interruption scheduled within the next 2 hours",
    };
  } else if (currentMs < startMs) {
    return {
      category: "later",
      label: "Later / Scheduled",
      hex: "#3B82F6",
      glyph: "📅",
      iconName: "calendar",
      opacity: 1.0,
      description: "Scheduled for later today or upcoming date",
    };
  } else {
    return {
      category: "restored",
      label: "Restored / Concluded",
      hex: "#22C55E",
      glyph: "✓",
      iconName: "check",
      opacity: 0.45,
      description: "Scheduled window has passed",
    };
  }
}

/**
 * Pure function to calculate earthquake severity tier and visual styling.
 */
export function computeEarthquakeSeverity(magnitude: number): EarthquakeSeverityStyle {
  if (magnitude < 3.0) {
    return {
      tier: "minor",
      label: "< 3.0 (Minor)",
      hex: "#A78BFA",
      radius: 8,
      hasShockwave: false,
      description: "Minor tremor, rarely felt by residents",
    };
  } else if (magnitude < 5.0) {
    return {
      tier: "light",
      label: "3.0–4.9 (Light)",
      hex: "#8B5CF6",
      radius: 12,
      hasShockwave: false,
      description: "Light tremor, felt indoors by many",
    };
  } else if (magnitude < 6.0) {
    return {
      tier: "moderate",
      label: "5.0–5.9 (Moderate)",
      hex: "#7C3AED",
      radius: 16,
      hasShockwave: false,
      description: "Moderate shaking, potential for minor damage",
    };
  } else {
    return {
      tier: "strong",
      label: "≥ 6.0 (Strong+)",
      hex: "#D946EF",
      radius: 22,
      hasShockwave: true,
      description: "Strong earthquake, expecting aftershocks/damage assessment",
    };
  }
}

export interface EarthquakeMarkerOptions {
  magnitude: number;
  locationLabel: string;
  isRecentOrSignificant: boolean;
  hex: string;
}

/**
 * Normalizes and formats town/city names for the compact Option C wedge.
 * Strips verbose administrative prefixes like "City of " and "Municipality of "
 * so the actual town name is clearly legible instead of truncating to "City Of …".
 */
export function cleanTownName(name: string): string {
  if (!name) return "Visayas";
  let cleaned = name
    .replace(/\(.*?\)/g, "") // remove parentheticals like (Southern Leyte)
    .replace(/^city\s+of\s+/i, "")
    .replace(/^municipality\s+of\s+/i, "")
    .replace(/^town\s+of\s+/i, "")
    .replace(/^island\s+of\s+/i, "")
    .replace(/,\s*.*$/, "") // remove comma suffixes like ", Cebu"
    .trim();

  // Common abbreviations for long Philippine place names
  cleaned = cleaned.replace(/^General\s+/i, "Gen. ");
  cleaned = cleaned.replace(/^Captain\s+/i, "Capt. ");
  cleaned = cleaned.replace(/^Governor\s+/i, "Gov. ");
  cleaned = cleaned.replace(/^President\s+/i, "Pres. ");
  cleaned = cleaned.replace(/^Barangay\s+/i, "Brgy. ");
  cleaned = cleaned.replace(/^Santa\s+/i, "Sta. ");
  cleaned = cleaned.replace(/^Santo\s+/i, "Sto. ");

  if (cleaned.length > 9) {
    return cleaned.slice(0, 8).trim() + "…";
  }
  return cleaned || "Visayas";
}

/**
 * Renders the Option C compound earthquake marker:
 * - Bottom circle with bold magnitude number
 * - Top curved annular wedge with location name
 * - Selective GPU-accelerated pulse for recent (<24h) or significant (M4.0+) quakes
 */
export function renderEarthquakeMarkerSvg(opts: EarthquakeMarkerOptions): string {
  const magStr = opts.magnitude.toFixed(1);
  const shortTown = cleanTownName(opts.locationLabel);
  const pulseClass = opts.isRecentOrSignificant ? "has-pulse" : "";

  return `
    <div class="earthquake-compound-pin ${pulseClass}" style="--eq-color: ${opts.hex};">
      <svg class="eq-svg" viewBox="0 0 64 68" width="64" height="68" xmlns="http://www.w3.org/2000/svg">
        <!-- Top Annular Wedge / Callout -->
        <path class="eq-wedge" d="M 7.91 13.59 A 42 42 0 0 1 56.09 13.59 L 43.47 31.62 A 20 20 0 0 0 20.53 31.62 Z" fill="${opts.hex}28" stroke="${opts.hex}" stroke-width="1.5" />
        <text class="eq-wedge-text" x="32" y="23" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF">${shortTown}</text>

        <!-- Bottom Magnitude Circle -->
        <circle class="eq-circle" cx="32" cy="48" r="15" fill="${opts.hex}" stroke="#FFFFFF" stroke-width="1.8" />
        <text class="eq-mag-text" x="32" y="49" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF">${magStr}</text>
      </svg>
    </div>
  `;
}

