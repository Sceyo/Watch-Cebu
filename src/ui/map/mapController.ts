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
import type { LayerSelection, FilterState, SelectedLocationDetails } from "../types.js";
import { computePowerStatus, computeEarthquakeSeverity, renderEarthquakeMarkerSvg, cleanTownName } from "./markerStyles.js";
import {
  formatPhilippineDateTime,
  formatReadableDate,
  formatPhilippineTimeRange,
  normalizeStreetList,
} from "../../utils/index.js";
import { ICONS } from "../components/icons.js";

export class MapController {
  private map: L.Map;
  private powerLayerGroup: L.LayerGroup;
  private earthquakeLayerGroup: L.LayerGroup;
  private onSelectLocation?: (details: SelectedLocationDetails) => void;
  private userLocationMarker?: L.CircleMarker;

  constructor(elementId: string) {
    // Metro Cebu coordinates (10.3157°N, 123.8854°E)
    // Default zoom 12 on desktop, 11 on mobile (H2)
    const initialZoom = typeof window !== "undefined" && window.innerWidth < 768 ? 11 : 12;

    this.map = L.map(elementId, {
      center: [10.3157, 123.8854],
      zoom: initialZoom,
      minZoom: 7,
      maxBounds: L.latLngBounds([6.2, 119.5], [14.6, 128.2]),
      maxBoundsViscosity: 0.85,
      zoomControl: false,
    });

    // Dark-themed tile layer (CartoDB Dark Matter)
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

  setOnSelectLocation(callback: (details: SelectedLocationDetails) => void): void {
    this.onSelectLocation = callback;
  }

  centerOnUser(coords: { lat: number; lon: number }): void {
    if (this.userLocationMarker) {
      this.map.removeLayer(this.userLocationMarker);
    }
    this.userLocationMarker = L.circleMarker([coords.lat, coords.lon], {
      radius: 9,
      fillColor: "#3B82F6",
      color: "#FFFFFF",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9,
      className: "user-gps-pulse-marker",
    }).addTo(this.map);

    this.map.setView([coords.lat, coords.lon], 14, { animate: true });
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

    const query = filter.searchQuery ? filter.searchQuery.toLowerCase() : "";

    const filtered = advisories.filter((a) => {
      if (!query && filter.selectedDate !== "all" && a.date !== filter.selectedDate) {
        return false;
      }
      if (a.lat === null || a.lon === null) {
        return false;
      }
      if (query) {
        const matchesBarangay = a.barangay.some((b) => b.toLowerCase().includes(query));
        const matchesCity = a.city.toLowerCase().includes(query);
        const matchesStreets = a.streets.some((s) => s.toLowerCase().includes(query));
        const matchesRaw = a.areas_affected_raw ? a.areas_affected_raw.toLowerCase().includes(query) : false;
        const matchesPurpose = a.purpose.toLowerCase().includes(query);
        if (!matchesBarangay && !matchesCity && !matchesStreets && !matchesRaw && !matchesPurpose) {
          return false;
        }
      }
      return true;
    });

    // Group by coordinates (5 decimal places) to resolve stacked pins (H1)
    const coordMap = new Map<string, PowerAdvisory[]>();
    for (const a of filtered) {
      if (a.lat === null || a.lon === null) continue;
      const key = `${a.lat.toFixed(5)},${a.lon.toFixed(5)}`;
      const list = coordMap.get(key) || [];
      list.push(a);
      coordMap.set(key, list);
    }

    const isMobileOrTouch = typeof window !== "undefined" && (window.innerWidth < 768 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

    for (const group of coordMap.values()) {
      const first = group[0];
      if (!first || first.lat === null || first.lon === null) continue;

      // Determine highest severity status in group (active > upcoming > later > restored)
      const priorityOrder: Record<string, number> = { active: 0, upcoming: 1, later: 2, restored: 3 };
      let bestStatus = computePowerStatus(first.date, first.start_time, first.end_time);
      let bestPriority = priorityOrder[bestStatus.category] ?? 99;

      for (const a of group) {
        const s = computePowerStatus(a.date, a.start_time, a.end_time);
        const p = priorityOrder[s.category] ?? 99;
        if (p < bestPriority) {
          bestPriority = p;
          bestStatus = s;
        }
      }

      const isManual = first.coordinate_source === "manual_verified";
      const ringClass = isManual ? "marker-ring-manual" : "marker-ring-osm";
      const multiCountBadge = group.length > 1 ? `<span class="pin-count-badge">${group.length}</span>` : "";
      const statusIcon = bestStatus.iconName ? ICONS[bestStatus.iconName] : "";

      const html = `
        <div class="power-pin ${ringClass} status-${bestStatus.category} ${group.length > 1 ? 'has-multi' : ''}" style="--pin-color: ${bestStatus.hex}; opacity: ${bestStatus.opacity ?? 1.0};">
          <div class="pin-inner">${statusIcon}</div>
          ${multiCountBadge}
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([first.lat, first.lon], { icon: customIcon });

      // Click behavior: on mobile/touch, open bottom sheet; on desktop, allow bound popup to open
      marker.on("click", (evt) => {
        const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));
        if (isMobile && this.onSelectLocation) {
          marker.closePopup();
          L.DomEvent.stopPropagation(evt);
          this.onSelectLocation({ type: "power", advisories: group });
        }
      });

      // Desktop popup content
      const barangayName = first.barangay.join(", ") || "Unspecified area";
      let popupBodyHtml = "";

      if (group.length === 1) {
        const a = group[0];
        const status = bestStatus;
        const cleanStreets = normalizeStreetList(a.streets);
        const streetsText = cleanStreets.length > 0 ? cleanStreets.join(", ") : (a.areas_affected_raw || "Not specified");
        const locationSourceLabel = isManual ? "Manually verified (SRP Administrative Spine)" : "OpenStreetMap node";
        const readableDate = formatReadableDate(a.date);
        const timeRangePht = formatPhilippineTimeRange(a.start_time, a.end_time, a.overnight_span);

        let verificationNoteHtml = "";
        if (isManual) {
          verificationNoteHtml = `
            <div class="popup-provenance-note">
              <span class="note-tag">Provenance Note:</span>
              <span>South Reclamation Area is a 300-hectare special economic zone not designated as a separate PSA administrative barangay. Point anchored to the Cebu South Road Properties administrative spine (OSM Way 597926764).</span>
            </div>
          `;
        }

        popupBodyHtml = `
          <div class="popup-card power-popup">
            <div class="popup-header">
              <span class="popup-badge" style="background: ${status.hex}22; color: ${status.hex}; border: 1px solid ${status.hex}55;">
                ${status.glyph ? status.glyph + ' ' : ''}${status.label}
              </span>
              <span class="popup-city">${a.city}</span>
            </div>
            <h3 class="popup-title">${barangayName}</h3>
            
            <div class="popup-field-row">
              <span class="field-label">Date:</span>
              <span class="field-value">${readableDate} <span style="font-size: 0.72rem; color: var(--text-muted);">(${a.date})</span></span>
            </div>
            <div class="popup-field-row">
              <span class="field-label">Time:</span>
              <span class="field-value">${timeRangePht}</span>
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
      } else {
        // Multi-advisory card
        let itemsHtml = "";
        for (let i = 0; i < group.length; i++) {
          const a = group[i];
          const status = computePowerStatus(a.date, a.start_time, a.end_time);
          const cleanStreets = normalizeStreetList(a.streets);
          const streetsText = cleanStreets.length > 0 ? cleanStreets.join(", ") : (a.areas_affected_raw || "Not specified");
          const readableDate = formatReadableDate(a.date);
          const timeRangePht = formatPhilippineTimeRange(a.start_time, a.end_time, a.overnight_span);

          itemsHtml += `
            <div class="popup-multi-item" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; margin-top: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="popup-badge" style="background: ${status.hex}22; color: ${status.hex}; border: 1px solid ${status.hex}55; font-size: 0.68rem; padding: 2px 6px;">
                  ${status.glyph ? status.glyph + ' ' : ''}${status.label}
                </span>
                <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${readableDate} · ${timeRangePht}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.35; margin-bottom: 4px;">
                <strong style="color: var(--text-primary);">Streets:</strong> ${streetsText}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.3;">
                ${a.purpose}
              </div>
              <div style="margin-top: 4px;">
                <a href="${a.source_url}" target="_blank" rel="noopener noreferrer" class="source-link" style="font-size: 0.7rem;">
                  Verify Post ↗
                </a>
              </div>
            </div>
          `;
        }

        popupBodyHtml = `
          <div class="popup-card power-popup multi-advisory-popup">
            <div class="popup-header">
              <span class="popup-badge" style="background: ${bestStatus.hex}22; color: ${bestStatus.hex}; border: 1px solid ${bestStatus.hex}55;">
                ${group.length} Advisories
              </span>
              <span class="popup-city">${first.city}</span>
            </div>
            <h3 class="popup-title">${barangayName}</h3>
            <p style="font-size: 0.72rem; color: var(--text-muted); margin: 0 0 6px 0;">Multiple scheduled interruptions at this location:</p>
            <div class="popup-multi-list" style="max-height: 220px; overflow-y: auto;">
              ${itemsHtml}
            </div>
          </div>
        `;
      }

      marker.bindPopup(popupBodyHtml, {
        maxWidth: 340,
        autoPan: true,
        autoPanPaddingTopLeft: L.point(20, 110),
        autoPanPaddingBottomRight: L.point(20, 40),
        keepInView: true,
      });

      this.powerLayerGroup.addLayer(marker);
    }
  }

  renderEarthquakeEvents(events: EarthquakeEvent[], filter: FilterState): void {
    this.earthquakeLayerGroup.clearLayers();

    const query = filter.searchQuery ? filter.searchQuery.toLowerCase() : "";

    const filtered = events.filter((e) => {
      if (filter.minMagnitude > 0 && e.magnitude < filter.minMagnitude) {
        return false;
      }
      if (query) {
        const matchesDesc = e.location_description.toLowerCase().includes(query);
        const matchesTown = e.nearest_town ? e.nearest_town.toLowerCase().includes(query) : false;
        const matchesProv = e.nearest_province ? e.nearest_province.toLowerCase().includes(query) : false;
        if (!matchesDesc && !matchesTown && !matchesProv) {
          return false;
        }
      }
      return e.within_watch_radius;
    });

    const isMobileOrTouch = typeof window !== "undefined" && (window.innerWidth < 768 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

    for (const e of filtered) {
      const severity = computeEarthquakeSeverity(e.magnitude);
      const eqDate = formatPhilippineDateTime(e.datetime_pst);

      const rawTown = e.nearest_town || e.location_description.replace(/.*of\s+/i, "").replace(/\(.*?\)/g, "").trim() || "Visayas";
      const locationLabel = cleanTownName(rawTown);

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

      marker.on("click", (evt) => {
        const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));
        if (isMobile && this.onSelectLocation) {
          marker.closePopup();
          L.DomEvent.stopPropagation(evt);
          this.onSelectLocation({ type: "earthquake", event: e });
        }
      });

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

      marker.bindPopup(popupHtml, {
        maxWidth: 340,
        autoPan: true,
        autoPanPaddingTopLeft: L.point(20, 110),
        autoPanPaddingBottomRight: L.point(20, 40),
        keepInView: true,
      });

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
