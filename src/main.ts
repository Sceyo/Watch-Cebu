/**
 * Main Application Bootstrapper for Watch Cebu.
 *
 * Implements Stage 3 Architecture:
 * - Bootstraps decoupled data fetches for Power Advisories and Earthquakes.
 * - Manages application state: LayerSelection, FilterState, FeedState.
 * - Renders MapController, Header, DayTabs, Legend, and Fallback Banner.
 * - Manages Multi-Hazard Drawers (Legend, About, Air Quality) with backdrop & focus traps.
 */

import "leaflet/dist/leaflet.css";
import "./ui/styles/main.css";
import type { PowerAdvisory, EarthquakeEvent } from "./types/index.js";
import type { LayerSelection, FilterState, FeedState } from "./ui/types.js";
import { fetchPowerAdvisories, fetchEarthquakeEvents } from "./ui/services/dataFeed.js";
import { MapController } from "./ui/map/mapController.js";
import { renderHeader } from "./ui/components/header.js";
import { renderDayTabs } from "./ui/components/dayTabs.js";
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

// Global App State
let currentLayer: LayerSelection = "both";
let filterState: FilterState = {
  selectedDate: "all",
  minMagnitude: 0,
};
let isLegendOpen = false;
let isAboutOpen = false;
let isAirQualityOpen = false;
let isForecastOpen = false;
let lastFocusedTrigger: HTMLElement | null = null;

let powerFeedState: FeedState<PowerAdvisory[]> = {
  status: "loading",
  data: [],
};

let eqFeedState: FeedState<EarthquakeEvent[]> = {
  status: "loading",
  data: [],
};

// Optimistic UI cache for instant header render (Task 10)
let airQualityData: AirQualityReading | null = getCachedAirQuality();
let forecastData: ForecastResult | null = null;

let mapController: MapController | null = null;

function closeAllDrawers() {
  if (isLegendOpen || isAboutOpen || isAirQualityOpen || isForecastOpen) {
    isLegendOpen = false;
    isAboutOpen = false;
    isAirQualityOpen = false;
    isForecastOpen = false;
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
  return null;
}

function focusActiveDrawer() {
  setTimeout(() => {
    const activeEl = getActiveDrawerElement();
    if (activeEl) {
      const closeBtn = activeEl.querySelector<HTMLButtonElement>("button.legend-close-btn, button.drawer-close-btn");
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

  const isAnyDrawerOpen = isLegendOpen || isAboutOpen || isAirQualityOpen || isForecastOpen;
  if (backdropEl) {
    backdropEl.classList.toggle("active", isAnyDrawerOpen);
    backdropEl.setAttribute("aria-hidden", isAnyDrawerOpen ? "false" : "true");
  }

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
            lastFocusedTrigger = document.getElementById("btn-toggle-forecast");
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
  // Initialize Map
  mapController = new MapController("map");

  // Initial UI render (using cached air quality if available, eliminating layout shift)
  updateUI();

  // Backdrop click listener to close open drawer (Task 6)
  const backdropEl = document.getElementById("drawer-backdrop");
  backdropEl?.addEventListener("click", () => {
    closeAllDrawers();
  });

  // Kick off decoupled fetches in parallel — none awaits the other
  const powerPromise = fetchPowerAdvisories().then((state) => {
    powerFeedState = state;
    updateUI();
  });

  const eqPromise = fetchEarthquakeEvents().then((state) => {
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

  // When power and earthquakes settle, fit bounds if appropriate
  Promise.allSettled([powerPromise, eqPromise]).then(() => {
    mapController?.fitBoundsIfNotEmpty();
  });

  // Global Keyboard listener: Escape closes drawers & Tab focus trapping (Task 7)
  window.addEventListener("keydown", (e) => {
    const isAnyDrawerOpen = isLegendOpen || isAboutOpen || isAirQualityOpen || isForecastOpen;
    if (!isAnyDrawerOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeAllDrawers();
      return;
    }

    if (e.key === "Tab") {
      const activeDrawer = getActiveDrawerElement();
      if (!activeDrawer) return;

      const focusable = activeDrawer.querySelectorAll<HTMLElement>(
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
