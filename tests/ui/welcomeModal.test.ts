/**
 * Unit Tests for First-Entry Civic Onboarding Guide & Welcome Modal Component.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  renderWelcomeModal,
  hasSeenWelcomeGuide,
  markWelcomeGuideSeen,
  WELCOME_STORAGE_KEY,
} from "../../src/ui/components/welcomeModal.js";

function createMockElement(): any {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const attrs: Record<string, string> = {};
  const classListSet = new Set<string>();
  let innerHTMLValue = "";

  const elem: any = {
    className: "",
    style: { display: "" },
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
    querySelector: vi.fn((sel: string) => {
      if (innerHTMLValue.includes(sel.replace(/^[#.]/, ""))) {
        return createMockElement();
      }
      return null;
    }),
    querySelectorAll: vi.fn(() => []),
  };
  return elem;
}

describe("Welcome Modal & Onboarding Guide Component", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("hasSeenWelcomeGuide tracks state correctly in localStorage", () => {
    expect(hasSeenWelcomeGuide()).toBe(false);
    markWelcomeGuideSeen();
    expect(hasSeenWelcomeGuide()).toBe(true);
    expect((globalThis as any).localStorage.getItem(WELCOME_STORAGE_KEY)).toBe("1");
  });

  it("renderWelcomeModal hides container when isOpen is false", () => {
    const container = createMockElement();
    renderWelcomeModal(container, false, () => {}, () => {});

    expect(container.style.display).toBe("none");
    expect(container.innerHTML).toBe("");
    expect(container.classList.contains("open")).toBe(false);
  });

  it("renderWelcomeModal renders 3 core civic features, coverage limits, and action buttons when open", () => {
    const container = createMockElement();
    renderWelcomeModal(container, true, () => {}, () => {}, () => {});

    expect(container.style.display).toBe("flex");
    expect(container.classList.contains("open")).toBe(true);
    expect(container.innerHTML).toContain('class="welcome-brand-logo"');
    expect(container.innerHTML).toContain('src="/icons/icon.svg"');
    expect(container.innerHTML).not.toContain("welcome-subtitle");
    expect(container.innerHTML).toContain("Brownout Schedules");
    expect(container.innerHTML).toContain("Earthquakes, Storms &amp; Air Quality");
    expect(container.innerHTML).toContain("Works on Weak Signal");
    expect(container.innerHTML).toContain("24/7 Emergency Hotlines");
    expect(container.innerHTML).toContain("welcome-emergency-bar");
    expect(container.innerHTML).toContain('href="tel:0322557371"');
    expect(container.innerHTML).toContain('href="tel:911"');
    expect(container.innerHTML).toContain("Covers VECO areas only");
    expect(container.innerHTML).toContain('id="btn-welcome-pin"');
    expect(container.innerHTML).toContain('id="btn-welcome-explore"');
    expect(container.innerHTML).toContain('id="btn-welcome-about"');
    expect(container.innerHTML).toContain('id="btn-welcome-close"');
  });
});
