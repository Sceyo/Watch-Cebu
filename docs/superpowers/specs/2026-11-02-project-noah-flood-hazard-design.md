# Project NOAH 100-Year Flood Hazard Overlay (Approach A) — Design Specification

**Date:** 2026-11-02  
**Branch:** `Proj_noah`  
**Status:** Approved for Planning (Approach A)

---

## 1. Intent & Why

Residents of Metro Cebu frequently face simultaneous power interruptions and urban flooding during heavy monsoon rains, low-pressure areas, and tropical cyclones. While Watch Cebu currently tracks VECO power interruptions, PHIVOLCS earthquakes, and PAGASA cyclone/rainfall advisories, users lack spatial visibility into whether their neighborhood or an active outage area sits inside a flood-prone zone.

Adding Project NOAH's 100-year flood susceptibility zones as an **independent, lazy-loaded map toggle (Approach A)** gives Metro Cebu residents instant, street-level flood hazard awareness without cluttering the default map or slowing down initial page load.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Independent Floating Map Toggle:** Add a `[Flood Risk]` toggle button (`#btn-toggle-flood-hazard`) to the floating map controls bar (`src/ui/components/mapControls.ts`) that layers Project NOAH flood polygons over the map independently of the `Power | Quakes | Both` pin selection.
- **Lazy-Loaded Static GeoJSON (`0 KB` initial impact):** Keep the flood layer OFF by default so initial bundle size and page-load network traffic remain unchanged. Fetch `/data/cebu-flood-hazards.geojson` only on the user's first activation of the toggle, then cache in memory (and Service Worker).
- **Authentic Project NOAH 100-Year Metro Cebu Data:** Extract and simplify 100-year return period flood polygons (`Var`: `1` = Low `0–0.5m`, `2` = Medium `0.5–1.5m`, `3` = High `>1.5m`) from Project NOAH's open ODC-ODbL dataset (`bettergovph/project-noah-hazard-maps`), bounded to the populated Metro Cebu corridor (`10.18°N–10.46°N`, `123.75°E–124.05°E`: Talisay, Cebu City, Mandaue, Lapu-Lapu, Cordova, Consolacion, Liloan, Minglanilla).
- **Decoupled Pane Z-Index Sandwiching:** Render flood polygons in a dedicated Leaflet pane (`floodHazardPane`, `z-index: 380`) above the CARTO dark base tiles (`z-index: 200`), below the CARTO street labels (`labelsPane`, `z-index: 450`), and below all interactive civic markers (`markerPane`, `z-index: 600`).
- **Interactive Zone Popups & Legend Integration:** Clicking or tapping a flood polygon displays a clean popup card with the hazard level (`Low`, `Medium`, `High`), expected flood depth range (`0 – 0.5m`, `0.5 – 1.5m`, `> 1.5m`), return period (`100-Year Return Period`), and official ODC-ODbL attribution to UP Project NOAH. Add a matching 3-tier explanation section to the Map Guide & Legend drawer (`src/ui/components/legend.ts`).

### Non-Goals
- Real-time crowdsourced ("Waze-style") user flood reports (deferred to a separate future phase to avoid overwhelming the interface).
- Multi-return-period dropdown selectors (5-year vs. 25-year vs. 100-year); we standardize on the 100-year worst-case safety baseline used by Project NOAH's *Know Your Hazards* default view.
- Province-wide rural mountain coverage outside the populated Metro Cebu corridor.

### Anti-Goals
- Never block or delay initial app boot to load flood geometry.
- Never obscure street names or block clicks on VECO power / PHIVOLCS earthquake pins when the flood overlay is active.
- Never introduce Node.js built-ins into `src/ui/` or `src/main.ts`.

---

## 3. Global Constraints

- **Zero Node.js imports in client bundle:** `src/main.ts` and all files under `src/ui/` must not import `fs`, `path`, `crypto`, `zlib`, or `process` (`tests/ui/clientBundleIntegrity.test.ts`).
- **Strict TLS security:** No `rejectUnauthorized: false` anywhere in the repository (`tests/server/tlsConfig.test.ts`).
- **Authentic `data/` directory preservation:** Automated tests must never mutate tracked files in `data/` (`tests/guards/dataDirectoryGuard.test.ts`).
- **Static asset size ceiling:** `public/data/cebu-flood-hazards.geojson` must remain under `600 KB` uncompressed (`< 150 KB` gzipped) for fast mobile LTE loading.
- **License attribution:** All UI popups and legend entries for flood hazards must credit `UP Project NOAH (ODC-ODbL)`.

---

## 4. Approaches Considered

1. **Approach A (Selected): Independent "Flood Risk" Map Toggle (`#btn-toggle-flood-hazard`).**
   - *Tradeoffs:* Non-intrusive, zero initial bandwidth cost via lazy loading, allows simultaneous viewing of power outages and flood zones during storms.
2. **Approach B: 4th Mode in Main Layer Switcher (`Power | Quakes | Floods | All`).**
   - *Tradeoffs:* Crowds primary header navigation and hides power pins when inspecting flood zones.
3. **Approach C: Contextual On-Demand Barangay Badge Only.**
   - *Tradeoffs:* Prevents free-form visual exploration of flood corridors across Metro Cebu.

---

## 5. Architecture & Data Flow

1. **Build-Time Extraction Script (`scripts/extract_noah_cebu.ts`):**
   - Queries the Project NOAH 100-year PMTiles archive (`PMTiles/layers/flood_100yr.pmtiles` on Hugging Face) via HTTP Range requests (`206 Partial Content`) for zoom-12 vector tiles covering Metro Cebu (`lat: 10.18..10.46`, `lon: 123.75..124.05`).
   - Decodes the MVT protobuf geometries into WGS84 GeoJSON (`Polygon` / `MultiPolygon`), rounds coordinates to 5 decimal places (~1.1m precision), maps `Var` (`1 | 2 | 3`) to structured properties (`hazard_level`, `depth_range`, `return_period`), and writes `public/data/cebu-flood-hazards.geojson`.
2. **Frontend Service (`src/ui/services/floodHazards.ts`):**
   - Exports `fetchFloodHazards(fetchFn?: typeof fetch): Promise<FloodHazardCollection>` with in-memory singleton caching and strict runtime schema validation.
   - Exports `getFloodHazardStyle(varCode: 1 | 2 | 3): FloodHazardStyle` returning NOAH's color palette:
     - `1` (Low): `#FACC15` (Yellow, `0 – 0.5m`, `fillOpacity: 0.35`)
     - `2` (Medium): `#F97316` (Orange, `0.5 – 1.5m`, `fillOpacity: 0.42`)
     - `3` (High): `#EF4444` (Red, `> 1.5m`, `fillOpacity: 0.50`)
3. **Map Controller Integration (`src/ui/map/mapController.ts`):**
   - Creates `floodHazardPane` at `z-index: 380`.
   - Adds `renderFloodHazards(geojson: FloodHazardCollection | null): void` and `setFloodLayerVisibility(visible: boolean): void`.
4. **UI Controls & Legend (`src/ui/components/mapControls.ts`, `src/ui/components/legend.ts`, `src/main.ts`):**
   - Adds `#btn-toggle-flood-hazard` button with `aria-pressed` state and loading spinner/toast feedback on first activation.
   - Adds Section 4 ("Flood Susceptibility — Project NOAH") to `src/ui/components/legend.ts`.
