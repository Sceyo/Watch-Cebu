/**
 * About & Attribution Drawer Component.
 *
 * Implements Stage 5 Section 5:
 * - Positioned adjacent to Legend button in header with identical visual weight.
 * - Opens a slide-over drawer reusing Legend interaction pattern.
 * - Contains placeholder content marked clearly with `// PLACEHOLDER — replace before public launch`.
 * - Provides genuine civic data attribution for VECO, PHIVOLCS, OpenStreetMap, and CARTO.
 */

// PLACEHOLDER — replace before public launch
export const ABOUT_METADATA = {
  appName: "WATCH CEBU",
  tagline: "Civic Awareness & Critical Infrastructure Tracker", // PLACEHOLDER — replace before public launch
  version: "Stage 5 Discovery Preview", // PLACEHOLDER — replace before public launch
  description:
    "Watch Cebu is an open, independent civic transparency platform monitoring scheduled power interruptions and seismic activity across Metro Cebu. All data is fetched directly from official public sources with strict coordinate provenance and zero invented data.", // PLACEHOLDER — replace before public launch
  feedbackUrl: "https://github.com/francis/Watch-Cebu/issues", // PLACEHOLDER — replace before public launch
  feedbackLabel: "Report an Issue or Feedback (GitHub)", // PLACEHOLDER — replace before public launch
};

export function renderAbout(
  container: HTMLElement,
  isOpen: boolean,
  onClose: () => void
): void {
  container.className = `legend-drawer ${isOpen ? "open" : "closed"}`;
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-label", "About Watch Cebu");

  container.innerHTML = `
    <div class="legend-header">
      <h2 class="legend-title">About Watch Cebu</h2>
      <button class="legend-close-btn" id="btn-close-about" title="Close About Drawer" aria-label="Close About Drawer">✕</button>
    </div>

    <div class="legend-content">
      <!-- Project Mission / Description -->
      <div class="legend-section">
        <h3 class="section-title">${ABOUT_METADATA.appName}</h3>
        <p class="section-desc" style="color: var(--text-primary); font-weight: 500; margin-bottom: 8px;">
          ${ABOUT_METADATA.tagline}
        </p>
        <p class="section-desc">
          ${ABOUT_METADATA.description}
        </p>
      </div>

      <!-- Real Data Attribution Section (MANDATORY & UNCOMPROMISED) -->
      <div class="legend-section">
        <h3 class="section-title">🏛️ Authoritative Data Sources</h3>
        <p class="section-desc">Watch Cebu presents only verified public records. Coordinates and bulletins originate directly from authoritative channels:</p>

        <div class="legend-item" style="align-items: flex-start;">
          <span style="font-size: 1.2rem; line-height: 1;">⚡</span>
          <div class="item-text">
            <span class="item-name">Visayan Electric (VECO)</span>
            <span class="item-sub">Scheduled power interruption advisories published for franchise areas in Metro Cebu.</span>
          </div>
        </div>

        <div class="legend-item" style="align-items: flex-start;">
          <span style="font-size: 1.2rem; line-height: 1;">🌐</span>
          <div class="item-text">
            <span class="item-name">DOST-PHIVOLCS</span>
            <span class="item-sub">Philippine Institute of Volcanology and Seismology official earthquake bulletins and PEIS intensity data.</span>
          </div>
        </div>

        <div class="legend-item" style="align-items: flex-start;">
          <span style="font-size: 1.2rem; line-height: 1;">🗺️</span>
          <div class="item-text">
            <span class="item-name">OpenStreetMap Contributors</span>
            <span class="item-sub">Authoritative barangay boundary nodes and civic location coordinates (ODbL). Zero synthetic coordinates.</span>
          </div>
        </div>

        <div class="legend-item" style="align-items: flex-start;">
          <span style="font-size: 1.2rem; line-height: 1;">🎨</span>
          <div class="item-text">
            <span class="item-name">CARTO Basemaps</span>
            <span class="item-sub">Dark Matter high-contrast map tiles for control-room civic clarity.</span>
          </div>
        </div>
      </div>

      <!-- Contact & Feedback Link -->
      <div class="legend-section">
        <h3 class="section-title">💬 Contact & Feedback</h3>
        <p class="section-desc">Have suggestions or found a data discrepancy?</p>
        <a href="${ABOUT_METADATA.feedbackUrl}" target="_blank" rel="noopener noreferrer" class="source-link" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
          <span>${ABOUT_METADATA.feedbackLabel}</span>
          <span>↗</span>
        </a>
      </div>

      <div class="legend-footer">
        <p style="font-size: 0.72rem; color: var(--text-muted);">
          // PLACEHOLDER — replace before public launch.<br/>
          Watch Cebu is a non-commercial public service civic engineering project.
        </p>
      </div>
    </div>
  `;

  const closeBtn = container.querySelector("#btn-close-about");
  closeBtn?.addEventListener("click", () => {
    onClose();
  });
}
