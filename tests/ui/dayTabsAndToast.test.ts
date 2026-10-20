/**
 * Unit Tests for Day Tabs Advance Notice and Toast Civic Feedback.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderDayTabs } from "../../src/ui/components/dayTabs.js";
import { showToast } from "../../src/ui/components/mobileNav.js";
import type { PowerAdvisory } from "../../types/index.js";
import fs from "node:fs";
import path from "node:path";

function createMockElement(): any {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const attrs: Record<string, string> = {};
  const classListSet = new Set<string>();
  let innerHTMLValue = "";

  const elem: any = {
    id: "",
    className: "",
    children: [] as any[],
    classList: {
      add: (cls: string) => classListSet.add(cls),
      remove: (cls: string) => classListSet.delete(cls),
      contains: (cls: string) => classListSet.has(cls),
    },
    get innerHTML() {
      return innerHTMLValue;
    },
    set innerHTML(val: string) {
      innerHTMLValue = val;
    },
    setAttribute: vi.fn((k: string, v: string) => {
      attrs[k] = v;
    }),
    getAttribute: vi.fn((k: string) => attrs[k] ?? null),
    addEventListener: vi.fn((event: string, handler: any) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    querySelectorAll: vi.fn(() => []),
    appendChild: vi.fn((child: any) => {
      elem.children.push(child);
      return child;
    }),
    querySelector: vi.fn((sel: string) => {
      return elem.children.find((c: any) => {
        if (sel.includes("toast-success") && c.className.includes("toast-success")) return true;
        if (sel.includes("toast-warning") && c.className.includes("toast-warning")) return true;
        if (sel.includes("toast-info") && c.className.includes("toast-info")) return true;
        return false;
      }) ?? null;
    }),
  };

  return elem;
}

const mockFutureAdvisories: PowerAdvisory[] = [
  {
    id: "adv-1",
    source_url: "https://visayanelectric.com",
    fetched_at: "2026-10-15T08:00:00Z",
    advisory_week_start: "2026-10-18",
    date: "2026-10-18",
    start_time: "08:00",
    end_time: "17:00",
    overnight_span: false,
    duration_hours: 9,
    purpose: "Testing",
    city: "Cebu City",
    barangay: ["Lahug"],
    streets: ["Gorordo Ave"],
    areas_affected_raw: "Lahug",
    lat: 10.33,
    lon: 123.9,
    coordinate_source: "osm_point",
    geocode_query: null,
    geocode_provider: null,
    business_confidence: "scheduled",
    parse_confidence: "high",
    parse_notes: null,
  },
  {
    id: "adv-2",
    source_url: "https://visayanelectric.com",
    fetched_at: "2026-10-15T08:00:00Z",
    advisory_week_start: "2026-10-18",
    date: "2026-10-20",
    start_time: "08:00",
    end_time: "17:00",
    overnight_span: false,
    duration_hours: 9,
    purpose: "Testing",
    city: "Mandaue City",
    barangay: ["Subangdaku"],
    streets: ["Lopez Jaena"],
    areas_affected_raw: "Subangdaku",
    lat: 10.32,
    lon: 123.92,
    coordinate_source: "osm_point",
    geocode_query: null,
    geocode_provider: null,
    business_confidence: "scheduled",
    parse_confidence: "high",
    parse_notes: null,
  },
];

describe("Day Tabs Filter Bar", () => {
  it("renders clean horizontal day tabs starting with All Week", () => {
    const container = createMockElement();
    renderDayTabs(container, mockFutureAdvisories, "all", () => {}, "2026-10-15");

    expect(container.innerHTML).toContain("day-tabs-scroll");
    expect(container.innerHTML).toContain("All Week");
    expect(container.innerHTML).toContain("Oct 18");
    expect(container.innerHTML).toContain("Oct 20");
  });

  it("highlights active date tab and marks today tab when date matches today", () => {
    const container = createMockElement();
    renderDayTabs(container, mockFutureAdvisories, "all", () => {}, "2026-10-18");

    expect(container.innerHTML).toContain("today-tab");
    expect(container.innerHTML).toContain("Today");
    expect(container.innerHTML).toContain("Oct 18");
  });

  it("highlights specific selected date tab as active and un-highlights All Week", () => {
    const container = createMockElement();
    renderDayTabs(container, mockFutureAdvisories, "2026-10-20", () => {}, "2026-10-15");

    expect(container.innerHTML).toContain('data-date="2026-10-20" role="tab" aria-selected="true"');
    expect(container.innerHTML).toContain('class="day-tab active"');
    expect(container.innerHTML).toContain('data-date="all" role="tab" aria-selected="false"');
  });

  it("preserves horizontal scroll position when re-rendering day tabs", () => {
    let scrollLeftVal = 142;
    const mockScrollContainer: any = {
      get scrollLeft() {
        return scrollLeftVal;
      },
      set scrollLeft(v: number) {
        scrollLeftVal = v;
      },
    };
    const container = createMockElement();
    container.querySelector = vi.fn((sel: string) => {
      if (sel.includes("day-tabs-scroll")) return mockScrollContainer;
      return null;
    });

    renderDayTabs(container, mockFutureAdvisories, "all", () => {}, "2026-10-15");
    expect(scrollLeftVal).toBe(142);

    renderDayTabs(container, mockFutureAdvisories, "2026-10-20", () => {}, "2026-10-15");
    expect(scrollLeftVal).toBe(142);
  });
});

describe("Civic Search Feedback Toast Notifications", () => {
  let mockContainer: any;

  beforeEach(() => {
    mockContainer = createMockElement();
    mockContainer.id = "toast-container";

    (globalThis as any).document = {
      getElementById: (id: string) => (id === "toast-container" ? mockContainer : null),
      createElement: (tag: string) => {
        const el = createMockElement();
        return el;
      },
      body: {
        appendChild: (el: any) => el,
      },
    };

    (globalThis as any).requestAnimationFrame = (cb: () => void) => cb();
  });

  afterEach(() => {
    delete (globalThis as any).document;
    delete (globalThis as any).requestAnimationFrame;
  });

  it("renders success toast with checkmark icon when no active advisories are found", () => {
    showToast("Centered on Guadalupe, Cebu City — No active advisories in this area.");
    const toast = mockContainer.querySelector(".toast-message.toast-success");
    expect(toast).not.toBeNull();
    expect(toast?.className).toContain("toast-success");
    expect(toast?.innerHTML).toContain("No active advisories");
  });

  it("renders warning toast with alert icon when no location is found", () => {
    showToast('No location found for "xyz123" in Cebu.');
    const toast = mockContainer.querySelector(".toast-message.toast-warning");
    expect(toast).not.toBeNull();
    expect(toast?.className).toContain("toast-warning");
    expect(toast?.innerHTML).toContain("No location found");
  });

  it("renders info toast with bolt icon when active pins are found", () => {
    showToast('Found 3 active pins for "Lahug".');
    const toast = mockContainer.querySelector(".toast-message.toast-info");
    expect(toast).not.toBeNull();
    expect(toast?.className).toContain("toast-info");
    expect(toast?.innerHTML).toContain("Found 3 active pins");
  });
});

describe("Global WCAG 2.2 Focus Appearance (:focus-visible)", () => {
  it("defines high-contrast 2px cyan focus-visible outline with offset in main.css", () => {
    const cssPath = path.resolve(__dirname, "../../src/ui/styles/main.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain(":focus-visible");
    expect(cssContent).toContain("outline: 2px solid #38BDF8 !important;");
    expect(cssContent).toContain("outline-offset: 2px !important;");
    expect(cssContent).toContain(".day-tab:focus-visible");
    expect(cssContent).toContain(".search-submit-btn:focus-visible");
  });
});

describe("Search Suggestions Stacking & Z-Index Architecture", () => {
  it("enforces higher stacking context for search row over layer bar and banner in main.css", () => {
    const cssPath = path.resolve(__dirname, "../../src/ui/styles/main.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Search row & wrapper priority
    expect(cssContent).toMatch(/\.map-search-row\s*\{[^}]*z-index:\s*200;/);
    expect(cssContent).toMatch(/\.search-input-wrapper\s*\{[^}]*z-index:\s*200;/);

    // Layer bar and pinned banner constrained below search
    expect(cssContent).toMatch(/\.mobile-layer-segmented-bar\s*\{[^}]*z-index:\s*10;/);
    expect(cssContent).toMatch(/\.my-barangay-status-banner\s*\{[^}]*z-index:\s*10;/);

    // Suggestions dropdown positioned directly below input with high elevation
    expect(cssContent).toMatch(/\.search-suggestions-dropdown\s*\{[^}]*top:\s*calc\(100%\s*\+\s*4px\);/);
    expect(cssContent).toMatch(/\.search-suggestions-dropdown\s*\{[^}]*z-index:\s*1050;/);
  });
});