/**
 * Floating Map Controls Component (Search, Locate Me, Mobile Layer Toggle).
 *
 * Implements:
 * - Search bar with font-size >= 16px to prevent iOS auto-zoom on focus (H5).
 * - "Locate me" button centering map within Cebu watch bounds (H5).
 * - Floating segmented layer toggle on mobile (C2).
 */

import type { LayerSelection } from "../types.js";
import { ICONS } from "./icons.js";

export interface MapControlsCallbacks {
  onSearchChange: (query: string) => void;
  onLocateUser: (coords: { lat: number; lon: number }) => void;
  onLayerChange: (layer: LayerSelection) => void;
  onToast: (msg: string) => void;
}

export function renderMapControls(
  container: HTMLElement,
  currentLayer: LayerSelection,
  callbacks: MapControlsCallbacks
): void {
  container.innerHTML = `
    <div class="map-floating-overlay">
      <!-- Search and Locate Row -->
      <div class="map-search-row">
        <div class="search-input-wrapper">
          <span class="search-icon" aria-hidden="true" style="display: inline-flex; align-items: center;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input
            type="search"
            id="map-search-input"
            class="map-search-input"
            placeholder="Search barangay, street, or city..."
            aria-label="Search barangay, street, or city"
            autocomplete="off"
            spellcheck="false"
          />
          <button id="btn-clear-search" class="search-clear-btn" aria-label="Clear search" title="Clear search" style="display: none;">${ICONS.close}</button>
        </div>
        <button id="btn-locate-me" class="map-ctrl-btn btn-locate-me" aria-label="Locate me on map" title="Center on my location">
          <span class="ctrl-icon" aria-hidden="true" style="display: inline-flex; align-items: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
          </span>
        </button>
      </div>

      <!-- Mobile Floating Layer Segmented Toggle (Visible only on mobile) -->
      <div class="mobile-layer-segmented-bar mobile-only">
        <button class="mobile-layer-btn ${currentLayer === 'power' ? 'active' : ''}" data-layer="power">
          <span style="display: inline-flex; align-items: center; margin-right: 4px;">${ICONS.bolt}</span>Power
        </button>
        <button class="mobile-layer-btn ${currentLayer === 'earthquakes' ? 'active' : ''}" data-layer="earthquakes">
          <span style="display: inline-flex; align-items: center; margin-right: 4px;">${ICONS.earthquake}</span>Quakes
        </button>
        <button class="mobile-layer-btn ${currentLayer === 'both' ? 'active' : ''}" data-layer="both">
          Both
        </button>
      </div>
    </div>
  `;

  // Search input listeners
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
  }

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

  // Mobile layer buttons
  const mobileLayerBtns = container.querySelectorAll<HTMLButtonElement>(".mobile-layer-btn");
  mobileLayerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const layer = btn.getAttribute("data-layer") as LayerSelection;
      if (layer) callbacks.onLayerChange(layer);
    });
  });
}
