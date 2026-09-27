# ADR-001: Scheduling & Hosting Architecture

## Status
Accepted

## Context
Watch Cebu ingests data from two third-party websites without public APIs:
1. Visayan Electric Company (VECO) - scheduled service interruption advisories (weekly updates).
2. Philippine Institute of Volcanology and Seismology (PHIVOLCS) - earthquake bulletins (event-driven, time-sensitive).

In Stage 3, an in-memory TTL cache (15 min power / 10 min earthquakes) was implemented on the dev server. However, in serverless or container deployment targets, cold starts reset in-memory caches. This allows concurrent or repeated user requests to trigger uncoordinated live web scraping against legacy infrastructure, violating our commitment to low-load, respectful data consumption.

We evaluated three architectures:
- **Option A: Scheduled job writes, app only reads.** An independent scheduled job runs the parser/resolver pipeline on a predictable cadence and writes snapshots to storage. Application `/api/*` endpoints only read snapshots.
- **Option B: Serverless functions with on-demand scrape + external cache (Redis/Vercel KV).** Preserves on-demand scraping while caching remotely.
- **Option C: Long-running persistent server with internal scheduling (node-cron).** An always-on server running both cron and HTTP serving.

## Decision
We chose **Option A (Scheduled job writes, app only reads)** implemented via GitHub Actions cron workflows.

### 1. Asymmetric Cadence
The update frequencies of the two data sources differ significantly:
- **Power (VECO): Every 4 hours (`0 */4 * * *`)**. VECO publishes weekly advisories with hour-level precision. Checking every few hours captures new weekly updates without placing undue load on VECO's Wix-hosted site.
- **Earthquakes (PHIVOLCS): Every 10 minutes (`*/10 * * * *`)**. Earthquake data is time-sensitive. Routine runs fetch only the lightweight index page (~600KB uncompressed, fast check). When new bulletins appear within 300km of Cebu, they are fetched using a concurrency-limited pool (batch size 5, 200ms delay). Note: GitHub Actions scheduled cron has a practical 5-minute minimum and platform execution variance, so 10 minutes is treated as best-effort rather than sub-minute real-time telemetry.

### 2. Workflows and Feed Isolation
To completely prevent race conditions (both in Git push rejections and concurrent JSON read/write clobbering), two separate workflows are defined:
- `.github/workflows/refresh-power.yml` (`WATCH_CEBU_FEED=power`)
- `.github/workflows/refresh-earthquakes.yml` (`WATCH_CEBU_FEED=earthquakes`)

The ingestion script `scripts/run_scheduled_fetch.ts` strictly requires `WATCH_CEBU_FEED` and only touches the requested feed.

### 3. Heartbeat & GitHub Actions Auto-disable Prevention
GitHub disables scheduled workflows on public repositories after 60 days of repository inactivity. To ensure workflows continue running even during prolonged upstream outages or calm seismic periods:
- The script commits a per-feed status file (`data/status_power.json` or `data/status_earthquakes.json`) on **every** run (`if: always()`), regardless of whether the scrape succeeded or failed.
- The status file contains `last_checked_at` and `status: "ok" | "error"`. `last_successful_update` only advances on verified successful fetches.

### 4. Active Notification on Staleness
If `last_successful_update` exceeds the staleness threshold (48h for power, 24h for earthquakes), the script exits with code 1 (`steps.fetch.outcome == 'failure'`). An active webhook notification (e.g. Discord via `DISCORD_WEBHOOK_URL`) fires to alert the maintainer, avoiding silent degradation.

### 5. Local Development Parity
`npm run dev` defaults to on-demand scraping for local developer convenience. To test production snapshot handling locally, `npm run dev:snapshot` (`WATCH_CEBU_USE_SNAPSHOT=true`) configures the dev middleware to read from snapshot files and exercise the fallback/staleness paths.

## Consequences & Revisit Triggers
- **Consequences:** Near-zero ongoing hosting cost. User traffic is decoupled from scraper execution. Scraper failures do not cause downtime (stale snapshot or fallback data is returned with clear provenance banners).
- **Revisit Trigger:** If sub-minute real-time earthquake alerting or instant webhook notifications become necessary, migrate to Option C (persistent server with a daemon or long-polling worker) or a dedicated polling service.
