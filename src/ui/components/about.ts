/**
 * About & Attribution Drawer Component.
 *
 * Implements Stage 5 Section 5:
 * - Positioned adjacent to Legend button in header with identical visual weight.
 * - Opens a slide-over drawer reusing Legend interaction pattern.
 * - Contains placeholder content marked clearly with `// PLACEHOLDER — replace before public launch`.
 * - Provides genuine civic data attribution for VECO, PHIVOLCS, OpenStreetMap, and CARTO.
 */

import { CEBU_EMERGENCY_HOTLINES } from "../services/networkStatus.js";

export const ABOUT_METADATA = {
  appName: "WATCH CEBU",
  tagline: "Civic Awareness & Critical Infrastructure Tracker",
  version: "Stage 6 Production Preview",
  description:
    "Watch Cebu is an open, independent civic transparency platform monitoring scheduled power interruptions, seismic activity, air quality, and daily weather forecasts across Metro Cebu and the Visayas. Data is parsed directly from public utility and agency announcements with coordinate mapping from OpenStreetMap and atmospheric models from Open-Meteo.",
  githubUrl: "https://github.com/Sceyo",
  linkedinUrl: "https://www.linkedin.com/in/francis-aliser/",
  feedbackUrl: "https://github.com/Sceyo/Watch-Cebu/issues",
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

  const githubHtml = ABOUT_METADATA.githubUrl
    ? `
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
    `
    : `
      <div class="source-link pending-link" style="display: flex; flex-direction: column; padding: 10px 12px; background: rgba(239, 68, 68, 0.06); border: 1px dashed rgba(239, 68, 68, 0.4); border-radius: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: #FFFFFF;">
            <span style="font-size: 1.15rem; line-height: 1;">🐙</span>
            <span>GitHub</span>
          </span>
          <span style="color: #F87171; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; background: rgba(239, 68, 68, 0.15); padding: 2px 6px; border-radius: 4px;">Pending Configuration</span>
        </div>
        <div style="font-size: 0.72rem; color: #FCA5A5; font-family: var(--font-mono); margin-top: 4px;">
          Not yet set — configure maintainer GitHub profile before public launch
        </div>
      </div>
    `;

  const linkedinHtml = ABOUT_METADATA.linkedinUrl
    ? `
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
    `
    : `
      <div class="source-link pending-link" style="display: flex; flex-direction: column; padding: 10px 12px; background: rgba(239, 68, 68, 0.06); border: 1px dashed rgba(239, 68, 68, 0.4); border-radius: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: #FFFFFF;">
            <span style="font-size: 1.15rem; line-height: 1;">💼</span>
            <span>LinkedIn</span>
          </span>
          <span style="color: #F87171; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; background: rgba(239, 68, 68, 0.15); padding: 2px 6px; border-radius: 4px;">Pending Configuration</span>
        </div>
        <div style="font-size: 0.72rem; color: #FCA5A5; font-family: var(--font-mono); margin-top: 4px;">
          Not yet set — configure maintainer LinkedIn profile before public launch
        </div>
      </div>
    `;

  const feedbackHtml = ABOUT_METADATA.feedbackUrl
    ? `
      <a href="${ABOUT_METADATA.feedbackUrl}" target="_blank" rel="noopener noreferrer" class="source-link" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
        <span>${ABOUT_METADATA.feedbackLabel}</span>
        <span>↗</span>
      </a>
    `
    : `
      <div class="source-link pending-link" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: #94A3B8; font-size: 0.85rem;">
        <span>${ABOUT_METADATA.feedbackLabel}</span>
        <span style="color: #F87171; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; background: rgba(239, 68, 68, 0.15); padding: 2px 6px; border-radius: 4px;">Pending Configuration</span>
      </div>
    `;

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
          <span style="font-size: 1.2rem; line-height: 1;">🌀</span>
          <div class="item-text">
            <span class="item-name">DOST-PAGASA</span>
            <span class="item-sub">Philippine Atmospheric, Geophysical and Astronomical Services Administration official severe weather bulletins, Tropical Cyclone Wind Signals (TCWS), and Heavy Rainfall Warnings.</span>
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

      <!-- Scope Boundaries, Limitations & Disclaimers -->
      <div class="legend-section">
        <h3 class="section-title">⚠️ Scope Limitations & Civic Disclaimers</h3>
        <p class="section-desc">What Watch Cebu covers, what is currently out of scope, and essential civic boundaries:</p>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          <!-- Power Coverage Boundaries -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #F59E0B; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>⚡ Power Coverage: VECO Franchise Only</span>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4;">
              Covers scheduled maintenance for <strong>4 cities & 4 municipalities</strong> (Cebu City, Mandaue, Talisay, Naga, Consolacion, Liloan, Minglanilla, San Fernando).<br>
              <strong style="color: #F87171;">Currently Out of Scope (Known Limitations):</strong>
              <ul style="margin: 4px 0 0 16px; padding: 0;">
                <li><strong>MECO (Mactan Electric):</strong> Lapu-Lapu City & Cordova (Mactan Island) are not covered.</li>
                <li><strong>CEBECO I, II, & III:</strong> Provincial towns in Northern, Southern, and Western Cebu are not covered due to a lack of machine-readable data feeds.</li>
                <li><strong>Unscheduled / Emergency Outages:</strong> Spontaneous breaker tripping, blown transformers, and emergency blackouts cannot be detected in real time.</li>
              </ul>
            </div>
          </div>

          <!-- Geocoding Approximate Coordinates -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #60A5FA; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>📍 Approximate Barangay Coordinates</span>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4;">
              Map pins indicate approximate neighborhood center points derived from OpenStreetMap and VECO text descriptions. An advisory pin in your barangay does <em>not</em> guarantee your specific household or meter will lose power, as outages often isolate specific transformer feeders.
            </div>
          </div>

          <!-- Seismic Disclaimer -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #A78BFA; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>🌋 Seismic Epicenters (Not Early Warning)</span>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4;">
              Tracks official DOST-PHIVOLCS bulletins within 300 km. This is an information dashboard, <strong>not an Earthquake Early Warning (EEW) alarm</strong>. Shaking felt at your home depends on local ground conditions and distance from the epicenter.
            </div>
          </div>

          <!-- Weather & Evacuation Orders -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #34D399; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>🌀 Weather & Disaster Orders</span>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4;">
              Weather forecasts (Open-Meteo) and storm signals (DOST-PAGASA) are aggregated for situational awareness. Watch Cebu does <strong>not issue official evacuation orders or class suspensions</strong>. Always follow directives from your local CDRRMO and the Provincial Disaster Office.
            </div>
          </div>

          <!-- No Dispatch -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #CBD5E1; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>🚨 No Emergency Dispatch or Ticketing</span>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4;">
              This website is an informational monitor. You cannot report downed lines, request medical rescue, or submit power tickets through this app. Use the direct emergency hotlines below for urgent assistance.
            </div>
          </div>
        </div>
      </div>

      <!-- Emergency Hotlines (Civic Lifeline & Offline Reference) -->
      <div class="legend-section">
        <h3 class="section-title">🚨 Emergency Hotlines (Cebu)</h3>
        <p class="section-desc">Tap-to-call emergency responders for disasters, grid hazards, and medical aid:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          ${CEBU_EMERGENCY_HOTLINES.map(
            (h) => `
            <a href="${h.phone}" class="source-link" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; text-decoration: none;">
              <div>
                <div style="font-weight: 600; color: #FFFFFF; font-size: 0.85rem;">${h.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${h.description}</div>
              </div>
              <div style="text-align: right; margin-left: 8px; flex-shrink: 0;">
                <span style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700; color: #F87171;">${h.displayPhone}</span>
                <span style="display: block; font-size: 0.65rem; color: #34D399; font-weight: 600;">${h.available}</span>
              </div>
            </a>
          `
          ).join("")}
        </div>
      </div>

      <!-- Developer & Maintainer Links -->
      <div class="legend-section">
        <h3 class="section-title">👤 Developer & Connect</h3>
        <p class="section-desc">Connect with the project maintainer or inspect the source code:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          ${githubHtml}
          ${linkedinHtml}
        </div>
      </div>

      <!-- Contact & Feedback Link -->
      <div class="legend-section">
        <h3 class="section-title">💬 Issues & Feedback</h3>
        <p class="section-desc">Have suggestions or found a data discrepancy?</p>
        ${feedbackHtml}
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
