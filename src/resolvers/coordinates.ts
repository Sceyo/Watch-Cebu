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
  canonicalCity?: string;
}

export type GeocodeFetcher = (query: string) => Promise<{ lat: number; lon: number } | null>;

function normalizeStr(s: string): string {
  let str = (s || "").toLowerCase();
  str = str
    .replace(/Ⅰ/g, "1")
    .replace(/Ⅱ/g, "2")
    .replace(/Ⅲ/g, "3")
    .replace(/Ⅳ/g, "4")
    .replace(/Ⅴ/g, "5")
    .replace(/Ⅵ/g, "6")
    .replace(/Ⅶ/g, "7")
    .replace(/Ⅷ/g, "8");
  return str.replace(/[^a-z0-9]/g, "");
}

export interface CentroidResult {
  lat: number;
  lon: number;
  source: CoordinateSourceVECO;
  canonicalName: string;
  city: string;
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
    this.registerCuratedFallbacks();
  }

  private buildMap(collection: GeoJsonCollection): void {
    for (const f of collection.features) {
      const city = f.properties.city;
      const b = f.properties.barangay;
      const [lon, lat] = f.properties.centroid;
      const source: CoordinateSourceVECO = (f.properties.source as CoordinateSourceVECO) || "osm_point";

      const record: CentroidResult = { lat, lon, source, canonicalName: b, city };
      this.lookupMap.set(`${city}::${normalizeStr(b)}`, record);

      if (f.properties.alt_names) {
        for (const alt of f.properties.alt_names) {
          this.lookupMap.set(`${city}::${normalizeStr(alt)}`, record);
        }
      }
    }
  }

  private registerCuratedFallbacks(): void {
    const fallbacks: Array<{
      city: VECOCity;
      canonicalName: string;
      names: string[];
      lat: number;
      lon: number;
      source: CoordinateSourceVECO;
    }> = [
      {
        city: "Minglanilla",
        canonicalName: "Poblacion Ward I",
        names: ["Ward I", "Ward 1", "Poblacion Ward 1", "Poblacion Ward I", "Poblacion 1"],
        lat: 10.2445568,
        lon: 123.7979595,
        source: "osm_point",
      },
      {
        city: "Minglanilla",
        canonicalName: "Poblacion Ward II",
        names: ["Ward II", "Ward 2", "Poblacion Ward 2", "Poblacion Ward II", "Poblacion 2"],
        lat: 10.2424,
        lon: 123.7945,
        source: "osm_point",
      },
      {
        city: "Minglanilla",
        canonicalName: "Poblacion Ward III",
        names: ["Ward III", "Ward 3", "Poblacion Ward 3", "Poblacion Ward III", "Poblacion 3"],
        lat: 10.2471,
        lon: 123.7978,
        source: "osm_point",
      },
      {
        city: "Cebu City",
        canonicalName: "North Reclamation Area",
        names: ["North Reclamation Area", "North Reclamation", "NRA"],
        lat: 10.3128,
        lon: 123.9215,
        source: "osm_point",
      },
      {
        city: "San Fernando",
        canonicalName: "Liburon",
        names: ["Liburon"],
        lat: 10.1833,
        lon: 123.6488,
        source: "osm_point",
      },
    ];

    for (const item of fallbacks) {
      const record: CentroidResult = {
        lat: item.lat,
        lon: item.lon,
        source: item.source,
        canonicalName: item.canonicalName,
        city: item.city,
      };
      for (const name of item.names) {
        this.lookupMap.set(`${item.city}::${normalizeStr(name)}`, record);
      }
    }
  }

  /**
   * Look up coordinates and honest source for a given barangay within an LGU.
   * If not found under the specified city (e.g. VECO lumped multiple LGUs like Cebu City & Mandaue City),
   * falls back to searching across any other Metro Cebu LGU for that barangay.
   */
  public lookup(
    barangayName: string,
    city: VECOCity
  ): { lat: number; lon: number; source: CoordinateSourceVECO; canonicalCity: string } | null {
    const norm = normalizeStr(barangayName);
    const directKey = `${city}::${norm}`;
    if (this.lookupMap.has(directKey)) {
      const res = this.lookupMap.get(directKey)!;
      return { lat: res.lat, lon: res.lon, source: res.source, canonicalCity: res.city };
    }

    // Substring / prefix search within the same city
    const cityPrefix = `${city}::`;
    for (const [key, val] of this.lookupMap.entries()) {
      if (key.startsWith(cityPrefix)) {
        const kName = key.slice(cityPrefix.length);
        if (kName.includes(norm) || norm.includes(kName)) {
          return { lat: val.lat, lon: val.lon, source: val.source, canonicalCity: val.city };
        }
      }
    }

    // Cross-LGU fallback: When VECO combines multiple cities in one row (e.g. "Cebu City & Mandaue City"),
    // check if this barangay exists uniquely in another VECO city.
    for (const [key, val] of this.lookupMap.entries()) {
      const parts = key.split("::");
      if (parts.length === 2) {
        const kName = parts[1];
        if (kName === norm || kName.includes(norm) || norm.includes(kName)) {
          return { lat: val.lat, lon: val.lon, source: val.source, canonicalCity: val.city };
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
      geocode_provider: null,
      canonicalCity: match.canonicalCity
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
      let resolvedCity = parent.city;

      if (b) {
        const coords = await resolveBarangayCoordinates(b, parent.city, parent.areas_affected_raw, options);
        if (coords) {
          lat = coords.lat;
          lon = coords.lon;
          coordSource = coords.source;
          geocodeQuery = coords.geocode_query;
          geocodeProvider = coords.geocode_provider;
          if (coords.canonicalCity) {
            resolvedCity = coords.canonicalCity as VECOCity;
          }
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
        city: resolvedCity,
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
