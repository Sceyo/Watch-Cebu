/**
 * Header and Layer Toggle Component.
 *
 * Implements Stage 3 UI requirements:
 * - App title: Watch Cebu.
 * - Layer toggle: Power / Earthquakes / Both.
 * - Data freshness chips per layer with live vs fallback indicator.
 */

import type { LayerSelection, FeedState } from "../types.js";
import type { PowerAdvisory, EarthquakeEvent } from "../../types/index.js";
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

  // Consolidated system status for compact mobile header (52px top bar)
  const isAnyFallback = powerState.dataSource === "fixture_fallback" || eqState.dataSource === "fixture_fallback" || extra?.airQuality?.isFallback;
  const isAnyLoading = powerState.status === "loading" || eqState.status === "loading";
  let mobileStatusHtml = `<button class="freshness-chip mobile-status-btn live" id="btn-mobile-status" aria-label="System status: Live feeds"><span class="live-dot"></span><span>3 Feeds Live</span></button>`;
  if (isAnyLoading) {
    mobileStatusHtml = `<button class="freshness-chip mobile-status-btn loading" id="btn-mobile-status" aria-label="System status: Fetching data"><span class="pulse-dot"></span><span>Connecting...</span></button>`;
  } else if (isAnyFallback) {
    mobileStatusHtml = `<button class="freshness-chip mobile-status-btn fallback" id="btn-mobile-status" aria-label="System status: Backup data active"><span class="pulse-dot"></span><span>⚠️ Backup Data</span></button>`;
  }

  container.innerHTML = `
    <div class="header-left">
      <div class="brand">
        <span class="brand-icon" style="display: inline-flex; align-items: center; color: #EF4444;">${ICONS.bolt}</span>
        <h1 class="brand-title">WATCH CEBU</h1>
      </div>
      <div class="freshness-chips desktop-only">
        ${powerChip}
        ${eqChip}
        ${airChip}
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
}
