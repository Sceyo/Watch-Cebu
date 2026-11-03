import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FloodHazardCollection } from "../../src/ui/types.js";

const { dummyMapInstance, capturedGeoJsonCalls, capturedPopups } = vi.hoisted(() => {
  const dummyMap: any = {
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    setView: vi.fn(),
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
      getNorth: () => 10.50,
      getSouth: () => 10.20,
      getEast: () => 124.05,
      getWest: () => 123.75,
    })),
  };

  return {
    dummyMapInstance: dummyMap,
    capturedGeoJsonCalls: [] as any[],
    capturedPopups: [] as any[],
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
      latLngBounds: vi.fn(() => ({
        isValid: () => true,
        getCenter: () => ({ lat: 10.33, lng: 123.90 }),
      })),
      point: vi.fn((x, y) => ({ x, y })),
      divIcon: vi.fn((opts) => opts || {}),
      marker: vi.fn().mockReturnValue({
        on: vi.fn(),
        bindPopup: vi.fn(),
      }),
      circleMarker: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      circle: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      featureGroup: vi.fn().mockReturnValue({
        getBounds: vi.fn().mockReturnValue({ isValid: () => false }),
      }),
    },
  };
});

import { MapController } from "../../src/ui/map/mapController.js";

describe("MapController Regional Flood Hazard Multi-Layer Management", () => {
  beforeEach(() => {
    capturedGeoJsonCalls.length = 0;
    capturedPopups.length = 0;
  });

  const metroData: FloodHazardCollection = {
    type: "FeatureCollection",
    metadata: {
      source: "Project NOAH",
      return_period: "100-Year",
      license: "ODC-ODbL",
      region: "metro",
    },
    features: [
      {
        type: "Feature",
        properties: { Var: 3, hazard_level: "High", return_period: "100-Year" },
        geometry: { type: "Polygon", coordinates: [[[123.9, 10.3], [123.91, 10.3], [123.91, 10.31], [123.9, 10.3]]] },
      },
    ],
  };

  const northData: FloodHazardCollection = {
    type: "FeatureCollection",
    metadata: {
      source: "Project NOAH",
      return_period: "100-Year",
      license: "ODC-ODbL",
      region: "north",
    },
    features: [
      {
        type: "Feature",
        properties: { Var: 2, hazard_level: "Medium", return_period: "100-Year" },
        geometry: { type: "Polygon", coordinates: [[[124.0, 10.5], [124.01, 10.5], [124.01, 10.51], [124.0, 10.5]]] },
      },
    ],
  };

  it("renders multiple regions incrementally without wiping existing layers and tracks loaded regions", () => {
    const controller = new MapController("map");
    expect(controller.getLoadedFloodRegions()).toEqual([]);

    // 1. Render Metro
    controller.renderFloodHazards(metroData, "metro");
    expect(controller.isFloodRegionLoaded("metro")).toBe(true);
    expect(controller.isFloodRegionLoaded("north")).toBe(false);
    expect(controller.getLoadedFloodRegions()).toEqual(["metro"]);
    expect(capturedGeoJsonCalls).toHaveLength(1);

    // 2. Redundant call for Metro should be a no-op (deduplicated)
    controller.renderFloodHazards(metroData, "metro");
    expect(capturedGeoJsonCalls).toHaveLength(1);

    // 3. Render North alongside Metro
    controller.renderFloodHazards(northData, "north");
    expect(controller.isFloodRegionLoaded("metro")).toBe(true);
    expect(controller.isFloodRegionLoaded("north")).toBe(true);
    expect(controller.getLoadedFloodRegions()).toEqual(["metro", "north"]);
    expect(capturedGeoJsonCalls).toHaveLength(2);

    // 4. Check popup naming for regional chunk
    expect(capturedPopups[0].html).toContain("Metro Cebu Inundation Zone");
    expect(capturedPopups[1].html).toContain("North Cebu Inundation Zone");

    // 5. clearFloodHazards resets both layer and region tracking
    controller.clearFloodHazards();
    expect(controller.getLoadedFloodRegions()).toEqual([]);
    expect(controller.isFloodRegionLoaded("metro")).toBe(false);
    expect(controller.isFloodRegionLoaded("north")).toBe(false);
  });

  it("exposes map bounds and moveend subscription", () => {
    const controller = new MapController("map");
    const bounds = controller.getBounds();
    expect(bounds.getNorth()).toBe(10.50);

    const moveEndCallback = vi.fn();
    const unsubscribe = controller.onMoveEnd(moveEndCallback);
    expect(dummyMapInstance.on).toHaveBeenCalledWith("moveend", moveEndCallback);

    unsubscribe();
    expect(dummyMapInstance.off).toHaveBeenCalledWith("moveend", moveEndCallback);
  });
});
