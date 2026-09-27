/**
 * Day-Tab Navigation Component for VECO Power Advisories.
 *
 * Implements Stage 3 requirements:
 * - Dynamic tabs for the advisory week dates (e.g. Sep 6 to Sep 12).
 * - Real per-day counts calculated from resolved advisories.
 * - Filters map view by date on click.
 */

import type { PowerAdvisory } from "../../types/index.js";

export function calculateDayDistribution(advisories: PowerAdvisory[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of advisories) {
    counts[a.date] = (counts[a.date] || 0) + 1;
  }
  return counts;
}

export function formatTabDateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${monthNames[m] || parts[1]} ${d}`;
}

export function renderDayTabs(
  container: HTMLElement,
  advisories: PowerAdvisory[],
  selectedDate: string,
  onSelectDate: (date: string) => void
): void {
  const distribution = calculateDayDistribution(advisories);
  const sortedDates = Object.keys(distribution).sort();
  const totalCount = advisories.length;

  let tabsHtml = `
    <button class="day-tab ${selectedDate === 'all' ? 'active' : ''}" data-date="all">
      <span class="tab-label">All Week</span>
      <span class="tab-badge">${totalCount}</span>
    </button>
  `;

  for (const date of sortedDates) {
    const count = distribution[date];
    const label = formatTabDateLabel(date);
    const isActive = selectedDate === date ? "active" : "";
    tabsHtml += `
      <button class="day-tab ${isActive}" data-date="${date}">
        <span class="tab-label">${label}</span>
        <span class="tab-badge">${count}</span>
      </button>
    `;
  }

  container.innerHTML = `
    <div class="day-tabs-scroll">
      ${tabsHtml}
    </div>
  `;

  const tabs = container.querySelectorAll<HTMLButtonElement>(".day-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const date = tab.getAttribute("data-date") || "all";
      onSelectDate(date);
    });
  });
}
