/**
 * Data Source Warning Banner Component.
 *
 * Implements Stage 3 Requirement:
 * - Transparently discloses when fixture fallback data is in use instead of live scrapes.
 * - Loud, visible, dismissible-per-session notification.
 * - Displays the actual failure reason from parse_notes.
 */

import type { FeedState } from "../types.js";
import type { PowerAdvisory, EarthquakeEvent } from "../../types/index.js";

let bannerDismissed = false;

export function renderDataSourceBanner(
  container: HTMLElement,
  powerState: FeedState<PowerAdvisory[]>,
  eqState: FeedState<EarthquakeEvent[]>
): void {
  const fallbacks: string[] = [];

  if (powerState.dataSource === "fixture_fallback") {
    fallbacks.push(`<strong>Power:</strong> Live VECO advisory scrape couldn't complete (${powerState.parseNotes || 'Source unreachable'}). Displaying verified September 6–12 backup advisory fixture.`);
  }

  if (eqState.dataSource === "fixture_fallback") {
    fallbacks.push(`<strong>Earthquakes:</strong> Live PHIVOLCS feed couldn't complete (${eqState.parseNotes || 'Source unreachable'}). Displaying verified backup bulletin fixture.`);
  }

  if (fallbacks.length === 0 || bannerDismissed) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div class="data-fallback-banner">
      <div class="banner-content">
        <span class="banner-icon">⚠️</span>
        <div class="banner-text">
          <div class="banner-heading">Notice: Using Backup Reference Data</div>
          <div class="banner-details">${fallbacks.join("<br/>")}</div>
        </div>
      </div>
      <button class="banner-close-btn" id="btn-dismiss-banner" title="Dismiss notice for this session">✕</button>
    </div>
  `;

  const closeBtn = container.querySelector("#btn-dismiss-banner");
  closeBtn?.addEventListener("click", () => {
    bannerDismissed = true;
    container.style.display = "none";
  });
}
