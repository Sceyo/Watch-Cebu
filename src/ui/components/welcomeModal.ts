/**
 * First-Entry Civic Onboarding Guide & Welcome Modal Component.
 *
 * Provides a warm, reassuring first-run onboarding experience for civilians
 * explaining the 3 core capabilities (Power, Quakes/Weather, Offline-First),
 * without requiring user accounts or logins.
 */

import { ICONS } from "./icons.js";

export const WELCOME_STORAGE_KEY = "watch_cebu_welcome_seen";

export function hasSeenWelcomeGuide(): boolean {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWelcomeGuideSeen(): void {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, "1");
  } catch {
    // Ignore localStorage write failures (e.g. private browsing restrictions)
  }
}

export function renderWelcomeModal(
  container: HTMLElement,
  isOpen: boolean,
  onDismiss: () => void,
  onOpenAbout: () => void,
  onPinBarangay?: () => void
): void {
  if (!isOpen) {
    container.style.display = "none";
    container.innerHTML = "";
    container.classList.remove("open");
    return;
  }

  container.style.display = "flex";
  container.classList.add("open");

  container.innerHTML = `
    <div class="welcome-modal-card" role="dialog" aria-modal="true" aria-labelledby="welcome-modal-title">
      <div class="welcome-modal-header">
        <div class="welcome-brand">
          <img src="/icons/icon.svg" alt="Watch Cebu" class="welcome-brand-logo" width="34" height="34" />
          <h2 id="welcome-modal-title" class="welcome-title">WATCH CEBU</h2>
        </div>
        <button class="welcome-close-btn" id="btn-welcome-close" aria-label="Dismiss guide" title="Dismiss guide">${ICONS.close}</button>
      </div>

      <div class="welcome-tagline">
        Check brownouts, earthquakes, storms, and air quality in Metro Cebu. Free, no sign-up.
      </div>

      <div class="welcome-features-list">
        ${[
          { c: "welcome-feat-bolt", i: ICONS.bolt, t: "Brownout Schedules", d: "Planned outages from Visayan Electric (VECO). Search or pin your barangay to see if you're affected." },
          { c: "welcome-feat-quake", i: ICONS.earthquake, t: "Earthquakes, Storms &amp; Air Quality", d: "Recent quakes near Cebu, official PAGASA storm warnings, and live air quality updates." },
          { c: "welcome-feat-shield", i: ICONS.shield, t: "Works on Weak Signal (Offline PWA)", d: "Opens even when connection is slow. Add to Home Screen for offline access. Zero ads, zero accounts." },
        ].map(f => `
          <div class="welcome-feature-item">
            <div class="welcome-feature-icon ${f.c}">${f.i}</div>
            <div class="welcome-feature-content">
              <div class="welcome-feature-title">${f.t}</div>
              <div class="welcome-feature-desc">${f.d}</div>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- One-line coverage notice -->
      <div class="welcome-coverage-notice">
        <span class="coverage-notice-icon" aria-hidden="true">${ICONS.info}</span>
        <span><strong>Unofficial.</strong> Covers VECO areas only (Cebu City, Mandaue, Talisay, Minglanilla, Naga, San Fernando, Consolacion, Liloan). Does not cover Lapu-Lapu or provincial towns.</span>
      </div>

      <div class="welcome-modal-footer">
        <div class="welcome-action-buttons">
          <button id="btn-welcome-pin" class="welcome-btn-primary">
            <span class="btn-icon" aria-hidden="true">${ICONS.mapPin}</span>
            <span>Search &amp; Pin Barangay</span>
          </button>
          <button id="btn-welcome-explore" class="welcome-btn-secondary">
            <span>Explore the Map</span>
          </button>
        </div>
        <button id="btn-welcome-about" class="welcome-link-btn">
          About, Limitations &amp; 24/7 Hotlines →
        </button>
      </div>
    </div>
  `;

  // Attach event listeners
  const closeBtn = container.querySelector<HTMLButtonElement>("#btn-welcome-close");
  closeBtn?.addEventListener("click", () => {
    markWelcomeGuideSeen();
    onDismiss();
  });

  const pinBtn = container.querySelector<HTMLButtonElement>("#btn-welcome-pin");
  pinBtn?.addEventListener("click", () => {
    markWelcomeGuideSeen();
    if (onPinBarangay) {
      onPinBarangay();
    } else {
      onDismiss();
    }
  });

  const exploreBtn = container.querySelector<HTMLButtonElement>("#btn-welcome-explore");
  exploreBtn?.addEventListener("click", () => {
    markWelcomeGuideSeen();
    onDismiss();
  });

  const aboutBtn = container.querySelector<HTMLButtonElement>("#btn-welcome-about");
  aboutBtn?.addEventListener("click", () => {
    markWelcomeGuideSeen();
    onDismiss();
    onOpenAbout();
  });
}
