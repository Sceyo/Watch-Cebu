# ⚡ WATCH CEBU

> **Real-Time Civic Awareness & Multi-Hazard Dashboard for Metro Cebu and the Visayas Region**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-269%20Passed-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![Accessibility](https://img.shields.io/badge/a11y-WCAG%202.1%20AAA-brightgreen)](https://www.w3.org/WAI/WCAG21/quickref/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

---

## 📌 Overview

**Watch Cebu** is an open-source, zero-cost, high-reliability civic monitoring dashboard built specifically for residents, emergency responders, and businesses in Metro Cebu and surrounding Visayan provinces. 

Unlike traditional platforms riddled with ads, analytics trackers, and heavy dependencies, Watch Cebu is engineered as an **offline-first, dark control-room interface** that synthesizes municipal power outages, seismic events, atmospheric air quality, and single-day weather forecasts into a unified, high-speed map experience.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                   WATCH CEBU CONTROL ROOM                   │
       ├─────────────────┬──────────────────────┬────────────────────┤
       │ ⚡ POWER FEED    │ 🌋 SEISMIC ACTIVITY  │ 🍃 AIR & HAZE      │
       │ VECO Scheduled  │ PHIVOLCS DOST        │ Open-Meteo AQI     │
       │ Interruptions   │ 300km Watch Radius   │ Transboundary Haze │
       ├─────────────────┴──────────────────────┴────────────────────┤
       │ 🌦️ TODAY'S FORECAST: 24h Horizon • Rain % • Wind (Open-Meteo) │
       ├─────────────────────────────────────────────────────────────┤
       │ 🗺️ LEAFLET 1.9.4 CORE: CartoDB Dark Matter • Strict Bounds  │
       └─────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Features

### ⚡ 1. VECO Scheduled Power Outage Tracking
- **Granular Street & Landmark Parsing**: Employs heuristic NLP (`extractStreets`) to parse scheduled maintenance bulletins from Visayan Electric Company (VECO). Retains abbreviations and initialisms (e.g. *A. Cortes Ave.*, *P. Cabantan St.*) without truncating on periods.
- **Provenance-Aware Geocoding**: Visual pins distinguish between street-level verified coordinates and municipal/barangay centroid fallbacks.
- **Day Tabs Filter Bar**: Horizontal interactive tabs filter interruptions by day across the current week.
- **Deterministic Hashing**: Advisories are indexed with SHA-256 hashes to prevent duplicates across runs.

### 🌋 2. PHIVOLCS Seismic Hazard Monitoring
- **300 km Watch Radius**: Automatically monitors and filters earthquake bulletins from DOST-PHIVOLCS within 300 km of Cebu City (`10.3157°N, 123.8854°E`), capturing seismic activity across Cebu, Bohol, Leyte, Negros, Samar, and Panay.
- **Option C Compound Marker Design**: Raw SVG pin featuring an annular location-name wedge, magnitude core, and GPU-accelerated pulse for significant (<24h or M4.0+) quakes.
- **Zero Third-Party Map Bloat**: Renders cleanly via native Leaflet `L.divIcon` without heavyweight animation libraries.

### 🍃 3. Atmospheric Air Quality & Transboundary Haze Advisory
- **Live Open-Meteo AQI Feed**: Tracks US AQI, PM2.5, PM10, Carbon Monoxide (CO), and Aerosol Optical Depth (AOD) for Metro Cebu.
- **WCAG 2.1 AAA Contrast**: Specially tuned color-contrast tokens (including `#0F172A` dark slate text on Moderate Yellow `#EAB308`) for maximum daylight and nighttime legibility.
- **Continuous Spectrum Gauge**: 6-color segmented gradient track with dynamic needle positioning.
- **Transboundary Smoke Haze Architecture**: Structured recurring-hazard advisory detailing the seasonal *habagat* (southwest monsoon) wind vector transporting wildfire particulates from Indonesia (Kalimantan/Sumatra) to Cebu.

### 🌦️ 4. Today's Weather Forecast (Phase 6 Dropdown Drawer)
- **Top Slide-down Drawer**: A single click on the header's `🌦️ Forecast` button smoothly slides down a horizontal-scrolling 24-hour horizon drawer.
- **Compact Scannable Hour Cards**:
  - Hour timestamp with a glowing `NOW` pill for the current hour.
  - Standard WMO Weather Interpretation Code icons (Clear, Cloudy, Rain, Thunderstorm).
  - Expected Rain Probability percentage (`🌧️ %`).
  - Wind speed in km/h (`💨 km/h`).
- **Eliminates Flawed Tile Layers**: Replaced transparent Doppler radar tiles and low-resolution satellite overlays with structured, lightweight forecast metrics that load instantly.

### 🛡️ 5. Control Room UX & Accessibility
- **Decoupled Data Architecture**: All feeds fetch in parallel (`Promise.allSettled`). If one endpoint is offline, other layers continue functioning uninterrupted.
- **Transparent Freshness Indicators**: Header freshness chips display `Live · Verified`, `Fetching...`, or `⚠️ Backup Fixture Data` with fallback warnings.
- **Full Keyboard & Screen Reader Accessibility**: Complete `Tab` and `Shift+Tab` focus traps inside modal drawers, backdrop scrim click dismissal, and `Escape` key support.
- **Strict Viewport Containment**: Leaflet viewport clamped (`minZoom: 7`, bounds `[7.4, 120.9]` to `[13.2, 126.9]`, `viscosity: 1.0`) preventing unnecessary world panning.

### 🔍 6. Hybrid 3-Tier Search & Auto-Zoom (Cities, Barangays, Streets)
- **Instant Camera Navigation**: Searching any barangay, municipality, street, or landmark and submitting (`Enter` or search button) automatically flies the map camera and zooms directly to that area.
- **Tier 1 (Instant Active Pins)**: Matches in-memory power outage advisories and seismic events (0ms latency, offline). If a single pin matches, auto-pans, zooms to Level 16, and opens its details; if multiple pins match, fits the map bounds around all pins.
- **Tier 2 (Offline Barangay & LGU Centroids)**: Built-in offline dictionary of 444 Metro Cebu LGUs, barangays, and landmarks extracted from `metro-cebu-barangays.geojson`. Cleans prefixes (*"Brgy."*, *"Barangay"*, *"City of"*) and zooms instantly without network calls.
- **Tier 3 (Cebu-Bounded Public Geocoding)**: OpenStreetMap Nominatim fallback strictly geo-fenced to Cebu Province (`[9.3°N, 123.1°E]` to `[11.4°N, 124.4°E]`) for specific streets (*e.g. Gorordo Ave, Colon St*). Only executes on explicit form submission to strictly adhere to free-tier fair-use limits.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend Runtime** | TypeScript 5, Vite 7, HTML5, Vanilla CSS3 (Dark Mode) |
| **Mapping Engine** | Leaflet 1.9.4, CartoDB Dark Matter Basemap Tiles |
| **Data Ingestion** | Cheerio, Node.js HTTP/HTTPS, Axios, Native Fetch |
| **Testing** | Vitest (Unit & Component), Chrome DevTools Protocol (Headless CDP Integration) |
| **External APIs** | Open-Meteo (Air Quality & Forecast), VECO Portal, DOST-PHIVOLCS |
| **State & Storage** | Decoupled In-Memory State, `localStorage` Optimistic UI Cache |

---

## 📁 Project Structure

```text
Watch-Cebu/
├── data/                         # GeoJSON polygons, barangay centroids, fixtures
│   ├── barangays_geo.json        # Cebu City & Metro barangay boundary centroids
│   └── fixtures/                 # Real historical VECO & PHIVOLCS HTML/JSON fixtures
├── docs/                         # Technical documentation & architecture decisions
│   ├── adr/                      # Architecture Decision Records (ADR-001 to ADR-003)
│   └── Data-Standards.md         # Field definitions, schema contracts, confidence tiers
├── scripts/                      # Automated ingestion & validation scripts
│   ├── run_scheduled_fetch.ts    # Headless scraping & atomic snapshot generator
│   ├── verify_phase6_forecast.ts # Headless Chrome CDP verification for Forecast drawer
│   └── verify_stage6b_containment.ts # Viewport bounds & zoom clamping validation
├── server/                       # Node.js API handlers & snapshot serving layer
├── src/                          # Application source code
│   ├── parsers/                  # Cheerio scrapers for VECO HTML & PHIVOLCS bulletins
│   │   ├── veco.ts               # Power interruption table & street parser
│   │   ├── vecoRates.ts          # Electric tariff rate change detector
│   │   └── phivolcs.ts           # Seismic bulletin scraper with Haversine filter
│   ├── resolvers/                # Geocoding & coordinate provenance resolvers
│   ├── ui/                       # Control-room frontend components
│   │   ├── components/           # Header, ForecastDrawer, AirQualityDrawer, Legend, About
│   │   ├── map/                  # Leaflet MapController & Option C SVG pins
│   │   ├── services/             # Client data services (AirQuality, Forecast, Feeds)
│   │   └── styles/main.css       # Complete dark control-room responsive stylesheet
│   ├── utils/                    # Date formatters, Haversine math, constants
│   ├── main.ts                   # Application bootstrap & lifecycle orchestrator
│   └── types/                    # Shared TypeScript domain models & schemas
├── tests/                        # Comprehensive test suite (Vitest)
│   ├── parsers/                  # Parsing edge cases, malformed tables, multi-street tests
│   ├── ui/                       # A11y, AQI contrast, forecast cards, focus trapping
│   └── server/                   # Snapshot read safety & atomic file write tests
├── implementation_plan.md        # Master phase status, deliverables, and roadmaps
├── vite.config.ts                # Vite build configuration & scrape-live dev middleware
└── package.json                  # NPM scripts & dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or `v22.x+` (Tested on Node 24)
- **Package Manager**: `npm` (included with Node.js)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Sceyo/Watch-Cebu.git
   cd Watch-Cebu
   ```
2. Install project dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   *(Optional)* Add a CartoDB API key in `.env.local` to enable official dark basemap tiles:
   ```env
   VITE_CARTO_API_KEY=your_carto_key_here
   ```

### Running Locally
Start the Vite development server with the live scraping proxy middleware:
```bash
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

Watch Cebu maintains a strict 100% test pass requirement across all parsers, UI modules, and coordinate math.

### Run Unit Tests
```bash
npm test
```
*Current Suite: 22 test files, 269 tests passed (100% green).*

### Run TypeScript & Production Build
```bash
npm run build
```
Generates an optimized client bundle in `dist-client/` with zero TypeScript compiler errors.

### Real Browser CDP Audit
Run the automated Chrome DevTools Protocol verification script (launches headless Chrome, audits iPhone SE, Pixel 7, and Desktop viewports, exercises drawers/search auto-zoom, and captures inspectable screenshots in `verification-artifacts/responsive-overhaul/`):
```bash
npx tsx scripts/verify_responsive_overhaul.ts
```

---

## 🚀 Production Deployment & Cloud Architecture (Vercel)

Watch Cebu is deployed to production on Vercel at [`https://watch-cebu.vercel.app/`](https://watch-cebu.vercel.app/) using an edge-optimized, serverless architecture documented in [ADR-005](docs/adr/ADR-005-production-deployment-and-snapshot-distribution.md).

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           GITHUB ACTIONS                               │
  │  • refresh-power.yml (every 4h)  ──┐                                   │
  │  • refresh-earthquakes.yml (10m) ──┴──> git push data/*.json to main   │
  └───────────────────────────────────────────────────┬────────────────────┘
                                                      │ (144 commits/day)
                                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           VERCEL HOBBY PLATFORM                        │
  │  Git Ignored Build Step:                                               │
  │  bash scripts/vercel-ignore-build.sh                                   │
  │  Exit 0 -> SKIPS redeployment when only data/ changed (no quota burn!)  │
  └───────────────────────────────────────────────────┬────────────────────┘
                                                      │ User Visits
                                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                            EDGE RUNTIME                                │
  │  Client App: Served from dist-client/ (Vite outputDirectory)           │
  │  API Routes: /api/power & /api/earthquakes (Serverless Functions)      │
  │  Snapshot Source: Fetches raw.githubusercontent.com/.../data at runtime│
  │  Edge Caching: Cache-Control: s-maxage=60, stale-while-revalidate=300  │
  └────────────────────────────────────────────────────────────────────────┘
```

### 1. Output Directory Configuration (`vercel.json`)
Vite outputs the client SPA bundle to `dist-client/`, while `tsc` outputs backend server modules to `dist/`. `vercel.json` configures `"outputDirectory": "dist-client"` to ensure Vercel serves the root `index.html` rather than an empty server output folder (resolving 404s).

### 2. Runtime Snapshot Distribution (Decoupled from Deployments)
Instead of embedding snapshot JSON files into the build bundle, production routes (`api/power.ts` and `api/earthquakes.ts`) use `GitHubSnapshotSource` to dynamically fetch snapshots from the public GitHub repository at runtime (`https://raw.githubusercontent.com/Sceyo/Watch-Cebu/main/data/`).
- Responses are cached at Vercel's Edge CDN with `Cache-Control: s-maxage=60, stale-while-revalidate=300`.
- Function executions are capped at ~1 invocation/minute under continuous load, well within the 100k/month Hobby limit.
- If upstream GitHub raw requests ever experience an outage, functions fall back seamlessly to bundled verified backup fixtures (`data_source: "fixture_fallback"`).

### 3. Vercel Hobby Deploy-Limit Protection (Ignored Build Step)
The earthquake ingestion workflow commits a heartbeat status every 10 minutes (up to 144 commits/day). Because Vercel's Hobby tier enforces a strict limit of **100 deployments per day**, automated snapshot commits would quickly exhaust the daily quota.
- Configured via `"ignoreCommand": "bash scripts/vercel-ignore-build.sh"` in `vercel.json` (and Vercel Dashboard -> Git -> Ignored Build Step):
  ```bash
  git diff --quiet HEAD^ HEAD -- . ':(exclude)data'
  ```
- **Exit 0 (Skip)**: When a commit only touches `data/`, the deployment is cancelled without burning daily quota.
- **Exit 1 (Proceed)**: When code, styles, tests, or documentation change, Vercel triggers a full build and deployment.

### 4. Zero-Leak Test Isolation (`WATCH_CEBU_DATA_DIR`)
Running `npm test` never writes to authentic `data/` snapshots:
- Test executions use `WATCH_CEBU_DATA_DIR` pointing to an ephemeral directory (`tests/fixtures/tmp_scheduled_data`).
- A global integrity guard (`tests/setup/globalDataGuard.ts`) computes SHA-256 hashes of all files in `data/` before and after test runs, failing immediately if any test mutates production snapshots.

---

## 📋 Master Roadmap

- [x] **Phase 1: Parsers & Ingestion** — Cheerio scrapers for VECO HTML & PHIVOLCS seismic bulletins with deterministic hashing.
- [x] **Phase 2: Core Spatial Engine** — Leaflet 1.9.4 base map, CartoDB Dark Matter, and strict 300 km Visayas radius filtering.
- [x] **Phase 3: Decoupled State & Resilient UI** — Independent data feeds, fallback warning banners, optimistic `localStorage` cache.
- [x] **Phase 4: Street Extraction & Filter Ergonomics** — Heuristic street/landmark parser (`extractStreets`), day tabs filter bar.
- [x] **Phase 5: Rate Parser & Attribution** — Historical VECO tariff rate parser, legal attribution, and About drawer.
- [x] **Phase 6: Multi-Hazard Expansion** — Option C earthquake markers, Open-Meteo Air Quality & recurring haze advisory, Stage 6b viewport containment, and Today's Weather Forecast button & drawer.
- [x] **Responsive Overhaul & Auto-Zoom** — Mobile bottom sheet, compact 52px chrome, WCAG AAA contrast, and Hybrid 3-Tier Search Auto-Zoom.
- [x] **Production Deployment & Cloud Architecture (ADR-005)** — Vercel `dist-client` output, edge-cached serverless API routes (`/api/power`, `/api/earthquakes`), runtime GitHub raw snapshot distribution, 100/day Hobby deploy-limit bypass, and SHA-256 test data isolation.
- [ ] **Phase 7: PWA Hardening & Standalone Mode (Upcoming)** — Manifest, offline service worker, and add-to-home-screen installability.

---

## 👨‍💻 Author & Maintainer

- **Developer & Maintainer**: **Francis Aliser**
  - **GitHub**: [@Sceyo](https://github.com/Sceyo)
  - **LinkedIn**: [francis-aliser](https://www.linkedin.com/in/francis-aliser/)
- **Issues & Community Feedback**: [GitHub Issues](https://github.com/Sceyo/Watch-Cebu/issues)

---

## ⚠️ Limitations & Disclaimers: What Watch Cebu Cannot Do (Cons & Boundaries)

Watch Cebu is built with a bias toward honesty, verification, and calibrated claims. To prevent misinterpretation during civic disruptions or emergencies, the following technical and operational boundaries apply:

### 1. Power Distribution Utility (DU) Boundaries
- **VECO Franchise Only (674 km² Core)**:
  - Watch Cebu tracks scheduled power maintenance exclusively within the **4 cities and 4 municipalities** served by the Visayan Electric Company: *Cebu City, Mandaue City, Talisay City, City of Naga, Consolacion, Liloan, Minglanilla, and San Fernando*.
- **❌ MECO (Mactan Electric Company) is NOT Covered**:
  - Outages in **Lapu-Lapu City and Cordova (Mactan Island)** are currently out of scope. Residents of Mactan Island will not see power advisories for their areas.
- **❌ CEBECO I, II, & III (Cebu Electric Cooperatives) are NOT Covered**:
  - Provincial towns and rural municipalities across northern, southern, and western Cebu are excluded:
    - *CEBECO I*: Carcar City down to Santander, Barili, Moalboal, Dalaguete, etc.
    - *CEBECO II*: Compostela, Danao City, Bogo City, Medellin, Daanbantayan, etc.
    - *CEBECO III*: Toledo City, Balamban, Asturias, Pinamungajan, Aloguinsan.
    - *BANELCO & CELCO*: Bantayan and Camotes Islands.
  - *Why*: CEBECO cooperatives do not maintain public, machine-readable web data. Most notices are published as social media posters/infographics on Facebook or broadcast via municipal megaphones (*rekorida*).
- **❌ No Real-Time Detection for Unscheduled / Emergency Blackouts**:
  - The dashboard tracks **planned, scheduled maintenance**. It **cannot** detect spontaneous tripping, blown distribution transformers, fallen utility poles, lightning strikes, or emergency load shedding in real time, as distribution utilities do not expose live breaker telemetry APIs.

### 2. Geographic Resolution & Centroid Approximation
- **Approximate Centroids, Not Meter-Level Outages**:
  - Pins indicate **approximate barangay and street center points** derived from OpenStreetMap nodes and verbatim advisory text.
  - A pin in your barangay does **not** guarantee that your specific home or meter will lose power. Power feeders often isolate specific sub-pockets, transformer banks, or single sitios within a barangay.

### 3. Seismic Hazard Boundaries (PHIVOLCS)
- **Calculated Epicenters, NOT Earthquake Early Warning (EEW)**:
  - Seismic pins display the calculated underground epicenter and estimated magnitude once published by DOST-PHIVOLCS.
  - This is **not an early-warning alarm** (it does not alert users seconds prior to P-wave arrival).
  - Ground shaking (PEIS Intensity) at your actual location depends on local soil mechanics, distance from the fault line, and focal depth.

### 4. Severe Weather & Disaster Orders (PAGASA / Open-Meteo)
- **Civic Situational Awareness, NOT Official Command**:
  - DOST-PAGASA Tropical Cyclone Wind Signals (TCWS) and heavy rainfall alerts are aggregated for convenience.
  - Watch Cebu does **not issue official evacuation orders or government class/work suspensions**. Citizens must always prioritize and follow official executive orders from the Cebu City DRRMO, Cebu Provincial Disaster Office, and respective LGUs.
  - Atmospheric forecasts (Open-Meteo) are based on regional numerical prediction models (ECMWF/GFS) and may vary from localized microclimates (such as sudden mountain downpours in Busay).

### 5. PWA Offline Cache Boundaries
- **Serving Cached Snapshots**:
  - When disconnected from the internet, the application serves previously cached data and displays an amber "Offline Mode" banner. It **cannot receive live updates or newly issued bulletins while offline**.
  - Map tile storage is bounded to a 100-tile LRU cache. Panning far outside your cached area while offline will display empty map grids.

### 6. Emergency Dispatch & Reporting
- **No Incident Ticketing or Rescue Dispatch**:
  - Watch Cebu provides direct tap-to-call links for emergency hotlines (DRRMO, VECO Emergency, Red Cross, BFP, 911), but **users cannot report downed lines, log power outages, or request emergency rescue through this web application**.

---

## ⚖️ Data Privacy, Provenance & Disclaimer

- **No Surveillance / No Trackers**: Watch Cebu does not use Google Analytics, cookies, fingerprinting, or user telemetry.
- **Attribution**:
  - Power data sourced from public notices by [Visayan Electric Company (VECO)](https://www.visayanelectric.com/).
  - Seismic bulletins sourced from [DOST-PHIVOLCS](https://www.phivolcs.dost.gov.ph/).
  - Atmospheric air quality and hourly forecasts powered by [Open-Meteo](https://open-meteo.com/).
  - Map basemap data © [OpenStreetMap](https://www.openstreetmap.org/) contributors, tiles © [CARTO](https://carto.com/).
- **Civic Disclaimer**: This application is an independent community project and is **not officially affiliated with or endorsed by VECO, DOST-PHIVOLCS, or the City of Cebu**. For official safety orders, always heed local disaster risk reduction and management office (CDRRMO) directives.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.