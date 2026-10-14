/**
 * Automated PWA, Offline Resilience & Emergency Hotlines Verification.
 *
 * Enforces:
 * 1. Web App Manifest conforms to W3C spec with standalone display, themes, and icons.
 * 2. Service Worker exists, defines multi-tier caching (static shell, api, bounded tiles).
 * 3. Network status service tracks connectivity transitions and exports Cebu emergency hotlines.
 * 4. Offline banner accurately reflects network state without clobbering data fallback banner.
 * 5. index.html contains required PWA meta tags and manifest link.
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  isOnline,
  onNetworkChange,
  CEBU_EMERGENCY_HOTLINES,
} from "../../src/ui/services/networkStatus.js";
import { renderOfflineBanner } from "../../src/ui/components/offlineBanner.js";

function createMockElement(): any {
  let innerHTMLValue = "";
  const style: Record<string, string> = { display: "none" };

  const elem: any = {
    id: "",
    className: "",
    style,
    children: [],
    get innerHTML() {
      return innerHTMLValue;
    },
    set innerHTML(val: string) {
      innerHTMLValue = val;
    },
    querySelector: vi.fn((sel: string) => {
      const cleanId = sel.replace(/^[#.]/, "");
      if (innerHTMLValue.includes(cleanId)) {
        return {
          id: cleanId,
          textContent: innerHTMLValue,
          remove: () => {
            innerHTMLValue = "";
          },
        };
      }
      return null;
    }),
  };
  return elem;
}

describe("PWA Manifest & Asset Integrity", () => {
  const manifestPath = resolve(__dirname, "../../public/manifest.webmanifest");
  const htmlPath = resolve(__dirname, "../../index.html");

  it("manifest.webmanifest exists and contains valid JSON with required PWA fields", () => {
    expect(existsSync(manifestPath)).toBe(true);
    const content = JSON.parse(readFileSync(manifestPath, "utf-8"));

    expect(content.name).toContain("Watch Cebu");
    expect(content.short_name).toBe("Watch Cebu");
    expect(content.display).toBe("standalone");
    expect(content.start_url).toBe("/");
    expect(content.theme_color).toBe("#0F172A");
    expect(content.background_color).toBe("#020617");
    expect(Array.isArray(content.icons)).toBe(true);
    expect(content.icons.length).toBeGreaterThanOrEqual(3);

    // Verify maskable and regular icons exist
    const has192 = content.icons.some((i: any) => i.sizes === "192x192");
    const has512 = content.icons.some((i: any) => i.sizes === "512x512");
    const hasMaskable = content.icons.some((i: any) => i.purpose === "maskable");
    expect(has192).toBe(true);
    expect(has512).toBe(true);
    expect(hasMaskable).toBe(true);
  });

  it("PWA icons exist in public/icons/", () => {
    const iconSvg = resolve(__dirname, "../../public/icons/icon.svg");
    const icon192 = resolve(__dirname, "../../public/icons/icon-192.png");
    const icon512 = resolve(__dirname, "../../public/icons/icon-512.png");

    expect(existsSync(iconSvg)).toBe(true);
    expect(existsSync(icon192)).toBe(true);
    expect(existsSync(icon512)).toBe(true);
  });

  it("index.html contains manifest link and PWA mobile meta tags", () => {
    const html = readFileSync(htmlPath, "utf-8");
    expect(html).toMatch(/<link\s+rel=["']manifest["']\s+href=["']\/manifest\.webmanifest["']/);
    expect(html).toMatch(/<meta\s+name=["']theme-color["']\s+content=["']#0F172A["']/);
    expect(html).toMatch(/<meta\s+name=["']apple-mobile-web-app-capable["']\s+content=["']yes["']/);
    expect(html).toMatch(/<link\s+rel=["']apple-touch-icon["']\s+href=["']\/icons\/icon-192\.png["']/);
  });
});

describe("Service Worker Architecture & Caching Strategy", () => {
  const swPath = resolve(__dirname, "../../public/sw.js");

  it("public/sw.js exists and implements 3-tier caching with bounded tile storage", () => {
    expect(existsSync(swPath)).toBe(true);
    const swCode = readFileSync(swPath, "utf-8");

    // Tier 1: Static Shell
    expect(swCode).toMatch(/CACHE_VERSION/);
    expect(swCode).toMatch(/PRECACHE_ASSETS/);
    expect(swCode).toMatch(/install/);
    expect(swCode).toMatch(/activate/);

    // Tier 2: Dynamic API Caching (/api/)
    expect(swCode).toMatch(/\/api\//);
    expect(swCode).toMatch(/offline_cache/);

    // Tier 3: Bounded Tile Caching with LRU cap
    expect(swCode).toMatch(/MAX_CACHED_TILES/);
    expect(swCode).toMatch(/trimCache/);
    expect(swCode).toMatch(/cartocdn\.com/);
  });
});

describe("Network Status & Civic Emergency Hotlines", () => {
  it("CEBU_EMERGENCY_HOTLINES contains critical disaster and utility responders", () => {
    expect(CEBU_EMERGENCY_HOTLINES.length).toBeGreaterThanOrEqual(4);

    const hasDrrmo = CEBU_EMERGENCY_HOTLINES.some((h) => h.name.includes("DRRMO"));
    const hasVeco = CEBU_EMERGENCY_HOTLINES.some((h) => h.name.includes("VECO"));
    const hasRedCross = CEBU_EMERGENCY_HOTLINES.some((h) => h.name.includes("Red Cross"));
    const hasBfp = CEBU_EMERGENCY_HOTLINES.some((h) => h.name.includes("Fire"));

    expect(hasDrrmo).toBe(true);
    expect(hasVeco).toBe(true);
    expect(hasRedCross).toBe(true);
    expect(hasBfp).toBe(true);

    for (const hotline of CEBU_EMERGENCY_HOTLINES) {
      expect(hotline.phone.startsWith("tel:")).toBe(true);
      expect(hotline.displayPhone.length).toBeGreaterThan(0);
      expect(hotline.available).toBe("24/7");
    }
  });

  it("isOnline() returns navigator.onLine state or fallback", () => {
    expect(typeof isOnline()).toBe("boolean");
  });

  it("onNetworkChange registers and unregisters window event listeners cleanly", () => {
    const listeners: Record<string, ((...args: any[]) => void)[]> = {};
    const mockWindow = {
      addEventListener: vi.fn((event: string, handler: any) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: any) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((h) => h !== handler);
        }
      }),
    };

    (globalThis as any).window = mockWindow;

    const callback = vi.fn();
    const unsubscribe = onNetworkChange(callback);

    expect(mockWindow.addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(mockWindow.addEventListener).toHaveBeenCalledWith("offline", expect.any(Function));

    // Simulate offline
    listeners["offline"]?.forEach((fn) => fn(new Event("offline")));
    expect(callback).toHaveBeenCalledWith(false);

    // Simulate online
    listeners["online"]?.forEach((fn) => fn(new Event("online")));
    expect(callback).toHaveBeenCalledWith(true);

    unsubscribe();
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith("offline", expect.any(Function));

    delete (globalThis as any).window;
  });
});

describe("Offline Mode Banner Component", () => {
  it("renders #offline-status-banner when offline", () => {
    const container = createMockElement();
    renderOfflineBanner(container, false);

    expect(container.style.display).toBe("block");
    const banner = container.querySelector("#offline-status-banner");
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain("Offline Mode");
    expect(banner?.textContent).toContain("Serving Cached Advisories");
  });

  it("removes #offline-status-banner when connection is restored", () => {
    const container = createMockElement();
    renderOfflineBanner(container, false);
    expect(container.querySelector("#offline-status-banner")).not.toBeNull();

    renderOfflineBanner(container, true);
    expect(container.querySelector("#offline-status-banner")).toBeNull();
    expect(container.style.display).toBe("none");
  });
});
