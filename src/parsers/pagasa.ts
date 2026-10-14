/**
 * DOST-PAGASA Severe Weather & Heavy Rainfall Parser
 *
 * Parses official bulletins from PAGASA:
 * 1. Tropical Cyclone Bulletins (TCWS Signals 1 to 5, storm center position, movement).
 * 2. Heavy Rainfall Warnings (Red, Orange, Yellow) and Thunderstorm Advisories.
 *
 * Implements strict input sanitization, bounded regex parsing, and closed-schema validation.
 */

import * as cheerio from "cheerio";
import type { PagasaBulletin, TcwsSignalLevel, HeavyRainfallAlertLevel } from "../types/pagasa.js";
import { makeId } from "../utils/hash.js";

export const PAGASA_WEATHER_URL = "https://bagong.pagasa.dost.gov.ph/weather";

export type Fetcher = (url: string) => Promise<string>;

const TCWS_WIND_SPEEDS: Record<TcwsSignalLevel, string | null> = {
  0: null,
  1: "39–61 km/h (Strong breeze to near gale)",
  2: "62–88 km/h (Gale-force to storm-force)",
  3: "89–117 km/h (Storm-force winds)",
  4: "118–184 km/h (Typhoon-force winds)",
  5: "≥185 km/h (Super Typhoon-force winds)"
};

/**
 * Sanitizes input text: strips HTML tags, caps length, normalizes whitespace.
 */
function sanitize(text: string, maxLength = 500): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Parses raw HTML string from PAGASA into a validated PagasaBulletin.
 */
export function parsePagasaBulletinHtml(
  html: string,
  sourceUrl = PAGASA_WEATHER_URL,
  fetchedAt = new Date().toISOString()
): PagasaBulletin {
  // Input sanity guard (prevent unbounded payload parsing)
  if (!html || typeof html !== "string") {
    return createBaselineBulletin(sourceUrl, fetchedAt, "Empty or non-string HTML payload", "low");
  }

  // Max payload cap (1MB) to prevent ReDoS
  const safeHtml = html.slice(0, 1024 * 1024);
  const $ = cheerio.load(safeHtml);

  // Remove scripts and style elements for clean text parsing
  $("script, style, noscript, svg").remove();
  const fullText = $("body").text().replace(/\s+/g, " ");

  // 1. Detect Active Tropical Cyclone
  const hasCyclone = /TROPICAL\s+CYCLONE\s+BULLETIN/i.test(fullText) ||
                     /TROPICAL\s+(DEPRESSION|STORM)|TYPHOON|SUPER\s+TYPHOON/i.test(fullText);

  let cycloneName: string | null = null;
  if (hasCyclone) {
    const nameMatch = fullText.match(/(?:TROPICAL\s+STORM|TYPHOON|SUPER\s+TYPHOON|TROPICAL\s+DEPRESSION)\s+["“']?([A-Z]{3,20})["”']?/i);
    if (nameMatch) {
      cycloneName = sanitize(nameMatch[1].toUpperCase(), 30);
    }
  }

  // 2. Parse TCWS for Cebu
  let maxSignalForCebu: TcwsSignalLevel = 0;
  const cebuAreasAffected: string[] = [];

  if (hasCyclone) {
    // Scan sections for Signal No. 1 through Signal No. 5
    for (let sig = 5; sig >= 1; sig--) {
      // Look for Signal heading and the text block up to the next signal or disclaimer
      const signalRegex = new RegExp(`SIGNAL\\s+NO\\.?\\s*${sig}\\b([\\s\\S]*?)(?=SIGNAL\\s+NO\\.?|OTHER\\s+AREAS|WHAT\\s+TO\\s+DO|$)`, "i");
      const signalBlock = fullText.match(signalRegex);

      if (signalBlock && signalBlock[1]) {
        const blockText = signalBlock[1];
        if (/\bCebu\b/i.test(blockText)) {
          maxSignalForCebu = sig as TcwsSignalLevel;

          // Check sub-regions of Cebu specifically mentioned
          if (/Northern\s+Cebu/i.test(blockText)) cebuAreasAffected.push("Northern Cebu");
          if (/Camotes\s+Islands?/i.test(blockText)) cebuAreasAffected.push("Camotes Islands");
          if (/Bantayan\s+Islands?/i.test(blockText)) cebuAreasAffected.push("Bantayan Islands");
          if (/Central\s+Cebu|Metro\s+Cebu/i.test(blockText)) cebuAreasAffected.push("Metro Cebu");
          if (/Southern\s+Cebu/i.test(blockText)) cebuAreasAffected.push("Southern Cebu");

          if (cebuAreasAffected.length === 0) {
            cebuAreasAffected.push("Cebu Province");
          }
          break; // Stop at highest hoisted signal
        }
      }
    }
  }

  // 3. Parse Heavy Rainfall Warning (HRW) for Cebu
  let rainfallLevel: HeavyRainfallAlertLevel = "none";
  let rainfallDesc = "No active severe rainfall warning in effect for Metro Cebu.";
  const rainfallAreas: string[] = [];

  const rainfallMatch = fullText.match(/HEAVY\s+RAINFALL\s+WARNING|COLOR-CODED\s+RAINFALL|THUNDERSTORM\s+ADVISORY/i);
  if (rainfallMatch) {
    if (/\bCebu\b/i.test(fullText)) {
      if (/\bRED\s+(?:WARNING|ALERT)\b/i.test(fullText)) {
        rainfallLevel = "red";
        rainfallDesc = "Torrential rains expected (>30 mm/hr). Severe flooding and landslides expected; immediate evacuation in hazard zones.";
        rainfallAreas.push("Metro Cebu");
      } else if (/\bORANGE\s+(?:WARNING|ALERT)\b/i.test(fullText)) {
        rainfallLevel = "orange";
        rainfallDesc = "Intense rains expected (15–30 mm/hr). Flooding threatening; prepare for potential evacuation.";
        rainfallAreas.push("Metro Cebu");
      } else if (/\bYELLOW\s+(?:WARNING|ALERT)\b/i.test(fullText)) {
        rainfallLevel = "yellow";
        rainfallDesc = "Heavy rains expected (7.5–15 mm/hr). Localized flooding possible in low-lying and river areas.";
        rainfallAreas.push("Metro Cebu");
      }
    }
  }

  // 4. Parse Storm Center (if available)
  let stormCenter = null;
  const eyeMatch = fullText.match(/(?:eye|center)[\s\S]{0,100}?([0-9]+\.?[0-9]*)\s*°?\s*N[^\d]*([0-9]+\.?[0-9]*)\s*°?\s*E/i);
  if (eyeMatch) {
    const lat = parseFloat(eyeMatch[1]);
    const lon = parseFloat(eyeMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= 0 && lat <= 30 && lon >= 110 && lon <= 145) {
      let movement: string | null = null;
      const moveMatch = fullText.match(/(?:moving|movement)\s+([A-Za-z\s]+?)\s+(?:at|with)/i);
      if (moveMatch) {
        movement = sanitize(moveMatch[1], 40);
      }
      stormCenter = { lat, lon, movement };
    }
  }

  // 5. Issued Timestamp (PST)
  let issuedAtPst = fetchedAt;
  const issuedMatch = fullText.match(/Issued\s+at\s+([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)[^,\n]*,\s*[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
  if (issuedMatch) {
    issuedAtPst = sanitize(issuedMatch[1], 80);
  }

  // Compute deterministic SHA-256 ID
  const id = makeId(sourceUrl, cycloneName || "NONE", String(maxSignalForCebu), rainfallLevel, issuedAtPst);

  return {
    id,
    source_url: sourceUrl,
    fetched_at: fetchedAt,
    issued_at_pst: issuedAtPst,
    cyclone_name: cycloneName,
    has_active_cyclone: hasCyclone,
    tcws_cebu: {
      active: maxSignalForCebu > 0,
      signal_level: maxSignalForCebu,
      wind_speed_kmh: TCWS_WIND_SPEEDS[maxSignalForCebu],
      areas_affected: cebuAreasAffected
    },
    heavy_rainfall_alert: {
      level: rainfallLevel,
      warning_type: rainfallMatch ? sanitize(rainfallMatch[0], 50) : null,
      description: rainfallDesc,
      advisory_areas: rainfallAreas
    },
    storm_center: stormCenter,
    parse_confidence: "high",
    parse_notes: null
  };
}

function createBaselineBulletin(
  sourceUrl: string,
  fetchedAt: string,
  note: string,
  confidence: "high" | "low"
): PagasaBulletin {
  return {
    id: makeId(sourceUrl, "BASELINE", fetchedAt),
    source_url: sourceUrl,
    fetched_at: fetchedAt,
    issued_at_pst: fetchedAt,
    cyclone_name: null,
    has_active_cyclone: false,
    tcws_cebu: {
      active: false,
      signal_level: 0,
      wind_speed_kmh: null,
      areas_affected: []
    },
    heavy_rainfall_alert: {
      level: "none",
      warning_type: null,
      description: "No severe weather or flood warnings active for Cebu.",
      advisory_areas: []
    },
    storm_center: null,
    parse_confidence: confidence,
    parse_notes: note
  };
}

/**
 * Live fetcher for PAGASA weather bulletin with timeout and error fallback.
 */
export async function fetchPagasaBulletin(
  fetcher?: Fetcher
): Promise<PagasaBulletin> {
  const url = PAGASA_WEATHER_URL;
  const fetchedAt = new Date().toISOString();

  try {
    let html: string;
    if (fetcher) {
      html = await fetcher(url);
    } else {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "WatchCebu-CivicMonitor/1.0 (+https://watch-cebu.vercel.app)"
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      html = await res.text();
    }

    return parsePagasaBulletinHtml(html, url, fetchedAt);
  } catch (err: any) {
    return createBaselineBulletin(
      url,
      fetchedAt,
      `Failed to fetch live PAGASA bulletin: ${err.message || String(err)}`,
      "low"
    );
  }
}
