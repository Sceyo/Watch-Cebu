/**
 * Air Quality & Transboundary Haze Service (Phase 6).
 *
 * Fetches real-time Air Quality data for Metro Cebu from Open-Meteo Air Quality API:
 * Endpoint: https://air-quality-api.open-meteo.com/v1/air-quality?latitude=10.3157&longitude=123.8854&current=pm10,pm2_5,carbon_monoxide,aerosol_optical_depth,us_aqi,european_aqi
 *
 * Categorizes AQI per Philippine DENR-EMB & US EPA standard:
 * - 0–50: Good (#22C55E)
 * - 51–100: Moderate (#EAB308) — WCAG AA dark text (#0F172A)
 * - 101–150: Unhealthy for Sensitive Groups (#F97316)
 * - 151–200: Unhealthy (#EF4444)
 * - 201–300: Acutely Unhealthy (#A855F7)
 * - 301+: Emergency / Hazardous (#7E22CE)
 *
 * Detects transboundary wildfire smoke signatures (e.g. Kalimantan/Sumatra haze via Habagat winds).
 */

export interface AirQualityReading {
  aqi: number;
  category: "good" | "moderate" | "sensitive" | "unhealthy" | "acutely_unhealthy" | "emergency";
  categoryLabel: string;
  contrastColor: string;
  hex: string;
  pm2_5: number;
  pm2_5Desc: string;
  pm10: number;
  pm10Desc: string;
  carbonMonoxide: number;
  carbonMonoxideDesc: string;
  aerosolOpticalDepth: number;
  aerosolOpticalDepthDesc: string;
  isWildfireHazeDetected: boolean;
  healthAdvisory: {
    headline: string;
    actionableGuidance: string;
    maskRecommendation: string;
    vulnerableGroupWarning: string;
  };
  fetchedAt: string;
  observationTimePst: string;
  isFallback: boolean;
  isStale: boolean;
}

export function computeAqiCategory(aqi: number): {
  category: AirQualityReading["category"];
  label: string;
  hex: string;
  contrastColor: string;
} {
  if (aqi <= 50) {
    return { category: "good", label: "Good", hex: "#22C55E", contrastColor: "#FFFFFF" };
  } else if (aqi <= 100) {
    // WCAG 2.1 AA requirement: Dark slate text (#0F172A) on Moderate Yellow (#EAB308)
    return { category: "moderate", label: "Moderate", hex: "#EAB308", contrastColor: "#0F172A" };
  } else if (aqi <= 150) {
    return { category: "sensitive", label: "Sensitive Groups", hex: "#F97316", contrastColor: "#FFFFFF" };
  } else if (aqi <= 200) {
    return { category: "unhealthy", label: "Unhealthy", hex: "#EF4444", contrastColor: "#FFFFFF" };
  } else if (aqi <= 300) {
    return { category: "acutely_unhealthy", label: "Acutely Unhealthy", hex: "#A855F7", contrastColor: "#FFFFFF" };
  } else {
    return { category: "emergency", label: "Emergency", hex: "#7E22CE", contrastColor: "#FFFFFF" };
  }
}

export function formatObservationTime(isoString?: string): string {
  try {
    const d = isoString ? new Date(isoString) : new Date();
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " PST";
  } catch {
    return "Recently";
  }
}

export function parseAirQualityData(rawJson: any, now: Date = new Date()): AirQualityReading {
  const current = rawJson?.current ?? {};
  const aqi = Math.round(current.us_aqi ?? current.european_aqi ?? 45);
  const pm2_5 = Number((current.pm2_5 ?? 12.0).toFixed(1));
  const pm10 = Number((current.pm10 ?? 20.0).toFixed(1));
  const carbonMonoxide = Number((current.carbon_monoxide ?? 250).toFixed(0));
  const aerosolOpticalDepth = Number((current.aerosol_optical_depth ?? 0.15).toFixed(2));

  const { category, label, hex, contrastColor } = computeAqiCategory(aqi);

  // Humanized qualitative descriptors
  let pm2_5Desc = "Good";
  if (pm2_5 > 55.4) pm2_5Desc = "High / Unhealthy";
  else if (pm2_5 > 35.4) pm2_5Desc = "Elevated";
  else if (pm2_5 > 12.0) pm2_5Desc = "Moderate";

  let pm10Desc = "Good";
  if (pm10 > 154) pm10Desc = "Elevated";
  else if (pm10 > 54) pm10Desc = "Moderate";

  // Ambient baseline: 200-1500 ug/m3 is typical urban air; >4000 ug/m3 is elevated combustion
  const carbonMonoxideDesc = carbonMonoxide >= 4000 ? "Elevated combustion" : "Normal baseline";

  // AOD: < 0.20 clear, 0.20-0.34 moderate, >= 0.35 dense smoke/haze
  let aerosolOpticalDepthDesc = "Clear atmosphere";
  if (aerosolOpticalDepth >= 0.35) {
    aerosolOpticalDepthDesc = "Dense smoke haze";
  } else if (aerosolOpticalDepth >= 0.20) {
    aerosolOpticalDepthDesc = "Moderate turbidity";
  }

  // Wildfire haze signature: elevated AOD (> 0.35) or high PM2.5 + CO from combustion
  const isWildfireHazeDetected = aerosolOpticalDepth >= 0.35 || (pm2_5 >= 35 && aqi >= 101);

  let headline = "Air quality is satisfactory in Metro Cebu.";
  let guidance = "Air pollution poses little or no risk to general activities.";
  let maskRecommendation = "No mask required for general outdoor activities.";
  let vulnerableGroupWarning = "Safe for general population and sensitive groups.";

  if (category === "moderate") {
    headline = "Air quality is acceptable in Metro Cebu.";
    guidance = "Unusually sensitive people should consider reducing prolonged outdoor exertion.";
    maskRecommendation = "Mask optional; recommended if sensitive to airborne dust.";
    vulnerableGroupWarning = "People with respiratory illness may notice mild irritation.";
  } else if (category === "sensitive") {
    headline = "Elevated particulate pollution detected in Metro Cebu.";
    guidance = "Members of sensitive groups should reduce prolonged or heavy outdoor exertion.";
    maskRecommendation = "Well-fitted surgical or KN95 mask recommended for sensitive groups outdoors.";
    vulnerableGroupWarning = "Children, elderly, and individuals with asthma/heart disease are at risk.";
  } else if (category === "unhealthy") {
    headline = "Unhealthy air quality across Metro Cebu.";
    guidance = "Everyone should reduce outdoor activities. Keep home and classroom windows closed.";
    maskRecommendation = "N95 or KN95 protective mask strongly advised outdoors.";
    vulnerableGroupWarning = "Sensitive groups should remain indoors and avoid physical exertion.";
  } else if (category === "acutely_unhealthy" || category === "emergency") {
    headline = "Acutely unhealthy air quality — Transboundary Haze Warning.";
    guidance = "Serious health hazard. Avoid all unnecessary outdoor exposure. Follow LGU class and work advisories.";
    maskRecommendation = "Well-fitted N95 / KN95 respirator mask mandatory when going outdoors.";
    vulnerableGroupWarning = "High risk of acute respiratory distress. Keep windows tightly shut; use air purification.";
  }

  const fetchedAt = current.time ?? now.toISOString();
  const obsDate = new Date(fetchedAt);
  const diffMs = Math.abs(now.getTime() - obsDate.getTime());
  const isStale = !isNaN(diffMs) && diffMs > 2 * 3600000;

  return {
    aqi,
    category,
    categoryLabel: label,
    contrastColor,
    hex,
    pm2_5,
    pm2_5Desc,
    pm10,
    pm10Desc,
    carbonMonoxide,
    carbonMonoxideDesc,
    aerosolOpticalDepth,
    aerosolOpticalDepthDesc,
    isWildfireHazeDetected,
    healthAdvisory: {
      headline,
      actionableGuidance: guidance,
      maskRecommendation,
      vulnerableGroupWarning,
    },
    fetchedAt,
    observationTimePst: formatObservationTime(fetchedAt),
    isFallback: false,
    isStale,
  };
}

const FALLBACK_READING: AirQualityReading = {
  aqi: 48,
  category: "good",
  categoryLabel: "Good",
  contrastColor: "#FFFFFF",
  hex: "#22C55E",
  pm2_5: 11.2,
  pm2_5Desc: "Good",
  pm10: 18.5,
  pm10Desc: "Good",
  carbonMonoxide: 210,
  carbonMonoxideDesc: "Normal baseline",
  aerosolOpticalDepth: 0.12,
  aerosolOpticalDepthDesc: "Clear atmosphere",
  isWildfireHazeDetected: false,
  healthAdvisory: {
    headline: "Air quality is satisfactory in Metro Cebu.",
    actionableGuidance: "Air pollution poses little or no risk to general activities.",
    maskRecommendation: "No mask required for general outdoor activities.",
    vulnerableGroupWarning: "Safe for general population and sensitive groups.",
  },
  fetchedAt: new Date().toISOString(),
  observationTimePst: formatObservationTime(),
  isFallback: true,
  isStale: false,
};

const CACHE_KEY = "watch_cebu_aqi_cache_v1";

export function getCachedAirQuality(): AirQualityReading | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedAirQuality(reading: AirQualityReading): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CACHE_KEY, JSON.stringify(reading));
  } catch {}
}

export async function fetchAirQuality(
  fetcher: typeof fetch = fetch
): Promise<AirQualityReading> {
  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=10.3157&longitude=123.8854&current=pm10,pm2_5,carbon_monoxide,aerosol_optical_depth,us_aqi,european_aqi";

  try {
    const res = await fetcher(url);
    if (!res.ok) {
      console.warn(`[WatchCebu] Air Quality API returned HTTP ${res.status}`);
      return FALLBACK_READING;
    }
    const json = await res.json();
    const reading = parseAirQualityData(json);
    setCachedAirQuality(reading);
    return reading;
  } catch (err) {
    console.warn("[WatchCebu] Air Quality fetch failed, using fallback:", err);
    return FALLBACK_READING;
  }
}
