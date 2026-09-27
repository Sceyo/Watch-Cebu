/**
 * Shared utilities: Haversine distance, time/date parsing, street extraction.
 * Browser-safe module: ZERO Node.js built-ins.
 */
import { VECO_CITIES, type VECOCity } from "../types/index.js";

// ─── Haversine ─────────────────────────────────────────────────────────────────

/** Cebu City reference point (centroid near City Hall) */
export const CEBU_CITY_REF = { lat: 10.3157, lon: 123.8854 } as const;
export const WATCH_RADIUS_KM = 300;

/**
 * Great-circle distance in km between two WGS-84 points.
 * Uses the Haversine formula.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ─── VECO time/date helpers ────────────────────────────────────────────────────

/**
 * Parse a VECO time-range string like "8:00 AM to 6:00 PM (10hrs)".
 * Returns null if the format is not recognised.
 */
export function parseVECOTimeRange(raw: string): {
  start_time: string;
  end_time: string;
  overnight_span: boolean;
  duration_hours: number | null;
} | null {
  const normalized = raw.replace(/\s+/g, " ").trim();
  // Match patterns like "8:00 AM to 6:00 PM (10hrs)" or "10:00 PM of September 10 to 6:00 AM of September 11 (8hrs)"
  const simpleMatch = normalized.match(
    /^(\d{1,2}:\d{2}\s*(?:AM|PM))\s+to\s+(\d{1,2}:\d{2}\s*(?:AM|PM))(?:\s*\((\d+(?:\.\d+)?)hrs?\))?/i
  );
  if (simpleMatch) {
    const start = to24Hour(simpleMatch[1].trim());
    const end = to24Hour(simpleMatch[2].trim());
    const duration = simpleMatch[3] ? parseFloat(simpleMatch[3]) : null;
    if (!start || !end) return null;
    const overnight = timeToMinutes(end) <= timeToMinutes(start);
    return { start_time: start, end_time: end, overnight_span: overnight, duration_hours: duration };
  }
  // Overnight cross-day: "10:00 PM of September 10 to 6:00 AM of September 11 (8hrs)"
  const overnightMatch = normalized.match(
    /^(\d{1,2}:\d{2}\s*(?:AM|PM))\s+of\s+\w+\s+\d+\s+to\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s+of\s+\w+\s+\d+(?:\s*\((\d+(?:\.\d+)?)hrs?\))?/i
  );
  if (overnightMatch) {
    const start = to24Hour(overnightMatch[1].trim());
    const end = to24Hour(overnightMatch[2].trim());
    const duration = overnightMatch[3] ? parseFloat(overnightMatch[3]) : null;
    if (!start || !end) return null;
    return { start_time: start, end_time: end, overnight_span: true, duration_hours: duration };
  }
  return null;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convert "8:00 AM" / "6:00 PM" → "08:00" / "18:00".
 * Returns null on parse failure.
 */
export function to24Hour(t: string): string | null {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const period = m[3].toUpperCase();
  // Reject impossible hours: AM/PM clock runs 1–12 only
  if (h < 1 || h > 12) return null;
  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${min}`;
}

// ─── VECO city normalisation ───────────────────────────────────────────────────

/**
 * Extract and normalise the VECO city from an "Areas Affected" string.
 * Returns null if no known city is found (parse_confidence should become "low").
 *
 * VECO's areas text format: "Portion of [Barangay], [City], along [Streets]."
 * The city always follows the barangay list and a comma.
 */
export function extractCity(areasAffectedRaw: string): VECOCity | null {
  for (const city of VECO_CITIES) {
    // Case-insensitive match for the city name followed by comma or end
    if (new RegExp(`\\b${escapeRegex(city)}\\b`, "i").test(areasAffectedRaw)) {
      return city;
    }
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract barangay names from an "Areas Affected" string.
 * Strategy: text between "Portion of " and the city name.
 * Returns an empty array if parsing fails.
 */
export function extractBarangay(areasAffectedRaw: string, city: VECOCity): string[] {
  // Check for parenthetical barangays after city names: "Portion of Cebu City & Mandaue City (Mabolo & Subangdaku), along..."
  const parenMatch = areasAffectedRaw.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const list = parenMatch[1]
      .split(/[,&]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/\d/.test(s)); // exclude time/duration parentheticals
    if (list.length > 0) return list;
  }

  // Match "Portion of [X], [Y], CityName,"
  const m = areasAffectedRaw.match(/Portion of ([^,]+(?:,[^,]+)*),\s*(?:Cebu City|Mandaue City|Talisay City|Naga City|Consolacion|Liloan|Minglanilla|San Fernando)/i);
  if (!m) return [];
  // Split by "&" and "," — barangays may be joined with either
  return m[1]
    .split(/[,&]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(Portion of|portion of)$/.test(s));
}

/**
 * Extract street names and landmarks from an "Areas Affected" string.
 *
 * Robust Strategy:
 * 1. Isolates text after "along" or after the city name / barangay prefix.
 * 2. Does NOT truncate on abbreviations with periods (e.g. "Z. Estreras", "M.C. Briones", "Gov. M. Cuenco", "St.").
 * 3. Strips prefix filler ("along", "portions of", "portion of").
 * 4. Splits correctly on commas, "and", and "&".
 * 5. Tags recognized landmark clauses ("including ...").
 */
export function extractStreets(areasAffectedRaw: string): string[] {
  let cleaned = areasAffectedRaw.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/\s*\.?\s*$/, "");

  let streetPart = "";
  const alongMatch = cleaned.match(/along\s+(.+)$/i);
  if (alongMatch) {
    streetPart = alongMatch[1];
  } else {
    // If no "along", take text following the last occurrence of any VECO city name
    const cityMatches = [...cleaned.matchAll(new RegExp(`(?:${VECO_CITIES.join("|")})`, "gi"))];
    if (cityMatches.length > 0) {
      const lastMatch = cityMatches[cityMatches.length - 1];
      streetPart = cleaned.substring(lastMatch.index! + lastMatch[0].length).replace(/^[,:\s]+/, "");
    } else {
      streetPart = cleaned;
    }
  }

  // Strip leading 'portions of', 'portion of'
  streetPart = streetPart.replace(/^(?:portions?\s+of\s+)?/i, "").trim();

  // Separate landmarks if 'including' is present
  let landmarkPart = "";
  const incMatch = streetPart.match(/^(.*?)(?:,\s*)?including\s+(.*)$/i);
  if (incMatch) {
    streetPart = incMatch[1].trim();
    landmarkPart = incMatch[2].trim();
  }

  // Split by comma, ' and ', or ' & '
  const rawItems = streetPart.split(/(?:,\s*(?:and\s+|&\s*)?|\s+and\s+|\s+&\s+)/i);
  const streets: string[] = [];
  for (const item of rawItems) {
    let s = item.trim();
    s = s.replace(/^(?:along\s+)?(?:portions?\s+of\s+)?/i, "").trim();
    s = s.replace(/\s*\.?$/, "");
    if (s.length > 0 && !/^(and|&)$/i.test(s)) {
      streets.push(s);
    }
  }

  if (landmarkPart) {
    const landmarks = landmarkPart.split(/(?:,\s*(?:and\s+|&\s*)?|\s+and\s+|\s+&\s+)/i);
    for (const lm of landmarks) {
      let l = lm.trim().replace(/\s*\.?$/, "");
      if (l.length > 0 && !/^(and|&)$/i.test(l)) {
        streets.push(l + " (Landmark)");
      }
    }
  }

  return streets;
}

// ─── PHIVOLCS date helpers ─────────────────────────────────────────────────────

/**
 * Parse a PHIVOLCS date/time string: "05 Sep 2026 - 05:46:53 PM"
 * Returns ISO 8601 strings for both PST (+08:00) and UTC, or null on failure.
 */
export function parsePHIVOLCSDateTime(raw: string): {
  pst: string;
  utc: string;
} | null {
  const normalized = raw.replace(/\s+/g, " ").trim();
  const m = normalized.match(
    /^(\d{1,2})\s+(\w{3})\s+(\d{4})\s+-\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i
  );
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MONTH_MAP[m[2].toLowerCase()];
  if (month === undefined) return null;
  const year = parseInt(m[3], 10);
  let hour = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  const sec = parseInt(m[6], 10);
  const period = m[7].toUpperCase();
  if (period === "AM") { if (hour === 12) hour = 0; }
  else { if (hour !== 12) hour += 12; }
  // Build as UTC+8
  const pstDate = new Date(Date.UTC(year, month, day, hour - 8, min, sec));
  const pst = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(min)}:${pad(sec)}+08:00`;
  const utc = pstDate.toISOString();
  return { pst, utc };
}

/** Parse "05 September 2026 - 05:56 PM" (issued_on format, no seconds) */
export function parsePHIVOLCSIssuedOn(raw: string): string | null {
  const normalized = raw.replace(/\s+/g, " ").trim();
  // "05 September 2026 - 05:56 PM"
  const m = normalized.match(
    /^(\d{1,2})\s+(\w+)\s+(\d{4})\s+-\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i
  );
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MONTH_MAP_FULL[m[2].toLowerCase()];
  if (month === undefined) return null;
  const year = parseInt(m[3], 10);
  let hour = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  const period = m[6].toUpperCase();
  if (period === "AM") { if (hour === 12) hour = 0; }
  else { if (hour !== 12) hour += 12; }
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(min)}:00+08:00`;
}

/**
 * Parse PHIVOLCS location string: "12.90°N, 123.13°E - 013 km N 89° W of Claveria (Masbate)"
 * The degree symbol may appear as '°', '?', or encoded variants.
 * Returns null if lat/lon cannot be extracted.
 */
export function parsePHIVOLCSLocation(raw: string): {
  lat: number;
  lon: number;
  location_description: string;
  nearest_town: string | null;
  nearest_province: string | null;
} | null {
  const normalized = raw.replace(/\s+/g, " ").trim();
  // Lat/lon: allow any non-digit before N/E as the degree symbol
  const m = normalized.match(
    /^(\d{1,3}(?:\.\d+)?)\s*[^\d\s]?\s*N,\s*(\d{1,3}(?:\.\d+)?)\s*[^\d\s]?\s*E\s*-\s*(.+)$/i
  );
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lon)) return null;
  // Clean descriptionPart: normalize any replacement character (\uFFFD / ) or ? before directions to °
  const descriptionPart = m[3]
    .replace(/(\d+)\s*[\uFFFD?]\s*([NSEW])/gi, "$1° $2")
    .replace(/[\uFFFD]/g, "°")
    .trim();
  // Extract nearest town from "NNN km DIR of Town (Province)"
  const townMatch = descriptionPart.match(/of\s+(.+?)\s*(?:\(([^)]+)\))?$/i);
  const nearest_town = townMatch ? townMatch[1].trim() : null;
  const nearest_province = townMatch?.[2]?.trim() ?? null;
  return {
    lat,
    lon,
    location_description: descriptionPart,
    nearest_town,
    nearest_province,
  };
}

/**
 * Parse magnitude string like "Ms 1.9" or "2.1" (no prefix).
 */
export function parseMagnitude(raw: string): {
  magnitude: number;
  magnitude_type: string | null;
} | null {
  const normalized = raw.trim();
  // With prefix: "Ms 1.9", "Mw 5.2", "ML 2.3"
  const withPrefix = normalized.match(/^([A-Za-z]+)\s+(\d+(?:\.\d+)?)$/);
  if (withPrefix) {
    return {
      magnitude_type: withPrefix[1],
      magnitude: parseFloat(withPrefix[2]),
    };
  }
  // Without prefix: "1.9"
  const noPrefix = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (noPrefix) {
    return { magnitude_type: null, magnitude: parseFloat(noPrefix[1]) };
  }
  return null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const MONTH_MAP_FULL: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Format an ISO timestamp (e.g. "2026-09-05T23:15:20+08:00") into friendly Philippine human-readable date & time.
 * Transforms raw database strings into accessible citizen formats:
 * - Date: "Sep 5, 2026"
 * - Time: "11:15 PM PST"
 * - Relative: "2h ago", "Yesterday" (when recent)
 */
export function formatPhilippineDateTime(
  iso: string,
  now = new Date()
): {
  date: string;
  time: string;
  full: string;
  relative: string | null;
} {
  if (!iso) {
    return { date: "Unknown date", time: "Unknown time", full: "Unknown", relative: null };
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return { date: iso, time: "", full: iso, relative: null };
  }

  const dateStr = d.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeStr =
    d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " PST";

  let relative: string | null = null;
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec >= 0) {
    if (diffSec < 60) relative = "Just now";
    else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m ago`;
    else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h ago`;
    else if (diffSec < 172800) relative = "Yesterday";
    else if (diffSec < 604800) relative = `${Math.floor(diffSec / 86400)}d ago`;
  }

  const full = relative ? `${dateStr} · ${timeStr} (${relative})` : `${dateStr} · ${timeStr}`;

  return {
    date: dateStr,
    time: timeStr,
    full,
    relative,
  };
}

