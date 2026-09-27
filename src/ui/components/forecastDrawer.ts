/**
 * Forecast Drawer Component (Phase 6).
 *
 * Renders an accessible top slide-down drawer with a horizontal-scrolling row
 * of today's hourly weather cards for Metro Cebu (Open-Meteo).
 * Mirrors the Air Quality drawer's interaction pattern and keyboard accessibility.
 */

import type { ForecastResult, HourlyForecastEntry } from "../services/forecast.js";

export function renderForecastDrawer(
  container: HTMLElement,
  data: ForecastResult | null,
  isOpen: boolean,
  onClose: () => void
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

  // Loading State
  if (!data) {
    container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title" id="forecast-drawer-title">
          <span style="font-size: 1.25rem;" aria-hidden="true">🌦️</span>
          <span>Today's Weather Forecast — Metro Cebu</span>
        </div>
        <button class="drawer-close-btn" id="btn-close-forecast-drawer" aria-label="Close Forecast" title="Close Forecast">✕</button>
      </div>
      <div class="drawer-content" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
        <p>Fetching today's hourly weather forecast for Metro Cebu...</p>
      </div>
    `;
    container.querySelector("#btn-close-forecast-drawer")?.addEventListener("click", onClose);
    return;
  }

  // Error State
  if (data.status === "error" || data.entries.length === 0) {
    container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title" id="forecast-drawer-title">
          <span style="font-size: 1.25rem;" aria-hidden="true">🌦️</span>
          <span>Today's Weather Forecast — Metro Cebu</span>
        </div>
        <button class="drawer-close-btn" id="btn-close-forecast-drawer" aria-label="Close Forecast" title="Close Forecast">✕</button>
      </div>
      <div class="drawer-content" style="padding: 1.5rem;">
        <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; color: #FCA5A5; font-size: 0.85rem; line-height: 1.4;">
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
            <span class="hour-metric-icon">🌧️</span>
            <span class="hour-metric-val">${entry.precipitationProbability}%</span>
          </div>
          <div class="hour-card-wind" title="Wind speed">
            <span class="hour-metric-icon">💨</span>
            <span class="hour-metric-val">${entry.windSpeedKmh}<small>km/h</small></span>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-title" id="forecast-drawer-title">
        <span style="font-size: 1.25rem;" aria-hidden="true">🌦️</span>
        <span>Today's Weather Forecast — Metro Cebu</span>
      </div>
      <button class="drawer-close-btn" id="btn-close-forecast-drawer" aria-label="Close Forecast" title="Close Forecast">✕</button>
    </div>

    <div class="drawer-content forecast-drawer-content">
      <div class="forecast-meta-row">
        <span>● Metro Cebu (10.32°N, 123.89°E)</span>
        <span>Open-Meteo Hourly Model • 24-Hour Horizon</span>
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
