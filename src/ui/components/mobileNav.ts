/**
 * Mobile Navigation, Bottom Action Bar, Consolidated Status Popover,
 * Touch Bottom Sheet, and Civic Toast Notification Component.
 *
 * Implements:
 * - C1: Mobile Bottom Sheet (max 60dvh) with accessible close button and swipe dismiss.
 * - C2: Mobile Bottom Action Bar (56px + safe-area) with Forecast, Air, Legend, About.
 * - C2: Consolidated System Status Popover for mobile header chip.
 * - H1: Multi-advisory list for stacked pins sharing identical coordinates.
 * - H4: 44×44px touch targets and safe area insets.
 */

import type { FeedState, SelectedLocationDetails } from "../types.js";
import type { PowerAdvisory, EarthquakeEvent, PagasaBulletin } from "../../types/index.js";
import type { AirQualityReading } from "../services/airQuality.js";
import { computePowerStatus, computeEarthquakeSeverity } from "../map/markerStyles.js";
import {
  formatPhilippineDateTime,
  formatReadableDate,
  formatPhilippineTimeRange,
  normalizeStreetList,
  formatHumanTimestamp,
  escapeHtml,
} from "../../utils/index.js";
import { ICONS } from "./icons.js";

export interface MobileBottomBarCallbacks {
  onForecastToggle: () => void;
  onAirQualityToggle: () => void;
  onLegendToggle: () => void;
  onAboutToggle: () => void;
}

export interface MobileBottomBarState {
  isForecastOpen: boolean;
  isAirOpen: boolean;
  isLegendOpen: boolean;
  isAboutOpen: boolean;
  airQuality?: AirQualityReading | null;
}

export function renderMobileBottomBar(
  container: HTMLElement,
  state: MobileBottomBarState,
  callbacks: MobileBottomBarCallbacks
): void {
  const airBadge = state.airQuality
    ? `<span class="bottom-bar-aqi-pill" style="background: ${state.airQuality.hex}; color: ${state.airQuality.contrastColor};">${state.airQuality.aqi}</span>`
    : "";

  container.innerHTML = `
    <div class="mobile-bottom-bar-inner">
      <button class="bottom-action-btn ${state.isForecastOpen ? 'active' : ''}" id="btn-bottom-forecast" aria-label="Open Weather Forecast">
        <span class="btn-icon">${ICONS.weather}</span>
        <span class="btn-text">Forecast</span>
      </button>

      <button class="bottom-action-btn ${state.isAirOpen ? 'active' : ''}" id="btn-bottom-air" aria-label="Open Air Quality Advisory">
        <span class="btn-icon">${ICONS.air}</span>
        <span class="btn-text">Air ${airBadge}</span>
      </button>

      <button class="bottom-action-btn ${state.isLegendOpen ? 'active' : ''}" id="btn-bottom-legend" aria-label="Open Map Legend">
        <span class="btn-icon">${ICONS.legend}</span>
        <span class="btn-text">Legend</span>
      </button>

      <button class="bottom-action-btn ${state.isAboutOpen ? 'active' : ''}" id="btn-bottom-about" aria-label="Open About Information">
        <span class="btn-icon">${ICONS.about}</span>
        <span class="btn-text">About</span>
      </button>
    </div>
  `;

  container.querySelector("#btn-bottom-forecast")?.addEventListener("click", callbacks.onForecastToggle);
  container.querySelector("#btn-bottom-air")?.addEventListener("click", callbacks.onAirQualityToggle);
  container.querySelector("#btn-bottom-legend")?.addEventListener("click", callbacks.onLegendToggle);
  container.querySelector("#btn-bottom-about")?.addEventListener("click", callbacks.onAboutToggle);
}

export function renderStatusPopover(
  container: HTMLElement,
  isOpen: boolean,
  powerState: FeedState<PowerAdvisory[]>,
  eqState: FeedState<EarthquakeEvent[]>,
  airQuality: AirQualityReading | null,
  onClose: () => void,
  pagasaState?: FeedState<PagasaBulletin | null> | null
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
  container.setAttribute("aria-label", "System Data Feeds Status");

  const formatFeedRow = (name: string, state: FeedState<any>, provider: string, customDetail?: string) => {
    let statusBadge = `<span class="popover-badge live">● Live Feed</span>`;
    let detail = customDetail || `Verified updates received from ${provider}.`;

    if (state.status === "loading") {
      statusBadge = `<span class="popover-badge loading">Fetching...</span>`;
      detail = `Connecting to ${provider}...`;
    } else if (state.status === "error") {
      statusBadge = `<span class="popover-badge error">Offline</span>`;
      detail = `Direct feed unreachable. Network or upstream issue.`;
    } else if (state.dataSource === "fixture_fallback") {
      statusBadge = `<span class="popover-badge fallback"><span style="display:inline-flex; align-items:center; margin-right:4px;">${ICONS.alertTriangle}</span>Backup Fixture</span>`;
      detail = customDetail || `Displaying verified offline fixture dataset.`;
    } else if (state.fetchedAt) {
      detail = `${detail} (Last sync: ${formatHumanTimestamp(state.fetchedAt)})`;
    }

    return `
      <div class="popover-feed-row">
        <div class="popover-feed-header">
          <strong>${name}</strong>
          ${statusBadge}
        </div>
        <p class="popover-feed-desc">${detail}</p>
        <span class="popover-feed-source">Provider: ${provider}</span>
      </div>
    `;
  };

  const airBadge = airQuality
    ? (airQuality.isFallback
        ? `<span class="popover-badge fallback"><span style="display:inline-flex; align-items:center; margin-right:4px;">${ICONS.alertTriangle}</span>Backup</span>`
        : (airQuality.isStale
            ? `<span class="popover-badge delayed" style="background: rgba(245, 158, 11, 0.2); color: #FCD34D;"><span style="display:inline-flex; align-items:center; margin-right:4px;">${ICONS.clock}</span>Delayed (${airQuality.observationTimePst})</span>`
            : '<span class="popover-badge live">● Live Feed</span>'))
    : '<span class="popover-badge loading">Fetching...</span>';

  const airDetail = airQuality?.isStale
    ? `Atmospheric dispersion model update delayed (~${airQuality.observationTimePst}).`
    : `Atmospheric dispersion & particulate model.`;

  const airRow = `
    <div class="popover-feed-row">
      <div class="popover-feed-header">
        <strong>Air Quality &amp; Haze</strong>
        ${airBadge}
      </div>
      <p class="popover-feed-desc">${airDetail}</p>
      <span class="popover-feed-source">Provider: European CAMS via Open-Meteo</span>
    </div>
  `;

  let pagasaDetail = "TCWS Signals, storm tracks, and heavy rainfall alerts.";
  let pagasaBadgeOverride: string | null = null;
  if (pagasaState?.data) {
    const b = pagasaState.data;
    const isStale = b.issued_at_pst
      ? (Date.now() - new Date(b.issued_at_pst).getTime() > 24 * 3600000)
      : false;

    if (b.tcws_cebu?.active) {
      pagasaDetail = `TCWS Signal #${b.tcws_cebu.signal_level} in effect for Cebu (${b.cyclone_name || 'Active Cyclone'}).`;
    } else if (b.heavy_rainfall_alert && b.heavy_rainfall_alert.level !== "none") {
      pagasaDetail = `Heavy Rainfall Alert: ${b.heavy_rainfall_alert.level.toUpperCase()} level warning in effect.`;
    } else if (b.has_active_cyclone && b.cyclone_name) {
      pagasaDetail = `Active cyclone "${b.cyclone_name}" in PAR. No TCWS signals currently hoisted for Cebu Province.`;
    } else {
      pagasaDetail = "No active storm signals or heavy rainfall alerts in Cebu.";
    }

    if (b.issued_at_pst) {
      pagasaDetail = `${pagasaDetail} Issued: ${formatHumanTimestamp(b.issued_at_pst)}.`;
    }
    if (isStale) {
      pagasaBadgeOverride = `<span class="popover-badge delayed" style="background: rgba(245, 158, 11, 0.2); color: #FCD34D;"><span style="display:inline-flex; align-items:center; margin-right:4px;">${ICONS.clock}</span>Advisory Delayed</span>`;
    }
  }

  let pagasaRow = "";
  if (pagasaState) {
    if (pagasaBadgeOverride && pagasaState.status === "success" && pagasaState.dataSource !== "fixture_fallback") {
      pagasaRow = `
        <div class="popover-feed-row">
          <div class="popover-feed-header">
            <strong>PAGASA Severe Weather</strong>
            ${pagasaBadgeOverride}
          </div>
          <p class="popover-feed-desc">${pagasaDetail}</p>
          <span class="popover-feed-source">Provider: DOST-PAGASA</span>
        </div>
      `;
    } else {
      pagasaRow = formatFeedRow("PAGASA Severe Weather", pagasaState, "DOST-PAGASA", pagasaDetail);
    }
  }

  container.innerHTML = `
    <div class="status-popover-card">
      <div class="popover-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-flex; color: var(--accent-blue);" aria-hidden="true">${ICONS.alertTriangle}</span>
          <h2 style="font-size: 1rem; font-weight: 700; margin: 0; color: #FFFFFF;">System Feeds Status</h2>
        </div>
        <button class="drawer-close-btn" id="btn-close-status-popover" aria-label="Close status popover">${ICONS.close}</button>
      </div>
      <div class="popover-content">
        ${formatFeedRow("VECO Power Advisories", powerState, "Visayan Electric Company")}
        ${formatFeedRow("PHIVOLCS Seismic Activity", eqState, "DOST-PHIVOLCS")}
        ${airRow}
        ${pagasaRow}
      </div>
    </div>
  `;

  container.querySelector("#btn-close-status-popover")?.addEventListener("click", onClose);
}

export function renderMobileBottomSheet(
  container: HTMLElement,
  details: SelectedLocationDetails | null,
  onClose: () => void,
  onPinBarangay?: (barangay: string) => void,
  myBarangay?: string | null
): void {
  if (!details) {
    container.classList.remove("open");
    container.classList.add("closed");
    container.setAttribute("aria-hidden", "true");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("closed");
  container.classList.add("open");
  container.setAttribute("aria-hidden", "false");
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-label", "Location Details");

  let contentHtml = "";

  if (details.type === "power") {
    const advisories = details.advisories;
    const isMulti = advisories.length > 1;
    const barangayName = advisories[0]?.barangay.join(", ") || "Unspecified area";
    const cityName = advisories[0]?.city || "Metro Cebu";
    const isManual = advisories[0]?.coordinate_source === "manual_verified";
    const sourceLabel = isManual ? "Verified Landmark (SRP Spine)" : "Approximate Barangay Center (OpenStreetMap)";
    const primaryBarangay = advisories[0]?.barangay[0] || cityName;
    const isPinned = Boolean(myBarangay && primaryBarangay.toLowerCase() === myBarangay.toLowerCase());

    let advisoryCardsHtml = "";
    for (let i = 0; i < advisories.length; i++) {
      const a = advisories[i];
      const status = computePowerStatus(a.date, a.start_time, a.end_time);
      const cleanStreets = normalizeStreetList(a.streets);
      const streetsText = cleanStreets.length > 0 ? cleanStreets.join(", ") : (a.areas_affected_raw || "Not specified");
      const readableDate = formatReadableDate(a.date);
      const timeRangePht = formatPhilippineTimeRange(a.start_time, a.end_time, a.overnight_span);

      advisoryCardsHtml += `
        <div class="sheet-advisory-item">
          ${isMulti ? `<div class="sheet-item-count-label">Advisory ${i + 1} of ${advisories.length}</div>` : ""}
          <div class="sheet-status-row">
            <span class="popup-badge" style="background: ${status.hex}22; color: ${status.hex}; border: 1px solid ${status.hex}55;">
              ${status.glyph ? status.glyph + ' ' : ''}${status.label}
            </span>
            <span class="sheet-time-badge">${readableDate} · ${timeRangePht}</span>
          </div>

          <div class="sheet-field-group">
            <span class="field-label">Affected Streets &amp; Areas:</span>
            <p class="sheet-streets-val">${streetsText}</p>
          </div>

          <div class="sheet-field-group">
            <span class="field-label">Maintenance Purpose:</span>
            <p class="sheet-purpose-val">${a.purpose}</p>
          </div>

          <div class="sheet-card-footer">
            <a href="${a.source_url}" target="_blank" rel="noopener noreferrer" class="source-link">
              Verify Official VECO Post ↗
            </a>
          </div>
        </div>
      `;
    }

    contentHtml = `
      <div class="sheet-header">
        <div class="sheet-drag-handle" aria-hidden="true"></div>
        <div class="sheet-header-title-row">
          <div class="sheet-title-box">
            <span class="sheet-city-tag">${cityName}</span>
            <h3 class="sheet-title">${barangayName} ${isMulti ? `<span class="sheet-multi-count">(${advisories.length} Advisories)</span>` : ""}</h3>
          </div>
          <div class="sheet-header-actions" style="display: flex; align-items: center; gap: 8px;">
            <button class="sheet-pin-btn ${isPinned ? 'is-pinned' : ''}" id="btn-sheet-pin" title="Pin ${primaryBarangay} as home area" aria-label="Pin as home area">
              <span aria-hidden="true" style="display: inline-flex; align-items: center;">${isPinned ? ICONS.starFilled : ICONS.star}</span>
              <span class="pin-btn-text">${isPinned ? 'Pinned Area' : 'Pin Area'}</span>
            </button>
            <button class="sheet-close-btn" id="btn-close-sheet" aria-label="Close details" title="Close">${ICONS.close}</button>
          </div>
        </div>
      </div>

      <div class="sheet-body">
        ${isMulti ? `<div class="sheet-multi-notice">Multiple scheduled outages exist for this barangay. Listed below:</div>` : ""}
        <div class="sheet-advisories-list">
          ${advisoryCardsHtml}
        </div>

        <div class="popup-provenance-box" style="margin-top: 12px;">
          <div class="popup-field-row">
            <span class="field-label">Location accuracy:</span>
            <span class="field-value source-highlight ${isManual ? 'manual' : 'osm'}">${sourceLabel}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    // Earthquake Event
    const e = details.event;
    const severity = computeEarthquakeSeverity(e.magnitude);
    const eqDate = formatPhilippineDateTime(e.datetime_pst);
    const reportedIntensityText = e.reported_intensities ? e.reported_intensities : "Not reported";
    const damageText = e.expecting_damage ? "Yes (Assessments underway)" : "No";
    const aftershocksText = e.expecting_aftershocks ? "Yes" : "No";

    contentHtml = `
      <div class="sheet-header">
        <div class="sheet-drag-handle" aria-hidden="true"></div>
        <div class="sheet-header-title-row">
          <div class="sheet-title-box">
            <span class="sheet-city-tag">${e.distance_from_cebu_km} km from Cebu</span>
            <h3 class="sheet-title">${e.location_description}</h3>
          </div>
          <button class="sheet-close-btn" id="btn-close-sheet" aria-label="Close details" title="Close">${ICONS.close}</button>
        </div>
      </div>

      <div class="sheet-body">
        <div class="sheet-status-row" style="margin-bottom: 12px;">
          <span class="popup-badge" style="background: ${severity.hex}22; color: ${severity.hex}; border: 1px solid ${severity.hex}55; font-size: 0.85rem;">
            M${e.magnitude.toFixed(1)} ${e.magnitude_type || "ML"} · ${severity.label}
          </span>
          <span class="sheet-time-badge">${eqDate.full}</span>
        </div>

        <div class="sheet-grid-metrics">
          <div class="sheet-metric-item">
            <span class="sheet-metric-label">Depth</span>
            <span class="sheet-metric-val">${e.depth_km} km</span>
          </div>
          <div class="sheet-metric-item">
            <span class="sheet-metric-label">Origin</span>
            <span class="sheet-metric-val">${e.origin_type}</span>
          </div>
          <div class="sheet-metric-item">
            <span class="sheet-metric-label">Damage Expected</span>
            <span class="sheet-metric-val">${damageText}</span>
          </div>
          <div class="sheet-metric-item">
            <span class="sheet-metric-label">Aftershocks</span>
            <span class="sheet-metric-val">${aftershocksText}</span>
          </div>
        </div>

        <div class="sheet-field-group" style="margin-top: 10px;">
          <span class="field-label">Reported Intensities:</span>
          <p class="sheet-purpose-val">${reportedIntensityText}</p>
        </div>

        <div class="popup-provenance-box" style="margin-top: 12px;">
          <div class="popup-field-row">
            <span class="field-label">Location source:</span>
            <span class="field-value source-highlight bulletin">Official PHIVOLCS Bulletin</span>
          </div>
        </div>

        <div class="sheet-card-footer" style="margin-top: 12px;">
          <a href="${e.source_url}" target="_blank" rel="noopener noreferrer" class="source-link">
            Verify Official PHIVOLCS Bulletin ↗
          </a>
        </div>
      </div>
    `;
  }

  container.innerHTML = contentHtml;

  // Close button listener
  container.querySelector("#btn-close-sheet")?.addEventListener("click", onClose);

  // Pin Barangay listener
  const pinBtn = container.querySelector<HTMLButtonElement>("#btn-sheet-pin");
  pinBtn?.addEventListener("click", () => {
    if (details.type === "power") {
      const primaryBarangay = details.advisories[0]?.barangay[0] || details.advisories[0]?.city;
      if (primaryBarangay && onPinBarangay) {
        onPinBarangay(primaryBarangay);
      }
    }
  });

  // Swipe-down touch listener on sheet header
  let touchStartY = 0;
  const headerEl = container.querySelector(".sheet-header");
  headerEl?.addEventListener("touchstart", (e: any) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  headerEl?.addEventListener("touchend", (e: any) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY - touchStartY > 50) {
      onClose();
    }
  }, { passive: true });
}

export function showToast(message: string, durationMs = 3800): void {
  if (typeof document === "undefined") return;
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  let toastType = "toast-info";
  let iconHtml = `<span class="toast-icon" aria-hidden="true" style="display:inline-flex;align-items:center;color:#38BDF8;">${ICONS.bolt}</span>`;

  if (message.includes("No active advisories") || message.includes("Normal Grid Status") || message.includes("Reconnected") || message.includes("Online:")) {
    toastType = "toast-success";
    iconHtml = `<span class="toast-icon" aria-hidden="true" style="display:inline-flex;align-items:center;color:#10B981;">${ICONS.check}</span>`;
  } else if (message.includes("No location found") || message.includes("Offline:") || message.includes("Please enter")) {
    toastType = "toast-warning";
    iconHtml = `<span class="toast-icon" aria-hidden="true" style="display:inline-flex;align-items:center;color:#F59E0B;">${ICONS.alertTriangle}</span>`;
  }

  const toast = document.createElement("div");
  toast.className = `toast-message ${toastType}`;
  toast.innerHTML = `<div class="toast-inner">${iconHtml}<span>${escapeHtml(message)}</span></div>`;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, durationMs);
}
