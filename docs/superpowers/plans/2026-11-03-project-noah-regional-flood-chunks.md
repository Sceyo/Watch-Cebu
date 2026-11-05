# Project NOAH Regional Flood Hazard Chunks & Mobile View Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Project NOAH 100-year flood susceptibility maps to the entire province of Cebu using on-demand regional chunks (Metro, North, South) with mobile view optimization, keeping initial mobile load at 35 KB and ensuring 60 FPS pinch-zoom performance on all devices.

**Architecture:** A build-time extractor script generates three independent, simplified GeoJSON assets (`cebu-flood-metro.geojson`, `cebu-flood-north.geojson`, `cebu-flood-south.geojson`). On the client, toggling `[Flood Risk]` loads the region corresponding to the current map center (default: Metro). When panning across the province, the map controller dynamically loads and renders adjacent regional chunks on demand. On mobile screens (`<= 420px`), the floating button label is adapted to `"Flood"` to give the search bar ample breathing room.

**Tech Stack:** TypeScript, Leaflet (`L.geoJSON`, custom panes, debounced `moveend`), Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-project-noah-regional-flood-chunks-design.md`

## Global Constraints

- **Zero Node.js imports in client bundle:** `src/main.ts` and all files under `src/ui/` must not import `fs`, `path`, `crypto`, `zlib`, or `process` (`tests/ui/clientBundleIntegrity.test.ts`).
- **Strict TLS security:** No `rejectUnauthorized: false` anywhere in the repository (`tests/server/tlsConfig.test.ts`).
- **Authentic `data/` directory preservation:** Automated tests must never mutate tracked files in `data/` (`tests/guards/dataDirectoryGuard.test.ts`).
- **Static asset size ceiling:** Each regional GeoJSON chunk must remain under `400 KB` uncompressed (`< 80 KB` gzipped) for fast mobile LTE loading.
- **License attribution:** All UI popups and legend entries for flood hazards must credit `UP Project NOAH (ODC-ODbL)`.

## Review Focus

1. **Repeated rapid panning back and forth across regional boundaries (e.g. Metro ↔ North):** `fetchFloodHazards(region)` must deduplicate concurrent in-flight requests per region, and `MapController` must track loaded regions in a `Set<FloodRegion>` to avoid re-rendering duplicate polygons or stacking SVG paths.
2. **Offline / weak-signal fetch failure when panning into a new region:** If a provincial chunk fails to fetch due to dropped network, the map controller must log cleanly without crashing, preserve existing rendered regions, and display a non-blocking toast.
3. **Searching or pinning a provincial barangay (e.g., in Bogo or Carcar) with Flood Risk already active:** The search handler must detect the destination coordinates, fetch the target regional chunk if not already loaded, and render it before or during camera fit.
4. **Mobile portrait layout on 360px width viewports:** `#btn-toggle-flood-hazard` must adapt gracefully on narrow screens (`<= 420px`) with `"Flood"` label, keeping the search input width `>= 180px` without horizontal overflow.
5. **Backwards compatibility for existing assets:** `public/data/cebu-flood-hazards.geojson` must remain intact or alias to `cebu-flood-metro.geojson` so existing cached service workers or direct links do not break.

---

### Task 1: Regional Extraction & Multi-Zone GeoJSON Assets

**Files:**
- Modify: `scripts/extract_noah_cebu.ts`
- Create: `public/data/cebu-flood-metro.geojson` (copy/alias of `cebu-flood-hazards.geojson`)
- Create: `public/data/cebu-flood-north.geojson`
- Create: `public/data/cebu-flood-south.geojson`
- Test: `tests/unit/regionalFloodHazardAssets.test.ts`

**Interfaces:**
- Consumes: Project NOAH `flood_100yr.pmtiles` via HTTP Range 206 partial requests.
- Produces: Three GeoJSON FeatureCollections conforming to `FloodHazardCollection` with metadata:
  - `cebu-flood-metro.geojson` (Metro Cebu corridor, 10 tiles, ~139 KB)
  - `cebu-flood-north.geojson` (Compostela up to Daanbantayan, Bantayan & Camotes, ~200–300 KB)
  - `cebu-flood-south.geojson` (Naga down to Santander, and Toledo/Balamban/Tuburan, ~150–220 KB)

**Steps:**
1. [ ] Write failing unit test `tests/unit/regionalFloodHazardAssets.test.ts` asserting:
   - All three files (`cebu-flood-metro.geojson`, `cebu-flood-north.geojson`, `cebu-flood-south.geojson`) exist.
   - Each file size is `< 400 KB` uncompressed.
   - Each file is valid `FeatureCollection` with metadata containing `source: "UP Project NOAH"`, `license: "ODC-ODbL"`.
   - Each file contains valid polygons with `Var` in `[1, 2, 3]`.
2. [ ] Run test to verify RED: `npx.cmd vitest run tests/unit/regionalFloodHazardAssets.test.ts`.
3. [ ] Extend `scripts/extract_noah_cebu.ts` with tile definitions for `NORTH_CEBU_TILES` and `SOUTH_CEBU_TILES`.
4. [ ] Run extraction script to generate the North and South GeoJSON assets in `public/data/`.
5. [ ] Copy/ensure `public/data/cebu-flood-metro.geojson` matches `public/data/cebu-flood-hazards.geojson`.
6. [ ] Re-run test to verify GREEN: `npx.cmd vitest run tests/unit/regionalFloodHazardAssets.test.ts`.
7. [ ] Commit Task 1: `git commit -m "feat(data): generate Project NOAH North and South Cebu regional flood hazard assets"`.

---

### Task 2: Regional Flood Hazard Service & Spatial Region Resolvers

**Files:**
- Modify: `src/ui/types.ts`
- Modify: `src/ui/services/floodHazards.ts`
- Test: `tests/unit/floodHazardsRegionalService.test.ts`
- Test: `tests/ui/clientBundleIntegrity.test.ts`

**Interfaces:**
- `src/ui/types.ts`:
  ```ts
  export type FloodRegion = "metro" | "north" | "south";
  ```
- `src/ui/services/floodHazards.ts`:
  ```ts
  export function getRegionForCoordinates(lat: number, lon: number): FloodRegion;
  export function getRegionsForBounds(bounds: { north: number; south: number; east: number; west: number }): FloodRegion[];
  export function fetchFloodHazards(region?: FloodRegion): Promise<FloodHazardCollection>;
  export function getCachedFloodHazards(region?: FloodRegion): FloodHazardCollection | null;
  export function resetFloodHazardsCache(): void;
  ```

**Steps:**
1. [ ] Write failing test `tests/unit/floodHazardsRegionalService.test.ts` verifying:
   - `getRegionForCoordinates(10.3157, 123.8854)` returns `"metro"`.
   - `getRegionForCoordinates(11.05, 124.00)` (Bogo City) returns `"north"`.
   - `getRegionForCoordinates(10.10, 123.63)` (Toledo/Carcar) returns `"south"`.
   - `fetchFloodHazards("north")` calls `/data/cebu-flood-north.geojson` and caches the result independently from `"metro"`.
   - Concurrent calls for the same region deduplicate in flight.
   - Calling invalid region falls back to `"metro"`.
2. [ ] Run test to verify RED: `npx.cmd vitest run tests/unit/floodHazardsRegionalService.test.ts`.
3. [ ] Implement `FloodRegion` in `src/ui/types.ts` and regional loader + coordinate classifiers in `src/ui/services/floodHazards.ts`.
4. [ ] Run tests to verify GREEN: `npx.cmd vitest run tests/unit/floodHazardsRegionalService.test.ts tests/ui/clientBundleIntegrity.test.ts`.
5. [ ] Commit Task 2: `git commit -m "feat(ui): add regional flood hazard fetching, caching, and coordinate resolvers"`.

---

### Task 3: MapController On-Demand Regional Layer Management

**Files:**
- Modify: `src/ui/map/mapController.ts`
- Test: `tests/ui/floodMapOverlayRegional.test.ts`

**Interfaces:**
- In `src/ui/map/mapController.ts`:
  ```ts
  renderFloodHazards(collection: FloodHazardCollection, region?: FloodRegion): void;
  getLoadedFloodRegions(): FloodRegion[];
  getCurrentViewportBounds(): { north: number; south: number; east: number; west: number } | null;
  ```

**Steps:**
1. [ ] Write failing test `tests/ui/floodMapOverlayRegional.test.ts` asserting:
   - `renderFloodHazards(metroData, "metro")` marks `"metro"` as loaded in `getLoadedFloodRegions()`.
   - Subsequent `renderFloodHazards(northData, "north")` adds North polygons into `floodLayerGroup` without clearing Metro polygons.
   - Calling `renderFloodHazards` for an already-loaded region does not create duplicate Leaflet layers.
   - `setFloodLayerVisibility(false)` hides all regions simultaneously.
2. [ ] Run test to verify RED: `npx.cmd vitest run tests/ui/floodMapOverlayRegional.test.ts`.
3. [ ] Implement multi-region tracking and layer addition in `src/ui/map/mapController.ts`.
4. [ ] Run test to verify GREEN: `npx.cmd vitest run tests/ui/floodMapOverlayRegional.test.ts`.
5. [ ] Run type check: `npx.cmd tsc --noEmit`.
6. [ ] Commit Task 3: `git commit -m "feat(map): support multi-region flood hazard rendering and loaded region tracking"`.

---

### Task 4: Viewport Listener, Mobile UI Polish & App Wiring

**Files:**
- Modify: `src/main.ts`
- Modify: `src/ui/components/mapControls.ts`
- Modify: `src/ui/styles/main.css`
- Modify: `public/sw.js`
- Test: `tests/ui/floodRegionalControls.test.ts`

**Interfaces:**
- Mobile media query in `src/ui/styles/main.css`:
  - When screen width `<= 420px`, shorten `#btn-toggle-flood-hazard .view-mode-label` to `"Flood"`.
- In `src/main.ts`:
  - On toggle ON: loads current region based on map center.
  - On map `moveend`: if flood overlay active, checks viewport bounds; if new region intersected, lazy-loads that regional chunk seamlessly.
- In `public/sw.js`:
  - Cache version bumped to `watch-cebu-v9`, precaches / caches all regional `.geojson` files.

**Steps:**
1. [ ] Write failing test `tests/ui/floodRegionalControls.test.ts` asserting:
   - Responsive CSS rule exists shortening label on `<= 420px`.
   - Service worker caches regional `.geojson` paths.
2. [ ] Run test to verify RED: `npx.cmd vitest run tests/ui/floodRegionalControls.test.ts`.
3. [ ] Implement mobile label responsive rule in `src/ui/styles/main.css`.
4. [ ] Wire viewport bounds intersection listener in `src/main.ts`.
5. [ ] Bump Service Worker cache to `watch-cebu-v9` in `public/sw.js`.
6. [ ] Verify full test suite: `npx.cmd vitest run`.
7. [ ] Verify type check and build: `npx.cmd tsc --noEmit && npm.cmd run build`.
8. [ ] Commit Task 4: `git commit -m "feat(ui): wire on-demand regional flood chunk loading, mobile label polish, and v9 cache"`.
9. [ ] Push branch to `origin/Proj_noah`.
