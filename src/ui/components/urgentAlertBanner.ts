/**
 * Urgent Severe Weather & Tropical Cyclone Alert Banner.
 *
 * Surfaces active DOST-PAGASA Tropical Cyclone Wind Signals (TCWS)
 * and Heavy Rainfall Warnings directly on the main screen so civilians
 * do not have to hunt inside the forecast drawer.
 */

import type { PagasaBulletin } from "../../types/index.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderUrgentAlertBanner(
  container: HTMLElement,
  bulletin: PagasaBulletin | null | undefined,
  onOpenForecast: () => void
): void {
  if (!bulletin) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  const isTcwsActive = Boolean(bulletin.tcws_cebu?.active);
  const isRainActive = Boolean(
    bulletin.heavy_rainfall_alert && bulletin.heavy_rainfall_alert.level !== "none"
  );

  if (!isTcwsActive && !isRainActive) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  if (isTcwsActive) {
    const sig = bulletin.tcws_cebu.signal_level;
    const cycloneName = bulletin.cyclone_name ? `"${escapeHtml(bulletin.cyclone_name)}"` : "Tropical Cyclone";
    const windSpeed = bulletin.tcws_cebu.wind_speed_kmh || "39–61 km/h";

    container.innerHTML = `
      <div class="urgent-alert-banner alert-tcws" role="alert" tabindex="0" title="Click to view full storm track and weather forecast">
        <div class="urgent-alert-main">
          <span class="urgent-pulse-dot" aria-hidden="true"></span>
          <div class="urgent-alert-text">
            <span class="urgent-badge">TCWS SIGNAL #${sig}</span>
            <span class="urgent-headline">Cebu under storm warning for ${cycloneName} (${escapeHtml(windSpeed)})</span>
          </div>
        </div>
        <button class="urgent-view-btn" id="btn-urgent-forecast-action" aria-label="View storm track and forecast">
          <span>Track &amp; Forecast</span>
          <span aria-hidden="true">›</span>
        </button>
      </div>
    `;
  } else if (isRainActive) {
    const level = bulletin.heavy_rainfall_alert.level.toUpperCase();
    const isRed = level === "RED";
    const isOrange = level === "ORANGE";
    const levelClass = isRed ? "alert-rain-red" : isOrange ? "alert-rain-orange" : "alert-rain-yellow";

    container.innerHTML = `
      <div class="urgent-alert-banner ${levelClass}" role="alert" tabindex="0" title="Click to view heavy rainfall details and hourly forecast">
        <div class="urgent-alert-main">
          <span class="urgent-pulse-dot" aria-hidden="true"></span>
          <div class="urgent-alert-text">
            <span class="urgent-badge">${level} WARNING</span>
            <span class="urgent-headline">Heavy rainfall advisory for Metro Cebu — flood and landslide caution</span>
          </div>
        </div>
        <button class="urgent-view-btn" id="btn-urgent-forecast-action" aria-label="View heavy rainfall forecast">
          <span>View Forecast</span>
          <span aria-hidden="true">›</span>
        </button>
      </div>
    `;
  }

  const clickableBanner = container.querySelector<HTMLElement>(".urgent-alert-banner");
  clickableBanner?.addEventListener("click", () => {
    onOpenForecast();
  });

  clickableBanner?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenForecast();
    }
  });

  const btnAction = container.querySelector<HTMLButtonElement>("#btn-urgent-forecast-action");
  btnAction?.addEventListener("click", (e) => {
    e.stopPropagation();
    onOpenForecast();
  });
}
