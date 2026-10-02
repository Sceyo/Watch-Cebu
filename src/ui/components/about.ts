/**
 * About & Attribution Drawer Component.
 *
 * Implements Stage 5 Section 5:
 * - Positioned adjacent to Legend button in header with identical visual weight.
 * - Opens a slide-over drawer reusing Legend interaction pattern.
 * - Contains placeholder content marked clearly with `// PLACEHOLDER — replace before public launch`.
 * - Provides genuine civic data attribution for VECO, PHIVOLCS, OpenStreetMap, and CARTO.
 */

export const ABOUT_METADATA = {
  appName: "WATCH CEBU",
  tagline: "Civic Awareness & Critical Infrastructure Tracker",
  version: "Stage 6 Production Preview",
  description:
    "Watch Cebu is an open, independent civic transparency platform monitoring scheduled power interruptions, seismic activity, air quality, and daily weather forecasts across Metro Cebu and the Visayas. Data is parsed directly from public utility and agency announcements with coordinate mapping from OpenStreetMap and atmospheric models from Open-Meteo.",
  githubUrl: "https://github.com/YOUR_GITHUB_USERNAME", // Placeholder for GitHub profile URL
  linkedinUrl: "https://www.linkedin.com/in/YOUR_LINKEDIN_USERNAME", // Placeholder for LinkedIn profile URL
  feedbackUrl: "https://github.com/YOUR_GITHUB_USERNAME/Watch-Cebu/issues", // Placeholder for repository issue tracker
  feedbackLabel: "Report an Issue or Feedback (GitHub)",
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
          <span style="font-size: 1.2rem; line-height: 1;">🍃</span>
          <div class="item-text">
            <span class="item-name">Open-Meteo</span>
            <span class="item-sub">Real-time air quality index (AQI) and 24-hour hourly weather forecast metrics for Metro Cebu.</span>
          </div>
        </div>

        <div class="legend-item" style="align-items: flex-start;">
          <span style="font-size: 1.2rem; line-height: 1;">🗺️</span>
          <div class="item-text">
            <span class="item-name">OpenStreetMap Contributors</span>
            <span class="item-sub">Approximate barangay locations from OpenStreetMap community mapping (ODbL). Points, not official boundaries.</span>
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

      <!-- Developer & Maintainer Links -->
      <div class="legend-section">
        <h3 class="section-title">👤 Developer & Connect</h3>
        <p class="section-desc">Connect with the project maintainer or inspect the source code:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          <a href="${ABOUT_METADATA.githubUrl}" target="_blank" rel="noopener noreferrer" class="source-link" style="display: flex; flex-direction: column; padding: 10px 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-color); border-radius: 8px; text-decoration: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: #FFFFFF;">
                <span style="font-size: 1.15rem; line-height: 1;">🐙</span>
                <span>GitHub</span>
              </span>
              <span style="color: #60A5FA; font-size: 0.85rem;">↗</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${ABOUT_METADATA.githubUrl}
            </div>
          </a>
          <a href="${ABOUT_METADATA.linkedinUrl}" target="_blank" rel="noopener noreferrer" class="source-link" style="display: flex; flex-direction: column; padding: 10px 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-color); border-radius: 8px; text-decoration: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: #FFFFFF;">
                <span style="font-size: 1.15rem; line-height: 1;">💼</span>
                <span>LinkedIn</span>
              </span>
              <span style="color: #60A5FA; font-size: 0.85rem;">↗</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${ABOUT_METADATA.linkedinUrl}
            </div>
          </a>
        </div>
      </div>

      <!-- Contact & Feedback Link -->
      <div class="legend-section">
        <h3 class="section-title">💬 Issues & Feedback</h3>
        <p class="section-desc">Have suggestions or found a data discrepancy?</p>
        <a href="${ABOUT_METADATA.feedbackUrl}" target="_blank" rel="noopener noreferrer" class="source-link" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
          <span>${ABOUT_METADATA.feedbackLabel}</span>
          <span>↗</span>
        </a>
      </div>

      <div class="legend-footer">
        <p style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.45;">
          Watch Cebu is a non-commercial, open-source public service civic engineering project designed for citizen safety and transparency.
        </p>
      </div>
    </div>
  `;

  const closeBtn = container.querySelector("#btn-close-about");
  closeBtn?.addEventListener("click", () => {
    onClose();
  });
}
