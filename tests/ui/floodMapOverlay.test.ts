import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FloodHazardCollection } from "../../src/ui/types.js";

const { dummyMapInstance, capturedGeoJsonOptions, capturedPopups } = vi.hoisted(() => {
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
  };

  return {
    dummyMapInstance: dummyMap,
    capturedGeoJsonOptions: [] as any[],
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
        capturedGeoJsonOptions.push(options);
        const subLayers: any[] = [];
        if (geojson && Array.isArray(geojson.features)) {
          for (const feature of geojson.features) {
            const layerMock = {
              feature,
              bindPopup: vi.fn((html: string) => {
                capturedPopups.push({ feature, html });
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

describe("MapController Project NOAH Flood Hazard Overlay", () => {
  beforeEach(() => {
    capturedGeoJsonOptions.length = 0;
    capturedPopups.length = 0;
  });

  const sampleFloodData: FloodHazardCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          Var: 3,
          hazard_level: "High",
          depth_range: "> 1.5m",
          return_period: "100-Year",
          zone_name: 'Mandaue <script>alert("xss")</script> Subangdaku',
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[123.92, 10.32], [123.93, 10.32], [123.93, 10.33], [123.92, 10.32]]],
        },
      },
    ],
  };

  it("renders flood polygons into floodHazardPane, sanitizes popup HTML, and preserves visibility across Power/Earthquake switches (Review Focus #4 & #5)", () => {
    const controller = new MapController("map");
    expect(controller.isFloodLayerVisible()).toBe(false);

    controller.setFloodLayerVisibility(true);
    controller.renderFloodHazards(sampleFloodData);
    expect(controller.isFloodLayerVisible()).toBe(true);

    // Switching primary pin layers must NOT hide the independent flood layer (Review Focus #4)
    controller.setLayerVisibility("power", false);
    expect(controller.isFloodLayerVisible()).toBe(true);
    controller.setLayerVisibility("earthquakes", false);
    expect(controller.isFloodLayerVisible()).toBe(true);
    controller.setLayerVisibility("both", false);
    expect(controller.isFloodLayerVisible()).toBe(true);

    // Verify geoJSON options specified floodHazardPane
    expect(capturedGeoJsonOptions.length).toBeGreaterThan(0);
    expect(capturedGeoJsonOptions[0].pane).toBe("floodHazardPane");

    // Inspect popup content for XSS sanitization and Project NOAH attribution (Review Focus #5)
    expect(capturedPopups.length).toBe(1);
    const popupHtml = capturedPopups[0].html;
    expect(popupHtml).toContain("High Hazard");
    expect(popupHtml).toContain("&gt; 1.5m");
    expect(popupHtml).toContain("100-Year Return Period");
    expect(popupHtml).toContain("Project NOAH");
    expect(popupHtml).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
    expect(popupHtml).not.toContain('<script>alert("xss")</script>');

    controller.setFloodLayerVisibility(false);
    expect(controller.isFloodLayerVisible()).toBe(false);
  });
});
