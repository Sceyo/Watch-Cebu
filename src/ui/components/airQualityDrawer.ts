/**
 * Air Quality & Transboundary Haze Advisory Drawer Component (Phase 6).
 */

import type { AirQualityReading } from "../services/airQuality.js";
import { ICONS } from "./icons.js";

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
          <span style="display: inline-flex; align-items: center; color: var(--accent-blue);" aria-hidden="true">${ICONS.air}</span>
          <span>Air Quality &amp; Haze Advisory</span>
        </div>
        <button class="drawer-close-btn" id="btn-close-air-drawer" aria-label="Close Air Quality Advisory" title="Close Air Quality Advisory">${ICONS.close}</button>
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
        <span style="display: inline-flex; align-items: center; color: var(--accent-blue);" aria-hidden="true">${ICONS.air}</span>
        <span>Air Quality &amp; Haze Advisory</span>
      </div>
      <button class="drawer-close-btn" id="btn-close-air-drawer" aria-label="Close Air Quality Advisory" title="Close Air Quality Advisory">${ICONS.close}</button>
    </div>

    <div class="drawer-content">
      <!-- Freshness Timestamp Row -->
      <div class="drawer-timestamp-row">
        <span>Metro Cebu Centroid (Model Estimate · CAMS)</span>
        <span class="${data.isFallback ? 'drawer-stale-tag' : (data.isStale ? 'drawer-stale-tag' : 'drawer-live-tag')}">
          ${data.isFallback ? '⚠️ Offline Fixture' : (data.isStale ? '⚠️ Delayed Data' : '● Live · ' + data.observationTimePst)}
        </span>
      </div>

      <!-- Main AQI Hero Indicator Card -->
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

        <p class="aqi-headline" style="font-weight: 700; color: #FFFFFF; margin: 8px 0 4px 0;">${data.healthAdvisory.actionableGuidance}</p>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 10px 0;">${data.healthAdvisory.headline}</p>

        <!-- Primary Supporting Metric: PM2.5 in Hero -->
        <div class="hero-supporting-metric" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
          <span style="color: var(--text-secondary);">Primary Pollutant <strong>PM2.5</strong>:</span>
          <span style="font-family: var(--font-mono); color: #FFFFFF; font-weight: 700;">${data.pm2_5} μg/m³ <small style="font-weight: normal; color: var(--text-muted);">(${data.pm2_5Desc})</small></span>
        </div>

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

      <!-- Health Guidance Section -->
      <div class="about-section">
        <h3 class="section-heading" style="margin-bottom: 8px;">Health &amp; Safety Actions</h3>
        <div class="health-guidance-card">
          <div class="guidance-row">
            <span class="guidance-icon" aria-hidden="true" style="display: inline-flex; align-items: center; color: var(--accent-blue);">${ICONS.mask}</span>
            <div>
              <strong>Mask Recommendation</strong>
              <p>${data.healthAdvisory.maskRecommendation}</p>
            </div>
          </div>
          <div class="guidance-row">
            <span class="guidance-icon" aria-hidden="true" style="display: inline-flex; align-items: center; color: var(--accent-blue);">${ICONS.home}</span>
            <div>
              <strong>General Public Guidance</strong>
              <p>${data.healthAdvisory.actionableGuidance}</p>
            </div>
          </div>
          <div class="guidance-row">
            <span class="guidance-icon" aria-hidden="true" style="display: inline-flex; align-items: center; color: #F59E0B;">${ICONS.alertTriangle}</span>
            <div>
              <strong>Vulnerable Groups</strong>
              <p>${data.healthAdvisory.vulnerableGroupWarning}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Secondary Pollutant Metrics (Behind "More details" toggle) -->
      <details class="more-pollutants-details" style="margin-bottom: 16px;">
        <summary class="more-pollutants-summary" style="cursor: pointer; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); padding: 8px 12px; background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span>More Pollutant Metrics (PM10, CO, AOD)</span>
          <span class="summary-caret">▾</span>
        </summary>
        <div class="pollutant-grid" style="margin-top: 10px;">
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
      </details>

      <!-- Structured Transboundary Haze Callout Card (collapsible when AQI < 101 per M4) -->
      <details class="haze-context-card" ${data.aqi >= 101 ? "open" : ""}>
        <summary class="haze-card-header" style="cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-flex; align-items: center; color: #F59E0B;" aria-hidden="true">${ICONS.alertTriangle}</span>
            <h3 style="margin: 0; font-size: 0.92rem;">Transboundary Smoke Haze Preparedness</h3>
          </div>
          <span class="haze-toggle-indicator" style="font-size: 0.8rem; color: var(--text-muted);">${data.aqi >= 101 ? '▲' : '▼ View Guide'}</span>
        </summary>
        <p class="haze-intro" style="margin-top: 10px;">
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
          <div class="haze-fact-item">
            <span class="haze-fact-label">Class Suspensions</span>
            <span class="haze-fact-val">Determined by individual LGUs / DepEd upon advisory from EMB-7</span>
          </div>
        </div>
        <p class="haze-historical-note">
          <strong>Documented Precedents:</strong> September 2026 experienced two distinct haze waves: First on Sept 2–3, prompting precautionary class suspensions across Cebu City, Lapu-Lapu, Talisay, Carcar, and Minglanilla; then on Sept 20–22, when EMB-7 recorded AQI 248 on Sept 20, leading Mandaue and 9 other LGUs to suspend in-person classes on Sept 21.
        </p>
      </details>

      <!-- Data Source Note & Model Disclosure -->
      <div class="drawer-source-note" style="margin-top: 14px; font-size: 0.72rem; color: var(--text-muted); line-height: 1.45; border-top: 1px solid var(--border-color); padding-top: 10px;">
        <span>Model estimate (CAMS via Open-Meteo). Not an official station reading. For official ground telemetry, refer to <a href="https://r7.emb.gov.ph/" target="_blank" rel="noopener noreferrer" style="color: #60A5FA; text-decoration: underline;">DENR EMB Region VII</a> bulletins.</span>
      </div>
    </div>
  `;

  // Attach close event
  container.querySelector("#btn-close-air-drawer")?.addEventListener("click", onClose);
}
