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

export const POPULAR_BARANGAYS = [
  "Lahug",
  "Banilad",
  "Mabolo",
  "Guadalupe",
  "Talamban",
  "Subangdaku",
  "Basak",
  "Pardo",
];

export function renderWelcomeModal(
  container: HTMLElement,
  isOpen: boolean,
  onDismiss: () => void,
  onOpenAbout: () => void,
  onPinBarangay?: (selectedBarangay?: string) => void
): void {
  if (!isOpen) {
    container.style.display = "none";
    container.innerHTML = "";
    container.classList.remove("open");
    return;
  }

  container.style.display = "flex";
  container.classList.add("open");

  const chipsHtml = POPULAR_BARANGAYS.map(
    (b) => `<button type="button" class="welcome-chip-btn" data-barangay="${b}">${b}</button>`
  ).join("");

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
        <!-- Feature 1: Brownout schedules -->
        <div class="welcome-feature-item">
          <div class="welcome-feature-icon welcome-feat-bolt">
            ${ICONS.bolt}
          </div>
          <div class="welcome-feature-content">
            <div class="welcome-feature-title">Brownout Schedules</div>
            <div class="welcome-feature-desc">
              Planned outages from Visayan Electric (VECO). Search or pin your barangay to see if you're affected.
            </div>
          </div>
        </div>

        <!-- Feature 2: Earthquakes & storms -->
        <div class="welcome-feature-item">
          <div class="welcome-feature-icon welcome-feat-quake">
            ${ICONS.earthquake}
          </div>
          <div class="welcome-feature-content">
            <div class="welcome-feature-title">Earthquakes, Storms &amp; Air Quality</div>
            <div class="welcome-feature-desc">
              Recent quakes near Cebu, official PAGASA storm warnings, and live air quality updates.
            </div>
          </div>
        </div>

        <!-- Feature 3: Works on weak signal (PWA) -->
        <div class="welcome-feature-item">
          <div class="welcome-feature-icon welcome-feat-shield">
            ${ICONS.shield}
          </div>
          <div class="welcome-feature-content">
            <div class="welcome-feature-title">Works on Weak Signal (Offline PWA)</div>
            <div class="welcome-feature-desc">
              Opens even when connection is slow. Add to Home Screen for offline access. Zero ads, zero accounts.
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Suggested Barangay Chips -->
      <div class="welcome-quick-chips">
        <div class="welcome-chips-label">Quick pin your home area:</div>
        <div class="welcome-chips-row">
          ${chipsHtml}
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
  const closeBtn = container.querySelector<HTMLButtonElement>("#btn-welcome-close");
  closeBtn?.addEventListener("click", () => {
    markWelcomeGuideSeen();
    onDismiss();
  });

  // Attach chip listeners
  const chipBtns = container.querySelectorAll<HTMLButtonElement>(".welcome-chip-btn");
  chipBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const brgy = btn.getAttribute("data-barangay");
      markWelcomeGuideSeen();
      if (brgy && onPinBarangay) {
        onPinBarangay(brgy);
      } else {
        onDismiss();
      }
    });
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
