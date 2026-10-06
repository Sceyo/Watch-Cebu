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
- **Maintainer Links:** About panel links are guarded: when unconfigured, they visibly display "Pending Configuration" without fake links.

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
  - `iphone_se_about_drawer_open.png`: About panel displaying pending/configured developer links.
  - `pixel7_default_load.png`: Pixel 7 (412×915) layout.
  - `pixel7_search_active.png`: Search bar in use with active query filtering pins.
  - `desktop_default_load.png`: Desktop layout (1440×900) with desktop freshness chips and layer toggles.
  - `desktop_popup_headroom.png`: Desktop marker popup with verified 109.8px top headroom above header and tabs.

---

## 3. Test Suite Integrity

The codebase is protected by comprehensive unit, component, schema, and regression test suites:
- **18 test files, 235 passing tests (100% green)**.
- `tests/ui/responsiveGuards.test.ts`: Enforces 44×44px hit areas, 52px mobile header, 56px bottom bar, 16px search font (preventing iOS zoom), prefers-reduced-motion, all 6 AQI hazard tiers, and haze auto-collapse.
- `tests/ui/about.test.ts`: Verifies real authoritative attribution and enforces regression guards against unconfigured template URLs (`YOUR_GITHUB_USERNAME`).
- `tests/ui/clientBundleIntegrity.test.ts`: Guarantees zero Node built-ins and zero template string URLs in the client bundle.
- Production payload: Total gzipped CSS + JS is **~78 kB**, well below the 150 kB budget.
