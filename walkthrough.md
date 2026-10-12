# Watch Cebu — Responsive & Mobile-First Civic Platform Walkthrough

## Executive Summary

Watch Cebu is an open, independent civic transparency platform monitoring scheduled power interruptions, seismic activity, air quality, and daily weather forecasts across Metro Cebu and the Visayas.

Following a thorough multi-device audit (iPhone SE 375×667 on slow 4G, Pixel 7 412×915, small tablets, and desktop 1440×900), the frontend underwent a complete **Mobile-First and Responsive Overhaul**. All critical (C1–C4), high-impact (H1–H6), and medium-impact (M1–M7) findings were resolved, and verification artifacts are generated directly by headless browser automation and stored in the repository.

---

## 1. Key Architectural & UX Capabilities

### A. Popups & Mobile Bottom Sheets (C1)
- **Desktop (1440×900):** Leaflet map popups auto-pan with **109.8px top headroom** (`autoPanPaddingTopLeft: [20, 110]`), ensuring no popup content or verify links are obscured behind the 56px header and 44px day tabs bar.
- **Mobile / Touch Devices (`(pointer: coarse)` or `< 768px`):** Replaced default Leaflet popups with a native-feeling mobile bottom sheet (`#mobile-bottom-sheet`, clamped to `max-height: 60dvh`) featuring a prominent 44×44px close button, backdrop tap-to-dismiss, and smooth vertical scrolling.

### B. Compact Mobile Chrome (C2)
- **Header:** Desktop 5-row reflow was replaced by a compact 52px header (`#app-header`) containing the brand title and a single consolidated **System Status Summary Chip** (`.mobile-status-btn`).
- **Status Popover:** Clicking the status chip opens an accessible dialog popover showing individual live/snapshot freshness states for Power, Earthquakes, and Air Quality feeds.
- **Mobile Bottom Action Bar:** Added a thumb-reachable 56px bottom bar (`.mobile-bottom-bar`) with Forecast, Air Quality (displaying current AQI pill and category), Legend, and About.
- **Floating Map Controls:** Positioned a 44px segmented layer control (Power / Quakes / Both) and search bar directly on the map.

### C. Content Accuracy & Disclaimers (C3, C4)
- **Data Provenance:** Removed internal jargon (e.g. "Rule C-1") and overstatements. Disclosed OpenStreetMap points as *"approximate community-maintained coordinates, not official cadastral boundaries"*.
- **Air Quality Transparency:** Prominently labeled air quality readings as a *"Model estimate (CAMS via Open-Meteo). Not an official station reading. For official ground telemetry, refer to DENR EMB Region VII bulletins."*
- **Haze & Health Actions:** Documented both September 2026 haze waves (Sept 2–3 and Sept 20–22, noting EMB-7 peak AQI of 248). Clarified that class and work suspensions are determined at the discretion of local government units (LGUs).
- **Maintainer Links Configured & Live:** Real maintainer URLs configured and verified: Francis Aliser (GitHub: [`@Sceyo`](https://github.com/Sceyo), LinkedIn: [`francis-aliser`](https://www.linkedin.com/in/francis-aliser/), Feedback/Issues: [`Watch-Cebu Issues`](https://github.com/Sceyo/Watch-Cebu/issues)). Guard tests enforce that no template strings (`YOUR_GITHUB_USERNAME`) can ship to production.

### D. Map Behavior & Accessibility (H1–H6, M1–M7)
- **Multi-Advisory Clustering:** Grouped pins sharing identical barangay coordinates into a single marker with a count badge. Clicking shows a structured list of all scheduled interruptions for that location in the popup or bottom sheet.
- **Default Viewport:** Center fixed on Metro Cebu (`[10.3157, 123.8854]`, zoom 12 desktop, 11 mobile) with `minZoom: 7`. Disallowed auto-fitting to distant seismic events.
- **Day Tabs:** Defaults to "Today (PHT)" with past-day tabs dimmed.
- **Touch Targets:** Minimum 44×44px hit areas on all controls and pin touch targets (`.power-pin::before`).
- **Colorblind Support:** Dual visual channels on power status: color + SVG glyphs (⚡ bolt for Active, ⏱ clock for Upcoming, 📅 calendar for Scheduled, ✓ checkmark for Concluded) with 0.45 reduced opacity for Concluded pins.
- **Neutral Swatches:** Slate `#94A3B8` circular swatches for OSM and manual provenance to prevent blue/amber color collision.
- **Inline SVG Icons:** Built `src/ui/components/icons.ts` replacing OS-dependent emojis with uniform inline SVGs.
- **Air Quality Drawer:** Streamlined hero card focusing on AQI, health verdict, actionable guidance, and PM2.5. Secondary metrics (PM10, CO, AOD) are tucked inside an expandable `<details>` section. Transboundary Haze context auto-collapses when AQI < 101.
- **Forecast Drawer:** 24-hour hourly forecast queried from Open-Meteo (`#forecast-drawer`), auto-scrolling to the `NOW` card on open.

### E. Hybrid 3-Tier Search & Auto-Zoom
- **Submission Trigger:** Enter key and mobile virtual keyboard "Search/Go" submission (`enterkeyhint="search"`) or tapping the search button.
- **Tier 1 (Instant In-Memory Match):** Auto-zooms to active power outage pins or seismic events matching the search query; opens details immediately.
- **Tier 2 (Offline Centroids):** Instant 0ms offline centroid lookup for 444 curated Metro Cebu LGUs, barangays, and landmarks from `metro-cebu-barangays.geojson`. Cleans prefixes (*"Brgy."*, *"Barangay"*, *"City of"*) and zooms instantly without network calls.
- **Tier 3 (Bounded Public Geocoding):** OpenStreetMap Nominatim fallback strictly geo-fenced to Cebu Province (`[9.3°N, 123.1°E]` to `[11.4°N, 124.4°E]`) for specific streets (*e.g. Gorordo Ave, Colon St*). Only executes on explicit form submission to strictly adhere to free-tier fair-use limits.

---

## 2. Automated Browser Verification & Inspection Artifacts

### F. Production Deployment Architecture (ADR-005)
- **Vercel Output Alignment:** Added root `vercel.json` configuring `outputDirectory: "dist-client"` to ensure Vercel serves Vite's static SPA bundle containing `index.html`, eliminating 404s.
- **Production API Serverless Adapters:** Implemented `api/power.ts` and `api/earthquakes.ts` with `GitHubSnapshotSource` to fetch live committed snapshots directly from the public GitHub repository at runtime (`https://raw.githubusercontent.com/Sceyo/Watch-Cebu/main/data/`).
- **Edge CDN Caching:** Armed endpoints with `Cache-Control: s-maxage=60, stale-while-revalidate=300` to constrain serverless function invocations to ~1 per minute maximum, far below the Hobby tier allowance.
- **Hobby Plan Quota Shield:** Configured `scripts/vercel-ignore-build.sh` (`git diff --quiet HEAD^ HEAD -- . ':(exclude)data'`) so 10-minute automated earthquake commits update live data without consuming Vercel's 100/day deployment quota.
- **Zero-Leak Test Isolation:** Added `WATCH_CEBU_DATA_DIR` dynamic path resolution and a global SHA-256 integrity guard (`tests/setup/globalDataGuard.ts`) preventing test runs from dirtying or modifying authentic production snapshots.

---

## 2. Automated Browser Verification & Inspection Artifacts

Browser verification is performed via headless Chrome using the Chrome DevTools Protocol (CDP) via `scripts/verify_responsive_overhaul.ts`. The script tests the real application across multiple viewports and stores inspectable evidence in `verification-artifacts/responsive-overhaul/`:

### A. Shipped Inspection Evidence (`verification-artifacts/responsive-overhaul/`)
- `results.json`: Machine-readable results containing actual measured popup headroom in pixels, console error count and full text of any errors, and pass/fail for each specific check:
  - Bottom sheet opens on touch marker click.
  - Search filters pins and highlights matching barangays.
  - Consolidated status popover opens and dismisses.
  - Air Quality drawer opens and auto-collapses haze context on Good/Moderate AQI.
  - Desktop popup maintains >= 20px top headroom above header and day tabs.
  - Zero console errors recorded across all viewports.
- Real captured PNG screenshots:
  - `iphone_se_default_load.png`: Default view on iPhone SE (375×667) with 52px top bar, day tabs, and 56px bottom action bar.
  - `iphone_se_bottom_sheet_open.png`: Touch bottom sheet opened from marker click showing multi-advisory listing.
  - `iphone_se_air_drawer_open.png`: Mobile Air Quality drawer with model disclosure and collapsed secondary metrics.
  - `iphone_se_status_popover_open.png`: Consolidated system status popover.
  - `iphone_se_about_drawer_open.png`: About panel displaying active developer links (GitHub and LinkedIn).
  - `pixel7_default_load.png`: Pixel 7 (412×915) layout.
  - `pixel7_search_active.png`: Search bar in use with active query filtering pins.
  - `desktop_default_load.png`: Desktop layout (1440×900) with desktop freshness chips and layer toggles.
  - `desktop_popup_headroom.png`: Desktop marker popup with verified 109.8px top headroom above header and tabs.

---

## 3. Test Suite Integrity

The codebase is protected by comprehensive unit, component, schema, and regression test suites:
- **22 test files, 269 passing tests (100% green)**.
- `tests/guards/dataDirectoryGuard.test.ts`: Verifies directory isolation and proves tampering detection works.
- `tests/setup/globalDataGuard.ts`: Enforces zero snapshot mutations across all test executions.
- `tests/server/apiProductionRoutes.test.ts`: Tests `GitHubSnapshotSource`, edge CDN caching headers, and fallback resiliency.
- `tests/ui/responsiveGuards.test.ts`: Enforces 44×44px hit areas, 52px mobile header, 56px bottom bar, 16px search font, prefers-reduced-motion, all 6 AQI hazard tiers, and haze auto-collapse.
- `tests/ui/about.test.ts`: Verifies real authoritative attribution and enforces regression guards against unconfigured template URLs (`YOUR_GITHUB_USERNAME`).
- `tests/ui/clientBundleIntegrity.test.ts`: Guarantees zero Node built-ins and zero template string URLs in the client bundle.
- `tests/ui/cebuLocations.test.ts`: Verifies offline centroid indexing and bounded geocoder validation.
- `tests/ui/searchAndZoom.test.ts`: Tests MapController camera flight and auto-zoom across all 3 tiers.
- Production payload: Total gzipped CSS + JS is **~88 kB**, well below the 150 kB budget.
