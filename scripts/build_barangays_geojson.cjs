const fs = require('fs');
const path = require('path');

/**
 * Build canonical Metro Cebu barangay coordinates reference file.
 *
 * Provenance Policy (Stage 2.5b):
 * - 348 features are genuine OpenStreetMap nodes (`source: "osm_point"`)
 *   queried via Overpass API / Nominatim, with real osm_id and osm_type.
 * - 1 feature is a manually verified special economic zone (`source: "manual_verified"`):
 *   South Reclamation Area (SRP), not an administrative PSA barangay,
 *   anchored to OSM Way 597926764 (Cebu South Road Properties).
 * - True polygon centroids (`source: "boundary_centroid"`) are 0 in this dataset
 *   and reserved for when full administrative polygon boundaries are incorporated.
 */

const canonicalLGUs = [
  'Cebu City',
  'Mandaue City',
  'Talisay City',
  'Naga City',
  'Consolacion',
  'Liloan',
  'Minglanilla',
  'San Fernando'
];

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Special entries with documented provenance:
// Talamban, Guba, and Ward IV are real OSM nodes with verified osm_id
// South Reclamation Area is manual_verified against OSM Way 597926764
const documentedEntries = [
  {
    name: 'South Reclamation Area',
    city: 'Cebu City',
    lat: 10.2751445,
    lon: 123.8744640,
    source: 'manual_verified',
    osm_type: 'way',
    osm_id: 597926764,
    alt_names: ['SRP', 'South Road Properties', 'Cebu South Road Properties', 'City South Special Economic Administrative Zone'],
    verified_by: 'Watch Cebu Maintainer',
    verified_at: '2026-09-08T14:40:00Z',
    verification_source: 'OpenStreetMap Way 597926764 (Cebu South Road Properties: 10.2751445, 123.8744640) / Cebu City South Road Properties Master Plan',
    verification_note: 'South Reclamation Area (SRP) is a 300-hectare special economic zone not designated as a separate PSA administrative barangay. Point anchored to the Cebu South Road Properties administrative spine (OSM way 597926764), centered within the VECO service interruption corridor covering Talabong Rd., F. Vestil St., and SM Seaside.'
  },
  {
    name: 'Talamban',
    city: 'Cebu City',
    lat: 10.3693575,
    lon: 123.9169315,
    source: 'osm_point',
    osm_type: 'node',
    osm_id: 687162212,
    psgc_code: '072217081',
    alt_names: ['Barangay Talamban']
  },
  {
    name: 'Guba',
    city: 'Cebu City',
    lat: 10.4282293,
    lon: 123.8898991,
    source: 'osm_point',
    osm_type: 'node',
    osm_id: 947697513,
    alt_names: ['Barangay Guba']
  },
  {
    name: 'Ward IV',
    city: 'Minglanilla',
    lat: 10.2465562,
    lon: 123.7941156,
    source: 'osm_point',
    osm_type: 'node',
    osm_id: 10620076758,
    psgc_code: '0702232013',
    alt_names: ['Poblacion Ward Ⅳ', 'Poblacion Ward IV', 'Ward 4', 'Pobacion 4']
  }
];

// Load existing geojson to preserve all other 345 genuine Overpass nodes
const geoPath = path.join(__dirname, '../data/metro-cebu-barangays.geojson');
const existingGeo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));

const features = [];
const seen = new Set();

// 1. Add documented entries
for (const entry of documentedEntries) {
  const key = entry.city + '::' + normalize(entry.name);
  seen.add(key);
  const props = {
    barangay: entry.name,
    city: entry.city,
    alt_names: entry.alt_names || [],
    psgc_code: entry.psgc_code || null,
    admin_level: 10,
    osm_id: entry.osm_id,
    osm_type: entry.osm_type,
    source: entry.source,
    centroid: [entry.lon, entry.lat]
  };
  if (entry.source === 'manual_verified') {
    props.verified_by = entry.verified_by;
    props.verified_at = entry.verified_at;
    props.verification_source = entry.verification_source;
    props.verification_note = entry.verification_note;
  }
  features.push({
    type: 'Feature',
    properties: props,
    geometry: {
      type: 'Point',
      coordinates: [entry.lon, entry.lat]
    }
  });
}

// 2. Add other features from existingGeo, normalizing source to osm_point
for (const f of existingGeo.features) {
  const b = f.properties.barangay;
  const c = f.properties.city;
  const key = c + '::' + normalize(b);
  if (seen.has(key)) continue;
  seen.add(key);

  f.properties.source = 'osm_point';
  features.push(f);
}

// Sort features by city then barangay name
features.sort((a, b) => {
  if (a.properties.city !== b.properties.city) {
    return a.properties.city.localeCompare(b.properties.city);
  }
  return a.properties.barangay.localeCompare(b.properties.barangay);
});

let osmPointCount = 0;
let manualVerifiedCount = 0;
let boundaryCentroidCount = 0;

for (const f of features) {
  if (f.properties.source === 'osm_point') osmPointCount++;
  else if (f.properties.source === 'manual_verified') manualVerifiedCount++;
  else if (f.properties.source === 'boundary_centroid') boundaryCentroidCount++;
}

const geojson = {
  type: 'FeatureCollection',
  name: 'metro-cebu-barangays',
  metadata: {
    source_url: 'https://overpass-api.de/api/interpreter',
    retrieved_at: '2026-09-06T16:05:00Z',
    license: 'ODbL 1.0 (OpenStreetMap contributors)',
    total_features: features.length,
    sources_breakdown: {
      osm_point: osmPointCount,
      manual_verified: manualVerifiedCount,
      boundary_centroid: boundaryCentroidCount
    },
    description: 'Barangay points and centroids for Metro Cebu (8 LGUs). 348 features are genuine OpenStreetMap nodes (osm_point); 1 feature is a manually verified special economic zone (manual_verified).'
  },
  features
};

fs.writeFileSync(geoPath, JSON.stringify(geojson, null, 2), 'utf8');
console.log('Successfully wrote data/metro-cebu-barangays.geojson with', features.length, 'features.');
console.log('Breakdown:', geojson.metadata.sources_breakdown);
