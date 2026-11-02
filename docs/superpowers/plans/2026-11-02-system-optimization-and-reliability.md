# Watch Cebu System Optimization & Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the identified reliability, parser accuracy, workflow alerting, and frontend rendering/accessibility gaps across Watch Cebu without breaking existing contracts or the 408-test suite.

**Architecture:** Harden the snapshot read path (`server/api.ts`) to distinguish legitimate zero-event quiet periods (`status: "ok", record_count: 0`) from corrupted/missing payloads, parallelize GitHub raw snapshot fetches with bounded timeouts, and align PAGASA dev/snapshot staleness handling. Scope PAGASA Heavy Rainfall Warning level matching per-block and extract storm wind speeds (`src/parsers/pagasa.ts`), fix GitHub Actions job-level `env` scoping for Discord alerts (`.github/workflows/refresh-*.yml`), and decouple drawer/modal UI toggles from Leaflet marker layer rebuilds while unifying multi-favorite barangay state (`src/main.ts`, `src/ui/map/mapController.ts`, `src/ui/components/mobileNav.ts`).

**Tech Stack:** TypeScript 5, Vite 7, Leaflet 1.9.4, Cheerio 1.0, Undici, Vitest 3, GitHub Actions.

**Spec:** `docs/Data-Standards.md`, `docs/adr/ADR-001-scheduling-architecture.md`, `docs/adr/ADR-002-data-store.md`

## Global Constraints

- Zero Node.js built-in modules (`crypto`, `fs`, `path`, `tls`, `undici`) may be imported by any file under `src/ui/` or `src/main.ts` (`tests/ui/clientBundleIntegrity.test.ts`).
- `rejectUnauthorized: false` is strictly forbidden across `server/` and `src/` (`tests/server/tlsConfig.test.ts`).
- Tests must never mutate `data/*.json`; any test invoking `scripts/run_scheduled_fetch.ts` must set `WATCH_CEBU_DATA_DIR` to an isolated temporary directory (`tests/guards/dataDirectoryGuard.test.ts`).
- All untrusted strings rendered into HTML templates must be escaped with `escapeHtml` from `src/utils/index.ts`.
- Poisoned/uninitialized empty array payloads (`[]` without a corresponding `FeedStatus` where `status === "ok"` and `record_count === 0`) must continue falling back to `fixture_fallback` (`tests/stress/backendComprehensiveStress.test.ts`).

## Review Focus

- Empty array `[]` snapshot payloads when `status_*.json` has `status: "ok", record_count: 0` (legitimate quiet period -> returns `data_source: "snapshot", data: []`) vs. when `status_*.json` is missing, malformed, or `status: "error"` (uninitialized/poisoned -> falls back to `fixture_fallback`).
- Multi-region PAGASA Heavy Rainfall advisories where `RED WARNING` is hoisted for another province (e.g., Bicol/Leyte) while `YELLOW WARNING` is hoisted for `Cebu` -> must classify Cebu as `"yellow"`, not `"red"`.
- PAGASA live scrape failure in `getPagasaBulletin()` -> must return `data_source: "fixture_fallback"` and must not cache the failed response in `MemoryCache`.
- Toggling UI drawers (`Legend`, `About`, `Air Quality`, `Forecast`, `Status Popover`) when a desktop Leaflet marker popup is open -> must not clear or rebuild `powerLayerGroup`, `earthquakeLayerGroup`, or `pagasaLayerGroup`.
- Unpinning the primary barangay via the map controls banner (`onClearMyBarangay`) when a second favorite barangay is saved -> must promote the remaining favorite to primary instead of clearing all saved favorites.

---

### Task 1: Snapshot Zero-Event Support, Parallel GitHub Fetch & PAGASA Staleness/Fallback (`server/api.ts`)

**Files:**
- Modify: `server/api.ts:79-326`
- Modify: `server/api.ts:528-693`
- Test: `tests/server/api.test.ts`
- Test: `tests/server/apiProductionRoutes.test.ts`

**Interfaces:**
- Consumes: `fetchPagasaBulletin` from `src/parsers/pagasa.ts`, `MemoryCache` from `server/cache.ts`
- Produces:
  - `STALE_PAGASA_MS = 6 * 60 * 60 * 1000` in `server/api.ts`
  - `FileSnapshotSource.readPowerSnapshot(): Promise<SnapshotFeedData<PowerAdvisory[]> | null>`
  - `FileSnapshotSource.readEarthquakeSnapshot(): Promise<SnapshotFeedData<EarthquakeEvent[]> | null>`
  - `GitHubSnapshotSource.readPowerSnapshot(): Promise<SnapshotFeedData<PowerAdvisory[]> | null>`
  - `GitHubSnapshotSource.readEarthquakeSnapshot(): Promise<SnapshotFeedData<EarthquakeEvent[]> | null>`
  - `GitHubSnapshotSource.readPagasaSnapshot(): Promise<SnapshotFeedData<PagasaBulletin> | null>`
  - `getPagasaBulletin(options?: ServerApiOptions): Promise<ApiResponse<PagasaBulletin>>`
  - `getPagasaBulletinSnapshot(options?: ServerApiOptions): Promise<ApiResponse<PagasaBulletin>>`

- [ ] **Step 1: Write the failing tests in `tests/server/api.test.ts` and `tests/server/apiProductionRoutes.test.ts`**

In `tests/server/api.test.ts`, update the `getPagasaBulletin` error test (lines 168–180) and add zero-event and PAGASA staleness snapshot tests:

```typescript
  it("getPagasaBulletin handles upstream fetch errors gracefully by returning fixture_fallback without caching", async () => {
    const mockCache = new MemoryCache();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("PAGASA 500"));

    try {
      const res = await getPagasaBulletin({ cache: mockCache });
      expect(res.data_source).toBe("fixture_fallback");
      expect(res.parse_notes).toContain("Failed to fetch live PAGASA bulletin");
      expect(mockCache.get("pagasa")).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
```

And inside `describe("Server API Layer — Snapshot Read Path (Production)")` in `tests/server/api.test.ts`:

```typescript
  it("getEarthquakeEventsSnapshot serves valid empty array [] when status_earthquakes.json has status 'ok' and record_count 0", async () => {
    const { writeFileSync } = await import("fs");
    const fakeLivePath = join(TMP_DIR, "live_earthquake_events.json");
    const fakeStatusPath = join(TMP_DIR, "status_earthquakes.json");

    writeFileSync(fakeLivePath, "[]\n", "utf-8");
    writeFileSync(
      fakeStatusPath,
      JSON.stringify({
        last_checked_at: new Date().toISOString(),
        last_successful_update: new Date().toISOString(),
        record_count: 0,
        status: "ok",
      }),
      "utf-8"
    );

    const res = await getEarthquakeEventsSnapshot({
      liveEqPath: fakeLivePath,
      statusEqPath: fakeStatusPath,
    });

    expect(res.data_source).toBe("snapshot");
    expect(res.data).toEqual([]);
  });

  it("getPagasaBulletinSnapshot attaches staleness warning when last_successful_update is >6h ago", async () => {
    const { writeFileSync } = await import("fs");
    const fakeLivePath = join(TMP_DIR, "live_pagasa_bulletin.json");
    const fakeStatusPath = join(TMP_DIR, "status_pagasa.json");

    writeFileSync(
      fakeLivePath,
      JSON.stringify({
        id: "pagasa-1",
        has_active_cyclone: false,
        tcws_cebu: { active: false, signal_level: 0, wind_speed_kmh: null, areas_affected: [] },
        heavy_rainfall_alert: { level: "none", warning_type: null, description: "None", advisory_areas: [] },
      }),
      "utf-8"
    );
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    writeFileSync(
      fakeStatusPath,
      JSON.stringify({
        last_checked_at: new Date().toISOString(),
        last_successful_update: tenHoursAgo,
        record_count: 1,
        status: "ok",
      }),
      "utf-8"
    );

    const res = await getPagasaBulletinSnapshot({
      livePagasaPath: fakeLivePath,
      statusPagasaPath: fakeStatusPath,
    });

    expect(res.data_source).toBe("snapshot");
    expect(res.parse_notes).toContain("PAGASA snapshot is stale: last updated");
    expect(res.parse_notes).toContain("threshold: 6h");
  });
```

Also import `getPagasaBulletinSnapshot` at the top of `tests/server/api.test.ts`.

- [ ] **Step 2: Run test suite to verify the new tests fail**

Run: `npx.cmd vitest run tests/server/api.test.ts`
Expected: FAIL on `getPagasaBulletin` (`"live"` vs `"fixture_fallback"`), `getEarthquakeEventsSnapshot` (`"fixture_fallback"` vs `"snapshot"`), and `getPagasaBulletinSnapshot` (`res.parse_notes` is `undefined`).

- [ ] **Step 3: Implement zero-event validation, parallel fetch with timeout, PAGASA staleness, and `getPagasaBulletin` fallback in `server/api.ts`**

In `server/api.ts`:
1. Add `const STALE_PAGASA_MS = 6 * 60 * 60 * 1000; // 6 hours` at line 82.
2. Add helper `function isVerifiedEmptySnapshot(status: FeedStatus | null): boolean`:
   ```typescript
   function isVerifiedEmptySnapshot(status: FeedStatus | null): boolean {
     return Boolean(
       status &&
       typeof status === "object" &&
       !Array.isArray(status) &&
       status.status === "ok" &&
       status.record_count === 0
     );
   }
   ```
3. In `FileSnapshotSource.readPowerSnapshot()` and `FileSnapshotSource.readEarthquakeSnapshot()`: read `status` from `statusPath` first; if `!Array.isArray(data) || (data.length === 0 && !isVerifiedEmptySnapshot(status))`, return `null`.
4. In `GitHubSnapshotSource.readPowerSnapshot()`, `readEarthquakeSnapshot()`, and `readPagasaSnapshot()`:
   - Pass `signal: AbortSignal.timeout(8_000)` in the fetch options.
   - Fetch `liveUrl` and `statusUrl` concurrently using `Promise.all([this.fetchFn(liveUrl, ...), this.fetchFn(statusUrl, ...).catch(() => null)])`.
   - Parse `status` if `statusRes && statusRes.ok` (inside `try/catch`).
   - For power and earthquake snapshots, throw `"GitHub raw <feed> snapshot is empty or malformed"` only when `!Array.isArray(data) || (data.length === 0 && !isVerifiedEmptySnapshot(status))`.
5. In `getPowerAdvisoriesSnapshot()` and `getEarthquakeEventsSnapshot()`:
   - Check `if (!result || !Array.isArray(result.data) || (result.data.length === 0 && !isVerifiedEmptySnapshot(result.status)))` before falling back.
6. In `getPagasaBulletinSnapshot()`:
   - Check `result.status?.last_successful_update` against `STALE_PAGASA_MS` and attach `parse_notes: \`PAGASA snapshot is stale: last updated \${ageHours}h ago (threshold: 6h)\`` when `age > STALE_PAGASA_MS`.
7. In `getPagasaBulletin()`:
   - After `const bulletin = await fetchPagasaBulletin();`, check:
     ```typescript
     if (bulletin.parse_notes?.startsWith("Failed to fetch live PAGASA bulletin:")) {
       return getPagasaBulletinFallback(bulletin.parse_notes, options);
     }
     ```

- [ ] **Step 4: Run server and stress tests to verify they pass**

Run: `npx.cmd vitest run tests/server/api.test.ts tests/server/apiProductionRoutes.test.ts tests/stress/backendComprehensiveStress.test.ts`
Expected: PASS (all tests in all 3 suites pass, including poisoned `[]` payload test).

---

### Task 2: GitHub Actions Discord Webhook Scoping & CLI Staleness Test (`.github/workflows/refresh-*.yml` & `tests/scripts/scheduledFetch.test.ts`)

**Files:**
- Modify: `.github/workflows/refresh-power.yml:41-91`
- Modify: `.github/workflows/refresh-earthquakes.yml:46-88`
- Modify: `.github/workflows/refresh-pagasa.yml:40-78`
- Modify: `tests/scripts/scheduledFetch.test.ts:131-149`

**Interfaces:**
- Consumes: `scripts/run_scheduled_fetch.ts`
- Produces: Job-level `DISCORD_WEBHOOK_URL` environment variable in all 3 workflow files; end-to-end CLI staleness exit-code verification in `tests/scripts/scheduledFetch.test.ts`.

- [ ] **Step 1: Update `tests/scripts/scheduledFetch.test.ts` to test actual CLI execution on stale status**

Replace the no-op staleness test at `tests/scripts/scheduledFetch.test.ts:131-148` with a test that runs `scripts/run_scheduled_fetch.ts` when a feed fails and its `last_successful_update` is older than 48h (using an invalid `NODE_OPTIONS` or offline mock via a small `--import` or unreachable host override, or testing `status_power.json` with a 72h-old `last_successful_update` when `HTTPS_PROXY=http://127.0.0.1:1` forces the scrape to fail quickly):

```typescript
  it("flags staleness by setting exit code 1 when scrape fails and last_successful_update is older than threshold", () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    writeFileSync(
      POWER_STATUS,
      JSON.stringify({
        last_checked_at: threeDaysAgo,
        last_successful_update: threeDaysAgo,
        record_count: 51,
        status: "ok",
      }, null, 2),
      "utf-8"
    );

    let error: any = null;
    let stderrOutput = "";
    try {
      execSync("npx tsx scripts/run_scheduled_fetch.ts", {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          WATCH_CEBU_FEED: "power",
          WATCH_CEBU_DATA_DIR: TEST_DATA_DIR,
          WATCH_CEBU_FORCE_FAIL: "Simulated upstream outage",
        },
        stdio: "pipe",
      });
    } catch (err: any) {
      error = err;
      stderrOutput = err.stderr ? err.stderr.toString() : "";
    }

    expect(error).not.toBeNull();
    expect(error.status).toBe(1);
    expect(stderrOutput).toContain("[STALE] power feed has not updated in");

    const updatedStatus = JSON.parse(readFileSync(POWER_STATUS, "utf-8"));
    expect(updatedStatus.status).toBe("error");
    expect(updatedStatus.last_successful_update).toBe(threeDaysAgo);
  }, 60_000);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx.cmd vitest run tests/scripts/scheduledFetch.test.ts`
Expected: FAIL (because `WATCH_CEBU_FORCE_FAIL` is not yet handled in `scripts/run_scheduled_fetch.ts`, so the live VECO scrape succeeds and updates `last_successful_update` to `now`).

- [ ] **Step 3: Support `WATCH_CEBU_FORCE_FAIL` in `scripts/run_scheduled_fetch.ts` and move `DISCORD_WEBHOOK_URL` to job-level `env:` in `.github/workflows/refresh-*.yml`**

1. In `scripts/run_scheduled_fetch.ts` (at the top of the `try` block in `main()`, line 163):
   ```typescript
   if (process.env.WATCH_CEBU_FORCE_FAIL) {
     throw new Error(process.env.WATCH_CEBU_FORCE_FAIL);
   }
   ```
2. In `.github/workflows/refresh-power.yml`, `.github/workflows/refresh-earthquakes.yml`, and `.github/workflows/refresh-pagasa.yml`:
   Move `DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}` into `jobs.refresh.env` (alongside `WATCH_CEBU_FEED`), and remove the redundant step-level `env:` block on the `Notify on staleness breach` step so `if: steps.fetch.outcome == 'failure' && env.DISCORD_WEBHOOK_URL != ''` has access to `env.DISCORD_WEBHOOK_URL`.

- [ ] **Step 4: Run `tests/scripts/scheduledFetch.test.ts` and `tests/guards/dataDirectoryGuard.test.ts` to verify they pass**

Run: `npx.cmd vitest run tests/scripts/scheduledFetch.test.ts tests/guards/dataDirectoryGuard.test.ts`
Expected: PASS.

---

### Task 3: Scoped PAGASA Heavy Rainfall Warning & Storm Wind Speeds (`src/parsers/pagasa.ts`)

**Files:**
- Modify: `src/parsers/pagasa.ts:112-151`
- Test: `tests/parsers/pagasa.test.ts`

**Interfaces:**
- Consumes: `PagasaBulletin`, `PagasaStormCenter`, `HeavyRainfallAlertLevel` from `src/types/pagasa.ts`
- Produces: `parsePagasaBulletinHtml(html: string, sourceUrl?: string, fetchedAt?: string): PagasaBulletin`

- [ ] **Step 1: Write the failing tests in `tests/parsers/pagasa.test.ts`**

Add two tests to `describe("PAGASA Weather Parser — Functional Scenarios")` in `tests/parsers/pagasa.test.ts`:

```typescript
  it("does not assign Red Rainfall Warning to Cebu when Red is for another province and Cebu is under Yellow Warning", () => {
    const html = `
      <html>
        <body>
          <h1>HEAVY RAINFALL WARNING NO. 05</h1>
          <p>Issued at 2:00 PM, 14 October 2026</p>
          <p>RED WARNING LEVEL: Southern Leyte and Surigao del Norte. Torrential rains causing serious flooding.</p>
          <p>ORANGE WARNING LEVEL: Bohol and Siquijor. Flooding is threatening.</p>
          <p>YELLOW WARNING LEVEL: Cebu (Metro Cebu, Toledo, Carcar) and Negros Oriental. Flooding in low-lying areas.</p>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html);

    expect(result.heavy_rainfall_alert.level).toBe("yellow");
    expect(result.heavy_rainfall_alert.advisory_areas).toContain("Metro Cebu");
  });

  it("extracts max_sustained_winds_kmh and gustiness_kmh into storm_center when present", () => {
    const html = `
      <html>
        <body>
          <h1>TROPICAL CYCLONE BULLETIN NO. 08</h1>
          <h2>TYPHOON "KRISTINE"</h2>
          <p>The center of the eye was estimated at 12.3°N, 124.8°E moving West Northwest at 25 km/h with maximum sustained winds of 130 km/h near the center and gustiness of up to 165 km/h.</p>
          <h3>SIGNAL NO. 1</h3>
          <p>Visayas: Northern Cebu</p>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html);

    expect(result.storm_center).not.toBeNull();
    expect(result.storm_center?.lat).toBe(12.3);
    expect(result.storm_center?.lon).toBe(124.8);
    expect(result.storm_center?.max_sustained_winds_kmh).toBe(130);
    expect(result.storm_center?.gustiness_kmh).toBe(165);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run tests/parsers/pagasa.test.ts`
Expected: FAIL (`result.heavy_rainfall_alert.level` is `"red"` instead of `"yellow"`, and `max_sustained_winds_kmh` is `undefined`).

- [ ] **Step 3: Implement scoped Heavy Rainfall Warning matching and wind speed extraction in `src/parsers/pagasa.ts`**

In `src/parsers/pagasa.ts`:
1. Replace the unscoped Heavy Rainfall Warning check (lines 117–134) with a scoped block matcher that checks each warning level section (`RED`, `ORANGE`, `YELLOW`) up to the next warning level heading or end of text:
   ```typescript
   const rainfallMatch = fullText.match(/HEAVY\s+RAINFALL\s+WARNING|COLOR-CODED\s+RAINFALL|THUNDERSTORM\s+ADVISORY/i);
   if (rainfallMatch) {
     const levelConfigs: Array<{
       level: HeavyRainfallAlertLevel;
       regex: RegExp;
       desc: string;
     }> = [
       {
         level: "red",
         regex: /\bRED\s+(?:WARNING|ALERT)(?:\s+LEVEL)?\b([\s\S]*?)(?=\b(?:ORANGE|YELLOW)\s+(?:WARNING|ALERT)|\bAFFECTING\b|\bMEANWHILE\b|$)/i,
         desc: "Torrential rains expected (>30 mm/hr). Severe flooding and landslides expected; immediate evacuation in hazard zones.",
       },
       {
         level: "orange",
         regex: /\bORANGE\s+(?:WARNING|ALERT)(?:\s+LEVEL)?\b([\s\S]*?)(?=\b(?:RED|YELLOW)\s+(?:WARNING|ALERT)|\bAFFECTING\b|\bMEANWHILE\b|$)/i,
         desc: "Intense rains expected (15–30 mm/hr). Flooding threatening; prepare for potential evacuation.",
       },
       {
         level: "yellow",
         regex: /\bYELLOW\s+(?:WARNING|ALERT)(?:\s+LEVEL)?\b([\s\S]*?)(?=\b(?:RED|ORANGE)\s+(?:WARNING|ALERT)|\bAFFECTING\b|\bMEANWHILE\b|$)/i,
         desc: "Heavy rains expected (7.5–15 mm/hr). Localized flooding possible in low-lying and river areas.",
       },
     ];

     for (const cfg of levelConfigs) {
       const match = fullText.match(cfg.regex);
       if (match && match[1] && /\bCebu\b/i.test(match[1])) {
         rainfallLevel = cfg.level;
         rainfallDesc = cfg.desc;
         rainfallAreas.push("Metro Cebu");
         break;
       }
     }
   }
   ```
2. In the Storm Center parser (lines 137–150), extract `max_sustained_winds_kmh` and `gustiness_kmh`:
   ```typescript
   const windsMatch = fullText.match(/maximum\s+sustained\s+winds\s+of\s+(\d{1,3})\s*km\/h/i);
   const gustMatch = fullText.match(/gustiness\s+of\s+(?:up\s+to\s+)?(\d{1,3})\s*km\/h/i);
   const max_sustained_winds_kmh = windsMatch ? parseInt(windsMatch[1], 10) : undefined;
   const gustiness_kmh = gustMatch ? parseInt(gustMatch[1], 10) : undefined;
   stormCenter = {
     lat,
     lon,
     movement,
     ...(max_sustained_winds_kmh !== undefined ? { max_sustained_winds_kmh } : {}),
     ...(gustiness_kmh !== undefined ? { gustiness_kmh } : {}),
   };
   ```

- [ ] **Step 4: Run PAGASA unit and stress tests to verify they pass**

Run: `npx.cmd vitest run tests/parsers/pagasa.test.ts tests/stress/pagasaStress.test.ts`
Expected: PASS.

---

### Task 4: Multi-Favorite Consistency, Selective Map Re-rendering & Welcome Modal Accessibility (`src/main.ts`, `src/ui/map/mapController.ts`, `src/ui/components/mobileNav.ts`)

**Files:**
- Modify: `src/ui/map/mapController.ts:24-25`, `src/ui/map/mapController.ts:308-317`
- Modify: `src/ui/components/mobileNav.ts:15-16`, `src/ui/components/mobileNav.ts:251-253`
- Modify: `src/main.ts:152`, `src/main.ts:200-265`, `src/main.ts:304-362`, `src/main.ts:464-539`, `src/main.ts:685-692`, `src/main.ts:771-781`
- Test: `tests/ui/searchAndZoom.test.ts`
- Test: `tests/ui/mobileNav.test.ts`

**Interfaces:**
- Consumes: `isFavorite`, `toggleFavoriteBarangay` from `src/ui/services/myBarangay.ts`
- Produces:
  - Consistent multi-favorite star badge rendering in `MapController.renderPowerAdvisories` and `renderMobileBottomSheet`
  - `updateUI(shouldRenderMapLayers = true)` in `src/main.ts`
  - Welcome modal `Escape` and `Tab` focus-trap support in `src/main.ts`

- [ ] **Step 1: Write the failing tests in `tests/ui/searchAndZoom.test.ts` and `tests/ui/mobileNav.test.ts`**

1. In `tests/ui/searchAndZoom.test.ts`, add a test verifying that `renderPowerAdvisories` highlights secondary saved favorite barangays (via `isFavorite`) even when `myBarangay` is set to the primary favorite:
   ```typescript
   it("highlights all saved multi-favorite barangays on the map, not just primary myBarangay", async () => {
     const { setMyBarangay, clearAllFavorites } = await import("../../src/ui/services/myBarangay.js");
     clearAllFavorites();
     setMyBarangay("Lahug");
     setMyBarangay("Talamban"); // Talamban is primary, Lahug is secondary favorite

     const container = document.createElement("div");
     container.id = "map-multi-fav";
     document.body.appendChild(container);
     const controller = new MapController("map-multi-fav");

     const lahugAdv: PowerAdvisory = {
       ...mockAdvisories[0],
       id: "adv-lahug",
       barangay: ["Lahug"],
       city: "Cebu City",
       lat: 10.33,
       lon: 123.89,
     };

     controller.renderPowerAdvisories([lahugAdv], { selectedDate: "all", minMagnitude: 0 }, "Talamban");
     const layers = (controller as any).powerLayerGroup.getLayers();
     expect(layers.length).toBe(1);
     const iconHtml = layers[0].options.icon.options.html;
     expect(iconHtml).toContain("is-favorite");

     clearAllFavorites();
     container.remove();
   });
   ```

2. In `tests/ui/mobileNav.test.ts`, add a test verifying that `renderMobileBottomSheet` marks a secondary favorite barangay as `is-pinned` using `isFavorite`:
   ```typescript
   it("marks power advisory as Pinned Area in mobile bottom sheet when barangay is a secondary favorite", async () => {
     const { setMyBarangay, clearAllFavorites } = await import("../../src/ui/services/myBarangay.js");
     clearAllFavorites();
     setMyBarangay("Lahug");
     setMyBarangay("Talamban"); // Talamban is primary, Lahug is still in favorites

     const container = createMockElement();
     const lahugAdvisory: PowerAdvisory = {
       id: "pow-lahug-fav",
       source_url: "https://visayanelectric.com/post/1",
       fetched_at: "2026-10-16T08:00:00Z",
       advisory_week_start: "2026-10-18",
       date: "2026-10-18",
       start_time: "08:00",
       end_time: "17:00",
       overnight_span: false,
       duration_hours: 9,
       purpose: "Line maintenance",
       city: "Cebu City",
       barangay: ["Lahug"],
       streets: ["Salinas Drive"],
       areas_affected_raw: "Lahug",
       lat: 10.33,
       lon: 123.89,
       coordinate_source: "osm_point",
       geocode_query: null,
       geocode_provider: null,
       business_confidence: "scheduled",
       parse_confidence: "high",
       parse_notes: null,
     };

     renderMobileBottomSheet(container, { type: "power", advisories: [lahugAdvisory] }, vi.fn(), vi.fn(), "Talamban");
     expect(container.innerHTML).toContain("is-pinned");
     expect(container.innerHTML).toContain("Pinned Area");
     clearAllFavorites();
   });
   ```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx.cmd vitest run tests/ui/searchAndZoom.test.ts tests/ui/mobileNav.test.ts`
Expected: FAIL on the two new multi-favorite tests (`iconHtml` does not contain `"is-favorite"` and `container.innerHTML` does not contain `"is-pinned"`).

- [ ] **Step 3: Implement multi-favorite checks, selective map layer rendering, and Welcome Modal keyboard handling**

1. In `src/ui/map/mapController.ts`:
   - Import `isFavorite as isSavedFavorite` from `../services/myBarangay.js`.
   - In `renderPowerAdvisories` (lines 309–316), check both `myBarangay` and `isSavedFavorite`:
     ```typescript
     const isFavorite = Boolean(
       group.some((a) => {
         const mBrgy = a.barangay.some(
           (b) => (myBarangay && b.toLowerCase() === myBarangay.toLowerCase()) || isSavedFavorite(b)
         );
         const mCity =
           (myBarangay && a.city.toLowerCase() === myBarangay.toLowerCase()) || isSavedFavorite(a.city);
         return mBrgy || mCity;
       })
     );
     ```
2. In `src/ui/components/mobileNav.ts`:
   - Import `isFavorite` from `../services/myBarangay.js`.
   - In `renderMobileBottomSheet` (line 252), update `isPinned`:
     ```typescript
     const isPinned = Boolean(
       (myBarangay && primaryBarangay.toLowerCase() === myBarangay.toLowerCase()) ||
       isFavorite(primaryBarangay)
     );
     ```
3. In `src/main.ts`:
   - Update `onClearMyBarangay` (lines 352–362) to unpin only the current primary barangay via `toggleFavoriteBarangay`:
     ```typescript
     onClearMyBarangay: () => {
       const prev = myBarangay;
       const { primary } = prev ? toggleFavoriteBarangay(prev) : { primary: null };
       myBarangay = primary;
       if (prev && filterState.searchQuery && filterState.searchQuery.toLowerCase().trim() === prev.toLowerCase().trim()) {
         filterState.searchQuery = "";
       }
       mapController?.renderPowerAdvisories(powerFeedState.data, filterState, myBarangay);
       showToast(prev ? `Unpinned ${prev}.` : "Unpinned home barangay.");
       updateUI(false);
     },
     ```
   - Change `function updateUI(shouldRenderMapLayers = true)` (line 152) and guard lines 686–691 with `if (mapController && shouldRenderMapLayers)`.
   - Pass `updateUI(false)` in pure drawer/modal/view-mode toggles where map data/filters did not change (`closeAllDrawers`, `onLegendToggle`, `onAboutToggle`, `onAirQualityToggle`, `onForecastToggle`, `onStatusPopoverToggle`, `onSearchChange` when `currentViewMode === "list"`, `onViewModeToggle`, mobile bottom sheet close, status popover close, and welcome modal close).
   - In the `window.addEventListener("keydown", ...)` listener (lines 772–779), include `isWelcomeOpen` in `isAnyOpen`:
     ```typescript
     const isAnyOpen =
       isLegendOpen ||
       isAboutOpen ||
       isAirQualityOpen ||
       isForecastOpen ||
       isStatusPopoverOpen ||
       selectedLocation !== null ||
       isWelcomeOpen;
     ```

- [ ] **Step 4: Run the full test suite and TypeScript typecheck**

Run: `npm.cmd test; npx.cmd tsc --noEmit`
Expected: PASS (all 35 test suites pass and `tsc --noEmit` exits 0).
