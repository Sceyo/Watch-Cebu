/**
 * Weather Forecast Service (Phase 6).
 *
 * Queries Open-Meteo API for today's hourly weather forecast for Metro Cebu.
 * Strictly limited to forecast_days=1 for a compact, scannable single-day view.
 * Endpoint: https://api.open-meteo.com/v1/forecast?latitude=10.3157&longitude=123.8854&hourly=precipitation_probability,precipitation,cloud_cover,wind_speed_10m,weather_code&timezone=Asia%2FManila&forecast_days=1
 */

export interface HourlyForecastEntry {
  time: string; // ISO string e.g. "2026-09-27T14:00"
  hourLabel: string; // e.g. "2 PM", "12 AM"
  hour24: number; // 0 - 23
  isCurrentHour: boolean;
  precipitationProbability: number; // % e.g. 25
  precipitationMm: number; // mm e.g. 0.2
  cloudCoverPercent: number; // % e.g. 60
  windSpeedKmh: number; // km/h e.g. 15
  weatherCode: number;
  icon: string; // e.g. "⛅"
  description: string; // e.g. "Partly cloudy"
}

export interface ForecastResult {
  status: "success" | "error";
  fetchedAt: string;
  entries: HourlyForecastEntry[];
  currentTempC?: number;
  error?: string;
}

/**
 * Standard WMO Weather Interpretation Code (WW) mapping.
 */
export function getWeatherCodeInfo(code: number): { icon: string; description: string } {
  switch (code) {
    case 0:
      return { icon: "☀️", description: "Clear sky" };
    case 1:
      return { icon: "🌤️", description: "Mainly clear" };
    case 2:
      return { icon: "⛅", description: "Partly cloudy" };
    case 3:
      return { icon: "☁️", description: "Overcast" };
    case 45:
    case 48:
      return { icon: "🌫️", description: "Fog / Mist" };
    case 51:
    case 53:
    case 55:
      return { icon: "🌦️", description: "Drizzle" };
    case 61:
      return { icon: "🌧️", description: "Slight rain" };
    case 63:
      return { icon: "🌧️", description: "Moderate rain" };
    case 65:
      return { icon: "🌧️", description: "Heavy rain" };
    case 80:
    case 81:
    case 82:
      return { icon: "🌧️", description: "Rain showers" };
    case 95:
      return { icon: "⛈️", description: "Thunderstorm" };
    case 96:
    case 99:
      return { icon: "⛈️", description: "Thunderstorm w/ hail" };
    default:
      return { icon: "🌤️", description: "Fair" };
  }
}

/**
 * Formats ISO hour string to 12-hour label (e.g. "2 PM", "12 AM").
 */
export function formatHourLabel(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const hours = date.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12} ${ampm}`;
  } catch {
    return isoString;
  }
}

export async function fetchForecast(
  fetcher: typeof fetch = fetch
): Promise<ForecastResult> {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=10.3157&longitude=123.8854&hourly=precipitation_probability,precipitation,cloud_cover,wind_speed_10m,weather_code&timezone=Asia%2FManila&forecast_days=1";

  try {
    const res = await fetcher(url);
    if (!res.ok) {
      return {
        status: "error",
        fetchedAt: new Date().toISOString(),
        entries: [],
        error: `HTTP ${res.status} from Open-Meteo forecast API`,
      };
    }

    const data = await res.json();
    const times = data?.hourly?.time;
    if (!Array.isArray(times) || times.length === 0) {
      return {
        status: "error",
        fetchedAt: new Date().toISOString(),
        entries: [],
        error: "Malformed hourly time series from forecast API",
      };
    }

    const probs = data?.hourly?.precipitation_probability ?? [];
    const precips = data?.hourly?.precipitation ?? [];
    const clouds = data?.hourly?.cloud_cover ?? [];
    const winds = data?.hourly?.wind_speed_10m ?? [];
    const codes = data?.hourly?.weather_code ?? [];

    const now = new Date();
    // In Manila timezone, get current hour
    const currentHourString = now.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour12: false,
      hour: "2-digit",
    });
    const currentHour24 = parseInt(currentHourString, 10);

    const entries: HourlyForecastEntry[] = times.map((t: string, idx: number) => {
      const code = Number(codes[idx] ?? 0);
      const codeInfo = getWeatherCodeInfo(code);
      const date = new Date(t);
      const hour24 = !isNaN(date.getTime()) ? date.getHours() : idx;

      return {
        time: t,
        hourLabel: formatHourLabel(t),
        hour24,
        isCurrentHour: hour24 === currentHour24,
        precipitationProbability: Math.round(Number(probs[idx] ?? 0)),
        precipitationMm: Number(precips[idx] ?? 0),
        cloudCoverPercent: Math.round(Number(clouds[idx] ?? 0)),
        windSpeedKmh: Math.round(Number(winds[idx] ?? 0)),
        weatherCode: code,
        icon: codeInfo.icon,
        description: codeInfo.description,
      };
    });

    return {
      status: "success",
      fetchedAt: new Date().toISOString(),
      entries,
    };
  } catch (err: any) {
    return {
      status: "error",
      fetchedAt: new Date().toISOString(),
      entries: [],
      error: err?.message || "Failed to fetch weather forecast",
    };
  }
}
