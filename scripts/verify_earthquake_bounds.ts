import fs from "fs";
import path from "path";

const BOUNDS = {
  minLat: 7.4,
  maxLat: 13.2,
  minLon: 120.9,
  maxLon: 126.9,
};

async function checkEarthquakes() {
  const file = path.resolve("data/live_earthquake_events.json");
  if (!fs.existsSync(file)) {
    console.error("File data/live_earthquake_events.json not found!");
    process.exit(1);
  }

  const events = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Auditing ${events.length} earthquake events from data/live_earthquake_events.json...`);

  let outsideCount = 0;
  for (const ev of events) {
    const { lat, lon, id, nearest_town, nearest_province, distance_from_cebu_km } = ev;
    const inLat = lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat;
    const inLon = lon >= BOUNDS.minLon && lon <= BOUNDS.maxLon;

    if (!inLat || !inLon) {
      console.error(`OUTSIDE BOUNDS: Event ${id} at (${lat}, ${lon}) - ${nearest_town}, ${nearest_province} (distance: ${distance_from_cebu_km}km)`);
      outsideCount++;
    } else {
      console.log(`✓ Within bounds: (${lat}, ${lon}) - ${nearest_town}, ${nearest_province} (${distance_from_cebu_km}km from Cebu)`);
    }
  }

  if (outsideCount === 0) {
    console.log(`✅ Exit Criterion 4 PASSED: All ${events.length} earthquake events fall strictly within maxBounds [${BOUNDS.minLat}, ${BOUNDS.minLon}] to [${BOUNDS.maxLat}, ${BOUNDS.maxLon}].`);
  } else {
    console.error(`❌ Exit Criterion 4 FAILED: ${outsideCount} events fell outside maxBounds!`);
    process.exit(1);
  }
}

checkEarthquakes().catch((err) => {
  console.error(err);
  process.exit(1);
});
