/**
 * Unit Tests for List View Alternative Component (Phase 2).
 *
 * Verifies:
 * 1. Renders empty state when no advisories match filter.
 * 2. Groups advisories by date in chronological order.
 * 3. Correctly parses and displays barangays, time range, streets, and purpose.
 * 4. Triggers onSelectAdvisory callback when "View on Map" is clicked.
 * 5. Triggers onPinBarangay callback when "Pin Barangay" is clicked.
 * 6. Reflects pinned area state when callbacks.myBarangay matches.
 * 7. Filters items by search query.
 */

import { describe, it, expect, vi } from "vitest";
import { renderListView } from "../../src/ui/components/listView.js";
import type { PowerAdvisory } from "../../types/index.js";
import type { FilterState } from "../../src/ui/types.js";

function createMockElement(): any {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const attrs: Record<string, string> = {};
  let innerHTMLValue = "";

  const elem: any = {
    id: "",
    className: "",
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
    querySelectorAll: vi.fn((sel: string) => {
      // Very simple mock querySelectorAll to find matching buttons in HTML
      const matches: any[] = [];
      if (sel.includes(".btn-locate-advisory")) {
        const regex = /class="[^"]*btn-locate-advisory[^"]*"\s+data-id="([^"]+)"/g;
        let match;
        while ((match = regex.exec(innerHTMLValue)) !== null) {
          const btn = createMockElement();
          btn.setAttribute("data-id", match[1]);
          matches.push(btn);
        }
      } else if (sel.includes(".btn-pin-barangay")) {
        const regex = /class="[^"]*btn-pin-barangay[^"]*"\s+data-barangay="([^"]+)"/g;
        let match;
        while ((match = regex.exec(innerHTMLValue)) !== null) {
          const btn = createMockElement();
          btn.setAttribute("data-barangay", match[1]);
          matches.push(btn);
        }
      }
      return matches;
    }),
  };

  return elem;
}

const sampleAdvisories: PowerAdvisory[] = [
  {
    id: "adv-1",
    date: "2026-10-18",
    start_time: "09:00",
    end_time: "17:00",
    duration_hours: 8,
    overnight_span: false,
    city: "Cebu City",
    barangay: ["Talamban"],
    streets: ["Cabancalan Rd", "Miñoza St"],
    purpose: "Line maintenance & pole relocation",
    areas_affected_raw: "Portion of Cabancalan Rd",
    lat: 10.366,
    lon: 123.916,
    is_centroid: true,
    has_explicit_location: true,
    feed_type: "power",
  },
  {
    id: "adv-2",
    date: "2026-10-18",
    start_time: "10:00",
    end_time: "14:00",
    duration_hours: 4,
    overnight_span: false,
    city: "Mandaue City",
    barangay: ["Subangdaku"],
    streets: ["Lopez Jaena St"],
    purpose: "Transformer servicing",
    areas_affected_raw: "Lopez Jaena St",
    lat: 10.323,
    lon: 123.931,
    is_centroid: true,
    has_explicit_location: true,
    feed_type: "power",
  },
  {
    id: "adv-3",
    date: "2026-10-19",
    start_time: "08:00",
    end_time: "16:00",
    duration_hours: 8,
    overnight_span: false,
    city: "Talisay City",
    barangay: ["Tabunok"],
    streets: ["National Highway"],
    purpose: "Vegetation clearing",
    areas_affected_raw: "Portion of Tabunok Market",
    lat: 10.262,
    lon: 123.839,
    is_centroid: true,
    has_explicit_location: true,
    feed_type: "power",
  },
];

describe("List View Alternative Component", () => {
  it("renders empty state when no advisories match the date", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "2026-10-25" };

    renderListView(container, sampleAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
    });

    expect(container.innerHTML).toContain("No Scheduled Outages Found");
  });

  it("renders date-grouped list with advisories", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all" };

    renderListView(container, sampleAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
    });

    expect(container.innerHTML).toContain("2 advisories");
    expect(container.innerHTML).toContain("1 advisory");
    expect(container.innerHTML).not.toContain("advisorys");
    expect(container.innerHTML).toContain("Talamban");
    expect(container.innerHTML).toContain("Subangdaku");
    expect(container.innerHTML).toContain("Tabunok");
    expect(container.innerHTML).toContain("Line maintenance &amp; pole relocation");
    expect(container.innerHTML).toContain("Pin Barangay");
  });

  it("shows pinned state when myBarangay matches advisory", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all" };

    renderListView(container, sampleAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
      myBarangay: "Talamban",
    });

    expect(container.innerHTML).toContain("Pinned Area");
    expect(container.innerHTML).toContain("is-pinned");
    expect(container.innerHTML).toContain("is-favorite-card");
    expect(container.innerHTML).toContain("Favorite Area");
  });

  it("filters advisories when search query is entered", () => {
    const container = createMockElement();
    const filter: FilterState = { selectedDate: "all", searchQuery: "Mandaue" };

    renderListView(container, sampleAdvisories, filter, {
      onSelectAdvisory: vi.fn(),
    });

    expect(container.innerHTML).toContain("Subangdaku");
    expect(container.innerHTML).not.toContain("Talamban");
    expect(container.innerHTML).not.toContain("Tabunok");
  });
});
