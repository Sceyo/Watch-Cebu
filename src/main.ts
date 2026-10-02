/**
 * Main Application Bootstrapper for Watch Cebu.
 *
 * Implements Stage 3 Architecture & Mobile-First Responsive Overhaul:
 * - Bootstraps decoupled data fetches for Power Advisories and Earthquakes.
 * - Manages application state: LayerSelection, FilterState, FeedState.
 * - Renders MapController, Header, DayTabs, Legend, About, Air Quality, and Forecast Drawers.
 * - Mobile Touch Bottom Sheet for marker details (C1).
 * - Mobile Compact 52px Header + Consolidated System Status Popover (C2).
 * - Fixed 56px Mobile Bottom Action Bar (C2).
 * - Metro Cebu default map view without auto-fit jumping (H2).
 * - Preselect Today (PHT) on initial load with past tabs dimmed (H3).
 * - Interactive Search and Locate Me controls (H5).
 * - 44×44px touch targets and full keyboard accessibility.
 */

import "leaflet/dist/leaflet.css";
import "./ui/styles/main.css";
import type { PowerAdvisory, EarthquakeEvent } from "./types/index.js";
import type { LayerSelection, FilterState, FeedState, SelectedLocationDetails } from "./ui/types.js";
import { fetchPowerAdvisories, fetchEarthquakeEvents } from "./ui/services/dataFeed.js";
import { MapController } from "./ui/map/mapController.js";
import { renderHeader } from "./ui/components/header.js";
import { renderDayTabs, getTodayPhtString } from "./ui/components/dayTabs.js";
import { renderDataSourceBanner } from "./ui/components/dataSourceBanner.js";
import { renderLegend } from "./ui/components/legend.js";
import { renderAbout } from "./ui/components/about.js";
import { renderAirQualityDrawer } from "./ui/components/airQualityDrawer.js";
import {
  fetchAirQuality,
  getCachedAirQuality,
  type AirQualityReading,
} from "./ui/services/airQuality.js";
import {
  fetchForecast,
  type ForecastResult,
} from "./ui/services/forecast.js";
import { renderForecastDrawer } from "./ui/components/forecastDrawer.js";
import { renderMapControls } from "./ui/components/mapControls.js";
import {
  renderMobileBottomBar,
  renderStatusPopover,
  renderMobileBottomSheet,
  showToast,
} from "./ui/components/mobileNav.js";

// Global App State
let currentLayer: LayerSelection = "both";
let filterState: FilterState = {
  selectedDate: "all",
  minMagnitude: 0,
  searchQuery: "",
};

let isLegendOpen = false;
let isAboutOpen = false;
let isAirQualityOpen = false;
let isForecastOpen = false;
let isStatusPopoverOpen = false;
let selectedLocation: SelectedLocationDetails | null = null;
let lastFocusedTrigger: HTMLElement | null = null;

let powerFeedState: FeedState<PowerAdvisory[]> = {
  status: "loading",
  data: [],
};

let eqFeedState: FeedState<EarthquakeEvent[]> = {
  status: "loading",
  data: [],
};

// Optimistic UI cache for instant header render
let airQualityData: AirQualityReading | null = getCachedAirQuality();
let forecastData: ForecastResult | null = null;

let mapController: MapController | null = null;

function closeAllDrawers() {
  if (
    isLegendOpen ||
    isAboutOpen ||
    isAirQualityOpen ||
    isForecastOpen ||
    isStatusPopoverOpen ||
    selectedLocation !== null
  ) {
    isLegendOpen = false;
    isAboutOpen = false;
    isAirQualityOpen = false;
    isForecastOpen = false;
    isStatusPopoverOpen = false;
    selectedLocation = null;
    document.body.classList.remove("modal-open");
    updateUI();
    if (lastFocusedTrigger) {
      lastFocusedTrigger.focus();
      lastFocusedTrigger = null;
    }
  }
}

function getActiveDrawerElement(): HTMLElement | null {
  if (isForecastOpen) return document.getElementById("forecast-drawer");
  if (isAirQualityOpen) return document.getElementById("air-drawer");
  if (isLegendOpen) return document.getElementById("legend-drawer");
  if (isAboutOpen) return document.getElementById("about-drawer");
  if (isStatusPopoverOpen) return document.getElementById("status-popover");
  if (selectedLocation) return document.getElementById("mobile-bottom-sheet");
  return null;
}

function focusActiveDrawer() {
  setTimeout(() => {
    const activeEl = getActiveDrawerElement();
    if (activeEl) {
      const closeBtn = activeEl.querySelector<HTMLButtonElement>(
        "button.legend-close-btn, button.drawer-close-btn, button.sheet-close-btn"
      );
      closeBtn?.focus();
    }
  }, 50);
}

function updateUI() {
  const headerEl = document.getElementById("app-header");
  const dayTabsEl = document.getElementById("day-tabs-bar");
  const bannerEl = document.getElementById("data-source-banner-container");
  const legendEl = document.getElementById("legend-drawer");
  const aboutEl = document.getElementById("about-drawer");
  const airDrawerEl = document.getElementById("air-drawer");
  const forecastDrawerEl = document.getElementById("forecast-drawer");
  const backdropEl = document.getElementById("drawer-backdrop");
  const mapControlsEl = document.getElementById("map-controls-container");
  const mobileBottomBarEl = document.getElementById("mobile-bottom-bar");
  const mobileBottomSheetEl = document.getElementById("mobile-bottom-sheet");
  const statusPopoverEl = document.getElementById("status-popover");

  const isAnyDrawerOpen =
    isLegendOpen ||
    isAboutOpen ||
    isAirQualityOpen ||
    isForecastOpen ||
    isStatusPopoverOpen ||
    selectedLocation !== null;

  if (backdropEl) {
    backdropEl.classList.toggle("active", isAnyDrawerOpen);
    backdropEl.setAttribute("aria-hidden", isAnyDrawerOpen ? "false" : "true");
  }

  if (isAnyDrawerOpen) {
    document.body.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
  }

  // Header Component (Desktop full / Mobile 52px top bar)
  if (headerEl) {
    renderHeader(
      headerEl,
      currentLayer,
      powerFeedState,
      eqFeedState,
      {
        onLayerChange: (layer) => {
          currentLayer = layer;
          mapController?.setLayerVisibility(currentLayer);
          updateUI();
        },
        onLegendToggle: () => {
          isLegendOpen = !isLegendOpen;
          if (isLegendOpen) {
            isAboutOpen = false;
            isAirQualityOpen = false;
            isForecastOpen = false;
            isStatusPopoverOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-toggle-legend");
            focusActiveDrawer();
          }
          updateUI();
        },
        onAboutToggle: () => {
          isAboutOpen = !isAboutOpen;
          if (isAboutOpen) {
            isLegendOpen = false;
            isAirQualityOpen = false;
            isForecastOpen = false;
            isStatusPopoverOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-toggle-about");
            focusActiveDrawer();
          }
          updateUI();
        },
        onAirQualityToggle: () => {
          isAirQualityOpen = !isAirQualityOpen;
          if (isAirQualityOpen) {
            isLegendOpen = false;
            isAboutOpen = false;
            isForecastOpen = false;
            isStatusPopoverOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-toggle-air");
            focusActiveDrawer();
          }
          updateUI();
        },
        onForecastToggle: () => {
          isForecastOpen = !isForecastOpen;
          if (isForecastOpen) {
            isLegendOpen = false;
            isAboutOpen = false;
            isAirQualityOpen = false;
            isStatusPopoverOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-toggle-forecast");
            focusActiveDrawer();
          }
          updateUI();
        },
        onStatusPopoverToggle: () => {
          isStatusPopoverOpen = !isStatusPopoverOpen;
          if (isStatusPopoverOpen) {
            isLegendOpen = false;
            isAboutOpen = false;
            isAirQualityOpen = false;
            isForecastOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-mobile-status");
            focusActiveDrawer();
          }
          updateUI();
        },
      },
      {
        airQuality: airQualityData,
        isForecastActive: isForecastOpen,
      }
    );
  }

  // Floating Map Controls (Search, Locate Me, Mobile Layer Toggle)
  if (mapControlsEl) {
    renderMapControls(mapControlsEl, currentLayer, {
      onSearchChange: (query) => {
        filterState.searchQuery = query;
        mapController?.renderPowerAdvisories(powerFeedState.data, filterState);
        mapController?.renderEarthquakeEvents(eqFeedState.data, filterState);
      },
      onLocateUser: (coords) => {
        mapController?.centerOnUser(coords);
      },
      onLayerChange: (layer) => {
        currentLayer = layer;
        mapController?.setLayerVisibility(currentLayer);
        updateUI();
      },
      onToast: (msg) => {
        showToast(msg);
      },
    });
  }

  // Mobile Fixed Bottom Action Bar (56px + safe area)
  if (mobileBottomBarEl) {
    renderMobileBottomBar(
      mobileBottomBarEl,
      {
        isForecastOpen,
        isAirOpen: isAirQualityOpen,
        isLegendOpen,
        isAboutOpen,
        airQuality: airQualityData,
      },
      {
        onForecastToggle: () => {
          isForecastOpen = !isForecastOpen;
          if (isForecastOpen) {
            isLegendOpen = false;
            isAboutOpen = false;
            isAirQualityOpen = false;
            isStatusPopoverOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-bottom-forecast");
            focusActiveDrawer();
          }
          updateUI();
        },
        onAirQualityToggle: () => {
          isAirQualityOpen = !isAirQualityOpen;
          if (isAirQualityOpen) {
            isLegendOpen = false;
            isAboutOpen = false;
            isForecastOpen = false;
            isStatusPopoverOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-bottom-air");
            focusActiveDrawer();
          }
          updateUI();
        },
        onLegendToggle: () => {
          isLegendOpen = !isLegendOpen;
          if (isLegendOpen) {
            isAboutOpen = false;
            isAirQualityOpen = false;
            isForecastOpen = false;
            isStatusPopoverOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-bottom-legend");
            focusActiveDrawer();
          }
          updateUI();
        },
        onAboutToggle: () => {
          isAboutOpen = !isAboutOpen;
          if (isAboutOpen) {
            isLegendOpen = false;
            isAirQualityOpen = false;
            isForecastOpen = false;
            isStatusPopoverOpen = false;
            selectedLocation = null;
            lastFocusedTrigger = document.getElementById("btn-bottom-about");
            focusActiveDrawer();
          }
          updateUI();
        },
      }
    );
  }

  // Mobile Touch Bottom Sheet
  if (mobileBottomSheetEl) {
    renderMobileBottomSheet(mobileBottomSheetEl, selectedLocation, () => {
      selectedLocation = null;
      document.body.classList.remove("modal-open");
      updateUI();
    });
  }

  // Mobile Consolidated Status Popover
  if (statusPopoverEl) {
    renderStatusPopover(
      statusPopoverEl,
      isStatusPopoverOpen,
      powerFeedState,
      eqFeedState,
      airQualityData,
      () => {
        isStatusPopoverOpen = false;
        document.body.classList.remove("modal-open");
        updateUI();
      }
    );
  }

  if (forecastDrawerEl) {
    renderForecastDrawer(forecastDrawerEl, forecastData, isForecastOpen, () => {
      closeAllDrawers();
    });
  }

  if (bannerEl) {
    renderDataSourceBanner(bannerEl, powerFeedState, eqFeedState);
  }

  if (dayTabsEl) {
    if (currentLayer === "earthquakes") {
      dayTabsEl.style.display = "none";
    } else {
      dayTabsEl.style.display = "block";
      renderDayTabs(dayTabsEl, powerFeedState.data, filterState.selectedDate, (date) => {
        filterState.selectedDate = date;
        mapController?.renderPowerAdvisories(powerFeedState.data, filterState);
        updateUI();
      });
    }
  }

  if (legendEl) {
    renderLegend(legendEl, isLegendOpen, () => {
      closeAllDrawers();
    });
  }

  if (aboutEl) {
    renderAbout(aboutEl, isAboutOpen, () => {
      closeAllDrawers();
    });
  }

  if (airDrawerEl) {
    renderAirQualityDrawer(airDrawerEl, airQualityData, isAirQualityOpen, () => {
      closeAllDrawers();
    });
  }

  // Update map layer rendering
  if (mapController) {
    mapController.setLayerVisibility(currentLayer);
    mapController.renderPowerAdvisories(powerFeedState.data, filterState);
    mapController.renderEarthquakeEvents(eqFeedState.data, filterState);
  }
}

async function init() {
  // Initialize Map centered on Metro Cebu
  mapController = new MapController("map");

  // Wire mobile/touch selection callback to bottom sheet (C1)
  mapController.setOnSelectLocation((details) => {
    selectedLocation = details;
    isLegendOpen = false;
    isAboutOpen = false;
    isAirQualityOpen = false;
    isForecastOpen = false;
    isStatusPopoverOpen = false;
    updateUI();
    focusActiveDrawer();
  });

  // Initial UI render
  updateUI();

  // Backdrop click listener to close open drawer or bottom sheet
  const backdropEl = document.getElementById("drawer-backdrop");
  backdropEl?.addEventListener("click", () => {
    closeAllDrawers();
  });

  // Kick off decoupled fetches in parallel
  fetchPowerAdvisories().then((state) => {
    powerFeedState = state;
    // Preselect Today (PHT) on initial load (H3)
    if (state.data.length > 0 && filterState.selectedDate === "all") {
      const todayPht = getTodayPhtString();
      if (state.data.some((a) => a.date === todayPht)) {
        filterState.selectedDate = todayPht;
      } else {
        const sortedDates = [...new Set(state.data.map((a) => a.date))].sort();
        if (sortedDates.length > 0) {
          filterState.selectedDate = sortedDates[0];
        }
      }
    }
    updateUI();
  });

  fetchEarthquakeEvents().then((state) => {
    eqFeedState = state;
    updateUI();
  });

  fetchAirQuality().then((air) => {
    airQualityData = air;
    updateUI();
  });

  fetchForecast().then((forecast) => {
    forecastData = forecast;
    if (isForecastOpen) {
      updateUI();
    }
  });

  // Global Keyboard listener: Escape closes dialogs & Tab focus trapping
  window.addEventListener("keydown", (e) => {
    const isAnyOpen =
      isLegendOpen ||
      isAboutOpen ||
      isAirQualityOpen ||
      isForecastOpen ||
      isStatusPopoverOpen ||
      selectedLocation !== null;

    if (!isAnyOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeAllDrawers();
      return;
    }

    if (e.key === "Tab") {
      const activeDialog = getActiveDrawerElement();
      if (!activeDialog) return;

      const focusable = activeDialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  });
}

// Boot on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
