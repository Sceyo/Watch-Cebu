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
  onOpenAbout: () => void
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
          <span class="welcome-brand-icon" style="color: #38BDF8;" aria-hidden="true">${ICONS.cebu}</span>
          <div>
            <h2 id="welcome-modal-title" class="welcome-title">WATCH CEBU</h2>
            <div class="welcome-subtitle">Civic Situational Awareness &amp; Multi-Hazard Monitor</div>
          </div>
        </div>
        <button class="welcome-close-btn" id="btn-welcome-close" aria-label="Dismiss guide" title="Dismiss guide">${ICONS.close}</button>
      </div>

      <div class="welcome-tagline">
        Independent public transparency platform for Metro Cebu residents, responders, and businesses.
      </div>

      <div class="welcome-features-list">
        <!-- Feature 1: Power Outages -->
        <div class="welcome-feature-item">
          <div class="welcome-feature-icon" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3);">
            ${ICONS.bolt}
          </div>
          <div class="welcome-feature-content">
            <div class="welcome-feature-title">Scheduled Power Interruptions (VECO)</div>
            <div class="welcome-feature-desc">
              Tracks planned maintenance across 8 LGUs. Tap <strong>Pin My Barangay</strong> to monitor your neighborhood with zero logins, or switch to <strong>List View</strong> for fast text reading on LTE.
            </div>
          </div>
        </div>

        <!-- Feature 2: Quakes & Severe Weather -->
        <div class="welcome-feature-item">
          <div class="welcome-feature-icon" style="background: rgba(139, 92, 246, 0.15); color: #A78BFA; border: 1px solid rgba(139, 92, 246, 0.3);">
            ${ICONS.earthquake}
          </div>
          <div class="welcome-feature-content">
            <div class="welcome-feature-title">Seismic &amp; Severe Weather Alerts</div>
            <div class="welcome-feature-desc">
              Real-time DOST-PHIVOLCS earthquake epicenters within 300 km (filtering distant micro-quakes by default) and active DOST-PAGASA Tropical Cyclone Wind Signals (TCWS #1–5).
            </div>
          </div>
        </div>

        <!-- Feature 3: Offline-Ready & Non-Commercial -->
        <div class="welcome-feature-item">
          <div class="welcome-feature-icon" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);">
            ${ICONS.shield}
          </div>
          <div class="welcome-feature-content">
            <div class="welcome-feature-title">Offline-Ready &amp; Zero Trackers</div>
            <div class="welcome-feature-desc">
              Non-commercial public service. Zero advertisements, zero accounts, and zero cookies. Engineered to preserve battery and work during network brownouts.
            </div>
          </div>
        </div>
      </div>

      <div class="welcome-modal-footer">
        <button id="btn-welcome-explore" class="welcome-btn-primary">
          <span>Explore Dashboard</span>
          <span aria-hidden="true">→</span>
        </button>
        <button id="btn-welcome-about" class="welcome-btn-secondary">
          <span>Read Known Limitations &amp; Hotlines</span>
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
