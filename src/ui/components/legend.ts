/**
 * Legend & Information Drawer Component.
 *
 * Implements Stage 3 Section 5.1 & 5.2:
 * 1. Marker Provenance Explanation:
 *    - Solid pin: Located from OpenStreetMap data.
 *    - Ringed pin: Manually verified locations for areas without standard barangay boundaries.
 * 2. Power Status Colors (Red, Amber, Blue, Green).
 * 3. Earthquake Severity Scale (Pale violet, Violet, Deep violet, Fuchsia) with shockwave ring.
 */

import { ICONS } from "./icons.js";

export function renderLegend(
  container: HTMLElement,
  isOpen: boolean,
  onClose: () => void
): void {
  container.className = `legend-drawer ${isOpen ? 'open' : 'closed'}`;

  container.innerHTML = `
    <div class="legend-header">
      <h2 class="legend-title">Map Guide &amp; Provenance</h2>
      <button class="legend-close-btn" id="btn-close-legend" aria-label="Close Legend" title="Close Legend">${ICONS.close}</button>
    </div>

    <div class="legend-content">
      <!-- Section 1: Provenance Encoding (Neutral Slate Swatches) -->
      <div class="legend-section">
        <h3 class="section-title">📍 Marker Provenance</h3>
        <p class="section-desc">Coordinate certainty is clearly indicated before opening any popup:</p>
        
        <div class="legend-item">
          <div class="marker-sample solid-sample"></div>
          <div class="item-text">
            <span class="item-name">Solid Pins (OpenStreetMap)</span>
            <span class="item-sub">Approximate community locations from OpenStreetMap. Points, not official boundaries.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="marker-sample ring-sample"></div>
          <div class="item-text">
            <span class="item-name">Ringed Pins (Manually Verified)</span>
            <span class="item-sub">Manually verified locations for special economic zones (e.g. South Reclamation Area) without standard PSA barangay boundaries.</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Power Interruption Status (Color + Glyph + Opacity) -->
      <div class="legend-section">
        <h3 class="section-title"><span style="display: inline-flex; align-items: center; margin-right: 6px; color: #EF4444;">${ICONS.bolt}</span>Power Advisories (VECO)</h3>
        <p class="section-desc">Distinguishable via color, interior glyph, and opacity (colorblind accessible):</p>
        
        <div class="legend-item">
          <div class="color-swatch-circle" style="background: #EF4444;">
            ${ICONS.bolt}
          </div>
          <div class="item-text">
            <span class="item-name">⚡ Active Outage Now</span>
            <span class="item-sub">Interruption currently underway within scheduled window.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="color-swatch-circle" style="background: #F59E0B;">
            ${ICONS.clock}
          </div>
          <div class="item-text">
            <span class="item-name">⏱ Upcoming (&lt; 2h)</span>
            <span class="item-sub">Power interruption scheduled to begin in less than 2 hours.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="color-swatch-circle" style="background: #3B82F6;">
            ${ICONS.calendar}
          </div>
          <div class="item-text">
            <span class="item-name">📅 Later / Scheduled</span>
            <span class="item-sub">Scheduled for later today or upcoming day in the advisory week.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="color-swatch-circle" style="background: rgba(34, 197, 94, 0.35); border: 1.5px solid #22C55E; opacity: 0.7;">
            ${ICONS.check}
          </div>
          <div class="item-text">
            <span class="item-name">✓ Concluded (Dimmed)</span>
            <span class="item-sub">Scheduled window has passed; pin opacity reduced on map.</span>
          </div>
        </div>
      </div>

      <!-- Section 3: Seismic Severity -->
      <div class="legend-section">
        <h3 class="section-title"><span style="display: inline-flex; align-items: center; margin-right: 6px; color: #8B5CF6;">${ICONS.earthquake}</span>Earthquakes (PHIVOLCS)</h3>
        <p class="section-desc">Seismic events within 300 km of Cebu City, encoded in violet/fuchsia to prevent collision with power outage status:</p>

        <div class="legend-item">
          <div class="eq-sample" style="width: 14px; height: 14px; background: #A78BFA;"></div>
          <div class="item-text">
            <span class="item-name">Magnitude &lt; 3.0</span>
            <span class="item-sub">Minor micro-earthquake, rarely felt.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="eq-sample" style="width: 18px; height: 18px; background: #8B5CF6;"></div>
          <div class="item-text">
            <span class="item-name">Magnitude 3.0 – 4.9</span>
            <span class="item-sub">Light earthquake, felt indoors by residents.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="eq-sample" style="width: 22px; height: 22px; background: #7C3AED;"></div>
          <div class="item-text">
            <span class="item-name">Magnitude 5.0 – 5.9</span>
            <span class="item-sub">Moderate shaking, felt widely with potential slight damage.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="eq-sample pulsing" style="width: 26px; height: 26px; background: #D946EF;"></div>
          <div class="item-text">
            <span class="item-name">Magnitude ≥ 6.0 (Pulsing Ring)</span>
            <span class="item-sub">Strong earthquake requiring active damage &amp; aftershock monitoring.</span>
          </div>
        </div>
      </div>

      <div class="legend-footer">
        <p>Advisories sourced from <strong>Visayan Electric (VECO)</strong> and <strong>DOST-PHIVOLCS</strong>. Map coordinates are approximate points from OpenStreetMap contributors (community map), not official boundaries.</p>
      </div>
    </div>
  `;

  const closeBtn = container.querySelector("#btn-close-legend");
  closeBtn?.addEventListener("click", () => {
    onClose();
  });
}
