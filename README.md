# ⚡ WATCH CEBU

> **Real-Time Civic Awareness & Multi-Hazard Dashboard for Metro Cebu and the Visayas Region**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-207%20Passed-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
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
   git clone https://github.com/francis/Watch-Cebu.git
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
*Current Suite: 16 test files, 207 tests passed in ~14s.*

### Run TypeScript & Production Build
```bash
npm run build
```
Generates an optimized client bundle in `dist-client/` with zero TypeScript compiler errors.

### Real Browser CDP Audit
Run the automated Chrome DevTools Protocol verification script (launches headless Chrome, navigates to the app, exercises the Forecast drawer, and captures screenshots):
```bash
npx tsx scripts/verify_phase6_forecast.ts
```

---

## 📋 Master Roadmap

- [x] **Phase 1: Parsers & Ingestion** — Cheerio scrapers for VECO HTML & PHIVOLCS seismic bulletins with deterministic hashing.
- [x] **Phase 2: Core Spatial Engine** — Leaflet 1.9.4 base map, CartoDB Dark Matter, and strict 300 km Visayas radius filtering.
- [x] **Phase 3: Decoupled State & Resilient UI** — Independent data feeds, fallback warning banners, optimistic `localStorage` cache.
- [x] **Phase 4: Street Extraction & Filter Ergonomics** — Heuristic street/landmark parser (`extractStreets`), day tabs filter bar.
- [x] **Phase 5: Rate Parser & Attribution** — Historical VECO tariff rate parser, legal attribution, and About drawer.
- [x] **Phase 6: Multi-Hazard Expansion** — Option C earthquake markers, Open-Meteo Air Quality & recurring haze advisory, Stage 6b viewport containment, and Today's Weather Forecast button & drawer.
- [ ] **Phase 7: PWA Hardening & Cloud Deployment (Upcoming)** — Manifest, offline service worker, standalone display mode, and deployment to Cloudflare Pages / Vercel.

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