/**
 * Leaflet Map Controller for Watch Cebu.
 *
 * Implements Stage 3 requirements:
 * - Initializes map centered on Metro Cebu (10.3157, 123.8854).
 * - Independent LayerGroups: powerLayerGroup and earthquakeLayerGroup.
 * - Double-ring styling for manual_verified markers vs solid for osm_point.
 * - Popups with labeled "Location source:", verification_note, and direct source links.
 * - Earthquake markers sized and colored in violet/fuchsia with pulse animation for M6+.
 */

import L from "leaflet";
import type { PowerAdvisory, EarthquakeEvent } from "../../types/index.js";
import type { LayerSelection, FilterState } from "../types.js";
import { computePowerStatus, computeEarthquakeSeverity, renderEarthquakeMarkerSvg } from "./markerStyles.js";
import { formatPhilippineDateTime } from "../../utils/index.js";

export class MapController {
  private map: L.Map;
  private powerLayerGroup: L.LayerGroup;
  private earthquakeLayerGroup: L.LayerGroup;


  constructor(elementId: string) {
    // Metro Cebu coordinates (10.3157°N, 123.8854°E)
    // Viewport containment: bounded strictly to 300km watch radius around Cebu City (§2)
    this.map = L.map(elementId, {
      center: [10.3157, 123.8854],
      zoom: 11,
      minZoom: 7,
      maxBounds: L.latLngBounds([7.4, 120.9], [13.2, 126.9]),
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    });

    // Dark-themed tile layer (CartoDB Dark Matter)
    // Supports optional VITE_CARTO_API_KEY from .env / .env.local
    const cartoKey = (import.meta.env?.VITE_CARTO_API_KEY as string | undefined)?.trim();
    const keyParam = cartoKey ? `?key=${encodeURIComponent(cartoKey)}` : "";
    const tileUrl = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${keyParam}`;

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(this.map);

    // Zoom control at bottom-right for thumb accessibility
    L.control.zoom({ position: "bottomright" }).addTo(this.map);

    this.powerLayerGroup = L.layerGroup().addTo(this.map);
    this.earthquakeLayerGroup = L.layerGroup().addTo(this.map);
  }

  setLayerVisibility(selection: LayerSelection): void {
    if (selection === "power") {
      if (!this.map.hasLayer(this.powerLayerGroup)) this.map.addLayer(this.powerLayerGroup);
      if (this.map.hasLayer(this.earthquakeLayerGroup)) this.map.removeLayer(this.earthquakeLayerGroup);
    } else if (selection === "earthquakes") {
      if (this.map.hasLayer(this.powerLayerGroup)) this.map.removeLayer(this.powerLayerGroup);
      if (!this.map.hasLayer(this.earthquakeLayerGroup)) this.map.addLayer(this.earthquakeLayerGroup);
    } else {
      if (!this.map.hasLayer(this.powerLayerGroup)) this.map.addLayer(this.powerLayerGroup);
      if (!this.map.hasLayer(this.earthquakeLayerGroup)) this.map.addLayer(this.earthquakeLayerGroup);
    }
  }

  renderPowerAdvisories(advisories: PowerAdvisory[], filter: FilterState): void {
    this.powerLayerGroup.clearLayers();

    const filtered = advisories.filter((a) => {
      if (filter.selectedDate !== "all" && a.date !== filter.selectedDate) {
        return false;
      }
      return a.lat !== null && a.lon !== null;
    });

    for (const a of filtered) {
      if (a.lat === null || a.lon === null) continue;

      const status = computePowerStatus(a.date, a.start_time, a.end_time);
      const isManual = a.coordinate_source === "manual_verified";

      // SVG DivIcon representing either solid dot (osm_point) or double-ring (manual_verified)
      const ringClass = isManual ? "marker-ring-manual" : "marker-ring-osm";
      const html = `
        <div class="power-pin ${ringClass}" style="--pin-color: ${status.hex};">
          <div class="pin-inner"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([a.lat, a.lon], { icon: customIcon });

      // Build popup content with full provenance
      const barangayName = a.barangay.join(", ") || "Unspecified area";
      const streetsText = a.streets.length > 0 ? a.streets.join(", ") : (a.areas_affected_raw || "Not specified");
      const locationSourceLabel = isManual ? "Manually verified (SRP Administrative Spine)" : "OpenStreetMap node";
      
      let verificationNoteHtml = "";
      if (isManual) {
        verificationNoteHtml = `
          <div class="popup-provenance-note">
            <span class="note-tag">Provenance Note:</span>
            <span>South Reclamation Area is a 300-hectare special economic zone not designated as a separate PSA administrative barangay. Point anchored to the Cebu South Road Properties administrative spine (OSM Way 597926764).</span>
          </div>
        `;
      }

      const popupHtml = `
        <div class="popup-card power-popup">
          <div class="popup-header">
            <span class="popup-badge" style="background: ${status.hex}22; color: ${status.hex}; border: 1px solid ${status.hex}55;">
              ${status.label}
            </span>
            <span class="popup-city">${a.city}</span>
          </div>
          <h3 class="popup-title">${barangayName}</h3>
          
          <div class="popup-field-row">
            <span class="field-label">Date:</span>
            <span class="field-value">${a.date}</span>
          </div>
          <div class="popup-field-row">
            <span class="field-label">Time:</span>
            <span class="field-value">${a.start_time} – ${a.end_time} PST ${a.overnight_span ? "(Overnight)" : ""}</span>
          </div>
          <div class="popup-field-row popup-field-streets">
            <span class="field-label">Streets:</span>
            <span class="field-value">${streetsText}</span>
          </div>
          <div class="popup-purpose">
            <span class="field-label">Purpose:</span>
            <p>${a.purpose}</p>
          </div>

          <div class="popup-provenance-box">
            <div class="popup-field-row">
              <span class="field-label">Location source:</span>
              <span class="field-value source-highlight ${isManual ? "manual" : "osm"}">${locationSourceLabel}</span>
            </div>
            ${verificationNoteHtml}
          </div>

          <div class="popup-footer">
            <a href="${a.source_url}" target="_blank" rel="noopener noreferrer" class="source-link">
              Verify VECO Advisory Post ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 320 });
      this.powerLayerGroup.addLayer(marker);
    }
  }

  renderEarthquakeEvents(events: EarthquakeEvent[], filter: FilterState): void {
    this.earthquakeLayerGroup.clearLayers();

    const filtered = events.filter((e) => {
      if (filter.minMagnitude > 0 && e.magnitude < filter.minMagnitude) {
        return false;
      }
      return e.within_watch_radius;
    });

    for (const e of filtered) {
      const severity = computeEarthquakeSeverity(e.magnitude);
      const eqDate = formatPhilippineDateTime(e.datetime_pst);

      // Determine location label for the top wedge
      const locationLabel = e.nearest_town || e.location_description.replace(/.*of\s+/i, "").replace(/\(.*?\)/g, "").trim() || "Visayas";

      // Check if recent (< 48h) or significant (M4.0+)
      const isRecent = eqDate.relative !== null && !eqDate.relative.includes("d ago");
      const isRecentOrSignificant = severity.hasShockwave || e.magnitude >= 4.0 || isRecent;

      const html = renderEarthquakeMarkerSvg({
        magnitude: e.magnitude,
        locationLabel,
        isRecentOrSignificant,
        hex: severity.hex,
      });

      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html,
        iconSize: [64, 68],
        iconAnchor: [32, 48],
        popupAnchor: [0, -42],
      });

      const marker = L.marker([e.lat, e.lon], { icon: customIcon });

      const reportedIntensityText = e.reported_intensities ? e.reported_intensities : "Not reported";
      const damageText = e.expecting_damage ? "Yes (Assessments underway)" : "No";
      const aftershocksText = e.expecting_aftershocks ? "Yes" : "No";

      const popupHtml = `
        <div class="popup-card earthquake-popup">
          <div class="popup-header">
            <span class="popup-badge" style="background: ${severity.hex}22; color: ${severity.hex}; border: 1px solid ${severity.hex}55;">
              M${e.magnitude.toFixed(1)} ${e.magnitude_type || "ML"} · ${severity.label}
            </span>
            <span class="popup-city">${e.distance_from_cebu_km} km from Cebu</span>
          </div>
          <h3 class="popup-title">${e.location_description}</h3>

          <div class="popup-field-row">
            <span class="field-label">Date:</span>
            <span class="field-value">${eqDate.date} ${eqDate.relative ? `<span class="time-ago">(${eqDate.relative})</span>` : ""}</span>
          </div>
          <div class="popup-field-row">
            <span class="field-label">Time:</span>
            <span class="field-value">${eqDate.time}</span>
          </div>
          <div class="popup-field-row">
            <span class="field-label">Coordinates:</span>
            <span class="field-value">${e.lat.toFixed(2)}°N, ${e.lon.toFixed(2)}°E</span>
          </div>
          <div class="popup-field-row">
            <span class="field-label">Depth:</span>
            <span class="field-value">${e.depth_km} km (${e.origin_type})</span>
          </div>
          <div class="popup-field-row popup-field-intensities">
            <span class="field-label">Intensities:</span>
            <span class="field-value">${reportedIntensityText}</span>
          </div>
          <div class="popup-field-row">
            <span class="field-label">Damage Expected:</span>
            <span class="field-value">${damageText}</span>
          </div>
          <div class="popup-field-row">
            <span class="field-label">Aftershocks:</span>
            <span class="field-value">${aftershocksText}</span>
          </div>

          <div class="popup-provenance-box">
            <div class="popup-field-row">
              <span class="field-label">Location source:</span>
              <span class="field-value source-highlight bulletin">Official PHIVOLCS Bulletin</span>
            </div>
          </div>

          <div class="popup-footer">
            <a href="${e.source_url}" target="_blank" rel="noopener noreferrer" class="source-link">
              Verify PHIVOLCS Bulletin ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 320 });
      this.earthquakeLayerGroup.addLayer(marker);
    }
  }

  fitBoundsIfNotEmpty(): void {
    const activeLayers: L.Layer[] = [];
    if (this.map.hasLayer(this.powerLayerGroup)) {
      activeLayers.push(...this.powerLayerGroup.getLayers());
    }
    if (this.map.hasLayer(this.earthquakeLayerGroup)) {
      activeLayers.push(...this.earthquakeLayerGroup.getLayers());
    }
    if (activeLayers.length === 0) return;
    const featureGroup = L.featureGroup(activeLayers);
    const bounds = featureGroup.getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }
}
