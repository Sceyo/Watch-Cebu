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

export function renderLegend(
  container: HTMLElement,
  isOpen: boolean,
  onClose: () => void
): void {
  container.className = `legend-drawer ${isOpen ? 'open' : 'closed'}`;

  container.innerHTML = `
    <div class="legend-header">
      <h2 class="legend-title">Map Guide & Provenance</h2>
      <button class="legend-close-btn" id="btn-close-legend" title="Close Legend">✕</button>
    </div>

    <div class="legend-content">
      <!-- Section 1: Provenance Encoding -->
      <div class="legend-section">
        <h3 class="section-title">📍 Marker Provenance</h3>
        <p class="section-desc">To maintain strict civic data integrity (Rule C-1), coordinate certainty is clearly indicated before opening any popup:</p>
        
        <div class="legend-item">
          <div class="marker-sample solid-sample"></div>
          <div class="item-text">
            <span class="item-name">Solid Pins (OpenStreetMap)</span>
            <span class="item-sub">Located from authoritative OpenStreetMap nodes representing barangays and quarters.</span>
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

      <!-- Section 2: Power Interruption Status -->
      <div class="legend-section">
        <h3 class="section-title">⚡ Power Advisories (VECO)</h3>
        
        <div class="legend-item">
          <div class="color-swatch" style="background: #EF4444;"></div>
          <div class="item-text">
            <span class="item-name">Active Outage Now</span>
            <span class="item-sub">Interruption currently within its scheduled window.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="color-swatch" style="background: #F59E0B;"></div>
          <div class="item-text">
            <span class="item-name">Upcoming (< 2h)</span>
            <span class="item-sub">Power interruption scheduled to begin in less than 2 hours.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="color-swatch" style="background: #3B82F6;"></div>
          <div class="item-text">
            <span class="item-name">Later / Scheduled</span>
            <span class="item-sub">Scheduled for later today or an upcoming day in the advisory week.</span>
          </div>
        </div>

        <div class="legend-item">
          <div class="color-swatch" style="background: rgba(34, 197, 94, 0.4); border: 1px solid #22C55E;"></div>
          <div class="item-text">
            <span class="item-name">Restored / Concluded</span>
            <span class="item-sub">Scheduled interruption period has elapsed.</span>
          </div>
        </div>
      </div>

      <!-- Section 3: Seismic Severity -->
      <div class="legend-section">
        <h3 class="section-title">🌐 Earthquakes (PHIVOLCS)</h3>
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
            <span class="item-sub">Strong earthquake requiring active damage & aftershock monitoring.</span>
          </div>
        </div>
      </div>

      <div class="legend-footer">
        <p>Data sourced exclusively from official channels: <strong>Visayan Electric (VECO)</strong> and <strong>DOST-PHIVOLCS</strong>. Zero invented coordinates.</p>
      </div>
    </div>
  `;

  const closeBtn = container.querySelector("#btn-close-legend");
  closeBtn?.addEventListener("click", () => {
    onClose();
  });
}
