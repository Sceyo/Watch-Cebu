/**
 * Coordinate Resolution and Fan-Out Tests (Stage 2.5)
 *
 * Verifies:
 * 1. Primary path: Barangay boundary centroid lookup against Metro Cebu GeoJSON.
 * 2. Fallback path: Geocoder invoked when centroid lookup fails.
 * 3. Last resort: Null coordinates with parse_notes logged when both fail.
 * 4. Multi-barangay fan-out: Fanning out multi-barangay rows into individual records with deterministic IDs.
 * 5. Full live fixture test: 100% of fanned-out advisories from Sept 6-12 fixture resolve coordinates or log parse_notes.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  BarangayCentroidLookup,
  resolveBarangayCoordinates,
  fanOutAndResolveAdvisories,
} from "../../src/resolvers/coordinates.js";
import { parsePostHtml } from "../../src/parsers/veco.js";
import type { PowerAdvisory } from "../../src/types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "../fixtures");
const geojsonPath = join(__dirname, "../../data/metro-cebu-barangays.geojson");

let postHtml: string;
let centroidLookup: BarangayCentroidLookup;

beforeAll(() => {
  postHtml = readFileSync(join(fixtureDir, "veco_post_sample.html"), "utf-8");
  centroidLookup = new BarangayCentroidLookup(geojsonPath);
});

describe("BarangayCentroidLookup", () => {
  it("resolves canonical barangays in Cebu City", () => {
    const coords = centroidLookup.lookup("Mambaling", "Cebu City");
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeCloseTo(10.29, 1);
    expect(coords!.lon).toBeCloseTo(123.87, 1);
  });

  it("resolves canonical barangays in Mandaue City", () => {
    const coords = centroidLookup.lookup("Subangdaku", "Mandaue City");
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeGreaterThan(10.3);
    expect(coords!.lon).toBeGreaterThan(123.9);
  });

  it("resolves canonical barangays in Talisay City", () => {
    const coords = centroidLookup.lookup("Tangke", "Talisay City");
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeGreaterThan(10.2);
  });

  it("resolves canonical barangays in Liloan", () => {
    const coords = centroidLookup.lookup("Tayud", "Liloan");
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeGreaterThan(10.35);
  });

  it("resolves canonical barangays in Consolacion", () => {
    const coords = centroidLookup.lookup("Polog", "Consolacion");
    expect(coords).not.toBeNull();
  });

  it("resolves aliases: South Reclamation Area in Cebu City as manual_verified", () => {
    const coords = centroidLookup.lookup("South Reclamation Area", "Cebu City");
    expect(coords).not.toBeNull();
    expect(coords!.source).toBe("manual_verified");
    expect(coords!.lat).toBeCloseTo(10.275, 2);
    expect(coords!.lon).toBeCloseTo(123.874, 2);
  });

  it("resolves Talamban as genuine osm_point", () => {
    const coords = centroidLookup.lookup("Talamban", "Cebu City");
    expect(coords).not.toBeNull();
    expect(coords!.source).toBe("osm_point");
    expect(coords!.lat).toBeCloseTo(10.369, 2);
    expect(coords!.lon).toBeCloseTo(123.916, 2);
  });

  it("resolves Guba as genuine osm_point", () => {
    const coords = centroidLookup.lookup("Guba", "Cebu City");
    expect(coords).not.toBeNull();
    expect(coords!.source).toBe("osm_point");
    expect(coords!.lat).toBeCloseTo(10.428, 2);
    expect(coords!.lon).toBeCloseTo(123.889, 2);
  });

  it("resolves aliases: Ward IV in Minglanilla to Poblacion Ward IV as osm_point", () => {
    const coords = centroidLookup.lookup("Ward IV", "Minglanilla");
    expect(coords).not.toBeNull();
    expect(coords!.source).toBe("osm_point");
    expect(coords!.lat).toBeCloseTo(10.246, 2);
  });

  it("returns null for unknown barangay in an LGU", () => {
    const coords = centroidLookup.lookup("NonExistentBarangay12345", "Cebu City");
    expect(coords).toBeNull();
  });
});

describe("resolveBarangayCoordinates", () => {
  it("primary path: returns osm_point when found in reference file", async () => {
    const res = await resolveBarangayCoordinates("Mambaling", "Cebu City", "Portion of Mambaling", {
      centroidLookup
    });
    expect(res).not.toBeNull();
    expect(res!.source).toBe("osm_point");
    expect(res!.lat).toBeCloseTo(10.29, 1);
    expect(res!.lon).toBeCloseTo(123.87, 1);
    expect(res!.geocode_query).toBeNull();
  });

  it("fallback path: invokes geocoder when reference lookup fails and fallback enabled", async () => {
    const mockGeocoder = async (query: string) => {
      if (query.includes("Sitio Mangga")) {
        return { lat: 10.3123, lon: 123.8912 };
      }
      return null;
    };

    const res = await resolveBarangayCoordinates("Sitio Mangga", "Cebu City", "Portion of Sitio Mangga", {
      centroidLookup,
      geocoder: mockGeocoder,
      enableGeocoderFallback: true
    });

    expect(res).not.toBeNull();
    expect(res!.source).toBe("geocoded");
    expect(res!.lat).toBe(10.3123);
    expect(res!.lon).toBe(123.8912);
    expect(res!.geocode_provider).toBe("nominatim");
    expect(res!.geocode_query).toContain("Sitio Mangga");
  });

  it("last resort: returns null when both centroid and geocoder fail", async () => {
    const mockFailingGeocoder = async () => null;

    const res = await resolveBarangayCoordinates("CompletelyUnknownPlace", "Cebu City", "Portion of Nowhere", {
      centroidLookup,
      geocoder: mockFailingGeocoder,
      enableGeocoderFallback: true
    });

    expect(res).toBeNull();
  });
});

describe("fanOutAndResolveAdvisories", () => {
  const dummyParent: PowerAdvisory = {
    id: "parent-hash-123456",
    source_url: "https://example.com/post-1",
    fetched_at: "2026-09-06T00:00:00Z",
    advisory_week_start: "2026-09-06",
    date: "2026-09-06",
    start_time: "08:00",
    end_time: "17:00",
    overnight_span: false,
    duration_hours: 9,
    purpose: "Line maintenance",
    city: "Cebu City",
    barangay: ["Mambaling", "South Reclamation Area"],
    streets: ["Candido Padilla St."],
    areas_affected_raw: "Portion of Mambaling & South Reclamation Area, Cebu City",
    lat: null,
    lon: null,
    coordinate_source: null,
    geocode_query: null,
    geocode_provider: null,
    business_confidence: "scheduled",
    parse_confidence: "high",
    parse_notes: null
  };

  it("fans out a 2-barangay advisory into 2 records with unique deterministic IDs and honest sources", async () => {
    const fanned = await fanOutAndResolveAdvisories([dummyParent], { centroidLookup });
    expect(fanned).toHaveLength(2);

    const [rec1, rec2] = fanned;
    expect(rec1.barangay).toEqual(["Mambaling"]);
    expect(rec2.barangay).toEqual(["South Reclamation Area"]);

    expect(rec1.id).not.toBe(dummyParent.id);
    expect(rec2.id).not.toBe(dummyParent.id);
    expect(rec1.id).not.toBe(rec2.id);

    // rec1 resolves to genuine osm_point; rec2 resolves to manual_verified
    expect(rec1.coordinate_source).toBe("osm_point");
    expect(rec1.lat).not.toBeNull();
    expect(rec2.coordinate_source).toBe("manual_verified");
    expect(rec2.lat).not.toBeNull();

    // Coordinates are distinct points for distinct barangays
    expect(rec1.lat).not.toBe(rec2.lat);
  });

  it("keeps root ID for single-barangay advisories", async () => {
    const single: PowerAdvisory = {
      ...dummyParent,
      id: "single-123",
      barangay: ["Mambaling"]
    };

    const fanned = await fanOutAndResolveAdvisories([single], { centroidLookup });
    expect(fanned).toHaveLength(1);
    expect(fanned[0].id).toBe("single-123");
    expect(fanned[0].barangay).toEqual(["Mambaling"]);
    expect(fanned[0].coordinate_source).toBe("osm_point");
  });

  it("preserves records with unresolved barangays, keeps lat/lon null, logs note", async () => {
    const unresolvable: PowerAdvisory = {
      ...dummyParent,
      id: "unres-123",
      barangay: ["GhostBarangay999"]
    };

    const fanned = await fanOutAndResolveAdvisories([unresolvable], {
      centroidLookup,
      enableGeocoderFallback: false
    });

    expect(fanned).toHaveLength(1);
    expect(fanned[0].lat).toBeNull();
    expect(fanned[0].lon).toBeNull();
    expect(fanned[0].coordinate_source).toBeNull();
    expect(fanned[0].parse_notes).toContain("Coordinates unresolved");
  });
});

describe("Sept 6-12 live fixture full resolution", () => {
  it("resolves coordinates for all 51 fanned-out advisories in the fixture set", async () => {
    const SOURCE_URL = "https://www.visayanelectric.com/post/service-interruption-september-6-12-2026";
    const NOW = "2026-09-06T00:00:00.000Z";

    const rawAdvisories = parsePostHtml(postHtml, SOURCE_URL, NOW);
    expect(rawAdvisories.length).toBe(33);

    const resolvedAdvisories = await fanOutAndResolveAdvisories(rawAdvisories, { centroidLookup });

    // Fanned-out count is exactly 51
    expect(resolvedAdvisories.length).toBe(51);

    // Every record must have either a valid coordinate_source or a logged note
    for (const a of resolvedAdvisories) {
      if (a.coordinate_source !== null) {
        expect(["osm_point", "manual_verified", "boundary_centroid", "geocoded"]).toContain(a.coordinate_source);
        expect(a.lat).not.toBeNull();
        expect(a.lon).not.toBeNull();
        // Latitude should be in Metro Cebu range (around 10.15 - 10.55 N)
        expect(a.lat!).toBeGreaterThan(10.1);
        expect(a.lat!).toBeLessThan(10.6);
        // Longitude should be in Metro Cebu range (around 123.70 - 124.05 E)
        expect(a.lon!).toBeGreaterThan(123.6);
        expect(a.lon!).toBeLessThan(124.1);
      } else {
        expect(a.lat).toBeNull();
        expect(a.lon).toBeNull();
        expect(a.parse_notes).not.toBeNull();
      }
    }

    // Provenance breakdown across the 51 fanned records:
    // 48 resolve via genuine osm_point, 3 resolve via manual_verified (South Reclamation Area)
    const osmPoints = resolvedAdvisories.filter(a => a.coordinate_source === "osm_point");
    const manualVerified = resolvedAdvisories.filter(a => a.coordinate_source === "manual_verified");

    expect(osmPoints.length).toBe(48);
    expect(manualVerified.length).toBe(3);
    expect(osmPoints.length + manualVerified.length).toBe(51);
  });
});

describe("GeoJSON Provenance Integrity", () => {
  it("never tags any feature as 'osm_overpass_centroid'", () => {
    const raw = JSON.parse(readFileSync(geojsonPath, "utf-8"));
    for (const f of raw.features) {
      expect(f.properties.source).not.toBe("osm_overpass_centroid");
      expect(["osm_point", "manual_verified", "boundary_centroid"]).toContain(f.properties.source);
    }
  });

  it("metadata sources_breakdown matches the exact feature counts", () => {
    const raw = JSON.parse(readFileSync(geojsonPath, "utf-8"));
    const { osm_point, manual_verified, boundary_centroid } = raw.metadata.sources_breakdown;
    expect(osm_point).toBe(348);
    expect(manual_verified).toBe(1);
    expect(boundary_centroid).toBe(0);
    expect(osm_point + manual_verified + boundary_centroid).toBe(raw.features.length);
  });
});
