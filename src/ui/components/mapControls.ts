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
import { getCebuSearchSuggestions } from "../services/cebuLocations.js";

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
  advisoryBarangays?: Set<string> | string[];
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
          ${myBarangay.count > 0 ? `<button class="btn-filter-my-area" id="btn-filter-my-area" title="Filter map to ${escapeHtml(myBarangay.barangay)}">Filter</button>` : ''}
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
            <div id="search-suggestions-dropdown" class="search-suggestions-dropdown" style="display: none;" role="listbox" aria-label="Location suggestions"></div>
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

  // Search input and suggestions elements
  const searchForm = container.querySelector<HTMLFormElement>("#map-search-form");
  const searchInput = container.querySelector<HTMLInputElement>("#map-search-input");
  const clearBtn = container.querySelector<HTMLButtonElement>("#btn-clear-search");
  const dropdown = container.querySelector<HTMLDivElement>("#search-suggestions-dropdown");
  let activeIndex = -1;

  const hideSuggestions = () => {
    if (dropdown) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      activeIndex = -1;
    }
  };

  const selectSuggestion = (name: string) => {
    if (searchInput) {
      searchInput.value = name;
    }
    if (clearBtn) {
      clearBtn.style.display = "flex";
    }
    hideSuggestions();
    callbacks.onSearchChange(name);
    callbacks.onSearchSubmit?.(name);
  };

  const showSuggestions = (q: string) => {
    if (!dropdown) return;
    const trimmed = q.trim();
    if (!trimmed) {
      hideSuggestions();
      return;
    }

    const suggestions = getCebuSearchSuggestions(trimmed, extra?.advisoryBarangays, 6);
    if (suggestions.length === 0) {
      hideSuggestions();
      return;
    }

    activeIndex = -1;
    dropdown.innerHTML = suggestions
      .map(
        (s, idx) => `
        <button type="button" class="suggestion-item" data-index="${idx}" data-name="${escapeHtml(s.name)}" role="option">
          <span class="suggestion-main">
            <span class="suggestion-pin" aria-hidden="true">${ICONS.mapPin}</span>
            <span class="suggestion-name">${escapeHtml(s.name)}</span>
            <span class="suggestion-city">${escapeHtml(s.city)}</span>
          </span>
          ${s.hasOutage ? '<span class="suggestion-badge">Outage</span>' : ''}
        </button>
      `
      )
      .join("");

    dropdown.style.display = "flex";

    dropdown.querySelectorAll<HTMLButtonElement>(".suggestion-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const name = btn.getAttribute("data-name");
        if (name) selectSuggestion(name);
      });
    });
  };

  if (searchInput && clearBtn) {
    searchInput.addEventListener("input", () => {
      const val = searchInput.value.trim();
      clearBtn.style.display = val.length > 0 ? "flex" : "none";
      callbacks.onSearchChange(val);
      showSuggestions(val);
    });

    searchInput.addEventListener("focus", () => {
      const val = searchInput.value.trim();
      if (val) {
        showSuggestions(val);
      }
    });

    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearBtn.style.display = "none";
      hideSuggestions();
      callbacks.onSearchChange("");
      searchInput.focus();
    });

    // Keyboard navigation: Escape, ArrowDown, ArrowUp, Enter
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideSuggestions();
        return;
      }

      if (dropdown && dropdown.style.display !== "none") {
        const items = dropdown.querySelectorAll<HTMLButtonElement>(".suggestion-item");
        if (items.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            items.forEach((item, idx) => item.classList.toggle("selected", idx === activeIndex));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            items.forEach((item, idx) => item.classList.toggle("selected", idx === activeIndex));
            return;
          }
          if (e.key === "Enter" && activeIndex >= 0 && activeIndex < items.length) {
            e.preventDefault();
            const chosenName = items[activeIndex].getAttribute("data-name");
            if (chosenName) {
              selectSuggestion(chosenName);
              return;
            }
          }
        }
      }

      if (e.key === "Enter") {
        e.preventDefault();
        hideSuggestions();
        const val = searchInput.value.trim();
        if (val) {
          callbacks.onSearchSubmit?.(val);
        }
      }
    });
  }

  // Hide suggestions when clicking outside container
  if (typeof document !== "undefined") {
    document.addEventListener("click", (e) => {
      if (typeof container.contains === "function" && !container.contains(e.target as Node)) {
        hideSuggestions();
      }
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      hideSuggestions();
      const val = searchInput ? searchInput.value.trim() : "";
      if (val) {
        callbacks.onSearchSubmit?.(val);
      }
    });
  }

  // View Mode Toggle listener
  const viewModeBtn = container.querySelector<HTMLButtonElement>("#btn-toggle-view-mode");
  viewModeBtn?.addEventListener("click", () => {
    hideSuggestions();
    callbacks.onViewModeToggle?.();
  });

  // Locate Me listener
  const locateBtn = container.querySelector<HTMLButtonElement>("#btn-locate-me");
  locateBtn?.addEventListener("click", () => {
    hideSuggestions();
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
    hideSuggestions();
    if (myBarangay && searchInput) {
      searchInput.value = myBarangay.barangay;
      if (clearBtn) clearBtn.style.display = "flex";
      callbacks.onSearchChange(myBarangay.barangay);
      callbacks.onSelectMyBarangay?.(myBarangay.barangay);
    }
  });

  const unpinBtn = container.querySelector<HTMLButtonElement>("#btn-unpin-area");
  unpinBtn?.addEventListener("click", () => {
    hideSuggestions();
    callbacks.onClearMyBarangay?.();
  });

  // Mobile layer buttons
  const mobileLayerBtns = container.querySelectorAll<HTMLButtonElement>(".mobile-layer-btn");
  mobileLayerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      hideSuggestions();
      const layer = btn.getAttribute("data-layer") as LayerSelection;
      if (layer) callbacks.onLayerChange(layer);
    });
  });
}
