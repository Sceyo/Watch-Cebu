/**
 * Offline Mode Banner Component
 *
 * Informs citizens when the application is running disconnected from the network
 * and relying on local Service Worker and IndexedDB / LocalStorage cached civic advisories.
 */

export function renderOfflineBanner(
  container: HTMLElement,
  isOnline: boolean
): void {
  const existingBanner = container.querySelector("#offline-status-banner");

  if (isOnline) {
    if (existingBanner) {
      existingBanner.remove();
      if (container.children && container.children.length === 0) {
        container.style.display = "none";
      }
    }
    return;
  }

  container.style.display = "block";

  if (!existingBanner) {
    if (typeof document !== "undefined" && document.createElement) {
      const banner = document.createElement("div");
      banner.id = "offline-status-banner";
      banner.className = "data-fallback-banner offline-banner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      banner.innerHTML = `
        <div class="banner-content">
          <span class="banner-icon" aria-hidden="true">📡</span>
          <div class="banner-text">
            <div class="banner-heading">Offline Mode — Serving Cached Advisories</div>
            <div class="banner-details">
              No internet connection. Viewing locally cached power, earthquake, and weather data. Emergency hotlines remain accessible in About.
            </div>
          </div>
        </div>
      `;
      container.appendChild(banner);
    } else {
      container.innerHTML += `
        <div id="offline-status-banner" class="data-fallback-banner offline-banner" role="status" aria-live="polite">
          <div class="banner-content">
            <span class="banner-icon" aria-hidden="true">📡</span>
            <div class="banner-text">
              <div class="banner-heading">Offline Mode — Serving Cached Advisories</div>
              <div class="banner-details">
                No internet connection. Viewing locally cached power, earthquake, and weather data. Emergency hotlines remain accessible in About.
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }
}
