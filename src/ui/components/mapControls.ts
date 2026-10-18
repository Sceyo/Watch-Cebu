/**
 * Floating Map Controls Component (Search, Locate Me, View Mode Toggle, Mobile Layer Toggle).
 *
 * Implements:
 * - Search bar with font-size >= 16px to prevent iOS auto-zoom on focus (H5).
 * - "Locate me" button centering map within Cebu watch bounds (H5).
 * - Map vs. List View toggle for fast low-bandwidth mobile LTE scanning.
 * - Pinned Home Barangay quick status banner (pure localStorage, zero account).
 * - Floating segmented layer toggle on mobile (C2).
 */

import type { LayerSelection } from "../types.js";
import type { MyBarangayStatus } from "../services/myBarangay.js";
import { formatReadableDate, escapeHtml } from "../../utils/index.js";
import { ICONS } from "./icons.js";

export interface MapControlsCallbacks {
  onSearchChange: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  onLocateUser: (coords: { lat: number; lon: number }) => void;
  onLayerChange: (layer: LayerSelection) => void;
  onToast: (msg: string) => void;
  onViewModeToggle?: () => void;
  onClearMyBarangay?: () => void;
  onSelectMyBarangay?: (barangay: string) => void;
}

export interface MapControlsExtraState {
  viewMode?: "map" | "list";
  myBarangayStatus?: MyBarangayStatus | null;
  searchQuery?: string;
}

export function renderMapControls(
  container: HTMLElement,
  currentLayer: LayerSelection,
  callbacks: MapControlsCallbacks,
  extra?: MapControlsExtraState
): void {
  const viewMode = extra?.viewMode || "map";
  const myBarangay = extra?.myBarangayStatus;
  const currentSearch = extra?.searchQuery || "";

  const isCurrentlyFiltered = Boolean(
    myBarangay &&
    currentSearch &&
    currentSearch.toLowerCase().trim() === myBarangay.barangay.toLowerCase().trim()
  );

  let pinnedBannerHtml = "";
  if (myBarangay) {
    const outageBadge = myBarangay.count > 0
      ? `<span class="pinned-tag outage-active">${myBarangay.count} Scheduled</span>`
      : `<span class="pinned-tag outage-clear">No Outages</span>`;

    pinnedBannerHtml = `
      <div class="my-barangay-status-banner" role="status" aria-label="Pinned Area: ${escapeHtml(myBarangay.barangay)}">
        <div class="my-barangay-info">
          <span class="pinned-icon" aria-hidden="true" style="display: inline-flex; align-items: center; color: #F59E0B;">${ICONS.mapPin}</span>
          <span class="my-barangay-name">${escapeHtml(myBarangay.barangay)}</span>
          ${outageBadge}
        </div>
        <div class="my-barangay-btns">
          ${myBarangay.count > 0 ? `<button class="btn-filter-my-area ${isCurrentlyFiltered ? 'active' : ''}" id="btn-filter-my-area" title="${isCurrentlyFiltered ? 'Clear filter to show all areas' : `Filter map to ${escapeHtml(myBarangay.barangay)}`}">${isCurrentlyFiltered ? 'Unfilter' : 'Filter'}</button>` : ''}
          <button class="btn-unpin-barangay" id="btn-unpin-area" title="Unpin ${escapeHtml(myBarangay.barangay)}" aria-label="Unpin barangay">${ICONS.close}</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="map-floating-overlay">
      <!-- Search, Locate & View Mode Row -->
      <div class="map-search-row">
        <form class="search-form" id="map-search-form" action="javascript:void(0);">
          <div class="search-input-wrapper">
            <button type="submit" class="search-submit-btn" aria-label="Search and zoom to area" title="Search and zoom to area">
              <span class="search-icon" aria-hidden="true" style="display: inline-flex; align-items: center;">${ICONS.search}</span>
            </button>
            <input
              type="search"
              id="map-search-input"
              class="map-search-input"
              placeholder="Search barangay..."
              aria-label="Search barangay, street, or city"
              autocomplete="off"
              spellcheck="false"
              enterkeyhint="search"
              value="${escapeHtml(currentSearch)}"
            />
            <button type="button" id="btn-clear-search" class="search-clear-btn" aria-label="Clear search" title="Clear search" style="display: ${currentSearch ? 'flex' : 'none'};">${ICONS.close}</button>
          </div>
        </form>

        <button id="btn-toggle-view-mode" class="map-ctrl-btn btn-view-mode" aria-label="Switch to ${viewMode === 'map' ? 'List View' : 'Map View'}" title="Toggle Map vs List View">
          <span class="ctrl-icon" aria-hidden="true" style="display: inline-flex; align-items: center;">${viewMode === 'map' ? ICONS.list : ICONS.map}</span>
          <span class="view-mode-label">${viewMode === 'map' ? 'List' : 'Map'}</span>
        </button>

        <button id="btn-locate-me" class="map-ctrl-btn btn-locate-me" aria-label="Locate me on map" title="Center on my location">
          <span class="ctrl-icon" aria-hidden="true" style="display: inline-flex; align-items: center;">${ICONS.crosshair}</span>
        </button>
      </div>

      <!-- Pinned Barangay Banner -->
      ${pinnedBannerHtml}

      <!-- Mobile Floating Layer Segmented Toggle (Visible only on mobile) -->
      <div class="mobile-layer-segmented-bar mobile-only">
        <button class="mobile-layer-btn ${currentLayer === 'power' ? 'active' : ''}" data-layer="power">
          Power
        </button>
        <button class="mobile-layer-btn ${currentLayer === 'earthquakes' ? 'active' : ''}" data-layer="earthquakes">
          Quakes
        </button>
        <button class="mobile-layer-btn ${currentLayer === 'both' ? 'active' : ''}" data-layer="both">
          Both
        </button>
      </div>
    </div>
  `;

  // Search input listeners
  const searchForm = container.querySelector<HTMLFormElement>("#map-search-form");
  const searchInput = container.querySelector<HTMLInputElement>("#map-search-input");
  const clearBtn = container.querySelector<HTMLButtonElement>("#btn-clear-search");

  if (searchInput && clearBtn) {
    searchInput.addEventListener("input", () => {
      const val = searchInput.value.trim();
      clearBtn.style.display = val.length > 0 ? "flex" : "none";
      callbacks.onSearchChange(val);
    });

    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearBtn.style.display = "none";
      callbacks.onSearchChange("");
      searchInput.focus();
    });

    // Explicit Enter key submission for desktop and mobile soft keyboards
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = searchInput.value.trim();
        if (val) {
          callbacks.onSearchSubmit?.(val);
        }
      }
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = searchInput ? searchInput.value.trim() : "";
      if (val) {
        callbacks.onSearchSubmit?.(val);
      }
    });
  }

  // View Mode Toggle listener
  const viewModeBtn = container.querySelector<HTMLButtonElement>("#btn-toggle-view-mode");
  viewModeBtn?.addEventListener("click", () => {
    callbacks.onViewModeToggle?.();
  });

  // Locate Me listener
  const locateBtn = container.querySelector<HTMLButtonElement>("#btn-locate-me");
  locateBtn?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      callbacks.onToast("Geolocation is not supported by your browser.");
      return;
    }

    locateBtn.classList.add("locating");
    callbacks.onToast("Locating your position in Cebu...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locateBtn.classList.remove("locating");
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Check if inside Cebu/Visayas bounds: 6.2 - 14.6 N, 119.5 - 128.2 E
        if (lat < 6.2 || lat > 14.6 || lon < 119.5 || lon > 128.2) {
          callbacks.onToast("Your location is outside the Metro Cebu watch area.");
          return;
        }

        callbacks.onLocateUser({ lat, lon });
        callbacks.onToast("Centered map on your position.");
      },
      (err) => {
        locateBtn.classList.remove("locating");
        if (err.code === err.PERMISSION_DENIED) {
          callbacks.onToast("Location access permission denied.");
        } else {
          callbacks.onToast("Unable to determine your location.");
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  });

  // Pinned barangay actions
  const filterMyAreaBtn = container.querySelector<HTMLButtonElement>("#btn-filter-my-area");
  filterMyAreaBtn?.addEventListener("click", () => {
    if (myBarangay && searchInput) {
      if (isCurrentlyFiltered) {
        searchInput.value = "";
        if (clearBtn) clearBtn.style.display = "none";
        callbacks.onSearchChange("");
      } else {
        searchInput.value = myBarangay.barangay;
        if (clearBtn) clearBtn.style.display = "flex";
        callbacks.onSearchChange(myBarangay.barangay);
        callbacks.onSelectMyBarangay?.(myBarangay.barangay);
      }
    }
  });

  const unpinBtn = container.querySelector<HTMLButtonElement>("#btn-unpin-area");
  unpinBtn?.addEventListener("click", () => {
    callbacks.onClearMyBarangay?.();
  });

  // Mobile layer buttons
  const mobileLayerBtns = container.querySelectorAll<HTMLButtonElement>(".mobile-layer-btn");
  mobileLayerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const layer = btn.getAttribute("data-layer") as LayerSelection;
      if (layer) callbacks.onLayerChange(layer);
    });
  });
}
