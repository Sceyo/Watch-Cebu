/**
 * Header and Layer Toggle Component.
 *
 * Implements Stage 3 UI requirements:
 * - App title: Watch Cebu.
 * - Layer toggle: Power / Earthquakes / Both.
 * - Data freshness chips per layer with live vs fallback indicator.
 */

import type { LayerSelection, FeedState } from "../types.js";
import type { PowerAdvisory, EarthquakeEvent, PagasaBulletin } from "../../types/index.js";
import type { AirQualityReading } from "../services/airQuality.js";
import { ICONS } from "./icons.js";

export interface HeaderCallbacks {
  onLayerChange: (layer: LayerSelection) => void;
  onLegendToggle: () => void;
  onAboutToggle: () => void;
  onAirQualityToggle?: () => void;
  onForecastToggle?: () => void;
  onStatusPopoverToggle?: () => void;
}

export interface HeaderExtraState {
  airQuality?: AirQualityReading | null;
  isForecastActive?: boolean;
  pagasaState?: FeedState<PagasaBulletin | null>;
}

export function renderHeader(
  container: HTMLElement,
  currentLayer: LayerSelection,
  powerState: FeedState<PowerAdvisory[]>,
  eqState: FeedState<EarthquakeEvent[]>,
  callbacks: HeaderCallbacks,
  extra?: HeaderExtraState
): void {
  // Format freshness chip text
  const formatFreshness = (label: string, state: FeedState<any>) => {
    if (state.status === "loading") {
      return `<span class="freshness-chip loading"><span class="pulse-dot"></span>${label}: Fetching...</span>`;
    }
    if (state.status === "error") {
      return `<span class="freshness-chip error">${label}: Offline</span>`;
    }
    if (state.dataSource === "fixture_fallback") {
      return `<span class="freshness-chip fallback" title="${state.parseNotes || ''}">⚠️ ${label}: Backup Fixture Data</span>`;
    }
    return `<span class="freshness-chip live"><span class="live-dot"></span>${label}: Live · Verified</span>`;
  };

  const powerChip = formatFreshness("Power", powerState);
  const eqChip = formatFreshness("Earthquakes", eqState);

  let airChip = `<button class="freshness-chip air-chip loading" id="btn-toggle-air" title="Loading Air Quality..."><span class="pulse-dot"></span>Air: Fetching...</button>`;
  if (extra?.airQuality) {
    const air = extra.airQuality;
    const hazeNotice = air.isWildfireHazeDetected ? " · Haze Advisory" : "";
    airChip = `<button class="freshness-chip air-chip" id="btn-toggle-air" style="border-color: ${air.hex}88;" title="Click for Air Quality & Haze Advisory"><span class="live-dot" style="background: ${air.hex};"></span>Air: AQI ${air.aqi} (${air.categoryLabel}${hazeNotice})</button>`;
  }

  let pagasaChip = `<button class="freshness-chip loading" id="btn-header-storm" title="Fetching PAGASA severe weather..."><span class="pulse-dot"></span>PAGASA: Fetching...</button>`;
  if (extra?.pagasaState) {
    const pState = extra.pagasaState;
    if (pState.status === "loading") {
      pagasaChip = `<button class="freshness-chip loading" id="btn-header-storm" title="Fetching PAGASA severe weather..."><span class="pulse-dot"></span>PAGASA: Fetching...</button>`;
    } else if (pState.status === "error") {
      pagasaChip = `<button class="freshness-chip error" id="btn-header-storm" title="PAGASA feed unreachable">PAGASA: Offline</button>`;
    } else if (pState.dataSource === "fixture_fallback") {
      pagasaChip = `<button class="freshness-chip fallback" id="btn-header-storm" title="${pState.parseNotes || 'Backup Fixture Data'}">⚠️ PAGASA: Backup Data</button>`;
    } else if (pState.data) {
      const bulletin = pState.data;
      if (bulletin.tcws_cebu?.active) {
        pagasaChip = `<button class="freshness-chip storm-chip active tcws-active" id="btn-header-storm" style="border-color: #EF4444; color: #FCA5A5; background: rgba(239, 68, 68, 0.15);" title="Active TCWS Signal #${bulletin.tcws_cebu.signal_level} for Cebu — Click for details"><span class="pulse-dot" style="background: #EF4444;"></span>TCWS #${bulletin.tcws_cebu.signal_level}: ${bulletin.cyclone_name || 'Active'}</button>`;
      } else if (bulletin.heavy_rainfall_alert && bulletin.heavy_rainfall_alert.level !== "none") {
        const rColor = bulletin.heavy_rainfall_alert.level === "red" ? "#EF4444" : bulletin.heavy_rainfall_alert.level === "orange" ? "#F97316" : "#EAB308";
        pagasaChip = `<button class="freshness-chip storm-chip active rainfall-active" id="btn-header-storm" style="border-color: ${rColor}; color: #FDE047; background: rgba(245, 158, 11, 0.15);" title="Heavy Rainfall Warning: ${bulletin.heavy_rainfall_alert.level.toUpperCase()} — Click for details"><span class="pulse-dot" style="background: ${rColor};"></span>Rainfall: ${bulletin.heavy_rainfall_alert.level.toUpperCase()}</button>`;
      } else {
        pagasaChip = `<button class="freshness-chip live" id="btn-header-storm" title="PAGASA Severe Weather: Normal — Click for weather forecast"><span class="live-dot"></span>PAGASA: Normal</button>`;
      }
    }
  }

  // Consolidated system status for compact mobile header (52px top bar)
  const isAnyFallback =
    powerState.dataSource === "fixture_fallback" ||
    eqState.dataSource === "fixture_fallback" ||
    extra?.airQuality?.isFallback ||
    extra?.pagasaState?.dataSource === "fixture_fallback";
  const isAnyLoading =
    powerState.status === "loading" ||
    eqState.status === "loading" ||
    extra?.pagasaState?.status === "loading";

  let liveCount = 0;
  if (powerState.status === "success" && powerState.dataSource !== "fixture_fallback") liveCount++;
  if (eqState.status === "success" && eqState.dataSource !== "fixture_fallback") liveCount++;
  if (extra?.airQuality && !extra.airQuality.isFallback) liveCount++;
  if (extra?.pagasaState?.status === "success" && extra?.pagasaState?.dataSource !== "fixture_fallback") liveCount++;

  let mobileStatusHtml = `<button class="freshness-chip mobile-status-btn live" id="btn-mobile-status" aria-label="System status: ${liveCount || 4} feeds live"><span class="live-dot"></span><span>${liveCount || 4} Feeds Live</span></button>`;
  if (isAnyLoading) {
    mobileStatusHtml = `<button class="freshness-chip mobile-status-btn loading" id="btn-mobile-status" aria-label="System status: Fetching data"><span class="pulse-dot"></span><span>Connecting...</span></button>`;
  } else if (isAnyFallback) {
    mobileStatusHtml = `<button class="freshness-chip mobile-status-btn fallback" id="btn-mobile-status" aria-label="System status: Backup data active"><span class="pulse-dot"></span><span>⚠️ Backup Data</span></button>`;
  }

  container.innerHTML = `
    <div class="header-left">
      <div class="brand">
        <span class="brand-icon" style="display: inline-flex; align-items: center; color: #38BDF8;" title="Watch Cebu — Civic Situational Awareness Map">${ICONS.cebu}</span>
        <h1 class="brand-title">WATCH CEBU</h1>
      </div>
      <div class="freshness-chips desktop-only">
        ${powerChip}
        ${eqChip}
        ${airChip}
        ${pagasaChip}
      </div>
      <div class="mobile-status-container mobile-only">
        ${mobileStatusHtml}
      </div>
    </div>

    <div class="header-center desktop-only">
      <div class="layer-toggle-group">
        <button class="layer-btn ${currentLayer === 'power' ? 'active' : ''}" data-layer="power">
          Power (${powerState.data.length})
        </button>
        <button class="layer-btn ${currentLayer === 'earthquakes' ? 'active' : ''}" data-layer="earthquakes">
          Quakes (${eqState.data.length})
        </button>
        <button class="layer-btn ${currentLayer === 'both' ? 'active' : ''}" data-layer="both">
          Both
        </button>
      </div>
    </div>

    <div class="header-right desktop-only">
      <button class="legend-toggle-btn forecast-toggle-btn ${extra?.isForecastActive ? 'active' : ''}" id="btn-toggle-forecast" title="View Today's Weather Forecast">
        <span class="btn-icon">${ICONS.weather}</span>
        <span class="btn-text">Forecast</span>
      </button>
      <button class="legend-toggle-btn" id="btn-toggle-about" title="About Watch Cebu">
        <span class="btn-icon">${ICONS.about}</span>
        <span class="btn-text">About</span>
      </button>
      <button class="legend-toggle-btn" id="btn-toggle-legend" title="View Legend and Information">
        <span class="btn-icon">${ICONS.legend}</span>
        <span class="btn-text">Legend</span>
      </button>
    </div>
  `;

  // Attach event listeners
  const layerButtons = container.querySelectorAll<HTMLButtonElement>(".layer-btn");
  layerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const layer = btn.getAttribute("data-layer") as LayerSelection;
      if (layer) callbacks.onLayerChange(layer);
    });
  });

  const forecastBtn = container.querySelector<HTMLButtonElement>("#btn-toggle-forecast");
  forecastBtn?.addEventListener("click", () => {
    callbacks.onForecastToggle?.();
  });

  const legendBtn = container.querySelector<HTMLButtonElement>("#btn-toggle-legend");
  legendBtn?.addEventListener("click", () => {
    callbacks.onLegendToggle();
  });

  const aboutBtn = container.querySelector<HTMLButtonElement>("#btn-toggle-about");
  aboutBtn?.addEventListener("click", () => {
    callbacks.onAboutToggle();
  });

  const airBtn = container.querySelector<HTMLButtonElement>("#btn-toggle-air");
  airBtn?.addEventListener("click", () => {
    callbacks.onAirQualityToggle?.();
  });

  const mobileStatusBtn = container.querySelector<HTMLButtonElement>("#btn-mobile-status");
  mobileStatusBtn?.addEventListener("click", () => {
    callbacks.onStatusPopoverToggle?.();
  });

  const stormBtn = container.querySelector<HTMLButtonElement>("#btn-header-storm");
  stormBtn?.addEventListener("click", () => {
    callbacks.onForecastToggle?.();
  });
}
