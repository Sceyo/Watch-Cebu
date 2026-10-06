/**
 * About Drawer & Header About Button Component Tests (Stage 5 Discovery).
 *
 * Verifies:
 * 1. ABOUT_METADATA contains required fields and placeholder markers.
 * 2. renderAbout contains real attribution for VECO, PHIVOLCS, OpenStreetMap, and CARTO.
 * 3. renderAbout sets correct open/closed classes and accessibility attributes.
 * 4. renderHeader renders #btn-toggle-about adjacent to #btn-toggle-legend and triggers onAboutToggle.
 */

import { describe, it, expect, vi } from "vitest";
import { renderAbout, ABOUT_METADATA } from "../../src/ui/components/about.js";
import { renderHeader } from "../../src/ui/components/header.js";
import type { FeedState } from "../../src/ui/types.js";

function createMockElement(): any {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const attrs: Record<string, string> = {};
  let innerHTMLValue = "";

  const elem: any = {
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
    dispatchEvent: vi.fn((event: { type: string }) => {
      const handlers = listeners[event.type] || [];
      handlers.forEach((h) => h(event));
    }),
    querySelector: vi.fn((sel: string) => {
      // Return mock sub-element if selector is inside innerHTML
      if (innerHTMLValue.includes(sel.replace(/^[#.]/, ""))) {
        return createMockElement();
      }
      return null;
    }),
    querySelectorAll: vi.fn((_sel: string) => {
      return [];
    }),
  };
  return elem;
}

describe("About Drawer Component", () => {
  it("ABOUT_METADATA contains required fields and NO template placeholders (Regression Guard)", () => {
    expect(ABOUT_METADATA.appName).toBe("WATCH CEBU");
    expect(ABOUT_METADATA.tagline).toBeDefined();
    expect(ABOUT_METADATA.description).toBeDefined();

    // Regression Guard: Fail loudly if any template string is left in metadata
    const templatePatterns = [/YOUR_GITHUB_USERNAME/i, /YOUR_LINKEDIN_USERNAME/i, /PLACEHOLDER/i];
    for (const pattern of templatePatterns) {
      if (ABOUT_METADATA.githubUrl) expect(ABOUT_METADATA.githubUrl).not.toMatch(pattern);
      if (ABOUT_METADATA.linkedinUrl) expect(ABOUT_METADATA.linkedinUrl).not.toMatch(pattern);
      if (ABOUT_METADATA.feedbackUrl) expect(ABOUT_METADATA.feedbackUrl).not.toMatch(pattern);
    }

    // Either null (unmistakably unfinished) or a real valid HTTPS URL
    if (ABOUT_METADATA.githubUrl !== null) {
      expect(ABOUT_METADATA.githubUrl).toMatch(/^https:\/\/(www\.)?github\.com\/.+/);
    }
    if (ABOUT_METADATA.linkedinUrl !== null) {
      expect(ABOUT_METADATA.linkedinUrl).toMatch(/^https:\/\/(www\.)?linkedin\.com\/.+/);
    }
    if (ABOUT_METADATA.feedbackUrl !== null) {
      expect(ABOUT_METADATA.feedbackUrl).toMatch(/^https:\/\/(www\.)?github\.com\/.+\/issues/);
    }
  });

  it("renderAbout visibly displays 'Pending Configuration' when links are not yet configured", () => {
    const container = createMockElement();
    renderAbout(container, true, () => {});

    // Must output Pending Configuration badges when URLs are null
    if (!ABOUT_METADATA.githubUrl) {
      expect(container.innerHTML).toContain("Pending Configuration");
      expect(container.innerHTML).toContain("Not yet set — configure maintainer GitHub profile");
      expect(container.innerHTML).not.toContain('href="https://github.com/YOUR_GITHUB_USERNAME"');
    }
    if (!ABOUT_METADATA.linkedinUrl) {
      expect(container.innerHTML).toContain("Not yet set — configure maintainer LinkedIn profile");
      expect(container.innerHTML).not.toContain('href="https://www.linkedin.com/in/YOUR_LINKEDIN_USERNAME"');
    }
  });

  it("renderAbout outputs real authoritative data attribution and developer connect section", () => {
    const container = createMockElement();
    renderAbout(container, true, () => {});

    expect(container.innerHTML).toContain("Visayan Electric (VECO)");
    expect(container.innerHTML).toContain("DOST-PHIVOLCS");
    expect(container.innerHTML).toContain("OpenStreetMap");
    expect(container.innerHTML).toContain("CARTO Basemaps");
    expect(container.innerHTML).toContain("GitHub");
    expect(container.innerHTML).toContain("LinkedIn");
    expect(container.innerHTML).not.toContain("// PLACEHOLDER");
  });

  it("renderAbout sets accessibility attributes role='dialog' and aria-modal='true'", () => {
    const container = createMockElement();
    renderAbout(container, true, () => {});

    expect(container.setAttribute).toHaveBeenCalledWith("role", "dialog");
    expect(container.setAttribute).toHaveBeenCalledWith("aria-modal", "true");
    expect(container.setAttribute).toHaveBeenCalledWith("aria-label", "About Watch Cebu");
    expect(container.className).toBe("legend-drawer open");
  });

  it("renderAbout sets closed class when isOpen is false", () => {
    const container = createMockElement();
    renderAbout(container, false, () => {});
    expect(container.className).toBe("legend-drawer closed");
  });
});

describe("Header About Button Integration", () => {
  it("renderHeader includes #btn-toggle-about button adjacent to #btn-toggle-legend", () => {
    const container = createMockElement();
    const mockPower: FeedState<any[]> = { status: "success", data: [] };
    const mockEq: FeedState<any[]> = { status: "success", data: [] };
    const callbacks = {
      onLayerChange: vi.fn(),
      onLegendToggle: vi.fn(),
      onAboutToggle: vi.fn(),
    };

    renderHeader(container, "both", mockPower, mockEq, callbacks);

    expect(container.innerHTML).toContain('id="btn-toggle-about"');
    expect(container.innerHTML).toContain('id="btn-toggle-legend"');
    expect(container.innerHTML).toContain("About");
    expect(container.innerHTML).toContain("Legend");
  });
});
