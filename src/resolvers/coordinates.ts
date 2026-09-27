/**
 * Coordinate Resolution Engine for Watch Cebu PowerAdvisories.
 *
 * Implements Stage 2.5 requirements:
 * 1. Primary path: Match barangay (+ city) against Metro Cebu GeoJSON boundary file,
 *    return centroid -> coordinate_source: "boundary_centroid".
 * 2. Fallback path: Nominatim geocoding -> coordinate_source: "geocoded",
 *    with geocode_query and geocode_provider recorded.
 * 3. Last resort: lat/lon null, coordinate_source null, logged in parse_notes.
 * 4. Multi-barangay fan-out: Split multi-barangay advisories into 1 record per barangay,
 *    each with deterministic id: hash(parent.id + ":" + barangay).
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { PowerAdvisory, VECOCity, CoordinateSourceVECO } from "../types/index.js";
import { makeId } from "../utils/hash.js";

export interface GeoJsonFeature {
  type: "Feature";
  properties: {
    barangay: string;
    city: string;
    alt_names?: string[];
    centroid: [number, number]; // [lon, lat]
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

export interface GeoJsonCollection {
  type: "FeatureCollection";
  name?: string;
  metadata?: any;
  features: GeoJsonFeature[];
}

export interface CoordinateResolution {
  lat: number;
  lon: number;
  source: CoordinateSourceVECO;
  geocode_query: string | null;
  geocode_provider: string | null;
}

export type GeocodeFetcher = (query: string) => Promise<{ lat: number; lon: number } | null>;

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface CentroidResult {
  lat: number;
  lon: number;
  source: CoordinateSourceVECO;
  canonicalName: string;
}

/**
 * Centroid lookup table built from Metro Cebu barangay boundary file.
 */
export class BarangayCentroidLookup {
  private lookupMap: Map<string, CentroidResult> = new Map();

  constructor(geojsonOrPath?: GeoJsonCollection | string) {
    let collection: GeoJsonCollection;
    if (typeof geojsonOrPath === "string") {
      collection = JSON.parse(readFileSync(geojsonOrPath, "utf-8"));
    } else if (geojsonOrPath) {
      collection = geojsonOrPath;
    } else {
      const defaultPath = join(process.cwd(), "data/metro-cebu-barangays.geojson");
      collection = JSON.parse(readFileSync(defaultPath, "utf-8"));
    }
    this.buildMap(collection);
  }

  private buildMap(collection: GeoJsonCollection): void {
    for (const f of collection.features) {
      const city = f.properties.city;
      const b = f.properties.barangay;
      const [lon, lat] = f.properties.centroid;
      const source: CoordinateSourceVECO = (f.properties.source as CoordinateSourceVECO) || "osm_point";

      const record: CentroidResult = { lat, lon, source, canonicalName: b };
      this.lookupMap.set(`${city}::${normalizeStr(b)}`, record);

      if (f.properties.alt_names) {
        for (const alt of f.properties.alt_names) {
          this.lookupMap.set(`${city}::${normalizeStr(alt)}`, record);
        }
      }
    }
  }

  /**
   * Look up coordinates and honest source for a given barangay within an LGU.
   */
  public lookup(barangayName: string, city: VECOCity): { lat: number; lon: number; source: CoordinateSourceVECO } | null {
    const norm = normalizeStr(barangayName);
    const directKey = `${city}::${norm}`;
    if (this.lookupMap.has(directKey)) {
      const res = this.lookupMap.get(directKey)!;
      return { lat: res.lat, lon: res.lon, source: res.source };
    }

    // Substring / prefix search within the same city
    const cityPrefix = `${city}::`;
    for (const [key, val] of this.lookupMap.entries()) {
      if (key.startsWith(cityPrefix)) {
        const kName = key.slice(cityPrefix.length);
        if (kName.includes(norm) || norm.includes(kName)) {
          return { lat: val.lat, lon: val.lon, source: val.source };
        }
      }
    }

    return null;
  }
}

/**
 * Fallback Nominatim geocoder.
 */
export async function defaultNominatimFetcher(query: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "WatchCebu/1.0 (civic app)" }
    });
    if (!res.ok) return null;
    const data = await res.json() as any[];
    if (!data || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (isNaN(lat) || isNaN(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

export interface ResolveOptions {
  centroidLookup?: BarangayCentroidLookup;
  geocoder?: GeocodeFetcher;
  enableGeocoderFallback?: boolean;
}

/**
 * Resolve coordinates for a single barangay + city.
 * Primary: Point/Centroid from boundary reference file (osm_point / manual_verified).
 * Fallback: Geocoder (geocoded).
 * Last resort: null.
 */
export async function resolveBarangayCoordinates(
  barangay: string,
  city: VECOCity,
  rawContext: string,
  options: ResolveOptions = {}
): Promise<CoordinateResolution | null> {
  const lookup = options.centroidLookup ?? new BarangayCentroidLookup();

  // 1. Primary: boundary reference file (osm_point, manual_verified, or boundary_centroid)
  const match = lookup.lookup(barangay, city);
  if (match) {
    return {
      lat: match.lat,
      lon: match.lon,
      source: match.source,
      geocode_query: null,
      geocode_provider: null
    };
  }

  // 2. Fallback: geocoder
  if (options.enableGeocoderFallback && options.geocoder) {
    const query = `${barangay}, ${city}, Philippines`;
    const geocoded = await options.geocoder(query);
    if (geocoded) {
      return {
        lat: geocoded.lat,
        lon: geocoded.lon,
        source: "geocoded",
        geocode_query: query,
        geocode_provider: "nominatim"
      };
    }
  }

  return null;
}

/**
 * Fans out multi-barangay PowerAdvisories into 1 record per barangay,
 * and resolves coordinates for all resulting records.
 *
 * - Advisories with multiple barangays fan out into N records.
 * - Each derived record gets an id deterministic on (root_id + ":" + barangay).
 * - Single-barangay advisories keep their root id and single barangay.
 * - Zero-barangay advisories are retained with null coordinates.
 */
export async function fanOutAndResolveAdvisories(
  advisories: PowerAdvisory[],
  options: ResolveOptions = {}
): Promise<PowerAdvisory[]> {
  const resolvedList: PowerAdvisory[] = [];

  for (const parent of advisories) {
    const barangays = parent.barangay && parent.barangay.length > 0 ? parent.barangay : [null];

    for (const b of barangays) {
      // Deterministic ID for fanned-out records
      const recordId = b && parent.barangay.length > 1
        ? makeId(parent.id, b)
        : parent.id;

      let lat = parent.lat;
      let lon = parent.lon;
      let coordSource = parent.coordinate_source;
      let geocodeQuery = parent.geocode_query;
      let geocodeProvider = parent.geocode_provider;
      let parseNotes = parent.parse_notes;

      if (b) {
        const coords = await resolveBarangayCoordinates(b, parent.city, parent.areas_affected_raw, options);
        if (coords) {
          lat = coords.lat;
          lon = coords.lon;
          coordSource = coords.source;
          geocodeQuery = coords.geocode_query;
          geocodeProvider = coords.geocode_provider;
        } else {
          // Log failure
          const note = `Coordinates unresolved for barangay: "${b}" in ${parent.city}`;
          parseNotes = parseNotes ? `${parseNotes}; ${note}` : note;
        }
      } else {
        const note = `No barangay identified for ${parent.city}`;
        parseNotes = parseNotes ? `${parseNotes}; ${note}` : note;
      }

      resolvedList.push({
        ...parent,
        id: recordId,
        barangay: b ? [b] : [],
        lat,
        lon,
        coordinate_source: coordSource,
        geocode_query: geocodeQuery,
        geocode_provider: geocodeProvider,
        parse_notes: parseNotes
      });
    }
  }

  return resolvedList;
}
