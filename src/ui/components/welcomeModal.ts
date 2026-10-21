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
  onOpenAbout: (section?: string) => void,
  onPinBarangay?: (selectedBrgy?: string) => void
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

        <!-- Interactive 24/7 Emergency Hotlines Card -->
        <div class="welcome-feature-item welcome-feature-interactive" id="welcome-card-hotlines" role="button" tabindex="0" aria-label="Open 24/7 Emergency Hotlines directory">
          <div class="welcome-feature-icon welcome-feat-phone">${ICONS.phone}</div>
          <div class="welcome-feature-content" style="flex: 1;">
            <div class="welcome-feature-title" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span>24/7 Emergency Hotlines</span>
              <span class="welcome-hotlines-badge">Tap to View →</span>
            </div>
            <div class="welcome-feature-desc">Tap to view direct emergency numbers for Cebu City DRRMO (166), VECO, Red Cross, and 911.</div>
          </div>
        </div>
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
  const dismissAnd = (action?: () => void) => {
    markWelcomeGuideSeen();
    onDismiss();
    action?.();
  };

  container.querySelector<HTMLButtonElement>("#btn-welcome-close")?.addEventListener("click", () => dismissAnd());
  container.querySelector<HTMLButtonElement>("#btn-welcome-pin")?.addEventListener("click", () => dismissAnd(onPinBarangay));
  container.querySelector<HTMLButtonElement>("#btn-welcome-explore")?.addEventListener("click", () => dismissAnd());
  container.querySelector<HTMLButtonElement>("#btn-welcome-about")?.addEventListener("click", () => dismissAnd(onOpenAbout));

  const hotlinesCard = container.querySelector<HTMLElement>("#welcome-card-hotlines");
  const onHotlines = () => dismissAnd(() => onOpenAbout("hotlines"));
  hotlinesCard?.addEventListener("click", onHotlines);
  hotlinesCard?.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onHotlines();
    }
  });
}
