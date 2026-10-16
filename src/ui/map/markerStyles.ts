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
 * Renders the Standard Earthquake Marker:
 * - Map pin teardrop with international cracked fault line earthquake icon
 * - Magnitude pill badge
 * - Selective GPU-accelerated seismic shockwave pulse for recent (<24h) or significant (M4.0+) quakes
 */
export function renderEarthquakeMarkerSvg(opts: EarthquakeMarkerOptions): string {
  const magStr = opts.magnitude.toFixed(1);
  const pulseClass = opts.isRecentOrSignificant ? "has-pulse" : "";

  return `
    <div class="earthquake-compound-pin ${pulseClass}" style="--eq-color: ${opts.hex};">
      <svg class="eq-svg" viewBox="0 0 32 40" width="32" height="40" xmlns="http://www.w3.org/2000/svg">
        <!-- Map Pin Teardrop Body -->
        <path class="eq-pin-body" d="M16 2 C8.27 2 2 8.27 2 16 C2 24.5 14.2 36.8 15.3 37.9 C15.7 38.3 16.3 38.3 16.7 37.9 C17.8 36.8 30 24.5 30 16 C30 8.27 23.73 2 16 2 Z" fill="#0F172A" stroke="${opts.hex}" stroke-width="2" />
        
        <!-- Standard Earthquake Cracked Ground / Fault Line Icon -->
        <path d="M8 12h4l1.5 3-1.5 3 2 2.5H8" fill="none" stroke="${opts.hex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M24 12h-4l-1.5 3 1.5 3-2 2.5h4" fill="none" stroke="${opts.hex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M15 6.5l-2 5.5 3 3-1.5 5" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Magnitude Pill Badge -->
        <rect x="5" y="24" width="22" height="12" rx="6" fill="${opts.hex}" stroke="#FFFFFF" stroke-width="1" />
        <text class="eq-mag-text" x="16" y="31" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="8.5px">${magStr}</text>
      </svg>
    </div>
  `;
}

