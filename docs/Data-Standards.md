# Data Standards — Watch Cebu
*Version: 0.1 — Stage 1 (Discovery & Data Contracts)*
*Last updated: 2026-09-06*

---

## 1. Scope

This document is the authoritative reference for every data shape, provenance rule, and quality convention used by Watch Cebu. Any parser, API handler, or UI component that touches civic data MUST comply with these standards.

Covered data layers:

| Layer | Source | Status |
|---|---|---|
| Scheduled power interruptions | VECO Service Advisory | Active |
| Seismic events | PHIVOLCS Earthquake Bulletins | Active |
| Rotational / emergency brownouts | Facebook (VECO page) | Dropped from scope (see Section 6) |

---

## 2. Coordinate Rules (Non-Negotiable)

**Rule C-1 — No invented coordinates.**
No coordinate pair may be derived from model knowledge, gazetteer lookup by feel, or any other non-auditable source. Every lat/lon must be traceable to one of the approved sources below.

### Approved coordinate sources

| Source label | Applies to | Description |
|---|---|---|
| `bulletin` | PHIVOLCS | Coordinates extracted verbatim from the PHIVOLCS bulletin text (e.g. `12.90°N, 123.13°E`). The only permitted source for earthquake epicenters. |
| `osm_point` | VECO | Point coordinate from an OpenStreetMap node representing an official barangay settlement or place marker, verified with OSM node ID. |
| `manual_verified` | VECO | Audited geographic point anchored to a checkable source (such as an OSM way/infrastructure feature or official project master plan) for special economic zones lacking PSA barangay status (e.g. South Reclamation Area). |
| `boundary_centroid` | VECO | Centroid mathematically computed from an administrative boundary polygon (`way` or `relation` geometry). Reserved for true polygon geometries (currently 0 in dataset). |
| `geocoded` | VECO | Result of calling an external geocoding API (e.g. Nominatim) with the area text as input. Response must be stored; the query string and provider must be logged. |

**PHIVOLCS coordinates come ONLY from `bulletin`.** If a bulletin page does not contain an explicit lat/lon pair, the record is invalid — skip it and log the URL.

**VECO coordinates come from `osm_point`, `manual_verified`, `boundary_centroid`, or `geocoded` only.** Never estimate from general knowledge or invent coordinates.

---

## 3. Provenance Requirements

Every record in either data layer MUST carry:

| Field | Type | Rule |
|---|---|---|
| `source_url` | `string (URL)` | The exact URL of the source page (bulletin page for PHIVOLCS; the `/post/` page for VECO). Must be a resolvable, permanent link. |
| `fetched_at` | `string (ISO 8601, UTC)` | Timestamp at which the parser retrieved the source page. |

These fields are never optional, never null.

---

## 4. Confidence and Parse-Quality Model

### 4.1 Power advisory confidence

| Value | Meaning |
|---|---|
| `scheduled` | Window is published in a weekly VECO service advisory post. VECO has committed to the time and area. |

If a future layer (e.g. emergency brownout) is added, it MUST use a distinct value (e.g. `conditional`) and must NOT reuse `scheduled`.

### 4.2 Parse confidence

| Value | Meaning | Action |
|---|---|---|
| `high` | All required fields extracted cleanly; no ambiguity detected. | Store and emit normally. |
| `low` | Required field(s) missing, truncated, or ambiguously formatted. | Store with flag, exclude from map pins, log for manual review. |
| `skip` | Record is structurally unrecognisable. | Do not store. Log the URL and raw snippet. |

**Parsers must fail loudly. Silent emission of wrong data is worse than dropping a record.**

---

## 5. Schemas

See `docs/schemas/PowerAdvisory.schema.json` and `docs/schemas/EarthquakeEvent.schema.json` for the full JSON Schema definitions.

### 5.1 PowerAdvisory — field summary

One record = one interruption event (one time block for one area set).

| Field | Type | Notes |
|---|---|---|
| `id` | string | SHA-256 of (source_url + date + start_time + areas_affected_raw) |
| `source_url` | string (URI) | Required. The /post/ page URL. |
| `fetched_at` | string (ISO 8601 UTC) | Required. |
| `advisory_week_start` | string (date) | ISO date of the Sunday that opens the advisory week. |
| `date` | string (date) | ISO date of the interruption day. |
| `start_time` | string (HH:MM) | PST, 24-hour. |
| `end_time` | string (HH:MM) | PST, 24-hour. |
| `overnight_span` | boolean | True when window crosses midnight. |
| `duration_hours` | number or null | From parenthetical "(Xhrs)". |
| `purpose` | string | Full verbatim purpose text. |
| `city` | enum | One of eight VECO LGUs (see below). |
| `barangay` | string[] | One or more names from Areas Affected. |
| `streets` | string[] | Street names from Areas Affected. Empty array if none. |
| `areas_affected_raw` | string | Verbatim "Areas Affected:" text. |
| `lat` | number or null | Null until geocoding stage. |
| `lon` | number or null | Null until geocoding stage. |
| `coordinate_source` | enum or null | "geocoded" or "boundary_centroid". |
| `geocode_query` | string or null | String submitted to geocoder. |
| `geocode_provider` | string or null | e.g. "nominatim", "google". |
| `business_confidence` | "scheduled" | Always this value for VECO advisories. |
| `parse_confidence` | "high" or "low" | "low" excludes from map. |
| `parse_notes` | string or null | Explanation for "low" confidence. |

**Valid `city` values (exactly these eight):**
Cebu City, Mandaue City, Talisay City, Naga City, Consolacion, Liloan, Minglanilla, San Fernando

### 5.2 EarthquakeEvent — field summary

One record = one PHIVOLCS bulletin (one seismic event, within 300 km of Cebu City).

| Field | Type | Notes |
|---|---|---|
| `id` | string | SHA-256 of source_url. |
| `source_url` | string (URI) | Required. Full bulletin URL. |
| `fetched_at` | string (ISO 8601 UTC) | Required. |
| `datetime_pst` | string (ISO 8601+08:00) | Event time in PST. |
| `datetime_utc` | string (ISO 8601 UTC) | Event time in UTC. |
| `lat` | number | From bulletin. Never null. Absence = invalid record. |
| `lon` | number | From bulletin. Never null. Absence = invalid record. |
| `coordinate_source` | "bulletin" | Hardcoded. Always "bulletin". |
| `location_description` | string | Full location string from bulletin. |
| `nearest_town` | string or null | Parsed town name. |
| `nearest_province` | string or null | Parsed province name. |
| `depth_km` | integer | Depth from bulletin in km. |
| `magnitude` | number | Magnitude value from bulletin. |
| `magnitude_type` | string or null | Scale prefix e.g. "Ms", "Mw". |
| `origin_type` | string | "TECTONIC" or "VOLCANIC" or raw string. |
| `reported_intensities` | string or null | Verbatim intensity string. Null if blank. |
| `expecting_damage` | boolean | true = YES in bulletin. |
| `expecting_aftershocks` | boolean | true = YES in bulletin. |
| `issued_on_pst` | string or null | Bulletin issue time in PST. |
| `distance_from_cebu_km` | number | Computed. Great-circle from 10.3157N 123.8854E. |
| `within_watch_radius` | boolean | true when distance <= 300 km. |
| `parse_confidence` | "high" or "low" | Required-field failures skip the record entirely. |
| `parse_notes` | string or null | Explanation for "low" confidence. |

---

## 6. Rotational / Emergency Brownouts — Scope Decision

**Decision: Dropped from scope indefinitely.**

VECO publishes rotational/emergency brownout advisories exclusively via informal Facebook posts. There is no API, RSS feed, structured HTML endpoint, or stable URL pattern. Scraping Facebook requires authentication, violates terms of service, and would produce an unreliable layer.

More fundamentally, adding an unstructured social-media source would undermine the project's integrity principle: *sourced only from official, structured, publicly accessible channels.*

**Future path:** If VECO ever publishes emergency brownout data through a structured official channel, revisit this decision. The `business_confidence` field is designed to accommodate a `conditional` value for that layer at that point.

---

## 7. PHIVOLCS Geographic Filter — Decision

**Decision: Fetch all nationwide events, filter by 300 km radius from Cebu City.**

**Finding:** PHIVOLCS does not expose any geographic filter on the index page. The index lists all recent nationwide seismic events in a single HTML table, chronologically, with no query parameters or regional sub-feeds.

**Filter specification:**
- Reference point: Cebu City at 10.3157°N, 123.8854°E
- Radius: 300 km great-circle distance
- Records with `distance_from_cebu_km <= 300` are stored with `within_watch_radius: true`
- Records outside this radius are not stored
- 300 km captures: entire Visayas region, Cebu Strait, Leyte, Bohol, Negros, Panay, northern Mindanao (Camiguin area), and adjacent waters

---

## 8. VECO URL Discovery — Decision

**Decision: Discover the current week post from the index page; do not construct URLs from dates.**

The `/customer-services/service-advisory` index page lists recent posts as anchor tags with titles like "Service Interruption: September 6-12, 2026" linking to `/post/service-interruption-september-6-12-2026`.

The URL slug pattern is: `service-interruption-{month_name}-{d1}-{d2}-{year}` where:
- `{month_name}` is the full English month name, lowercase
- `{d1}` and `{d2}` are day numbers without zero-padding
- Multi-month spans use a hyphen across months (e.g. `august-30-september-5-2026`)

**This pattern is fragile for date-construction.** Parser MUST:
1. Fetch the index page
2. Extract all hrefs matching `/post/service-interruption-*`
3. Take the first result (topmost = current week)
4. Fetch that URL
5. Log the resolved URL as `source_url`

---

## 9. Parser Failure Protocol

| Failure type | Action |
|---|---|
| Index page unreachable (HTTP error) | Abort fetch. Emit structured error log. Do not update stored data. |
| Index page structure changed (no matching links) | Abort. Emit skip log with raw HTML snippet. |
| Post page unreachable | Skip this week. Log URL + status. |
| Required field missing from VECO record | Set `parse_confidence: low`. Store with notes. Exclude from map. |
| PHIVOLCS bulletin missing lat/lon | Skip record entirely. Log bulletin URL. Do not store partial. |
| PHIVOLCS bulletin page unreachable | Skip. Log URL + status. Continue with remaining bulletins. |
| Unexpected field format | Set `parse_confidence: low`. Preserve raw value in *_raw field if available. |

---

## 10. Timezone Conventions

- All timestamps stored in both PST (UTC+8) and UTC.
- All VECO times are PST (VECO operates in the Philippine timezone; bulletins do not state timezone explicitly).
- All PHIVOLCS times are PST (stated explicitly: "Philippine Standard Time").
- `fetched_at` is always stored in UTC.

---

## 11. Coordinate Resolution & Barangay Centroids (Stage 2.5 & 2.5b)

### 11.1 Resolution Hierarchy for PowerAdvisory

To adhere strictly to **Rule C-1 (No invented coordinates)**, VECO coordinates are determined via a deterministic, multi-tier resolution hierarchy that reports genuine spatial provenance:

```
[PowerAdvisory Ingested (lat/lon: null)]
               │
               ▼
   [Barangay Lookup Engine] ────────► Matched ──► lat/lon from reference dataset
               │                                  source: "osm_point" | "manual_verified" | "boundary_centroid"
            No Match
               │
               ▼
     [Nominatim Geocoder]     ──────► Matched ──► lat/lon from geocoding API
     (Areas / Barangay query)                     coordinate_source: "geocoded"
               │                                  geocode_query & geocode_provider logged
            No Match
               │
               ▼
   [Unresolved Data Gap]      ──────► lat/lon remain null
                                      coordinate_source: null
                                      parse_notes: "Coordinates unresolved for..."
```

1. **Primary Path (`osm_point` / `boundary_centroid` / `manual_verified`):**
   Matches `(barangay, city)` against the static Metro Cebu boundary/point file (`data/metro-cebu-barangays.geojson`). The resolved record inherits the feature's actual provenance:
   - `osm_point`: Canonical point from OpenStreetMap (place node, office, or tagged location).
   - `boundary_centroid`: Mathematically computed geometric centroid of an administrative polygon boundary (none currently in dataset; reserved for polygon geometry).
   - `manual_verified`: Non-administrative zone or special development district verified against official survey/infrastructure maps and carrying full audit metadata (`verified_by`, `verified_at`, `verification_source`, `verification_note`).
2. **Fallback Path (`geocoded`):**
   Only when a barangay name cannot be matched to the reference file (e.g. sitio-level name, unusual name variant), the geocoder is invoked via Nominatim with `"${barangay}, ${city}, Philippines"`. The full query and provider name are permanently recorded on the advisory.
3. **Last Resort (Data Gap):**
   If both lookup and geocoding fail, `lat` and `lon` remain `null`, `coordinate_source` remains `null`, and the data gap is documented in `parse_notes`. **Never guess or invent coordinates.**

---

### 11.2 Reference Dataset Provenance & Audit (Stage 2.5b)

The Metro Cebu reference dataset is stored in the repository as static reference data (`data/metro-cebu-barangays.geojson`) to eliminate runtime network dependencies during ingestion.

#### Complete Source Breakdown

| Coordinate Source | Count | Description |
|---|---|---|
| `osm_point` | 348 | Real OpenStreetMap nodes (`node/<id>`) representing barangay centers, villages, suburbs, or quarters. |
| `manual_verified` | 1 | South Reclamation Area (SRP), Cebu City. Anchored to OSM Way 597926764 (`Cebu South Road Properties`). |
| `boundary_centroid` | 0 | Computed polygon centroids. (0 features in dataset; reserved strictly for actual polygon geometries). |
| **Total Features** | **349** | Canonical features across 8 LGUs. |

#### Dataset Metadata

| Attribute | Value |
|---|---|
| Repository path | `data/metro-cebu-barangays.geojson` |
| Builder script | `scripts/build_barangays_geojson.cjs` |
| Upstream source | OpenStreetMap (via Overpass API & Nominatim) |
| License | Open Data Commons Open Database License (ODbL 1.0) |
| Feature count | 349 canonical features across 8 LGUs |
| Covered LGUs | Cebu City (126), Mandaue City (49), Talisay City (37), Naga City (30), Consolacion (34), Liloan (24), Minglanilla (28), San Fernando (21) |

#### South Reclamation Area (SRP) Provenance Rationale
South Reclamation Area (SRP) is a 300-hectare commercial and civic development zone administered directly by the Cebu City Government, not an administrative barangay under the Local Government Code of 1991 (hence it lacks a PSA PSGC barangay code). VECO interruption notices frequently list SRP separately (e.g., *"Portion of Mambaling & South Reclamation Area"*). 

Rather than omitting it or falsely labeling an invented coordinate as an OSM centroid, SRP is represented honestly as `manual_verified`:
- **Coordinates:** `10.2751445, 123.8744640`
- **Anchor:** Centroid of Cebu South Road Properties spine ([OSM Way 597926764](https://www.openstreetmap.org/way/597926764))
- **Metadata:** `verified_by: "dev_team"`, `verification_source: "OSM Way 597926764 (Cebu South Road Properties) / Cebu City zoning map"`, `verification_note: "South Reclamation Area is a 300-ha special development zone administered by Cebu City, not an LGC administrative barangay. Coordinates represent the primary administrative spine."`

#### Corrected OSM Node Lookups
In Stage 2.5, 3 genuine barangays were erroneously hardcoded instead of queried from OSM. In Stage 2.5b, each was resolved to its real OSM node:
- **Talamban (Cebu City):** OSM Node `687162212` (`lat: 10.3693575, lon: 123.9169315`, `place: "suburb"`, `source: "osm_point"`).
- **Guba (Cebu City):** OSM Node `947697513` (`lat: 10.4282293, lon: 123.8898991`, `place: "village"`, `source: "osm_point"`).
- **Ward IV (Minglanilla):** OSM Node `10620076758` (`lat: 10.2465562, lon: 123.7941156`, `place: "quarter"`, `admin_level: "10"`, `source: "osm_point"`).

---

### 11.3 Multi-Barangay Fan-Out Rule

A single VECO interruption notice can affect multiple barangays in a single announcement (e.g., *"Portion of Mambaling & South Reclamation Area"* or *"Casuntingan, Maguikay & Bakilid"*). Centroid selection for multi-barangay spans is handled via **explicit fan-out**:

1. **Disaggregation into Distinct Records:**
   When an advisory lists $N$ barangays ($N > 1$), it is fanned out into $N$ distinct `PowerAdvisory` records—one for each named barangay.
2. **Deterministic ID Generation:**
   Each fanned-out record receives a deterministic SHA-256 ID:
   $$\text{id} = \text{SHA-256}(\text{parent\_id} \mathbin{\Vert} \text{barangay\_name})$$
   This guarantees idempotency across parser runs while preserving traceability back to the parent announcement.
3. **Field Inheritance:**
   All common operational fields (`source_url`, `fetched_at`, `advisory_week_start`, `date`, `start_time`, `end_time`, `overnight_span`, `duration_hours`, `purpose`, `city`, `streets`, `areas_affected_raw`, `business_confidence`, `parse_confidence`) are inherited verbatim from the parent row.
4. **Single-Barangay Invariance:**
   Advisories listing exactly one barangay maintain their parent ID and single-element `barangay` array.

#### Verification & Recount Breakdown (September 6–12, 2026 Fixture)
The raw advisory table from `veco_post_sample.html` yields 33 raw advisory rows. When fanned out across all named barangays, it yields **exactly 51 individual records** (previously miscounted as 50 in Stage 2.5 draft):

- **Single-barangay rows (22 rows):** 22 records
- **2-barangay rows (5 rows):** 10 records (Rows 0, 1, 14, 17, 32)
- **3-barangay rows (5 rows):** 15 records (Rows 7, 8, 9, 21, 23)
- **4-barangay rows (1 row):** 4 records (Row 18: Banilad, Lahug, Kamputhaw, Apas)
- **Total:** $22 + 10 + 15 + 4 = 51$ records.

All 51 fanned-out records resolve with 100% coordinate coverage:
- `osm_point`: 48 records
- `manual_verified`: 3 records (South Reclamation Area across rows 0, 1, and 17)
- `boundary_centroid`: 0 records
- Unresolved (`lat/lon: null`): 0 records

---

### 11.4 Character Encoding & Mojibake Prevention (Windows-1252)

**Root Cause Analysis:**
PHIVOLCS earthquake bulletin pages explicitly declare:
```html
<meta http-equiv=Content-Type content="text/html; charset=windows-1252">
```
Bulletins contain degree symbols (`°`) encoded as byte `0xb0` (the standard single-byte representation in Windows-1252 / ISO-8859-1). When decoded with a default UTF-8 reader, `0xb0` is an illegal sequence and is converted to `\uFFFD` (the Unicode replacement character ``).

**Protocol:**
1. All raw bulletin buffers MUST be decoded using `windows-1252` via `decodePhivolcsBuffer` (utilizing `TextDecoder("windows-1252")`).
2. `parsePHIVOLCSLocation` acts as defense-in-depth: it normalizes any stray `\uFFFD` or `?` in degree positions (e.g. `89? W` or `89 W`) to `89° W`.
3. Permanent regression test suites assert that `location_description` contains `°` and never contains `\uFFFD`.

---

### 11.5 Earthquake Authority & Single-Source of Truth Decision

**Decision:**
PHIVOLCS is and remains the **sole authoritative data source** for earthquake and seismic information in Watch Cebu. Secondary or dual-source ingestion (such as USGS Earthquake Hazards API) is explicitly **out of scope**.

**Rationale:**
1. **Local Authoritative Grounding:** PHIVOLCS is the mandated national agency operating the Philippine Seismic Network. Its bulletins report local epicenter descriptions (e.g. distance and bearing from Visayan municipalities), depth, origin type (tectonic/volcanic), and reported instrumental intensities (PHIVOLCS Earthquake Intensity Scale / PEIS).
2. **Provenance Integrity:** Merging a secondary global feed (e.g., USGS) with PHIVOLCS introduces distinct magnitude scales ($M_w$ vs $M_s$), disparate timestamps, differing depth calculations, and missing intensity/aftershock fields. Presenting aggregated feeds under a single layer blurs provenance and risks the exact "presented-as-more-real-than-it-is" failure that Watch Cebu has systematically designed out at the coordinate and fallback-data layers.
3. **Outage Resilience:** When PHIVOLCS is unreachable due to upstream maintenance or network splits, the system transparently serves verified local fixture data with a loud, honest provenance disclosure banner. It does not silently substitute a non-local data source.

---

### 11.6 NGCP Grid Status — Deferral Decision & Upstream Assessment

**Status:** Deferred indefinitely from active data layers.

**Assessment & Discovery Findings:**
Direct network and architectural discovery conducted during Stage 5 evaluated all candidate endpoints for the National Grid Corporation of the Philippines (NGCP) Visayas Grid status:
1. **`ngcp.ph` Web Endpoints:** HTTP probes against `ngcp.ph` (`/`, `/advisories`, `/press-releases`, `/grid-status`) return HTTP 403 or redirect to Cloudflare Turnstile bot challenges (`challenges.cloudflare.com`). No unprotected, machine-readable JSON/RSS feed or structured HTML advisory board is exposed for automated ingestion.
2. **Social Media Broadcasting (@NGCP_ALERT on Twitter/X):** NGCP's operational real-time declarations (Yellow / Red Alerts) are published almost exclusively via social media broadcasts. Twitter/X is an authenticated walled garden subject to aggressive rate limits, anti-scraping blocks, and API paywalls—mirroring the architectural barriers that previously required dropping Facebook rotational brownout tracking (Section 6).
3. **News Aggregators & Utility Disclosures:** Mainstream news outlets and VECO's own monthly rate advisories mention grid alerts only retrospectively (hours, days, or weeks after the alert window terminates). These cannot back a real-time status indicator.

**Decision & Architectural Principle:**
Per Watch Cebu's foundational data integrity policy, presenting data as more current than it actually is constitutes a critical system failure. A grid status indicator showing "Normal" or a stale alert from hours ago is dangerous and misleading during power system stress. Because no live, scrapeable, automated source with sub-hour resolution exists without brittle grey-market scraping, the **NGCP Grid Status badge is explicitly deferred**.

---

### 11.7 Color Reservation for Future Grid Status Layer

Should an authorized or unblocked machine-readable feed become available in a future stage, the color palette for Grid Status is strictly reserved to prevent domain overlap:
- **Power Advisories:** Red / Amber / Green (Reserved for operational status & interruption time horizons)
- **Earthquake Events:** Violet / Fuchsia (Reserved for seismic magnitude & PEIS intensity)
- **Grid Status (Reserved):** **Slate / Blue-Gray** family (e.g., Tailwind `slate-500` / `#64748b`, `slate-700` / `#334155`, `slate-900` / `#0f172a` with neutral border tokens).

No grid alert state may reuse the power or earthquake color families.

---

*This document is a living standard. All changes must be versioned and reviewed before any parser is updated.*


