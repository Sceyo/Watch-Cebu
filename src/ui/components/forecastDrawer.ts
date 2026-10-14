/**
 * Forecast Drawer Component (Phase 6).
 *
 * Renders an accessible top slide-down drawer with a horizontal-scrolling row
 * of today's hourly weather cards for Metro Cebu (Open-Meteo).
 * Mirrors the Air Quality drawer's interaction pattern and keyboard accessibility.
 */

import type { ForecastResult, HourlyForecastEntry } from "../services/forecast.js";
import type { PagasaBulletin } from "../../types/index.js";
import { ICONS } from "./icons.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPagasaSection(bulletin: PagasaBulletin | null | undefined): string {
  if (!bulletin) {
    return "";
  }

  const isTcwsActive = bulletin.tcws_cebu?.active;
  const isRainActive = bulletin.heavy_rainfall_alert && bulletin.heavy_rainfall_alert.level !== "none";

  if (!isTcwsActive && !isRainActive) {
    return `
      <div class="pagasa-status-banner normal">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem; line-height: 1;">🛡️</span>
            <div>
              <strong style="color: #34D399; font-size: 0.85rem;">PAGASA Civic Status: Normal</strong>
              <div style="font-size: 0.74rem; color: var(--text-secondary);">No active Tropical Cyclone Wind Signals (TCWS) or Flood Warnings in Cebu Province.</div>
            </div>
          </div>
          ${bulletin.issued_at_pst ? `<span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">Issued: ${escapeHtml(bulletin.issued_at_pst)}</span>` : ""}
        </div>
      </div>
    `;
  }

  // Active Alert Cards
  let tcwsCardHtml = "";
  if (isTcwsActive) {
    const sig = bulletin.tcws_cebu.signal_level;
    const areas = bulletin.tcws_cebu.areas_affected.length > 0
      ? bulletin.tcws_cebu.areas_affected.map(escapeHtml).join(", ")
      : "Cebu Province";
    const centerInfo = bulletin.storm_center
      ? `<div style="margin-top: 6px; font-size: 0.74rem; color: #FCA5A5; font-family: var(--font-mono);">
          Eye: ${bulletin.storm_center.lat.toFixed(1)}°N, ${bulletin.storm_center.lon.toFixed(1)}°E
          ${bulletin.storm_center.movement ? ` • Moving: ${escapeHtml(bulletin.storm_center.movement)}` : ""}
          ${bulletin.storm_center.max_sustained_winds_kmh ? ` • Max Winds: ${bulletin.storm_center.max_sustained_winds_kmh} km/h` : ""}
         </div>`
      : "";

    tcwsCardHtml = `
      <div class="pagasa-alert-card tcws-card">
        <div class="pagasa-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="pagasa-badge tcws-badge">SIGNAL #${sig}</span>
            <span class="pagasa-storm-name">${bulletin.cyclone_name ? `Tropical Cyclone "${escapeHtml(bulletin.cyclone_name)}"` : "Tropical Cyclone Warning"}</span>
          </div>
          <span class="pagasa-source-tag">DOST-PAGASA</span>
        </div>
        <div class="pagasa-card-body">
          <div style="font-size: 0.82rem; color: #FFFFFF; font-weight: 600;">
            Expected Winds: ${escapeHtml(bulletin.tcws_cebu.wind_speed_kmh || '39–61 km/h')}
          </div>
          <div style="font-size: 0.76rem; color: #FECACA; margin-top: 4px;">
            <strong>Affected Areas in Cebu:</strong> ${areas}
          </div>
          ${centerInfo}
          <div class="pagasa-precaution">
            ⚠️ <em>Civic Advisory:</em> Sea travel is hazardous for small seacrafts. Secure loose roofing materials and stay alert for localized flash floods.
          </div>
        </div>
      </div>
    `;
  }

  let rainCardHtml = "";
  if (isRainActive) {
    const lvl = bulletin.heavy_rainfall_alert.level;
    const badgeColor = lvl === "red" ? "#EF4444" : lvl === "orange" ? "#F97316" : "#EAB308";
    const bgOpacity = lvl === "red" ? "rgba(239, 68, 68, 0.14)" : lvl === "orange" ? "rgba(249, 115, 22, 0.14)" : "rgba(234, 179, 8, 0.14)";
    const areas = bulletin.heavy_rainfall_alert.advisory_areas.length > 0
      ? bulletin.heavy_rainfall_alert.advisory_areas.map(escapeHtml).join(", ")
      : "Metro Cebu & Low-lying Barangays";

    rainCardHtml = `
      <div class="pagasa-alert-card rainfall-card" style="background: ${bgOpacity}; border-color: ${badgeColor}66;">
        <div class="pagasa-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="pagasa-badge" style="background: ${badgeColor}; color: #000000; font-weight: 800;">${lvl.toUpperCase()} WARNING</span>
            <span class="pagasa-storm-name">${escapeHtml(bulletin.heavy_rainfall_alert.warning_type || "Heavy Rainfall Advisory")}</span>
          </div>
          <span class="pagasa-source-tag">DOST-PAGASA</span>
        </div>
        <div class="pagasa-card-body">
          <div style="font-size: 0.82rem; color: #FFFFFF; font-weight: 500;">
            ${escapeHtml(bulletin.heavy_rainfall_alert.description)}
          </div>
          <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px;">
            <strong>Advisory Coverage:</strong> ${areas}
          </div>
          <div class="pagasa-precaution">
            🌧️ <em>Civic Advisory:</em> Residents in low-lying and mountainous areas must monitor for flash floods and landslide hazards.
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="pagasa-alerts-container">
      ${tcwsCardHtml}
      ${rainCardHtml}
    </div>
  `;
}

export function renderForecastDrawer(
  container: HTMLElement,
  data: ForecastResult | null,
  isOpen: boolean,
  onClose: () => void,
  pagasaBulletin?: PagasaBulletin | null
): void {
  if (!isOpen) {
    container.classList.remove("open");
    container.setAttribute("aria-hidden", "true");
    container.innerHTML = "";
    return;
  }

  container.classList.add("open");
  container.setAttribute("aria-hidden", "false");
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-labelledby", "forecast-drawer-title");

  const pagasaHtml = renderPagasaSection(pagasaBulletin);

  // Loading State for Hourly Forecast
  if (!data) {
    container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title" id="forecast-drawer-title">
          <span style="display: inline-flex; align-items: center; color: var(--accent-blue);" aria-hidden="true">${ICONS.weather}</span>
          <span>Weather &amp; Severe Weather Alerts — Metro Cebu</span>
        </div>
        <button class="drawer-close-btn" id="btn-close-forecast-drawer" aria-label="Close Forecast" title="Close Forecast">${ICONS.close}</button>
      </div>
      <div class="drawer-content forecast-drawer-content" style="padding: 16px 20px;">
        ${pagasaHtml}
        <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary);">
          <p>Fetching today's hourly weather forecast for Metro Cebu...</p>
        </div>
      </div>
    `;
    container.querySelector("#btn-close-forecast-drawer")?.addEventListener("click", onClose);
    return;
  }

  // Error State for Hourly Forecast
  if (data.status === "error" || data.entries.length === 0) {
    container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title" id="forecast-drawer-title">
          <span style="display: inline-flex; align-items: center; color: var(--accent-blue);" aria-hidden="true">${ICONS.weather}</span>
          <span>Weather &amp; Severe Weather Alerts — Metro Cebu</span>
        </div>
        <button class="drawer-close-btn" id="btn-close-forecast-drawer" aria-label="Close Forecast" title="Close Forecast">${ICONS.close}</button>
      </div>
      <div class="drawer-content forecast-drawer-content" style="padding: 16px 20px;">
        ${pagasaHtml}
        <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; color: #FCA5A5; font-size: 0.85rem; line-height: 1.4; margin-top: 10px;">
          <strong>Forecast Temporarily Unavailable</strong>
          <p style="margin-top: 6px; color: #FECACA;">Unable to load atmospheric forecast data from Open-Meteo at this time. Please check your network connection or try again shortly.</p>
        </div>
      </div>
    `;
    container.querySelector("#btn-close-forecast-drawer")?.addEventListener("click", onClose);
    return;
  }

  // Success State: Render horizontal scrolling hour cards
  const cardsHtml = data.entries
    .map((entry: HourlyForecastEntry) => {
      const currentClass = entry.isCurrentHour ? " current-hour" : "";
      const currentBadge = entry.isCurrentHour
        ? `<span class="current-hour-pill">NOW</span>`
        : "";

      return `
        <div class="forecast-hour-card${currentClass}" title="${entry.hourLabel}: ${entry.description}">
          <div class="hour-card-time">
            ${currentBadge}
            <span>${entry.hourLabel}</span>
          </div>
          <div class="hour-card-icon" aria-hidden="true">${entry.icon}</div>
          <div class="hour-card-rain" title="Precipitation probability">
            <span class="hour-metric-icon" style="display: inline-flex; align-items: center; color: #60A5FA;">${ICONS.rain}</span>
            <span class="hour-metric-val">${entry.precipitationProbability}%</span>
          </div>
          <div class="hour-card-wind" title="Wind speed">
            <span class="hour-metric-icon" style="display: inline-flex; align-items: center; color: #94A3B8;">${ICONS.wind}</span>
            <span class="hour-metric-val">${entry.windSpeedKmh}<small>km/h</small></span>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-title" id="forecast-drawer-title">
        <span style="display: inline-flex; align-items: center; color: var(--accent-blue);" aria-hidden="true">${ICONS.weather}</span>
        <span>Weather &amp; Severe Weather Alerts — Metro Cebu</span>
      </div>
      <button class="drawer-close-btn" id="btn-close-forecast-drawer" aria-label="Close Forecast" title="Close Forecast">${ICONS.close}</button>
    </div>

    <div class="drawer-content forecast-drawer-content">
      ${pagasaHtml}

      <div class="forecast-meta-row" style="margin-top: 6px;">
        <span>● Metro Cebu (10.32°N, 123.89°E)</span>
        <span>Open-Meteo Hourly Model • Today (PHT)</span>
      </div>

      <!-- Single Horizontal Scrolling Row of Today's Hours -->
      <div class="forecast-hours-scroll" role="region" aria-label="Hourly weather forecast" tabindex="0">
        ${cardsHtml}
      </div>

      <div class="forecast-footer-note">
        <span>Scroll horizontally to view upcoming hours today. Shows expected rain chance and wind speed.</span>
      </div>
    </div>
  `;

  container.querySelector("#btn-close-forecast-drawer")?.addEventListener("click", onClose);
}
