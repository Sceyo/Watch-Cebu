/**
 * List View Alternative Component (Phase 2 Resident Usability).
 *
 * Provides a fast, text-first, zero-tile alternative to map hunting on mobile LTE.
 * Groups scheduled power interruptions by date and barangay with 1-tap "Locate on Map" action.
 */

import type { PowerAdvisory } from "../../types/index.js";
import type { FilterState } from "../types.js";
import { computePowerStatus } from "../map/markerStyles.js";
import {
  formatReadableDate,
  formatPhilippineTimeRange,
  normalizeStreetList,
} from "../../utils/index.js";
import { ICONS } from "./icons.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderListView(
  container: HTMLElement,
  advisories: PowerAdvisory[],
  filter: FilterState,
  callbacks: {
    onSelectAdvisory: (advisory: PowerAdvisory) => void;
    onPinBarangay?: (barangay: string) => void;
    myBarangay?: string | null;
  }
): void {
  const query = filter.searchQuery ? filter.searchQuery.toLowerCase().trim() : "";

  const filtered = advisories.filter((a) => {
    if (!query && filter.selectedDate !== "all" && a.date !== filter.selectedDate) {
      return false;
    }
    if (query) {
      const matchesBarangay = a.barangay.some((b) => b.toLowerCase().includes(query));
      const matchesCity = a.city.toLowerCase().includes(query);
      const matchesStreet = a.streets.some((s) => s.toLowerCase().includes(query));
      const matchesPurpose = a.purpose.toLowerCase().includes(query);
      if (!matchesBarangay && !matchesCity && !matchesStreet && !matchesPurpose) {
        return false;
      }
    }
    return true;
  });

  // Sort by date, then city, then start_time
  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.city !== b.city) return a.city.localeCompare(b.city);
    return a.start_time.localeCompare(b.start_time);
  });

  if (sorted.length === 0) {
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

  // Group by Date for readability
  const dateGroups = new Map<string, PowerAdvisory[]>();
  for (const a of sorted) {
    const list = dateGroups.get(a.date) || [];
    list.push(a);
    dateGroups.set(a.date, list);
  }

  let html = `<div class="list-cards-container">`;

  for (const [date, group] of dateGroups.entries()) {
    const readableDate = formatReadableDate(date);
    html += `
      <div class="list-date-group">
        <div class="list-date-header">
          <span class="list-date-label"><span style="display: inline-flex; align-items: center; color: var(--accent-blue); margin-right: 6px;" aria-hidden="true">${ICONS.calendar}</span>${readableDate}</span>
          <span class="list-date-count">${group.length} advisory${group.length > 1 ? 's' : ''}</span>
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
      const isPinned = callbacks.myBarangay && primaryBarangay.toLowerCase() === callbacks.myBarangay.toLowerCase();

      html += `
        <article class="list-advisory-card status-${status.category}" data-id="${escapeHtml(a.id)}">
          <div class="card-top-row">
            <span class="card-status-pill" style="background: ${status.hex}22; color: ${status.hex}; border: 1px solid ${status.hex}55;">
              ${status.glyph ? status.glyph + ' ' : ''}${status.label}
            </span>
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
            <button class="card-action-btn btn-pin-barangay ${isPinned ? 'is-pinned' : ''}" data-barangay="${escapeHtml(primaryBarangay)}">
              <span style="display: inline-flex; align-items: center; gap: 5px;">
                <span style="display: inline-flex; align-items: center; color: ${isPinned ? '#FCD34D' : 'var(--text-muted)'};" aria-hidden="true">${isPinned ? ICONS.starFilled : ICONS.star}</span>
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

  html += `</div>`;
  container.innerHTML = html;

  // Attach Locate on Map listeners
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
