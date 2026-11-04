/**
 * Full-System End-to-End Automated Scenario Test Suite.
 *
 * Covers every subsystem of Watch Cebu across 10 realistic civic scenarios:
 * 1. First-Run Civilian Onboarding, Emergency Hotlines & Civic Disclaimers
 * 2. Multi-Barangay Pinning, Outage Status Calculation & Purpose-Line Guard
 * 3. Severe Typhoon & Compound Hazard Emergency (PAGASA TCWS + Rainfall + Project NOAH Overlay)
 * 4. Province-Wide Panning & Dynamic Regional Flood Loading (Metro, North & South Cebu + San Fernando/Aloguinsan Coverage)
 * 5. Seismic Crisis — Major Earthquake vs. Distant Microquakes Filtering
 * 6. 3-Tier Hybrid Location Search & Offline Gazetteer Resolution
 * 7. Atmospheric & Weather Intelligence (Air Quality Index + 24-Hour Hourly Forecast Drawers)
 * 8. Offline / Weak Signal Resilience (PWA Fallback & Network State Transitions)
 * 9. Mobile Ergonomics & Compact Viewport Adaptation (Bottom Action Bar & Status Popover)
 * 10. Upstream Parser Resilience, Security Sanitization & Client Bundle Integrity
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { join } from "path";

// UI Components
import {
  renderWelcomeModal,
  hasSeenWelcomeGuide,
} from "../../src/ui/components/welcomeModal.js";
import { renderAbout, ABOUT_METADATA } from "../../src/ui/components/about.js";
import { renderLegend } from "../../src/ui/components/legend.js";
import { renderMapControls } from "../../src/ui/components/mapControls.js";
import { renderListView } from "../../src/ui/components/listView.js";
import { renderDayTabs } from "../../src/ui/components/dayTabs.js";
import { renderUrgentAlertBanner } from "../../src/ui/components/urgentAlertBanner.js";
import { renderForecastDrawer } from "../../src/ui/components/forecastDrawer.js";
import { renderAirQualityDrawer } from "../../src/ui/components/airQualityDrawer.js";
import { renderOfflineBanner } from "../../src/ui/components/offlineBanner.js";
import { renderMobileBottomBar, renderStatusPopover } from "../../src/ui/components/mobileNav.js";

// Services & Map Controller
import {
  getMyBarangay,
  setMyBarangay,
  addFavorite,
  removeFavorite,
  getFavorites,
  clearAllFavorites,
  getMyBarangayStatus,
} from "../../src/ui/services/myBarangay.js";
import {
  lookupCebuLocation,
  getCebuSearchSuggestions,
} from "../../src/ui/services/cebuLocations.js";
import {
  FLOOD_HAZARD_STYLES,
  getFloodHazardStyle,
  fetchFloodHazards,
  getCachedFloodHazards,
  getLoadedFloodRegions,
  resetFloodHazardsCache,
  getRegionForCoordinates,
  getRegionsForBounds,
} from "../../src/ui/services/floodHazards.js";
import { computeAqiCategory, type AirQualityReading } from "../../src/ui/services/airQuality.js";
import { getWeatherCodeInfo, type ForecastResult } from "../../src/ui/services/forecast.js";
import { CEBU_EMERGENCY_HOTLINES } from "../../src/ui/services/networkStatus.js";
import { MapController } from "../../src/ui/map/mapController.js";

// Backend Parsers & Utilities
import { parsePostHtml } from "../../src/parsers/veco.js";
import { parseBulletinHtml } from "../../src/parsers/phivolcs.js";
import {
  escapeHtml,
  parseVECOTimeRange,
  extractStreets,
} from "../../src/utils/index.js";

import type { PowerAdvisory, EarthquakeEvent, PagasaBulletin } from "../../src/types/index.js";
import type { FilterState, FloodHazardCollection, FeedState } from "../../src/ui/types.js";

// Hoisted Leaflet Mock for MapController Inspection
const { dummyMapInstance, capturedGeoJsonCalls, capturedPopups, capturedMarkers } = vi.hoisted(() => {
  let currentBounds = {
    north: 10.42,
    south: 10.22,
    east: 124.02,
    west: 123.78,
  };

  const dummyMap: any = {
    _setTestBounds: (b: { north: number; south: number; east: number; west: number }) => {
      currentBounds = b;
    },
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    setView: vi.fn(),
    invalidateSize: vi.fn(),
    closePopup: vi.fn(),
    stop: vi.fn(),
    hasLayer: vi.fn((layer: any) => Boolean(layer && layer._addedToMap)),
    addLayer: vi.fn((layer: any) => {
      if (layer) layer._addedToMap = true;
    }),
    removeLayer: vi.fn((layer: any) => {
      if (layer) layer._addedToMap = false;
    }),
    createPane: vi.fn().mockReturnValue({ style: {} }),
    getPane: vi.fn().mockReturnValue({ style: {} }),
    on: vi.fn(),
    off: vi.fn(),
    getBounds: vi.fn(() => ({
      getNorth: () => currentBounds.north,
      getSouth: () => currentBounds.south,
      getEast: () => currentBounds.east,
      getWest: () => currentBounds.west,
    })),
  };

  return {
    dummyMapInstance: dummyMap,
    capturedGeoJsonCalls: [] as any[],
    capturedPopups: [] as any[],
    capturedMarkers: [] as any[],
  };
});

vi.mock("leaflet", () => {
  return {
    default: {
      map: vi.fn().mockReturnValue(dummyMapInstance),
      layerGroup: vi.fn(() => {
        const layers: any[] = [];
        return {
          _addedToMap: false,
          clearLayers: vi.fn(() => {
            layers.length = 0;
          }),
          addLayer: vi.fn((l: any) => layers.push(l)),
          removeLayer: vi.fn((l: any) => {
            const idx = layers.indexOf(l);
            if (idx !== -1) layers.splice(idx, 1);
          }),
          addTo: vi.fn(function (this: any, m: any) {
            this._addedToMap = true;
            m.addLayer(this);
            return this;
          }),
          eachLayer: vi.fn((fn: any) => layers.forEach(fn)),
          getLayers: vi.fn(() => layers),
        };
      }),
      geoJSON: vi.fn((geojson: any, options: any) => {
        capturedGeoJsonCalls.push({ geojson, options });
        const subLayers: any[] = [];
        if (geojson && Array.isArray(geojson.features)) {
          for (const feature of geojson.features) {
            const layerMock = {
              feature,
              bindPopup: vi.fn((html: string, popupOpts: any) => {
                capturedPopups.push({ feature, html, popupOpts });
              }),
            };
            if (options?.onEachFeature) {
              options.onEachFeature(feature, layerMock);
            }
            subLayers.push(layerMock);
          }
        }
        return {
          subLayers,
          getLayers: () => subLayers,
        };
      }),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      control: { zoom: vi.fn().mockReturnValue({ addTo: vi.fn() }) },
      latLng: vi.fn((lat, lon) => ({ lat, lng: lon })),
      latLngBounds: vi.fn((pts?: any[]) => ({
        isValid: () => Array.isArray(pts) && pts.length > 0,
        getCenter: () => ({ lat: 10.32, lng: 123.90 }),
      })),
      point: vi.fn((x, y) => ({ x, y })),
      divIcon: vi.fn((opts) => opts || {}),
      marker: vi.fn((coords: any, opts: any) => {
        const m = {
          coords,
          opts,
          on: vi.fn(),
          bindPopup: vi.fn(),
          openPopup: vi.fn(),
          getLatLng: () => ({
            lat: Array.isArray(coords) ? coords[0] : coords.lat,
            lng: Array.isArray(coords) ? coords[1] : coords.lng,
          }),
        };
        capturedMarkers.push(m);
        return m;
      }),
      circleMarker: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      circle: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      featureGroup: vi.fn().mockReturnValue({
        getBounds: vi.fn(() => ({ isValid: () => false })),
      }),
    },
  };
});

/**
 * Lightweight Interactive DOM Container Simulator for Component Testing
 */
function createTestContainer(id = "test-root", initialClass = ""): any {
  const attrs: Record<string, string> = {};
  const classSet = new Set<string>(initialClass.split(/\s+/).filter(Boolean));
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const childListeners: Record<string, Record<string, ((...args: any[]) => void)[]>> = {};
  const appendedChildren: any[] = [];
  let html = "";

  const getOrCreateChildNode = (selector: string): any => {
    if (!childListeners[selector]) {
      childListeners[selector] = {};
    }
    return {
      selector,
      value: "",
      dataset: {},
      style: {},
      remove: () => {
        const token = selector.replace(/^[#.]/, "");
        html = html.replace(token, "");
        appendedChildren.length = 0;
      },
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: (c: string) => html.includes(c),
      },
      getAttribute: (name: string) => {
        const escapedSel = selector.replace(/^[#.]/, "");
        const regex = new RegExp(`id="${escapedSel}"[\\s\\S]*?${name}="([^"]+)"`, "i");
        const m = html.match(regex);
        return m ? m[1] : null;
      },
      addEventListener: (evt: string, cb: (...args: any[]) => void) => {
        if (!childListeners[selector][evt]) childListeners[selector][evt] = [];
        childListeners[selector][evt].push(cb);
      },
      click: () => {
        const cbs = childListeners[selector]?.["click"] || [];
        cbs.forEach((fn) => fn({ preventDefault: vi.fn(), stopPropagation: vi.fn(), currentTarget: {} }));
      },
      triggerKeydown: (key: string) => {
        const cbs = childListeners[selector]?.["keydown"] || [];
        cbs.forEach((fn) => fn({ key, preventDefault: vi.fn(), stopPropagation: vi.fn() }));
      },
    };
  };

  return {
    id,
    children: appendedChildren,
    style: { display: "" },
    get className() {
      return Array.from(classSet).join(" ");
    },
    set className(val: string) {
      classSet.clear();
      val.split(/\s+/).filter(Boolean).forEach((c) => classSet.add(c));
    },
    classList: {
      add: (c: string) => classSet.add(c),
      remove: (c: string) => classSet.delete(c),
      contains: (c: string) => classSet.has(c),
    },
    get innerHTML() {
      return html;
    },
    set innerHTML(val: string) {
      html = val;
      for (const k of Object.keys(childListeners)) {
        delete childListeners[k];
      }
    },
    appendChild: (node: any) => {
      appendedChildren.push(node);
      if (node.innerHTML) {
        html += `<div id="${node.id || ""}" class="${node.className || ""}">${node.innerHTML}</div>`;
      }
    },
    setAttribute: (k: string, v: string) => {
      attrs[k] = v;
    },
    getAttribute: (k: string) => attrs[k] ?? null,
    addEventListener: (evt: string, cb: (...args: any[]) => void) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
    },
    querySelector: (selector: string) => {
      const token = selector.replace(/^[#.]/, "");
      if (html.includes(token) || childListeners[selector]) {
        return getOrCreateChildNode(selector);
      }
      return null;
    },
    querySelectorAll: (selector: string) => {
      const token = selector.replace(/^[#.]/, "");
      if (!html.includes(token)) return [];
      return [getOrCreateChildNode(selector)];
    },
  };
}

function setupMockStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  });
  return store;
}

describe("Watch Cebu — Full-System End-to-End Automated Scenarios", () => {
  beforeEach(() => {
    setupMockStorage();
    resetFloodHazardsCache();
    capturedGeoJsonCalls.length = 0;
    capturedPopups.length = 0;
    capturedMarkers.length = 0;
    dummyMapInstance.flyTo.mockClear();
    dummyMapInstance.fitBounds.mockClear();
  });

  // =========================================================================
  // SCENARIO 1: FIRST-RUN CIVILIAN ONBOARDING & CIVIC DISCLAIMERS
  // =========================================================================
  describe("Scenario 1: First-Run Civilian Onboarding, Emergency Hotlines & Civic Disclaimers", () => {
    it("guides a first-time user through the Welcome Modal, Project NOAH disclaimers, and 24/7 Emergency Hotlines", () => {
      expect(hasSeenWelcomeGuide()).toBe(false);

      const welcomeEl = createTestContainer("welcome-modal");
      const aboutEl = createTestContainer("about-drawer");
      let aboutOpenedSection: string | undefined;
      let welcomeDismissed = false;

      renderWelcomeModal(
        welcomeEl,
        true,
        () => {
          welcomeDismissed = true;
        },
        (section) => {
          aboutOpenedSection = section;
          renderAbout(aboutEl, true, vi.fn(), vi.fn());
        },
        vi.fn()
      );

      // Verify Welcome Modal renders all 4 civic capabilities + Project NOAH disclaimer
      expect(welcomeEl.style.display).toBe("flex");
      expect(welcomeEl.innerHTML).toContain("Brownout Schedules");
      expect(welcomeEl.innerHTML).toContain("Earthquakes, Storms &amp; Air Quality");
      expect(welcomeEl.innerHTML).toContain("Works on Weak Signal (Offline PWA)");
      expect(welcomeEl.innerHTML).toContain("Flood Susceptibility (Project NOAH)");
      expect(welcomeEl.innerHTML).toContain("UP Project NOAH 100-year susceptibility simulations");

      // User taps the 24/7 Emergency Hotlines card
      const hotlinesCard = welcomeEl.querySelector("#welcome-card-hotlines");
      expect(hotlinesCard).not.toBeNull();
      hotlinesCard.click();

      // Verify Welcome Modal marks itself seen, dismisses, and opens About Drawer at 'hotlines'
      expect(hasSeenWelcomeGuide()).toBe(true);
      expect(welcomeDismissed).toBe(true);
      expect(aboutOpenedSection).toBe("hotlines");

      // Verify About Drawer contains all 7 Authoritative Data Sources & Emergency Hotlines
      expect(aboutEl.classList.contains("open")).toBe(true);
      expect(aboutEl.innerHTML).toContain("Visayan Electric (VECO)");
      expect(aboutEl.innerHTML).toContain("DOST-PHIVOLCS");
      expect(aboutEl.innerHTML).toContain("DOST-PAGASA");
      expect(aboutEl.innerHTML).toContain("Open-Meteo");
      expect(aboutEl.innerHTML).toContain("OpenStreetMap Contributors");
      expect(aboutEl.innerHTML).toContain("CARTO Basemaps");
      expect(aboutEl.innerHTML).toContain("UP Project NOAH");
      expect(aboutEl.innerHTML).toContain("ODC-ODbL");
      expect(aboutEl.innerHTML).toContain(ABOUT_METADATA.githubUrl);

      for (const hotline of CEBU_EMERGENCY_HOTLINES) {
        expect(aboutEl.innerHTML).toContain(hotline.name);
        expect(aboutEl.innerHTML).toContain(hotline.displayPhone);
      }
    });
  });

  // =========================================================================
  // SCENARIO 2: MULTI-BARANGAY PINNING & OUTAGE STATUS TRACKING
  // =========================================================================
  describe("Scenario 2: Multi-Barangay Pinning, Outage Status Calculation & Purpose-Line Guard", () => {
    it("tracks up to 3 pinned barangays, alerts on real outages, and ignores purpose-only feeder mentions", () => {
      clearAllFavorites();
      expect(getFavorites()).toEqual([]);

      // User pins Banilad, Lahug, and Mabolo
      setMyBarangay("Banilad");
      addFavorite("Lahug");
      addFavorite("Mabolo");
      expect(getFavorites()).toEqual(["Banilad", "Lahug", "Mabolo"]);
      expect(getMyBarangay()).toBe("Banilad");

      // Attempting to add a 4th beyond MAX_FAVORITES (3) returns false
      expect(addFavorite("Talamban")).toBe(false);

      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);

      const advisories: PowerAdvisory[] = [
        // Advisory 1: Only mentions "Banilad" in the purpose line (actual outage is in Talamban)
        {
          id: "adv-purpose-only",
          source_url: "https://veco.com.ph",
          fetched_at: now.toISOString(),
          advisory_week_start: todayIso,
          date: todayIso,
          start_time: "09:00",
          end_time: "17:00",
          overnight_span: false,
          duration_hours: 8,
          purpose: "To facilitate pole relocation along Banilad highway feeder",
          city: "Cebu City",
          barangay: ["Talamban"],
          streets: ["Gov. M. Cuenco Ave"],
          areas_affected_raw: "Portions of Brgy. Talamban, Cebu City",
          lat: 10.369,
          lon: 123.916,
          coordinate_source: "osm_point",
          geocode_query: null,
          geocode_provider: null,
          business_confidence: "scheduled",
          parse_confidence: "high",
          parse_notes: null,
        },
        // Advisory 2: Genuine scheduled outage in Lahug
        {
          id: "adv-lahug-real",
          source_url: "https://veco.com.ph",
          fetched_at: now.toISOString(),
          advisory_week_start: todayIso,
          date: todayIso,
          start_time: "08:00",
          end_time: "16:00",
          overnight_span: false,
          duration_hours: 8,
          purpose: "Line upgrading works",
          city: "Cebu City",
          barangay: ["Lahug"],
          streets: ["Salinas Drive", "Gorordo Ave"],
          areas_affected_raw: "Portions of Brgy. Lahug (Salinas Drive, Gorordo Ave), Cebu City",
          lat: 10.332,
          lon: 123.898,
          coordinate_source: "osm_point",
          geocode_query: null,
          geocode_provider: null,
          business_confidence: "scheduled",
          parse_confidence: "high",
          parse_notes: null,
        },
      ];

      // Banilad should NOT be flagged by the Talamban advisory's purpose line
      const baniladStatus = getMyBarangayStatus("Banilad", advisories);
      expect(baniladStatus.hasAdvisories).toBe(false);
      expect(baniladStatus.count).toBe(0);

      // Lahug SHOULD be flagged as affected
      const lahugStatus = getMyBarangayStatus("Lahug", advisories);
      expect(lahugStatus.hasAdvisories).toBe(true);
      expect(lahugStatus.count).toBe(1);
      expect(lahugStatus.advisories[0].id).toBe("adv-lahug-real");

      // Removing a favorite updates the list cleanly
      removeFavorite("Banilad");
      expect(getFavorites()).toEqual(["Lahug", "Mabolo"]);
      expect(getMyBarangay()).toBe("Lahug");
    });
  });

  // =========================================================================
  // SCENARIO 3: SEVERE TYPHOON & COMPOUND HAZARD EMERGENCY
  // =========================================================================
  describe("Scenario 3: Severe Typhoon & Compound Hazard Emergency (PAGASA + Project NOAH Overlay)", () => {
    it("surfaces urgent TCWS & Heavy Rainfall alerts, activates Flood Risk controls, and renders legend depth tiers", () => {
      const bannerEl = createTestContainer("urgent-banner");
      let forecastOpened = false;

      // 1. Active Tropical Cyclone Signal #2 over Cebu
      const typhoonBulletin: PagasaBulletin = {
        has_active_cyclone: true,
        cyclone_name: " Basyang <script> ",
        tcws_cebu: {
          active: true,
          signal_level: 2,
          wind_speed_kmh: "62–88 km/h",
          areas: ["Metro Cebu", "Northern Cebu"],
        },
        heavy_rainfall_alert: {
          level: "orange",
          areas: ["Cebu Province"],
          impacts: "Flooding is threatening in low-lying river basins.",
        },
        issued_at_pst: new Date().toISOString(),
        source_url: "https://bagong.pagasa.dost.gov.ph",
        scraped_at: new Date().toISOString(),
      };

      renderUrgentAlertBanner(bannerEl, typhoonBulletin, () => {
        forecastOpened = true;
      });

      expect(bannerEl.style.display).toBe("block");
      expect(bannerEl.innerHTML).toContain("TCWS SIGNAL #2");
      expect(bannerEl.innerHTML).toContain("Basyang &lt;script&gt;"); // XSS escaped
      expect(bannerEl.innerHTML).toContain("62–88 km/h");

      bannerEl.querySelector("#btn-urgent-forecast-action")?.click();
      expect(forecastOpened).toBe(true);

      // 2. User activates Project NOAH Flood Risk layer in Map Controls
      const controlsEl = createTestContainer("map-controls");
      let floodToggledCount = 0;

      renderMapControls(
        controlsEl,
        "both",
        {
          onSearchChange: vi.fn(),
          onLocateUser: vi.fn(),
          onLayerChange: vi.fn(),
          onToast: vi.fn(),
          onFloodHazardToggle: () => {
            floodToggledCount++;
          },
        },
        {
          isFloodHazardActive: true,
        }
      );

      expect(controlsEl.innerHTML).toContain("Flood Risk");
      const floodBtn = controlsEl.querySelector("#btn-toggle-flood-hazard");
      expect(floodBtn).not.toBeNull();
      expect(floodBtn.getAttribute("aria-pressed")).toBe("true");
      floodBtn.click();
      expect(floodToggledCount).toBe(1);

      // 3. Legend Drawer displays all 3 Project NOAH Flood Susceptibility depth tiers
      const legendEl = createTestContainer("legend-drawer");
      renderLegend(legendEl, true, vi.fn(), false, vi.fn());
      expect(legendEl.innerHTML).toContain("Flood Susceptibility (Project NOAH)");
      expect(legendEl.innerHTML).toContain("Low Hazard (0 – 0.5m)");
      expect(legendEl.innerHTML).toContain("Medium Hazard (0.5 – 1.5m)");
      expect(legendEl.innerHTML).toContain("High Hazard (&gt; 1.5m)");
      expect(legendEl.innerHTML).toContain(FLOOD_HAZARD_STYLES[1].hex);
      expect(legendEl.innerHTML).toContain(FLOOD_HAZARD_STYLES[2].hex);
      expect(legendEl.innerHTML).toContain(FLOOD_HAZARD_STYLES[3].hex);
    });
  });

  // =========================================================================
  // SCENARIO 4: PROVINCE-WIDE PANNING & DYNAMIC REGIONAL FLOOD LOADING
  // =========================================================================
  describe("Scenario 4: Province-Wide Panning & Dynamic Regional Flood Loading (Metro, North & South Cebu)", () => {
    it("dynamically loads Metro, North, and South Cebu GeoJSON chunks on pan and verifies San Fernando & Aloguinsan coverage", async () => {
      const dataDir = join(process.cwd(), "public", "data");
      const localDiskFetch = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        const fileName = urlStr.split("/").pop()!;
        const fullPath = join(dataDir, fileName);
        if (!existsSync(fullPath)) {
          return { ok: false, status: 404 } as Response;
        }
        const json = JSON.parse(readFileSync(fullPath, "utf-8"));
        return {
          ok: true,
          status: 200,
          json: async () => json,
        } as Response;
      });

      const mapCtrl = new MapController("map-container");

      // Step 1: Initial Viewport in Metro Cebu (Cebu City / Mandaue)
      dummyMapInstance._setTestBounds({
        north: 10.38,
        south: 10.26,
        east: 123.98,
        west: 123.82,
      });
      const metroRegions = getRegionsForBounds(mapCtrl.getBounds());
      expect(metroRegions).toContain("metro");

      const metroData = await fetchFloodHazards("metro", localDiskFetch as any);
      mapCtrl.renderFloodHazards(metroData, "metro");
      mapCtrl.setFloodLayerVisibility(true);
      expect(mapCtrl.isFloodLayerVisible()).toBe(true);
      expect(mapCtrl.isFloodRegionLoaded("metro")).toBe(true);
      expect(mapCtrl.isFloodRegionLoaded("north")).toBe(false);
      expect(mapCtrl.isFloodRegionLoaded("south")).toBe(false);

      // Step 2: User pans North to Bogo, Medellin & Bantayan Island
      dummyMapInstance._setTestBounds({
        north: 11.25,
        south: 10.65,
        east: 124.10,
        west: 123.75,
      });
      const northRegions = getRegionsForBounds(mapCtrl.getBounds());
      expect(northRegions).toContain("north");

      const northData = await fetchFloodHazards("north", localDiskFetch as any);
      mapCtrl.renderFloodHazards(northData, "north");
      expect(mapCtrl.isFloodRegionLoaded("north")).toBe(true);

      // Step 3: User pans South to San Fernando, Aloguinsan, Carcar, and Oslob
      dummyMapInstance._setTestBounds({
        north: 10.24,
        south: 9.85,
        east: 123.74,
        west: 123.45,
      });
      const southRegions = getRegionsForBounds(mapCtrl.getBounds());
      expect(southRegions).toContain("south");

      const southData = await fetchFloodHazards("south", localDiskFetch as any);
      mapCtrl.renderFloodHazards(southData, "south");
      expect(mapCtrl.isFloodRegionLoaded("south")).toBe(true);
      expect(getLoadedFloodRegions()).toEqual(["metro", "north", "south"]);
      expect(mapCtrl.getLoadedFloodRegions()).toEqual(["metro", "north", "south"]);

      // Verify San Fernando & Aloguinsan corridor (lat 10.14 - 10.23, lon 123.48 - 123.72) has real flood features
      const sanFernandoAloguinsanFeatures = southData.features.filter((f) => {
        const ring =
          f.geometry.type === "Polygon"
            ? (f.geometry.coordinates[0] as number[][])
            : (f.geometry.coordinates[0][0] as number[][]);
        const [lon, lat] = ring[0];
        return lat >= 10.14 && lat <= 10.23 && lon >= 123.48 && lon <= 123.72;
      });
      expect(sanFernandoAloguinsanFeatures.length).toBeGreaterThanOrEqual(8);

      // Verify all 3 regional chunks stay strictly under the 400 KB mobile budget
      for (const file of ["cebu-flood-metro.geojson", "cebu-flood-north.geojson", "cebu-flood-south.geojson"]) {
        const sizeBytes = statSync(join(dataDir, file)).size;
        expect(sizeBytes).toBeLessThan(400 * 1024);
      }

      // Step 4: Toggling Flood Visibility OFF removes layer group without losing cached regions
      mapCtrl.setFloodLayerVisibility(false);
      expect(mapCtrl.isFloodLayerVisible()).toBe(false);
      expect(mapCtrl.isFloodRegionLoaded("metro")).toBe(true);
      expect(mapCtrl.isFloodRegionLoaded("north")).toBe(true);
      expect(mapCtrl.isFloodRegionLoaded("south")).toBe(true);
      expect(getCachedFloodHazards("south")?.features.length).toBe(southData.features.length);
    });
  });

  // =========================================================================
  // SCENARIO 5: SEISMIC CRISIS — MAJOR QUAKES VS. MICROQUAKES FILTERING
  // =========================================================================
  describe("Scenario 5: Seismic Crisis — Major Earthquake vs. Distant Microquakes Filtering", () => {
    it("renders significant earthquakes immediately while filtering out distant microquakes until toggled", () => {
      const mapCtrl = new MapController("map-container");
      const listEl = createTestContainer("list-view");
      const nowIso = new Date().toISOString();

      const quakes: EarthquakeEvent[] = [
        {
          id: "eq-major-danao",
          source_url: "https://earthquake.phivolcs.dost.gov.ph",
          fetched_at: nowIso,
          datetime_pst: nowIso,
          datetime_utc: nowIso,
          lat: 10.52,
          lon: 124.02,
          coordinate_source: "bulletin",
          location_description: "005 km N 45° E of Danao City (Cebu)",
          nearest_town: "Danao City",
          nearest_province: "Cebu",
          depth_km: 8,
          magnitude: 5.4,
          magnitude_type: "Mw",
          origin_type: "TECTONIC",
          reported_intensities: "Intensity V - Danao City, Cebu City",
          expecting_damage: true,
          expecting_aftershocks: true,
          issued_on_pst: nowIso,
          distance_from_cebu_km: 24.5,
          within_watch_radius: true,
          parse_confidence: "high",
          parse_notes: null,
        },
        {
          id: "eq-distant-micro",
          source_url: "https://earthquake.phivolcs.dost.gov.ph",
          fetched_at: nowIso,
          datetime_pst: nowIso,
          datetime_utc: nowIso,
          lat: 9.10,
          lon: 122.80,
          coordinate_source: "bulletin",
          location_description: "042 km S 12° W of Bayawan City (Negros Oriental)",
          nearest_town: "Bayawan City",
          nearest_province: "Negros Oriental",
          depth_km: 35,
          magnitude: 2.1,
          magnitude_type: "Ms",
          origin_type: "TECTONIC",
          reported_intensities: null,
          expecting_damage: false,
          expecting_aftershocks: false,
          issued_on_pst: nowIso,
          distance_from_cebu_km: 175.0,
          within_watch_radius: true,
          parse_confidence: "high",
          parse_notes: null,
        },
      ];

      // 1. Default: showMicroQuakes = false -> Only the M5.4 Danao quake is shown
      capturedMarkers.length = 0;
      const filterHideMicro: FilterState = {
        selectedDate: "all",
        minMagnitude: 0,
        searchQuery: "",
        showMicroQuakes: false,
      };
      mapCtrl.renderEarthquakeEvents(quakes, filterHideMicro);
      expect(capturedMarkers.length).toBe(1);

      renderListView(listEl, "earthquakes", [], quakes, filterHideMicro, {
        onSelectAdvisory: vi.fn(),
      });
      expect(listEl.innerHTML).toContain("Danao City");
      expect(listEl.innerHTML).not.toContain("Bayawan City");

      // 2. Toggled: showMicroQuakes = true -> Both M5.4 and M2.1 quakes are shown
      capturedMarkers.length = 0;
      const filterShowMicro: FilterState = {
        selectedDate: "all",
        minMagnitude: 0,
        searchQuery: "",
        showMicroQuakes: true,
      };
      mapCtrl.renderEarthquakeEvents(quakes, filterShowMicro);
      expect(capturedMarkers.length).toBe(2);

      renderListView(listEl, "earthquakes", [], quakes, filterShowMicro, {
        onSelectAdvisory: vi.fn(),
      });
      expect(listEl.innerHTML).toContain("Danao City");
      expect(listEl.innerHTML).toContain("Bayawan City");
    });
  });

  // =========================================================================
  // SCENARIO 6: 3-TIER HYBRID LOCATION SEARCH & GAZETTEER RESOLUTION
  // =========================================================================
  describe("Scenario 6: 3-Tier Hybrid Location Search & Offline Gazetteer Resolution", () => {
    it("resolves Tier 1 active advisories, Tier 2 offline barangays/towns/landmarks, and autocomplete suggestions", async () => {
      const mapCtrl = new MapController("map-container");
      const nowIso = new Date().toISOString();
      const todayIso = nowIso.slice(0, 10);

      const powerAdvisories: PowerAdvisory[] = [
        {
          id: "adv-apas",
          source_url: "https://veco.com.ph",
          fetched_at: nowIso,
          advisory_week_start: todayIso,
          date: todayIso,
          start_time: "10:00",
          end_time: "14:00",
          overnight_span: false,
          duration_hours: 4,
          purpose: "Line maintenance",
          city: "Cebu City",
          barangay: ["Apas"],
          streets: ["Salinas Drive"],
          areas_affected_raw: "Portions of Brgy. Apas, Cebu City",
          lat: 10.330,
          lon: 123.906,
          coordinate_source: "osm_point",
          geocode_query: null,
          geocode_provider: null,
          business_confidence: "scheduled",
          parse_confidence: "high",
          parse_notes: null,
        },
      ];

      // Tier 1: Matches active power advisory in Apas
      const tier1Res = await mapCtrl.searchAndZoom("Apas", powerAdvisories, []);
      expect(tier1Res.found).toBe(true);
      expect(tier1Res.tier).toBe(1);

      // Tier 2: Resolves offline Cebu towns & landmarks without any network call
      for (const town of ["San Fernando", "Aloguinsan", "Carcar", "Bogo", "Cebu IT Park"]) {
        const loc = lookupCebuLocation(town);
        expect(loc).not.toBeNull();
        expect(getRegionForCoordinates(loc!.lat, loc!.lon)).toMatch(/^(metro|north|south)$/);
      }

      const tier2Res = await mapCtrl.searchAndZoom("San Fernando", powerAdvisories, []);
      expect(tier2Res.found).toBe(true);
      expect(tier2Res.tier).toBe(2);

      // Search suggestions return fast prefix matches
      const suggestions = getCebuSearchSuggestions("Ban", new Set(["Banilad"]), 5);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.name.toLowerCase().includes("banilad"))).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 7: ATMOSPHERIC & WEATHER INTELLIGENCE DRAWERS
  // =========================================================================
  describe("Scenario 7: Atmospheric & Weather Intelligence (Air Quality Index + 24-Hour Forecast Drawers)", () => {
    it("categorizes AQI readings per DENR/EPA standards and renders both Air Quality and Hourly Forecast drawers", () => {
      // Verify all 6 AQI tiers including WCAG AA contrast on Moderate Yellow
      expect(computeAqiCategory(25).category).toBe("good");
      expect(computeAqiCategory(75)).toEqual({
        category: "moderate",
        label: "Moderate",
        hex: "#EAB308",
        contrastColor: "#0F172A",
      });
      expect(computeAqiCategory(125).category).toBe("sensitive");
      expect(computeAqiCategory(175).category).toBe("unhealthy");
      expect(computeAqiCategory(250).category).toBe("acutely_unhealthy");
      expect(computeAqiCategory(350).category).toBe("emergency");

      // Render Air Quality Drawer with Wildfire Haze signature
      const airEl = createTestContainer("air-drawer");
      const mockAirReading: AirQualityReading = {
        aqi: 142,
        category: "sensitive",
        categoryLabel: "Sensitive Groups",
        contrastColor: "#FFFFFF",
        hex: "#F97316",
        pm2_5: 52.4,
        pm2_5Desc: "Elevated fine particulates",
        pm10: 88.1,
        pm10Desc: "Elevated coarse dust",
        carbonMonoxide: 410,
        carbonMonoxideDesc: "Elevated CO",
        aerosolOpticalDepth: 0.85,
        aerosolOpticalDepthDesc: "Dense haze plume",
        isWildfireHazeDetected: true,
        healthAdvisory: {
          headline: "Unhealthy for Sensitive Groups",
          actionableGuidance: "Limit prolonged outdoor exertion.",
          maskRecommendation: "KN95/N95 mask recommended outdoors.",
          vulnerableGroupWarning: "Asthma and elderly residents should stay indoors.",
        },
        fetchedAt: new Date().toISOString(),
        observationTimePst: "2:00 PM PST",
        isFallback: false,
        isStale: false,
      };

      renderAirQualityDrawer(airEl, mockAirReading, true, vi.fn());
      expect(airEl.innerHTML).toContain("142");
      expect(airEl.innerHTML).toContain("52.4");
      expect(airEl.innerHTML).toContain("KN95/N95");
      expect(airEl.innerHTML).toContain("Smoke Haze Detected");

      // Render 24-Hour Weather Forecast Drawer
      const forecastEl = createTestContainer("forecast-drawer");
      const mockForecast: ForecastResult = {
        status: "success",
        fetchedAt: new Date().toISOString(),
        currentTempC: 31,
        entries: [
          {
            time: "2026-11-04T14:00",
            hourLabel: "2 PM",
            hour24: 14,
            isCurrentHour: true,
            precipitationProbability: 80,
            precipitationMm: 4.5,
            cloudCoverPercent: 90,
            windSpeedKmh: 28,
            weatherCode: 95,
            icon: getWeatherCodeInfo(95).icon,
            description: getWeatherCodeInfo(95).description,
          },
        ],
      };

      renderForecastDrawer(forecastEl, mockForecast, true, vi.fn(), null);
      expect(forecastEl.innerHTML).toContain("NOW");
      expect(forecastEl.innerHTML).toContain("2 PM");
      expect(forecastEl.innerHTML).toContain("80%");
      expect(forecastEl.innerHTML).toContain("28<small>km/h</small>");
    });
  });

  // =========================================================================
  // SCENARIO 8: OFFLINE / WEAK SIGNAL RESILIENCE
  // =========================================================================
  describe("Scenario 8: Offline / Weak Signal Resilience (PWA Fallback & Network Transitions)", () => {
    it("displays the offline banner when disconnected and recovers failed regional flood fetches on retry", async () => {
      const offlineEl = createTestContainer("offline-banner");

      // Offline state (isOnline = false)
      renderOfflineBanner(offlineEl, false);
      expect(offlineEl.style.display).toBe("block");
      expect(offlineEl.innerHTML).toContain("Offline Mode — Serving Cached Advisories");

      // Online recovery (isOnline = true) removes banner
      renderOfflineBanner(offlineEl, true);
      expect(offlineEl.style.display).toBe("none");

      // Simulate transient network failure during flood hazard fetch followed by successful retry
      resetFloodHazardsCache();
      let attempt = 0;
      const flakyFetch = vi.fn(async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error("Network disconnected");
        }
        return {
          ok: true,
          status: 200,
          json: async () =>
            ({
              type: "FeatureCollection",
              metadata: {
                source: "Project NOAH",
                return_period: "100-Year",
                license: "ODC-ODbL",
                region: "metro",
              },
              features: [],
            }) satisfies FloodHazardCollection,
        } as Response;
      });

      await expect(fetchFloodHazards("metro", flakyFetch as any)).rejects.toThrow("Network disconnected");
      const recovered = await fetchFloodHazards("metro", flakyFetch as any);
      expect(recovered.type).toBe("FeatureCollection");
      expect(flakyFetch).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // SCENARIO 9: MOBILE ERGONOMICS & COMPACT VIEWPORT ADAPTATION
  // =========================================================================
  describe("Scenario 9: Mobile Ergonomics & Compact Viewport Adaptation", () => {
    it("renders Mobile Bottom Action Bar, Consolidated Status Popover, and Day Tabs cleanly", () => {
      const bottomBarEl = createTestContainer("mobile-bottom-bar");
      const popoverEl = createTestContainer("status-popover");
      const dayTabsEl = createTestContainer("day-tabs");

      let toggledDrawer = "";
      renderMobileBottomBar(
        bottomBarEl,
        {
          isForecastOpen: false,
          isAirOpen: false,
          isLegendOpen: true,
          isAboutOpen: false,
        },
        {
          onForecastToggle: () => {
            toggledDrawer = "forecast";
          },
          onAirQualityToggle: () => {
            toggledDrawer = "air";
          },
          onLegendToggle: () => {
            toggledDrawer = "legend";
          },
          onAboutToggle: () => {
            toggledDrawer = "about";
          },
        }
      );

      expect(bottomBarEl.innerHTML).toContain("Forecast");
      expect(bottomBarEl.innerHTML).toContain("Legend");
      bottomBarEl.querySelector("#btn-bottom-forecast")?.click();
      expect(toggledDrawer).toBe("forecast");

      // Status Popover
      const powerFeed: FeedState<PowerAdvisory[]> = {
        status: "success",
        dataSource: "live",
        fetchedAt: new Date().toISOString(),
        data: [],
      };
      const eqFeed: FeedState<EarthquakeEvent[]> = {
        status: "success",
        dataSource: "live",
        fetchedAt: new Date().toISOString(),
        data: [],
      };

      renderStatusPopover(popoverEl, true, powerFeed, eqFeed, null, vi.fn(), null);
      expect(popoverEl.classList.contains("open")).toBe(true);
      expect(popoverEl.innerHTML).toContain("Visayan Electric");
      expect(popoverEl.innerHTML).toContain("PHIVOLCS");

      // Day Tabs
      renderDayTabs(dayTabsEl, [], "all", vi.fn());
      expect(dayTabsEl.innerHTML).toContain("All Week");
    });
  });

  // =========================================================================
  // SCENARIO 10: UPSTREAM PARSER RESILIENCE, SECURITY & BUNDLE INTEGRITY
  // =========================================================================
  describe("Scenario 10: Upstream Parser Resilience, Security Sanitization & Client Bundle Integrity", () => {
    it("safely parses hostile upstream HTML, neutralizes XSS vectors, and enforces zero Node.js imports in src/ui/", () => {
      // 1. XSS neutralization
      const malicious = `<img src=x onerror="alert('xss')"><script>evil()</script>`;
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain("<script>");
      expect(escaped).toContain("&lt;script&gt;");

      // 2. VECO time & street parser resilience
      const timeRange = parseVECOTimeRange("8:00 AM to 4:00 PM (8hrs)");
      expect(timeRange?.start_time).toBe("08:00");
      expect(timeRange?.end_time).toBe("16:00");
      expect(extractStreets("Portions of Salinas Drive, Gorordo Ave; and JY Square")).toContain("Salinas Drive");

      // 3. Malformed HTML buffers in VECO & PHIVOLCS parsers do not crash
      expect(() =>
        parsePostHtml("<div>Unclosed garbage<<<script>", "https://veco.com.ph", new Date().toISOString())
      ).not.toThrow();
      expect(() =>
        parseBulletinHtml("<table><tr><td>Corrupted bulletin", "https://phivolcs.dost.gov.ph", new Date().toISOString())
      ).not.toThrow();

      // 4. Unknown Flood Hazard Var codes fall back safely to Low Hazard (Var 1)
      expect(getFloodHazardStyle(999).varCode).toBe(1);
      expect(getFloodHazardStyle(null).varCode).toBe(1);

      // 5. Client Bundle Guard: Zero Node built-in imports in src/ui/
      const uiDir = join(process.cwd(), "src", "ui");
      const scanFiles = (dir: string): string[] => {
        const entries = readdirSync(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory()) files.push(...scanFiles(full));
          else if (e.isFile() && e.name.endsWith(".ts")) files.push(full);
        }
        return files;
      };

      const forbiddenModules = ["fs", "path", "crypto", "zlib", "child_process", "http", "https", "os"];
      for (const file of scanFiles(uiDir)) {
        const content = readFileSync(file, "utf-8");
        for (const mod of forbiddenModules) {
          const regex = new RegExp(`from\\s+["'](node:)?${mod}["']`);
          expect(regex.test(content)).toBe(false);
        }
      }
    });
  });
});
