# ADR-002: Persistent Data Store Architecture

## Status
Accepted

## Context
Watch Cebu requires storage for snapshot data produced by scheduled ingestion workflows and served by application endpoints:
1. Power interruption advisories for Metro Cebu (~50 fanned-out records).
2. Earthquake events within 300km of Cebu City (10–30 records).
3. Ingestion status and heartbeat telemetry.

We evaluated two approaches:
- **Flat JSON files committed directly to git.**
- **Relational / Document Database (e.g. Supabase, PostgreSQL, Firebase).**

## Decision
We chose **Flat JSON files committed to the repository by scheduled workflows**, structured into four disjoint files:
1. `data/live_power_advisories.json`: Latest resolved power advisories.
2. `data/status_power.json`: Power feed heartbeat, last checked timestamp, last successful update timestamp, and status.
3. `data/live_earthquake_events.json`: Latest earthquake events within 300km.
4. `data/status_earthquakes.json`: Earthquake feed heartbeat, last checked timestamp, last successful update timestamp, and status.

### Rationale for Splitting Status Files
A single shared `status.json` would introduce two significant race conditions:
1. **Git merge conflicts / push rejections:** Two independently triggered workflows attempting to push non-fast-forward commits concurrently.
2. **Application-level data clobbering:** Workflow A reading the combined JSON, Workflow B overwriting it with its update, and Workflow A committing stale data for Workflow B's section.

By partitioning files strictly by feed, each workflow owns its files exclusively. Workflows can run concurrently without race conditions.

### Atomic Writes
To prevent partial or corrupted writes from reaching production consumers (e.g. if process terminates mid-write), files are written to a temporary file (`*_tmp.json`) and atomically replaced via filesystem rename (`fs.renameSync`).

## Consequences & Revisit Triggers
- **Consequences:** Zero external database infrastructure to provision, pay for, or maintain. Historical changes are auditable via git log.
- **Revisit Trigger:** When product requirements call for user-facing historical queries (e.g., "Show all outages in Barangay Lahug across the past 6 months" or multi-month seismic trend analytics) or multi-tenant user submissions, migrate the persistence layer to PostgreSQL / Supabase.
