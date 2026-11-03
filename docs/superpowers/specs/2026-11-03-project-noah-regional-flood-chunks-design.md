# Project NOAH Regional Flood Hazard Chunks & Mobile View Optimization (Approach B)

**Date:** 2026-11-03  
**Status:** Approved  
**Author:** Pair Programming Session (Sceyo & Antigravity)  
**Branch:** `Proj_noah`

---

## 1. Context & Motivation

Watch Cebu currently provides a 100-year return period flood susceptibility overlay from UP Project NOAH for Metro Cebu (139 KB, ~35 KB gzipped). While this performs with zero latency on mobile devices, users exploring or living in northern Cebu (Danao, Bogo, Daanbantayan, Medellin, Bantayan) and southern/western Cebu (Carcar, Toledo, Balamban, Argao, Santander) see empty space outside the metropolitan corridor.

At the same time, loading a single monolithic province-wide GeoJSON across the entire 220 km island would pull 150+ vector tiles (~8.3 MB raw MVT), causing significant SVG DOM overhead in Leaflet on budget mobile phones.

To solve this, **Approach B (On-Demand Regional Chunks)** divides the province into three lightweight, independent geographic chunks:
1. **Metro Cebu (Zone 1):** Default corridor (Cebu City, Mandaue, Lapu-Lapu, Talisay, Consolacion, Liloan, Minglanilla, Cordova).
2. **North Cebu (Zone 2):** Northern municipalities & islands (Compostela, Danao, Carmen, Catmon, Sogod, Borbon, Tabogon, Bogo City, San Remigio, Medellin, Daanbantayan, Bantayan Island, Camotes).
3. **South & West Cebu (Zone 3):** Southern towns & Western coast (Naga, San Fernando, Carcar, Sibonga, Argao, Dalaguete, Alcoy, Boljoon, Oslob, Santander, Samboan, Ginatilan, Malabuyoc, Alegria, Badian, Moalboal, Alcantara, Ronda, Dumanjug, Barili, Aloguinsan, Pinamungajan, Toledo City, Balamban, Asturias, Tuburan, Tabuelan).

Additionally, the mobile map controls are optimized for narrow viewports (`< 420px`) by adapting the floating toggle label (`"Flood"` instead of `"Flood Risk"`) to prevent search bar clipping.

---

## 2. Technical Architecture

### 2.1 Geographic Slicing & File Sizes
| Region | File Path | Land Tiles (z=12) | Uncompressed Size | Gzipped Size |
|---|---|---|---|---|
| **Metro** | `public/data/cebu-flood-metro.geojson` (aliased as `cebu-flood-hazards.geojson`) | 10 | ~139 KB | ~35 KB |
| **North** | `public/data/cebu-flood-north.geojson` | ~49 | ~200–300 KB | ~50–75 KB |
| **South** | `public/data/cebu-flood-south.geojson` | ~16 | ~150–220 KB | ~40–60 KB |

### 2.2 Client-Side On-Demand Fetching
- When the user toggles `[Flood Risk]` on:
  - The map controller determines which region intersects the current map viewport or search target.
  - If centered on Metro Cebu, it loads `metro` first (instantaneous).
  - When the user pans/zooms (`moveend` event debounced at 300ms), any newly intersected regional chunk is fetched asynchronously and added to `floodLayerGroup`.
  - Once fetched, each chunk is stored in memory (`Map<FloodRegion, FloodHazardCollection>`) and cached offline by Service Worker cache `watch-cebu-v9`.

### 2.3 Mobile Viewport Polish
- On viewports with width `<= 420px`:
  - `#btn-toggle-flood-hazard .view-mode-label` switches to `"Flood"` to preserve search input width (> 180px).
  - Leaflet popup widths are constrained to `maxWidth: 280px` with asymmetric top-safe-zone padding (`140px`).

---

## 3. Security, Performance & Data Boundaries
1. **Zero Node.js imports in browser bundle:** Verified by `tests/ui/clientBundleIntegrity.test.ts`.
2. **Strict Licensing:** All regional chunks maintain `UP Project NOAH (ODC-ODbL)` metadata.
3. **Authentic data/ protection:** Build scripts write only to `public/data/` and never mutate tracked files in `data/`.
