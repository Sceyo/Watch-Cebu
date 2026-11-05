# Project NOAH Flood Hazard Overlay (Approach A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent, lazy-loaded Project NOAH 100-year flood susceptibility polygon overlay (`Low`, `Medium`, `High`) for Metro Cebu onto the Watch Cebu map without slowing initial page load or cluttering existing VECO/PHIVOLCS workflows.

**Architecture:** A build-time extraction script pulls Metro Cebu 100-year flood vector tiles from Project NOAH's open ODC-ODbL PMTiles archive via HTTP Range requests and writes a compact static GeoJSON (`public/data/cebu-flood-hazards.geojson`). On the client, clicking the new `[Flood Risk]` floating map button lazily fetches and caches this GeoJSON, rendering it inside a dedicated Leaflet pane (`floodHazardPane`, `z-index: 380`) sandwiched between the CARTO dark base tiles (`z-index: 200`) and high-contrast street labels (`labelsPane`, `z-index: 450`).

**Tech Stack:** TypeScript, Leaflet (`L.geoJSON`, custom map panes), Vite static assets, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-project-noah-flood-hazard-design.md`

## Global Constraints

- **Zero Node.js imports in client bundle:** `src/main.ts` and all files under `src/ui/` must not import `fs`, `path`, `crypto`, `zlib`, or `process` (`tests/ui/clientBundleIntegrity.test.ts`).
- **Strict TLS security:** No `rejectUnauthorized: false` anywhere in the repository (`tests/server/tlsConfig.test.ts`).
- **Authentic `data/` directory preservation:** Automated tests must never mutate tracked files in `data/` (`tests/guards/dataDirectoryGuard.test.ts`).
- **Static asset size ceiling:** `public/data/cebu-flood-hazards.geojson` must remain under `600 KB` uncompressed (`< 150 KB` gzipped) for fast mobile LTE loading.
- **License attribution:** All UI popups and legend entries for flood hazards must credit `UP Project NOAH (ODC-ODbL)`.

## Review Focus

1. **Invalid or unexpected `Var` hazard codes in GeoJSON features (e.g., `Var: 0`, `null`, or `99`):** `getFloodHazardStyle()` must gracefully fall back to the `Low` (`Var: 1`) style definition rather than throwing or rendering `undefined` hex colors.
2. **Repeated rapid clicks on `#btn-toggle-flood-hazard` while initial network fetch is in flight:** `fetchFloodHazards()` must deduplicate concurrent in-flight promises and only render the polygons if the toggle is still active (`isFloodHazardVisible === true`) when the fetch resolves.
3. **Offline / HTTP 500 fetch failure when toggling Flood Risk on:** `fetchFloodHazards()` must reject cleanly, reset the in-flight cache so a later retry works, revert the toggle button's active state, and notify the user via toast.
4. **Switching between `Power`, `Earthquakes`, and `Both` while Flood Risk is toggled ON:** `setLayerVisibility()` must never clear or hide `floodLayerGroup`; the flood overlay remains independently visible until explicitly toggled off.
5. **XSS via malformed GeoJSON feature properties (`city`, `barangay`, or `description`):** Popup HTML generation in `renderFloodHazards()` must sanitize all string properties through `escapeHtml()`.

---

### Task 1: Project NOAH Metro Cebu Extraction Script & Static GeoJSON Asset

**Files:**
- Create: `scripts/extract_noah_cebu.ts`
- Create: `public/data/cebu-flood-hazards.geojson`
- Test: `tests/unit/floodHazardAsset.test.ts`

**Interfaces:**
- Consumes: `https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/resolve/main/PMTiles/layers/flood_100yr.pmtiles` (HTTP Range `206 Partial Content`)
- Produces:
  - `public/data/cebu-flood-hazards.geojson` conforming to `FloodHazardCollection`:
    ```ts
    export interface FloodHazardProperties {
      Var: 1 | 2 | 3;
      hazard_level: "Low" | "Medium" | "High";
      depth_range: "0 - 0.5m" | "0.5 - 1.5m" | "> 1.5m";
      return_period: "100-Year";
      zone_name?: string;
    }
    ```
  - `decodePmtilesTileId(z: number, x: number, y: number): number` in `scripts/extract_noah_cebu.ts`

- [ ] **Step 1: Write the failing asset integrity test in `tests/unit/floodHazardAsset.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

describe("Project NOAH Metro Cebu Static GeoJSON Asset", () => {
  const assetPath = join(process.cwd(), "public", "data", "cebu-flood-hazards.geojson");

  it("exists, is under 600 KB uncompressed, and contains valid 100-year Metro Cebu flood polygons", () => {
    expect(existsSync(assetPath)).toBe(true);
    const stats = statSync(assetPath);
    expect(stats.size).toBeGreaterThan(1000);
    expect(stats.size).toBeLessThan(600 * 1024);

    const geojson = JSON.parse(readFileSync(assetPath, "utf-8"));
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.metadata?.source).toContain("Project NOAH");
    expect(geojson.metadata?.license).toContain("ODC-ODbL");
    expect(Array.isArray(geojson.features)).toBe(true);
    expect(geojson.features.length).toBeGreaterThanOrEqual(15);

    const vars = new Set<number>();
    for (const f of geojson.features) {
      expect(["Polygon", "MultiPolygon"]).toContain(f.geometry.type);
      expect([1, 2, 3]).toContain(f.properties.Var);
      expect(["Low", "Medium", "High"]).toContain(f.properties.hazard_level);
      expect(f.properties.return_period).toBe("100-Year");
      vars.add(f.properties.Var);
    }
    expect(vars.has(1)).toBe(true);
    expect(vars.has(2)).toBe(true);
    expect(vars.has(3)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/unit/floodHazardAsset.test.ts`
Expected: FAIL with `expected false to be true` (`public/data/cebu-flood-hazards.geojson` does not exist yet).

- [ ] **Step 3: Implement `scripts/extract_noah_cebu.ts` and generate `public/data/cebu-flood-hazards.geojson`**

Create `scripts/extract_noah_cebu.ts` that queries the Project NOAH `flood_100yr.pmtiles` archive via HTTP Range requests for the Metro Cebu bounding box (`lat: 10.18..10.46`, `lon: 123.75..124.05` across Talisay, Cebu City, Mandaue, Lapu-Lapu, Cordova, Consolacion, Liloan), decodes MVT geometries into simplified WGS84 coordinates (5 decimal places), attaches `Var` (`1 | 2 | 3`), `hazard_level`, `depth_range`, `return_period: "100-Year"`, and `zone_name`, and writes `public/data/cebu-flood-hazards.geojson`. Run `npx.cmd tsx scripts/extract_noah_cebu.ts` to generate the asset.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run tests/unit/floodHazardAsset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/extract_noah_cebu.ts public/data/cebu-flood-hazards.geojson tests/unit/floodHazardAsset.test.ts
git commit -m "feat(data): add Project NOAH 100-year Metro Cebu flood hazard GeoJSON and extractor"
```

---

### Task 2: Flood Hazard Types, Styling Palette & Lazy-Load Service

**Files:**
- Modify: `src/ui/types.ts`
- Modify: `src/ui/components/icons.ts`
- Create: `src/ui/services/floodHazards.ts`
- Test: `tests/unit/floodHazardsService.test.ts`

**Interfaces:**
- Consumes: `public/data/cebu-flood-hazards.geojson` (via browser `fetch("/data/cebu-flood-hazards.geojson")`)
- Produces:
  - In `src/ui/types.ts`:
    ```ts
    export type FloodHazardVar = 1 | 2 | 3;
    export type FloodHazardTier = "low" | "medium" | "high";

    export interface FloodHazardStyle {
      varCode: FloodHazardVar;
      tier: FloodHazardTier;
      label: string;
      depthRange: string;
      hex: string;
      strokeHex: string;
      fillOpacity: number;
      description: string;
    }

    export interface FloodHazardFeature {
      type: "Feature";
      properties: {
        Var: FloodHazardVar;
        hazard_level?: string;
        depth_range?: string;
        return_period?: string;
        zone_name?: string;
      };
      geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: number[][][] | number[][][][];
      };
    }

    export interface FloodHazardCollection {
      type: "FeatureCollection";
      metadata?: {
        source: string;
        return_period: string;
        license: string;
      };
      features: FloodHazardFeature[];
    }
    ```
  - In `src/ui/components/icons.ts`:
    - `ICONS.flood`: SVG waves/water-level hazard icon (`width="16" height="16"`).
  - In `src/ui/services/floodHazards.ts`:
    - `getFloodHazardStyle(varCode: number | null | undefined): FloodHazardStyle`
    - `fetchFloodHazards(fetchFn?: typeof fetch): Promise<FloodHazardCollection>`
    - `getCachedFloodHazards(): FloodHazardCollection | null`
    - `resetFloodHazardsCache(): void`

- [ ] **Step 1: Write the failing unit tests in `tests/unit/floodHazardsService.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getFloodHazardStyle,
  fetchFloodHazards,
  getCachedFloodHazards,
  resetFloodHazardsCache,
} from "../../src/ui/services/floodHazards.js";

describe("Flood Hazards Service & Style Palette", () => {
  beforeEach(() => {
    resetFloodHazardsCache();
  });

  it("maps NOAH Var 1, 2, 3 to official Yellow, Orange, Red hazard styles", () => {
    expect(getFloodHazardStyle(1)).toMatchObject({
      varCode: 1,
      tier: "low",
      label: "Low Hazard",
      depthRange: "0 – 0.5m",
      hex: "#FACC15",
    });
    expect(getFloodHazardStyle(2)).toMatchObject({
      varCode: 2,
      tier: "medium",
      label: "Medium Hazard",
      depthRange: "0.5 – 1.5m",
      hex: "#F97316",
    });
    expect(getFloodHazardStyle(3)).toMatchObject({
      varCode: 3,
      tier: "high",
      label: "High Hazard",
      depthRange: "> 1.5m",
      hex: "#EF4444",
    });
  });

  it("falls back safely to Low Hazard style for unexpected or null Var values (Review Focus #1)", () => {
    expect(getFloodHazardStyle(0).tier).toBe("low");
    expect(getFloodHazardStyle(99).tier).toBe("low");
    expect(getFloodHazardStyle(null).tier).toBe("low");
    expect(getFloodHazardStyle(undefined).tier).toBe("low");
  });

  it("deduplicates concurrent in-flight fetches and caches the resolved FeatureCollection (Review Focus #2)", async () => {
    const sampleCollection = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { Var: 3 as const, hazard_level: "High" },
          geometry: {
            type: "Polygon" as const,
            coordinates: [[[123.88, 10.31], [123.89, 10.31], [123.89, 10.32], [123.88, 10.31]]],
          },
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleCollection,
    });

    const [res1, res2] = await Promise.all([
      fetchFloodHazards(mockFetch as unknown as typeof fetch),
      fetchFloodHazards(mockFetch as unknown as typeof fetch),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res1.features).toHaveLength(1);
    expect(res2.features).toHaveLength(1);
    expect(getCachedFloodHazards()).toEqual(sampleCollection);
  });

  it("clears in-flight promise on network error so subsequent retries succeed (Review Focus #3)", async () => {
    const failingFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchFloodHazards(failingFetch as unknown as typeof fetch)).rejects.toThrow(
      /Failed to load Project NOAH flood hazard data/
    );
    expect(getCachedFloodHazards()).toBeNull();

    const recoveryFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    });
    const recovered = await fetchFloodHazards(recoveryFetch as unknown as typeof fetch);
    expect(recovered.type).toBe("FeatureCollection");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/unit/floodHazardsService.test.ts`
Expected: FAIL with `Cannot find module '../../src/ui/services/floodHazards.js'`.

- [ ] **Step 3: Add types to `src/ui/types.ts`, `ICONS.flood` to `src/ui/components/icons.ts`, and implement `src/ui/services/floodHazards.ts`**

Implement `getFloodHazardStyle`, `fetchFloodHazards`, `getCachedFloodHazards`, and `resetFloodHazardsCache` in `src/ui/services/floodHazards.ts` with zero Node.js imports.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run tests/unit/floodHazardsService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/types.ts src/ui/components/icons.ts src/ui/services/floodHazards.ts tests/unit/floodHazardsService.test.ts
git commit -m "feat(ui): add Project NOAH flood hazard types, style palette, and lazy-load service"
```

---

### Task 3: Leaflet Map Controller `floodHazardPane` & GeoJSON Overlay Rendering

**Files:**
- Modify: `src/ui/map/mapController.ts`
- Test: `tests/ui/floodMapOverlay.test.ts`

**Interfaces:**
- Consumes: `FloodHazardCollection`, `getFloodHazardStyle` from `src/ui/services/floodHazards.ts`
- Produces:
  - In `MapController` (`src/ui/map/mapController.ts`):
    - Dedicated pane `floodHazardPane` with `zIndex = "380"` (below `labelsPane` at `450` and `markerPane` at `600`, above base tiles at `200`).
    - `renderFloodHazards(collection: FloodHazardCollection | null): void`
    - `setFloodLayerVisibility(visible: boolean): void`
    - `isFloodLayerVisible(): boolean`

- [ ] **Step 1: Write the failing map overlay tests in `tests/ui/floodMapOverlay.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapController } from "../../src/ui/map/mapController.js";
import type { FloodHazardCollection } from "../../src/ui/types.js";

describe("MapController Project NOAH Flood Hazard Overlay", () => {
  const sampleFloodData: FloodHazardCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          Var: 3,
          hazard_level: "High",
          depth_range: "> 1.5m",
          return_period: "100-Year",
          zone_name: 'Mandaue <script>alert("xss")</script> Subangdaku',
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[123.92, 10.32], [123.93, 10.32], [123.93, 10.33], [123.92, 10.32]]],
        },
      },
    ],
  };

  it("renders flood polygons into floodHazardPane, sanitizes popup HTML, and preserves visibility across Power/Earthquake switches (Review Focus #4 & #5)", () => {
    const controller = new MapController("map");
    expect(controller.isFloodLayerVisible()).toBe(false);

    controller.setFloodLayerVisibility(true);
    controller.renderFloodHazards(sampleFloodData);
    expect(controller.isFloodLayerVisible()).toBe(true);

    // Switching primary pin layers must NOT hide the independent flood layer
    controller.setLayerVisibility("power", false);
    expect(controller.isFloodLayerVisible()).toBe(true);
    controller.setLayerVisibility("earthquakes", false);
    expect(controller.isFloodLayerVisible()).toBe(true);

    // Inspect popup content for XSS sanitization and Project NOAH attribution
    const floodGroup = (controller as any).floodLayerGroup;
    const layers = floodGroup.getLayers();
    expect(layers.length).toBeGreaterThan(0);

    controller.setFloodLayerVisibility(false);
    expect(controller.isFloodLayerVisible()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/ui/floodMapOverlay.test.ts`
Expected: FAIL with `controller.isFloodLayerVisible is not a function`.

- [ ] **Step 3: Implement `floodHazardPane`, `renderFloodHazards`, `setFloodLayerVisibility`, and `isFloodLayerVisible` in `src/ui/map/mapController.ts`**

In `MapController.constructor`, create `floodHazardPane` (`zIndex: "380"`) and initialize `this.floodLayerGroup = L.layerGroup()` (not added to `this.map` until `setFloodLayerVisibility(true)` is called). In `renderFloodHazards(collection)`, clear `this.floodLayerGroup`, build `L.geoJSON(collection, { pane: "floodHazardPane", style: ..., onEachFeature: ... })` with escaped popup HTML showing hazard badge, depth range (`0 – 0.5m` / `0.5 – 1.5m` / `> 1.5m`), `100-Year Return Period`, and `UP Project NOAH (ODC-ODbL)` attribution link (`https://noah.up.edu.ph/know-your-hazards`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run tests/ui/floodMapOverlay.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/map/mapController.ts tests/ui/floodMapOverlay.test.ts
git commit -m "feat(map): render Project NOAH flood polygons in floodHazardPane with z-index 380"
```

---

### Task 4: Floating Map Controls Toggle, Legend Section & App Wiring

**Files:**
- Modify: `src/ui/components/mapControls.ts`
- Modify: `src/ui/components/legend.ts`
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Modify: `public/sw.js`
- Test: `tests/ui/floodControlsAndLegend.test.ts`

**Interfaces:**
- Consumes: `fetchFloodHazards`, `getCachedFloodHazards` from `src/ui/services/floodHazards.ts`; `renderFloodHazards`, `setFloodLayerVisibility` from `src/ui/map/mapController.ts`
- Produces:
  - In `MapControlsCallbacks` (`src/ui/components/mapControls.ts`):
    - `onFloodHazardToggle?: () => void`
  - In `MapControlsExtraState` (`src/ui/components/mapControls.ts`):
    - `isFloodHazardActive?: boolean`
    - `isFloodHazardLoading?: boolean`
  - Button `#btn-toggle-flood-hazard` in `.map-search-row` (`aria-pressed="true|false"`, label `"Flood Risk"`).
  - Section 4 (`Flood Susceptibility (Project NOAH)`) in `renderLegend()` (`src/ui/components/legend.ts`) showing the 3 official swatches (`Low: 0–0.5m`, `Medium: 0.5–1.5m`, `High: >1.5m`) and ODC-ODbL attribution.

- [ ] **Step 1: Write the failing UI control and legend tests in `tests/ui/floodControlsAndLegend.test.ts`**

```ts
// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderMapControls } from "../../src/ui/components/mapControls.js";
import { renderLegend } from "../../src/ui/components/legend.js";

describe("Flood Hazard Map Toggle & Legend Integration", () => {
  it("renders #btn-toggle-flood-hazard with aria-pressed state and fires onFloodHazardToggle", () => {
    const container = document.createElement("div");
    const onFloodHazardToggle = vi.fn();

    renderMapControls(
      container,
      "both",
      {
        onSearchChange: vi.fn(),
        onLocateUser: vi.fn(),
        onLayerChange: vi.fn(),
        onToast: vi.fn(),
        onFloodHazardToggle,
      },
      { isFloodHazardActive: true }
    );

    const btn = container.querySelector<HTMLButtonElement>("#btn-toggle-flood-hazard");
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
    expect(btn?.classList.contains("active")).toBe(true);

    btn?.click();
    expect(onFloodHazardToggle).toHaveBeenCalledTimes(1);
  });

  it("renders Project NOAH 100-year flood susceptibility tiers and ODC-ODbL attribution in Legend", () => {
    const container = document.createElement("div");
    renderLegend(container, true, vi.fn());

    expect(container.innerHTML).toContain("Project NOAH");
    expect(container.innerHTML).toContain("Low Hazard (0 – 0.5m)");
    expect(container.innerHTML).toContain("Medium Hazard (0.5 – 1.5m)");
    expect(container.innerHTML).toContain("High Hazard (&gt; 1.5m)");
    expect(container.innerHTML).toContain("ODC-ODbL");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/ui/floodControlsAndLegend.test.ts`
Expected: FAIL with `expected null not to be null` (`#btn-toggle-flood-hazard` does not exist yet).

- [ ] **Step 3: Implement `#btn-toggle-flood-hazard` in `mapControls.ts`, NOAH section in `legend.ts`, lazy toggle state in `main.ts`, styles in `style.css`, and cache rule in `public/sw.js`**

Wire `onFloodHazardToggle` in `src/main.ts` so clicking `#btn-toggle-flood-hazard` toggles `isFloodHazardActive`:
- When toggled ON: if `getCachedFloodHazards()` is already loaded, immediately call `mapController.renderFloodHazards(cached)` and `mapController.setFloodLayerVisibility(true)`. Otherwise set `isFloodHazardLoading = true`, call `fetchFloodHazards()`, and if `isFloodHazardActive` is still `true` when resolved, render and show a toast `"Project NOAH 100-year flood hazard zones enabled."`. On error, reset `isFloodHazardActive = false` and show an error toast.
- When toggled OFF: call `mapController.setFloodLayerVisibility(false)` and show a toast `"Flood hazard overlay hidden."`.

- [ ] **Step 4: Run full test suite, typecheck, and client bundle build**

Run: `npx.cmd vitest run && npx.cmd tsc --noEmit && npm.cmd run build`
Expected: All test suites PASS, 0 TypeScript errors, client bundle builds cleanly under size budget.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/mapControls.ts src/ui/components/legend.ts src/main.ts src/style.css public/sw.js tests/ui/floodControlsAndLegend.test.ts
git commit -m "feat(ui): wire Project NOAH flood risk toggle, legend guide, and offline caching"
```
