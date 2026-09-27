# ADR-003: Map Viewport Containment

## Status
Accepted

## Context
The Leaflet map (`mapController.ts`) had no `minZoom` or `maxBounds`, allowing
users to pan/zoom to any region on Earth. Two consequences surfaced during
Phase 6 review: (1) the CartoDB dark_all basemap serves an unauthenticated
"Zoom Level Not Supported" / "API KEY REQUIRED" placeholder tile outside a
certain zoom range or when no VITE_CARTO_API_KEY is configured, and (2) the
RainViewer and NASA GIBS weather overlays render for whatever region is in
view, with no relationship to the app's actual coverage area.

We evaluated:
- Rectangular `maxBounds` sized to the existing WATCH_RADIUS_KM (300km) earthquake
  radius already defined in `src/utils/index.ts`.
- A true geodesic circular mask (turf.js or similar) matching the 300km radius exactly.
- Leaving the base map unbounded and only scoping weather tile requests.
- Relying solely on the one-time `fitBoundsIfNotEmpty()` call already present.

## Decision
Constrain the map with `minZoom` and a rectangular `maxBounds` sized to fully
contain the existing 300km watch radius around CEBU_CITY_REF: approximately
lat [7.4, 13.2], lon [120.9, 126.9]. This reuses the already-decided radius
rather than introducing a new, separately-tuned geographic constant.

## Consequences
Makes the CARTO unauthenticated placeholder tile range unreachable by users
regardless of the exact threshold. Automatically scopes both weather overlays
to the app's relevant area without a separate bounding-box config on each
tile layer. Slightly over-includes open water/rectangle corners outside the
true 300km circle — accepted as functionally harmless. A CARTO API key
(`VITE_CARTO_API_KEY`) should still be added independently, since it removes
the underlying tile restriction rather than just avoiding it.
