/**
 * Air Quality & Transboundary Haze Advisory Drawer Component (Phase 6).
 */

import type { AirQualityReading } from "../services/airQuality.js";

export function renderAirQualityDrawer(
  container: HTMLElement,
  data: AirQualityReading | null,
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
  container.setAttribute("aria-labelledby", "air-drawer-title");

  if (!data) {
    container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title" id="air-drawer-title">
          <span style="font-size: 1.25rem;" aria-hidden="true">🍃</span>
          <span>Air Quality &amp; Haze Advisory</span>
        </div>
        <button class="drawer-close-btn" id="btn-close-air-drawer" aria-label="Close Air Quality Advisory" title="Close Air Quality Advisory">✕</button>
      </div>
      <div class="drawer-content" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
        <p>Fetching real-time particulate and atmospheric haze data for Metro Cebu...</p>
      </div>
    `;
    container.querySelector("#btn-close-air-drawer")?.addEventListener("click", onClose);
    return;
  }

  const hazeTag = data.isWildfireHazeDetected
    ? `<span class="haze-tag alert">⚠️ Smoke Haze Detected</span>`
    : `<span class="haze-tag normal">Normal Airflow</span>`;

  // Scale needle from 2% to 98% across 0 to 300 AQI range
  const needlePos = Math.min(98, Math.max(2, Math.round((data.aqi / 300) * 100)));

  container.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-title" id="air-drawer-title">
        <span style="font-size: 1.25rem;" aria-hidden="true">🍃</span>
        <span>Air Quality &amp; Haze Advisory</span>
      </div>
      <button class="drawer-close-btn" id="btn-close-air-drawer" aria-label="Close Air Quality Advisory" title="Close Air Quality Advisory">✕</button>
    </div>

    <div class="drawer-content">
      <!-- Freshness Timestamp Row -->
      <div class="drawer-timestamp-row">
        <span>Station Centroid: Metro Cebu (10.32°N, 123.89°E)</span>
        <span class="${data.isFallback ? 'drawer-stale-tag' : (data.isStale ? 'drawer-stale-tag' : 'drawer-live-tag')}">
          ${data.isFallback ? '⚠️ Offline Fixture' : (data.isStale ? '⚠️ Delayed Data' : '● Live · ' + data.observationTimePst)}
        </span>
      </div>

      <!-- Main AQI Indicator Card -->
      <div class="aqi-card" style="--aqi-color: ${data.hex};">
        <div class="aqi-top">
          <div class="aqi-score-box">
            <span class="aqi-number">${data.aqi}</span>
            <span class="aqi-unit">US AQI</span>
          </div>
          <div class="aqi-status-box">
            <span class="aqi-pill" data-category="${data.category}" style="background: ${data.hex}; color: ${data.contrastColor};">
              ${data.categoryLabel}
            </span>
            ${hazeTag}
          </div>
        </div>
        <p class="aqi-headline">${data.healthAdvisory.headline}</p>

        <!-- AQI Multi-Stop Hazard Spectrum Gauge Bar & Needle -->
        <div class="aqi-gauge-track" role="progressbar" aria-valuenow="${data.aqi}" aria-valuemin="0" aria-valuemax="300" aria-valuetext="AQI ${data.aqi}, ${data.categoryLabel}">
          <div class="aqi-gauge-needle" style="left: ${needlePos}%;"></div>
        </div>
        <div class="aqi-gauge-labels">
          <span>0 Good</span>
          <span>50</span>
          <span>100 Mod</span>
          <span>150 Sens</span>
          <span>200 Unhealthy</span>
          <span>300+</span>
        </div>
      </div>

      <!-- Pollutant Metrics Grid -->
      <div class="pollutant-grid">
        <div class="pollutant-item">
          <span class="pollutant-label">PM2.5 (Fine Dust)</span>
          <span class="pollutant-value">${data.pm2_5} <span class="pollutant-unit">μg/m³</span></span>
          <span class="pollutant-desc">${data.pm2_5Desc}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">PM10 (Coarse Dust)</span>
          <span class="pollutant-value">${data.pm10} <span class="pollutant-unit">μg/m³</span></span>
          <span class="pollutant-desc">${data.pm10Desc}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">Carbon Monoxide</span>
          <span class="pollutant-value">${data.carbonMonoxide} <span class="pollutant-unit">μg/m³</span></span>
          <span class="pollutant-desc">${data.carbonMonoxideDesc}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">Aerosol Optical Depth</span>
          <span class="pollutant-value">${data.aerosolOpticalDepth} <span class="pollutant-unit">AOD</span></span>
          <span class="pollutant-desc">${data.aerosolOpticalDepthDesc}</span>
        </div>
      </div>

      <!-- Health Guidance Section -->
      <div class="about-section">
        <h3 class="section-heading" style="margin-bottom: 8px;">Health &amp; Safety Actions</h3>
        <div class="health-guidance-card">
          <div class="guidance-row">
            <span class="guidance-icon" aria-hidden="true">😷</span>
            <div>
              <strong>Mask Recommendation</strong>
              <p>${data.healthAdvisory.maskRecommendation}</p>
            </div>
          </div>
          <div class="guidance-row">
            <span class="guidance-icon" aria-hidden="true">🏠</span>
            <div>
              <strong>General Public Guidance</strong>
              <p>${data.healthAdvisory.actionableGuidance}</p>
            </div>
          </div>
          <div class="guidance-row">
            <span class="guidance-icon" aria-hidden="true">⚠️</span>
            <div>
              <strong>Vulnerable Groups</strong>
              <p>${data.healthAdvisory.vulnerableGroupWarning}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Structured Transboundary Haze Callout Card -->
      <div class="haze-context-card">
        <div class="haze-card-header">
          <span style="font-size: 1.1rem;" aria-hidden="true">🌋</span>
          <h3>Transboundary Smoke Haze Preparedness</h3>
        </div>
        <p class="haze-intro">
          During Southwest Monsoon (Habagat) months, peatland and forest fires from Kalimantan and Sumatra, Indonesia can transport dense smoke plumes across the Sulu Sea into Metro Cebu.
        </p>
        <div class="haze-facts-grid">
          <div class="haze-fact-item">
            <span class="haze-fact-label">Origin Source</span>
            <span class="haze-fact-val">Kalimantan &amp; Sumatra, Indonesia</span>
          </div>
          <div class="haze-fact-item">
            <span class="haze-fact-label">Wind Vector</span>
            <span class="haze-fact-val">Southwest Monsoon (Habagat)</span>
          </div>
          <div class="haze-fact-item alert">
            <span class="haze-fact-label">Class Suspension Trigger</span>
            <span class="haze-fact-val">AQI &gt; 200 (Acutely Unhealthy)</span>
          </div>
        </div>
        <p class="haze-historical-note">
          <strong>Documented Precedent:</strong> In early Sept 2026, an intense haze episode spiked Metro Cebu AQI to ~296, triggering synchronized class suspensions across Cebu City, Mandaue, Talisay, Lapu-Lapu, Carcar, and Minglanilla.
        </p>
      </div>

      <!-- Data Source Note -->
      <div class="drawer-source-note" style="margin-top: 14px; font-size: 0.7rem; color: var(--text-muted); line-height: 1.4;">
        <span>Data Provider: European CAMS &amp; Open-Meteo Air Quality API · Continuous hourly forecast &amp; telemetry</span>
      </div>
    </div>
  `;

  // Attach close event
  container.querySelector("#btn-close-air-drawer")?.addEventListener("click", onClose);
}
