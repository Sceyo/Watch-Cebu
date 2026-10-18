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
import { ICONS } from "./icons.js";

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
  onClose: () => void,
  onOpenWelcome?: () => void
): void {
  container.className = `legend-drawer ${isOpen ? "open" : "closed"}`;
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-label", "About Watch Cebu");

  const githubHtml = ABOUT_METADATA.githubUrl
    ? `
      <a href="${ABOUT_METADATA.githubUrl}" target="_blank" rel="noopener noreferrer" class="source-link about-social-link">
        <div class="about-social-row">
          <span class="about-social-title">
            <span style="display: inline-flex; align-items: center;">${ICONS.github}</span>
            <span>GitHub</span>
          </span>
          <span style="color: #60A5FA; font-size: 0.85rem;">↗</span>
        </div>
        <div class="about-social-url">
          ${ABOUT_METADATA.githubUrl}
        </div>
      </a>
    `
    : `
      <div class="source-link pending-link about-social-link" style="background: rgba(239, 68, 68, 0.06); border: 1px dashed rgba(239, 68, 68, 0.4);">
        <div class="about-social-row">
          <span class="about-social-title">
            <span style="display: inline-flex; align-items: center;">${ICONS.github}</span>
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
      <a href="${ABOUT_METADATA.linkedinUrl}" target="_blank" rel="noopener noreferrer" class="source-link about-social-link">
        <div class="about-social-row">
          <span class="about-social-title">
            <span style="display: inline-flex; align-items: center;">${ICONS.linkedin}</span>
            <span>LinkedIn</span>
          </span>
          <span style="color: #60A5FA; font-size: 0.85rem;">↗</span>
        </div>
        <div class="about-social-url">
          ${ABOUT_METADATA.linkedinUrl}
        </div>
      </a>
    `
    : `
      <div class="source-link pending-link about-social-link" style="background: rgba(239, 68, 68, 0.06); border: 1px dashed rgba(239, 68, 68, 0.4);">
        <div class="about-social-row">
          <span class="about-social-title">
            <span style="display: inline-flex; align-items: center;">${ICONS.linkedin}</span>
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
    <div class="legend-header" style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="/icons/icon.svg" alt="Watch Cebu" width="28" height="28" style="border-radius: 7px; box-shadow: 0 0 10px rgba(56, 189, 248, 0.35); flex-shrink: 0; display: block;" />
        <h2 class="legend-title" style="margin: 0;">About Watch Cebu</h2>
      </div>
      <button class="legend-close-btn" id="btn-close-about" title="Close About Drawer" aria-label="Close About Drawer">✕</button>
    </div>

    <div class="legend-content">
      <!-- Quick Onboarding Guide Trigger -->
      <div class="legend-section" style="padding-bottom: 12px; margin-bottom: 8px;">
        <button id="btn-about-open-guide" class="welcome-guide-reopen-btn">
          <span style="display: inline-flex; align-items: center;">${ICONS.help}</span>
          <span>View Welcome Guide &amp; Tips</span>
        </button>
      </div>

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
        <h3 class="section-title" style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; align-items: center; color: var(--accent-blue);">${ICONS.institution}</span>
          <span>Authoritative Data Sources</span>
        </h3>
        <p class="section-desc">Watch Cebu presents only verified public records. Coordinates and bulletins originate directly from authoritative channels:</p>

        ${[
          { i: ICONS.bolt, c: "#F59E0B", n: "Visayan Electric (VECO)", d: "Scheduled power interruption advisories published for franchise areas in Metro Cebu." },
          { i: ICONS.earthquake, c: "#A78BFA", n: "DOST-PHIVOLCS", d: "Philippine Institute of Volcanology and Seismology official earthquake bulletins and PEIS intensity data." },
          { i: ICONS.cyclone, c: "#38BDF8", n: "DOST-PAGASA", d: "Philippine Atmospheric, Geophysical and Astronomical Services Administration official severe weather bulletins, Tropical Cyclone Wind Signals (TCWS), and Heavy Rainfall Warnings." },
          { i: ICONS.air, c: "#34D399", n: "Open-Meteo", d: "Real-time air quality index (AQI) and 24-hour hourly weather forecast metrics for Metro Cebu." },
          { i: ICONS.mapPin, c: "#60A5FA", n: "OpenStreetMap Contributors", d: "Approximate barangay locations from OpenStreetMap community mapping (ODbL). Points, not official boundaries." },
          { i: ICONS.map, c: "#CBD5E1", n: "CARTO Basemaps", d: "Dark Matter high-contrast map tiles for control-room civic clarity." },
        ].map(s => `
          <div class="legend-item" style="align-items: flex-start;">
            <span style="display: inline-flex; align-items: center; color: ${s.c}; margin-top: 2px;">${s.i}</span>
            <div class="item-text">
              <span class="item-name">${s.n}</span>
              <span class="item-sub">${s.d}</span>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Scope Boundaries, Limitations & Disclaimers -->
      <div class="legend-section">
        <h3 class="section-title" style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; align-items: center; color: #F59E0B;">${ICONS.alertTriangle}</span>
          <span>Scope Limitations & Civic Disclaimers</span>
        </h3>
        <p class="section-desc">What Watch Cebu covers, what is currently out of scope, and essential civic boundaries:</p>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          ${[
            {
              i: ICONS.bolt,
              c: "#F59E0B",
              t: "Power Coverage: VECO Franchise Only",
              b: `Covers scheduled maintenance for <strong>4 cities & 4 municipalities</strong> (Cebu City, Mandaue, Talisay, Naga, Consolacion, Liloan, Minglanilla, San Fernando).<br><strong style="color: #F87171;">Currently Out of Scope (Known Limitations):</strong><ul style="margin: 4px 0 0 16px; padding: 0;"><li><strong>MECO (Mactan Electric):</strong> Lapu-Lapu &amp; Cordova not covered.</li><li><strong>CEBECO I, II, & III:</strong> Provincial towns not covered.</li><li><strong>Emergency Outages:</strong> Spontaneous blackouts cannot be detected in real time.</li></ul>`,
            },
            {
              i: ICONS.mapPin,
              c: "#60A5FA",
              t: "Approximate Barangay Coordinates",
              b: "Map pins indicate approximate neighborhood center points derived from OpenStreetMap and VECO text descriptions. An advisory pin does not guarantee every household on a feeder loses power.",
            },
            {
              i: ICONS.earthquake,
              c: "#A78BFA",
              t: "Seismic Epicenters (Not Early Warning)",
              b: "Tracks official DOST-PHIVOLCS bulletins within 300 km. Informational dashboard, not an Earthquake Early Warning (EEW) alarm.",
            },
            {
              i: ICONS.cyclone,
              c: "#34D399",
              t: "Weather & Disaster Orders",
              b: "Weather forecasts (Open-Meteo) and storm signals (DOST-PAGASA) for situational awareness. Watch Cebu does not issue official evacuation orders or class suspensions.",
            },
            {
              i: ICONS.shield,
              c: "#CBD5E1",
              t: "No Emergency Dispatch or Ticketing",
              b: "Informational monitor. You cannot report downed lines or request medical rescue here. Use the direct emergency hotlines below for urgent assistance.",
            },
          ].map(d => `
            <div class="about-box">
              <div style="font-size: 0.82rem; font-weight: 700; color: ${d.c}; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-flex; align-items: center;">${d.i}</span>
                <span>${d.t}</span>
              </div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4;">
                ${d.b}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Emergency Hotlines (Civic Lifeline & Offline Reference) -->
      <div class="legend-section">
        <h3 class="section-title" style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; align-items: center; color: #F87171;">${ICONS.phone}</span>
          <span>Emergency Hotlines (Cebu)</span>
        </h3>
        <p class="section-desc">Tap-to-call emergency responders for disasters, grid hazards, and medical aid:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          ${CEBU_EMERGENCY_HOTLINES.map(
            (h) => `
            <a href="${h.phone}" class="source-link hotline-link">
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

      <!-- Progressive Web App (PWA) Offline Install Guide -->
      <div class="legend-section">
        <h3 class="section-title" style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; align-items: center; color: #10B981;">${ICONS.shield}</span>
          <span>Install App for Offline Use</span>
        </h3>
        <p class="section-desc">Installs directly to home screen for offline access:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          ${[
            { t: "iPhone &amp; iPad (Safari)", c: "#38BDF8", d: "Tap Share (box with arrow) → <strong>Add to Home Screen</strong> → Add." },
            { t: "Android (Chrome &amp; Edge)", c: "#34D399", d: "Tap menu (<strong>⋮</strong>) → <strong>Install app</strong> or Add to Home screen." },
          ].map(p => `
            <div class="about-box-sm">
              <div style="font-size: 0.8rem; font-weight: 700; color: ${p.c}; margin-bottom: 2px;">${p.t}</div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.35;">${p.d}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Developer & Maintainer Links -->
      <div class="legend-section">
        <h3 class="section-title" style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; align-items: center; color: #38BDF8;">${ICONS.user}</span>
          <span>Developer & Connect</span>
        </h3>
        <p class="section-desc">Connect with the project maintainer or inspect the source code:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          ${githubHtml}
          ${linkedinHtml}
        </div>
      </div>

      <!-- Contact & Feedback Link -->
      <div class="legend-section">
        <h3 class="section-title" style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; align-items: center; color: #38BDF8;">${ICONS.chat}</span>
          <span>Issues & Feedback</span>
        </h3>
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

  const guideBtn = container.querySelector("#btn-about-open-guide");
  guideBtn?.addEventListener("click", () => {
    onOpenWelcome?.();
  });
}
