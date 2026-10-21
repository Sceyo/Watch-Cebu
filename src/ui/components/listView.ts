/**
 * List View Alternative Component (Phase 2 Resident Usability & Quakes Mode Support).
 *
 * Provides a fast, text-first, zero-tile alternative to map hunting on mobile LTE.
 * - In "Power" mode: Groups scheduled power interruptions by date and barangay.
 * - In "Quakes" mode: Lists recent regional earthquake events reported by PHIVOLCS.
 * - In "Both" mode: Lists power interruptions first, and earthquake events lowest at the bottom.
 */

import type { PowerAdvisory, EarthquakeEvent } from "../../types/index.js";
import type { FilterState, LayerSelection } from "../types.js";
import { computePowerStatus, computeEarthquakeSeverity } from "../map/markerStyles.js";
import { isFavorite } from "../services/myBarangay.js";
import {
  formatReadableDate,
  formatPhilippineTimeRange,
  formatPhilippineDateTime,
  normalizeStreetList,
  escapeHtml,
} from "../../utils/index.js";
import { ICONS } from "./icons.js";

export interface ListViewCallbacks {
  onSelectAdvisory: (advisory: PowerAdvisory) => void;
  onSelectEarthquake?: (event: EarthquakeEvent) => void;
  onPinBarangay?: (barangay: string) => void;
  myBarangay?: string | null;
}

function matchesPhysicalLocation(a: PowerAdvisory, q: string): boolean {
  return (
    a.barangay.some((b) => b.toLowerCase().includes(q)) ||
    a.city.toLowerCase().includes(q) ||
    a.streets.some((s) => s.toLowerCase().includes(q)) ||
    Boolean(a.areas_affected_raw && a.areas_affected_raw.toLowerCase().includes(q))
  );
}

function matchesEarthquake(e: EarthquakeEvent, q: string): boolean {
  if (!q) return true;
  const lowerQ = q.toLowerCase();
  return (
    e.location_description.toLowerCase().includes(lowerQ) ||
    Boolean(e.nearest_town && e.nearest_town.toLowerCase().includes(lowerQ)) ||
    Boolean(e.nearest_province && e.nearest_province.toLowerCase().includes(lowerQ)) ||
    Boolean(e.reported_intensities && e.reported_intensities.toLowerCase().includes(lowerQ))
  );
}

function renderEarthquakeCardHtml(e: EarthquakeEvent): string {
  const severity = computeEarthquakeSeverity(e.magnitude);
  const eqDate = formatPhilippineDateTime(e.datetime_pst);
  const reportedIntensityText = e.reported_intensities ? e.reported_intensities : "None reported";
  const damageText = e.expecting_damage ? '<strong style="color: #EF4444;">Expected</strong>' : "No";
  const aftershocksText = e.expecting_aftershocks ? "Yes" : "No";

  return `
    <article class="list-advisory-card list-earthquake-card" data-id="${escapeHtml(e.id)}" style="border-left: 4px solid ${severity.hex};">
      <div class="card-top-row">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span class="card-status-pill" style="background: ${severity.hex}22; color: ${severity.hex}; border: 1px solid ${severity.hex}55; font-weight: 700;">
            M${e.magnitude.toFixed(1)} ${e.magnitude_type || "ML"} · ${severity.label}
          </span>
          ${e.origin_type ? `
            <span class="card-status-pill" style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid rgba(255, 255, 255, 0.1);">
              ${escapeHtml(e.origin_type)}
            </span>
          ` : ""}
        </div>
        <span class="card-city-tag" style="background: rgba(255, 255, 255, 0.08); color: #E2E8F0; font-weight: 600;">
          ${e.distance_from_cebu_km} km from Cebu
        </span>
      </div>

      <h3 class="card-barangay-title">${escapeHtml(e.location_description)}</h3>

      <div class="card-detail-row">
        <span class="card-time-icon" aria-hidden="true" style="display: inline-flex; align-items: center; color: var(--accent-blue);">${ICONS.clock}</span>
        <span class="card-time-val">${eqDate.full} ${eqDate.relative ? `<span style="color: var(--text-muted); font-size: 0.85em;">(${eqDate.relative})</span>` : ""}</span>
      </div>

      <div class="card-detail-row">
        <span class="card-detail-label" style="display: inline-flex; align-items: center; gap: 4px;">
          <span style="display: inline-flex; align-items: center; color: var(--text-muted);">${ICONS.mapPin}</span> Depth &amp; Coordinates:
        </span>
        <span class="card-detail-val">${e.depth_km} km depth · ${e.lat.toFixed(2)}°N, ${e.lon.toFixed(2)}°E</span>
      </div>

      ${e.reported_intensities ? `
        <div class="card-detail-row">
          <span class="card-detail-label" style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="display: inline-flex; align-items: center; color: #F59E0B;">${ICONS.alertTriangle}</span> Intensities:
          </span>
          <span class="card-detail-val">${escapeHtml(reportedIntensityText)}</span>
        </div>
      ` : ""}

      <div class="card-detail-row">
        <span class="card-detail-label" style="display: inline-flex; align-items: center; gap: 4px;">
          <span style="display: inline-flex; align-items: center; color: var(--text-muted);">${ICONS.shield}</span> Assessment:
        </span>
        <span class="card-detail-val">Damage: ${damageText} · Aftershocks: ${aftershocksText}</span>
      </div>

      <div class="card-actions-row">
        <button class="card-action-btn btn-locate-earthquake" data-id="${escapeHtml(e.id)}">
          <span aria-hidden="true" style="display: inline-flex; align-items: center; color: var(--accent-blue);">${ICONS.map}</span>
          <span>View on Map</span>
        </button>
        <a href="${escapeHtml(e.source_url)}" target="_blank" rel="noopener noreferrer" class="card-action-btn" style="text-decoration: none; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px;">
          <span aria-hidden="true" style="display: inline-flex; align-items: center;">${ICONS.about}</span>
          <span>Verify Bulletin ↗</span>
        </a>
      </div>
    </article>
  `;
}

export function renderListView(
  container: HTMLElement,
  layerOrAdvisories: LayerSelection | PowerAdvisory[],
  advisoriesOrFilter: PowerAdvisory[] | FilterState,
  eventsOrCallbacks?: EarthquakeEvent[] | ListViewCallbacks,
  filterArg?: FilterState,
  callbacksArg?: ListViewCallbacks
): void {
  let currentLayer: LayerSelection = "power";
  let advisories: PowerAdvisory[] = [];
  let earthquakes: EarthquakeEvent[] = [];
  let filter: FilterState;
  let callbacks: ListViewCallbacks;

  if (typeof layerOrAdvisories === "string") {
    currentLayer = layerOrAdvisories;
    advisories = (advisoriesOrFilter as PowerAdvisory[]) || [];
    earthquakes = (eventsOrCallbacks as EarthquakeEvent[]) || [];
    filter = filterArg || { selectedDate: "all", minMagnitude: 0 };
    callbacks = callbacksArg || { onSelectAdvisory: () => {} };
  } else {
    currentLayer = "power";
    advisories = layerOrAdvisories || [];
    earthquakes = [];
    filter = (advisoriesOrFilter as FilterState) || { selectedDate: "all", minMagnitude: 0 };
    callbacks = (eventsOrCallbacks as ListViewCallbacks) || { onSelectAdvisory: () => {} };
  }

  const query = filter.searchQuery ? filter.searchQuery.toLowerCase().trim() : "";

  // 1. Filter Power Advisories
  const hasPhysicalMatches = query ? advisories.some((a) => matchesPhysicalLocation(a, query)) : false;
  const filteredPower = advisories.filter((a) => {
    if (!query && filter.selectedDate !== "all" && a.date !== filter.selectedDate) return false;
    if (query) {
      const match = matchesPhysicalLocation(a, query);
      if (hasPhysicalMatches ? !match : !match && !a.purpose.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const sortedPower = [...filteredPower].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.city !== b.city) return a.city.localeCompare(b.city);
    return a.start_time.localeCompare(b.start_time);
  });

  // 2. Filter Earthquake Events
  const filteredQuakes = earthquakes.filter((e) => {
    if (filter.minMagnitude > 0 && e.magnitude < filter.minMagnitude) return false;
    if (filter.showMicroQuakes === false && e.magnitude < 3.0 && e.distance_from_cebu_km > 100) return false;
    if (query && !matchesEarthquake(e, query)) return false;
    return e.within_watch_radius;
  });

  const sortedQuakes = [...filteredQuakes].sort((a, b) => {
    const timeA = new Date(a.datetime_pst || a.datetime_utc).getTime();
    const timeB = new Date(b.datetime_pst || b.datetime_utc).getTime();
    return timeB - timeA;
  });

  // Handle empty states based on layer selection
  if (currentLayer === "power" && sortedPower.length === 0) {
    container.innerHTML = `
      <div class="list-empty-state">
        <div class="empty-icon-circle" style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(56, 189, 248, 0.1); color: #38BDF8; margin-bottom: 8px;" aria-hidden="true">
          ${ICONS.list}
        </div>
        <h3>No Scheduled Outages Found</h3>
        <p>${query ? `No advisories match "${escapeHtml(filter.searchQuery || '')}".` : 'No scheduled interruptions for the selected date.'}</p>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Try selecting "All Week" or searching for a different barangay or street.</span>
      </div>
    `;
    return;
  }

  if (currentLayer === "earthquakes" && sortedQuakes.length === 0) {
    container.innerHTML = `
      <div class="list-empty-state">
        <div class="empty-icon-circle" style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); color: #F59E0B; margin-bottom: 8px;" aria-hidden="true">
          ${ICONS.earthquake}
        </div>
        <h3>No Earthquakes Found</h3>
        <p>${query ? `No seismic events match "${escapeHtml(filter.searchQuery || '')}".` : 'No recent seismic events reported within the 300 km Central Visayas watch radius.'}</p>
        <span style="font-size: 0.8rem; color: var(--text-muted);">PHIVOLCS monitoring is continuous. Distant tremors are filtered unless significant.</span>
      </div>
    `;
    return;
  }

  if (currentLayer === "both" && sortedPower.length === 0 && sortedQuakes.length === 0) {
    container.innerHTML = `
      <div class="list-empty-state">
        <div class="empty-icon-circle" style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(56, 189, 248, 0.1); color: #38BDF8; margin-bottom: 8px;" aria-hidden="true">
          ${ICONS.list}
        </div>
        <h3>No Outages or Earthquakes Found</h3>
        <p>${query ? `No items match "${escapeHtml(filter.searchQuery || '')}".` : 'No scheduled power interruptions or recent earthquakes reported.'}</p>
      </div>
    `;
    return;
  }

  let html = `<div class="list-cards-container">`;

  // Render Power Advisories if "power" or "both"
  if (currentLayer === "power" || currentLayer === "both") {
    // Group by Date for readability
    const dateGroups = new Map<string, PowerAdvisory[]>();
    for (const a of sortedPower) {
      const list = dateGroups.get(a.date) || [];
      list.push(a);
      dateGroups.set(a.date, list);
    }

    for (const [date, group] of dateGroups.entries()) {
      const readableDate = formatReadableDate(date);
      html += `
        <div class="list-date-group">
          <div class="list-date-header">
            <span class="list-date-label"><span style="display: inline-flex; align-items: center; color: var(--accent-blue); margin-right: 6px;" aria-hidden="true">${ICONS.calendar}</span>${readableDate}</span>
            <span class="list-date-count">${group.length} ${group.length === 1 ? 'advisory' : 'advisories'}</span>
          </div>
          <div class="list-cards-grid">
      `;

      for (const a of group) {
        const status = computePowerStatus(a.date, a.start_time, a.end_time);
        const barangays = a.barangay.join(", ") || "General Area";
        const cleanStreets = normalizeStreetList(a.streets);
        const streetsText = cleanStreets.length > 0 ? cleanStreets.join(", ") : (a.areas_affected_raw || "All connected feeders");
        const timeRangePht = formatPhilippineTimeRange(a.start_time, a.end_time, a.overnight_span);
        const primaryBarangay = a.barangay[0] || a.city;
        const isPinned = Boolean(
          (callbacks.myBarangay &&
            (a.barangay.some((b) => b.toLowerCase() === callbacks.myBarangay!.toLowerCase()) ||
              a.city.toLowerCase() === callbacks.myBarangay!.toLowerCase())) ||
          a.barangay.some((b) => isFavorite(b)) ||
          isFavorite(a.city)
        );

        html += `
          <article class="list-advisory-card status-${status.category} ${isPinned ? 'is-favorite-card' : ''}" data-id="${escapeHtml(a.id)}">
            <div class="card-top-row">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="card-status-pill" style="background: ${status.hex}22; color: ${status.hex}; border: 1px solid ${status.hex}55;">
                  ${status.glyph ? status.glyph + ' ' : ''}${status.label}
                </span>
                ${isPinned ? `
                  <span class="card-status-pill" style="background: rgba(245, 158, 11, 0.2); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.5); font-weight: 700;">
                    <span aria-hidden="true" style="color: #FCD34D;">${ICONS.starFilled}</span> Favorite Area
                  </span>
                ` : ''}
              </div>
              <span class="card-city-tag">${escapeHtml(a.city)}</span>
            </div>

            <h3 class="card-barangay-title">${escapeHtml(barangays)}</h3>

            <div class="card-detail-row">
              <span class="card-time-icon" aria-hidden="true" style="display: inline-flex; align-items: center; color: var(--accent-blue);">${ICONS.clock}</span>
              <span class="card-time-val">${timeRangePht}</span>
            </div>

            <div class="card-detail-row">
              <span class="card-detail-label" style="display: inline-flex; align-items: center; gap: 4px;"><span style="display: inline-flex; align-items: center; color: var(--text-muted);">${ICONS.mapPin}</span> Streets:</span>
              <span class="card-detail-val">${escapeHtml(streetsText)}</span>
            </div>

            <div class="card-detail-row">
              <span class="card-detail-label" style="display: inline-flex; align-items: center; gap: 4px;"><span style="display: inline-flex; align-items: center; color: var(--text-muted);">${ICONS.wrench}</span> Purpose:</span>
              <span class="card-detail-val">${escapeHtml(a.purpose)}</span>
            </div>

            <div class="card-actions-row">
              ${a.lat !== null && a.lon !== null ? `
                <button class="card-action-btn btn-locate-advisory" data-id="${escapeHtml(a.id)}">
                  <span aria-hidden="true" style="display: inline-flex; align-items: center; color: var(--accent-blue);">${ICONS.map}</span>
                  <span>View on Map</span>
                </button>
              ` : ''}
              <button class="card-action-btn btn-pin-barangay ${isPinned ? 'is-pinned' : ''}" style="${isPinned ? 'background: rgba(245, 158, 11, 0.18); border-color: #F59E0B; color: #FEF08A;' : ''}" data-barangay="${escapeHtml(primaryBarangay)}">
                <span style="display: inline-flex; align-items: center; gap: 5px;">
                  <span style="display: inline-flex; align-items: center; color: ${isPinned ? '#F59E0B' : 'var(--text-muted)'};" aria-hidden="true">${isPinned ? ICONS.starFilled : ICONS.star}</span>
                  <span>${isPinned ? 'Pinned Area' : 'Pin Barangay'}</span>
                </span>
              </button>
            </div>
          </article>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }
  }

  // Render Earthquakes if "earthquakes" or if "both" (placed down in the list, in the lowest position)
  if ((currentLayer === "earthquakes" || currentLayer === "both") && sortedQuakes.length > 0) {
    html += `
      <div class="list-date-group list-earthquakes-section" ${currentLayer === "both" ? 'style="margin-top: 28px;"' : ''}>
        <div class="list-date-header">
          <span class="list-date-label">
            <span style="display: inline-flex; align-items: center; color: #F59E0B; margin-right: 6px;" aria-hidden="true">${ICONS.earthquake}</span>
            Recent Regional Earthquakes (PHIVOLCS)
          </span>
          <span class="list-date-count">${sortedQuakes.length} ${sortedQuakes.length === 1 ? 'event' : 'events'}</span>
        </div>
        <div class="list-cards-grid">
          ${sortedQuakes.map(renderEarthquakeCardHtml).join("")}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Attach Locate on Map listeners for power advisories
  const locateBtns = container.querySelectorAll<HTMLButtonElement>(".btn-locate-advisory");
  locateBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const advisory = advisories.find((a) => a.id === id);
      if (advisory) {
        callbacks.onSelectAdvisory(advisory);
      }
    });
  });

  // Attach Locate on Map listeners for earthquakes
  const locateEqBtns = container.querySelectorAll<HTMLButtonElement>(".btn-locate-earthquake");
  locateEqBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const event = earthquakes.find((e) => e.id === id);
      if (event && callbacks.onSelectEarthquake) {
        callbacks.onSelectEarthquake(event);
      }
    });
  });

  // Attach Pin Barangay listeners
  const pinBtns = container.querySelectorAll<HTMLButtonElement>(".btn-pin-barangay");
  pinBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const brgy = btn.getAttribute("data-barangay");
      if (brgy && callbacks.onPinBarangay) {
        callbacks.onPinBarangay(brgy);
      }
    });
  });
}
