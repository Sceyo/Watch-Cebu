# ADR-005: Production Deployment and Runtime Snapshot Distribution

## Status
Accepted

## Context
Watch Cebu was deployed to Vercel (`https://watch-cebu.vercel.app/`), but returned 404 at `/` and lacked functional `/api/power` and `/api/earthquakes` endpoints.

A root-cause diagnosis revealed three interrelated architecture constraints:
1. **Output Directory Mismatch:** `vite build` outputs static client assets to `dist-client/` (configured in `vite.config.ts`), whereas `tsc` outputs compiled JavaScript to `dist/` (configured in `tsconfig.json`). Vercel's default Vite framework preset serves `dist/`, which contains compiled backend code but no `index.html`, leading to a 404 on `/`.
2. **Missing Production API Routes:** The `/api/power` and `/api/earthquakes` routes existed solely as Vite development server middleware (`server/dev-middleware.ts`). Production builds had no serverless function adapter to serve snapshot data.
3. **Vercel Hobby Plan Deploy-Limit Trap:** In ADR-001 and ADR-002, we established scheduled GitHub Actions cron workflows committing flat JSON snapshots to the repository (`refresh-earthquakes.yml` runs every 10 minutes, generating up to 144 commits/day; `refresh-power.yml` adds ~6 commits/day). Vercel's Hobby tier enforces a strict hard cap of **100 deployments per day**. If snapshots were bundled into the Vercel deployment, every commit from the bot would trigger a new build, quickly exhausting the quota within ~16 hours and locking the maintainer out of manual deploys while freezing data updates.

Additionally, running local test suites (`npm test`) previously executed child processes that mutated `data/live_power_advisories.json` and `data/status_power.json`, risking accidental commits of stale September fixture data as live data.

---

## Decision

We chose to **decouple data snapshot updates completely from Vercel deployments** by serving committed snapshots at runtime from the public GitHub repository via lightweight edge-cached serverless functions, combined with an Ignored Build Step rule on Vercel.

### 1. Build and Output Configuration
We created a root `vercel.json` configuring:
- `"framework": "vite"`
- `"buildCommand": "npm run build"`
- `"outputDirectory": "dist-client"`
- `"functions": { "api/*.ts": { "includeFiles": "data/**" } }`

This guarantees that Vercel serves the Vite static bundle from `dist-client/` where `index.html` resides.

### 2. Runtime Snapshot Distribution (GitHub Raw API)
Instead of bundling `data/*.json` into immutable function builds, production endpoints fetch snapshots dynamically from GitHub's raw content CDN:
- Pinned Base URL: `https://raw.githubusercontent.com/Sceyo/Watch-Cebu/main/data/`
- Power Feed: `live_power_advisories.json` + `status_power.json`
- Earthquake Feed: `live_earthquake_events.json` + `status_earthquakes.json`

We implemented a pluggable `ISnapshotSource` abstraction in `server/api.ts`:
- **`FileSnapshotSource`**: Reads from the local filesystem (used by `npm run dev:snapshot` and unit tests).
- **`GitHubSnapshotSource`**: Fetches from the public GitHub repository at runtime using standard `fetch` (used by production Vercel functions).

### 3. Edge CDN Caching
To ensure function execution counts and upstream GitHub raw requests remain well below all platform limits, endpoints emit cache headers:
```http
Cache-Control: s-maxage=60, stale-while-revalidate=300
```
- `s-maxage=60`: Vercel's global Edge CDN caches responses for 60 seconds.
- `stale-while-revalidate=300`: For 5 minutes following expiration, edge servers serve cached responses immediately while revalidating in the background.
- Result: Even under high user traffic, Vercel functions execute at most once per minute (~1,440 invocations/day maximum), well within the Hobby allowance of 100,000 monthly invocations.

### 4. Resilient Fallback & Contract Preservation
The production API functions (`api/power.ts`, `api/earthquakes.ts`) preserve the exact response envelope expected by the frontend client:
- Success: `{ data_source: "snapshot", fetched_at: "...", data: [...] }`
- Staleness: If `status.last_successful_update` exceeds thresholds (48h power / 24h earthquakes), a warning note is attached in `parse_notes` and surfaced in the client UI banner.
- Upstream Failure: If `raw.githubusercontent.com` is unreachable or returns non-200, the functions fall back cleanly to bundled offline fixtures with `data_source: "fixture_fallback"` and explicit error notes. They never fail silently or return raw 500 errors.

### 5. Deployment Filtering (Ignored Build Step)
To ensure automated snapshot commits never consume Vercel deployment quota, we added `scripts/vercel-ignore-build.sh` and configured `"ignoreCommand"` in `vercel.json`:
```bash
git diff --quiet HEAD^ HEAD -- . ':(exclude)data'
```
- Exit 0 (Ignore Build): When a commit only touches `data/`, the deployment is skipped.
- Exit 1 (Proceed): When any code, style, test, documentation, or asset file outside `data/` is touched, Vercel builds and deploys normally.

### 6. Test Suite Isolation & Guard Test
To protect authentic production snapshots from test contamination:
- `server/api.ts` and `scripts/run_scheduled_fetch.ts` resolve data paths via `WATCH_CEBU_DATA_DIR` (defaulting to `data/`).
- `tests/scripts/scheduledFetch.test.ts` directs child process executions to an isolated temporary fixture directory (`tests/fixtures/tmp_scheduled_data`).
- A global integrity guard (`tests/setup/globalDataGuard.ts`) and regression suite (`tests/guards/dataDirectoryGuard.test.ts`) calculate SHA-256 hashes of all files in `data/` before and after test runs, failing immediately if any test ever mutates authentic data.

---

## Alternatives Considered & Rejected

### Option 1: Bundle `data/*.json` directly into deployment artifacts
- **Pros:** No HTTP fetch needed inside serverless functions.
- **Cons:** Every heartbeat commit from the 10-minute earthquake workflow would trigger a deployment (144+ deploys/day). This immediately breaches the Vercel Hobby tier limit (100 deploys/day), halting updates and blocking user deploys.
- **Verdict:** Rejected due to hard platform limits.

### Option 2: Migrate hosting to Cloudflare Pages
- **Pros:** Cloudflare Pages does not impose a 100 deploys/day limit on free tiers.
- **Cons:** Phase 7 already plans PWA hardening and cloud deployment evaluation. Migrating providers now would expand scope unnecessarily when Vercel can be cleanly configured with zero friction.
- **Verdict:** Deferred to Phase 7 as planned.

### Option 3: External Database or Managed Object Storage (Supabase / AWS S3 / Firebase)
- **Pros:** Decouples data storage from Git commits.
- **Cons:** Introduces third-party infrastructure, billing risks, and API credential management that ADR-002 deliberately rejected in favor of low-maintenance civic transparency.
- **Verdict:** Rejected.

---

## Consequences & Revisit Triggers
- **Consequences:**
  - `https://watch-cebu.vercel.app/` serves production HTML and live JSON data.
  - Vercel daily deployments drop from ~150/day to 0 on automated runs (only intentional code commits deploy).
  - Snapshot updates reach end users within 60–300 seconds of a GitHub Actions commit.
  - Test runs are guaranteed to never dirty git working trees.
- **Revisit Triggers:**
  - If the GitHub repository is ever made private, raw content fetches will require authentication (`Authorization: Bearer <GITHUB_TOKEN>`).
  - If user-level historical querying is introduced in Phase 7+, re-evaluate Cloudflare KV or SQLite edge storage.
