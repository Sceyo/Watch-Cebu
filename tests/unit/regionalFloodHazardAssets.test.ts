import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

describe("Project NOAH Regional Flood Hazard Static Assets", () => {
  const dataDir = join(process.cwd(), "public", "data");
  const regions = [
    { name: "metro", file: "cebu-flood-metro.geojson", minFeatures: 15 },
    { name: "north", file: "cebu-flood-north.geojson", minFeatures: 10 },
    { name: "south", file: "cebu-flood-south.geojson", minFeatures: 10 },
  ];

  for (const reg of regions) {
    it(`generates valid ${reg.name} regional flood hazard GeoJSON under 400 KB`, () => {
      const assetPath = join(dataDir, reg.file);
      expect(existsSync(assetPath)).toBe(true);

      const stats = statSync(assetPath);
      expect(stats.size).toBeGreaterThan(1000);
      expect(stats.size).toBeLessThan(400 * 1024); // Mobile budget ceiling

      const geojson = JSON.parse(readFileSync(assetPath, "utf-8"));
      expect(geojson.type).toBe("FeatureCollection");
      expect(geojson.metadata?.source).toContain("Project NOAH");
      expect(geojson.metadata?.license).toContain("ODC-ODbL");
      expect(Array.isArray(geojson.features)).toBe(true);
      expect(geojson.features.length).toBeGreaterThanOrEqual(reg.minFeatures);

      const vars = new Set<number>();
      for (const f of geojson.features) {
        expect(["Polygon", "MultiPolygon"]).toContain(f.geometry.type);
        expect([1, 2, 3]).toContain(f.properties.Var);
        expect(["Low", "Medium", "High"]).toContain(f.properties.hazard_level);
        expect(f.properties.return_period).toBe("100-Year");
        vars.add(f.properties.Var);
      }
      expect(vars.size).toBeGreaterThanOrEqual(1);
    });
  }

  it("preserves backwards compatibility of cebu-flood-hazards.geojson", () => {
    const legacyPath = join(dataDir, "cebu-flood-hazards.geojson");
    const metroPath = join(dataDir, "cebu-flood-metro.geojson");
    expect(existsSync(legacyPath)).toBe(true);
    expect(existsSync(metroPath)).toBe(true);

    const legacy = JSON.parse(readFileSync(legacyPath, "utf-8"));
    const metro = JSON.parse(readFileSync(metroPath, "utf-8"));
    expect(legacy.features.length).toBe(metro.features.length);
  });

  it("strictly confines all regional flood hazard features to Cebu Province (zero Leyte, Bohol, or Negros leakage)", () => {
    for (const reg of regions) {
      const assetPath = join(dataDir, reg.file);
      const geojson = JSON.parse(readFileSync(assetPath, "utf-8"));
      for (const f of geojson.features) {
        const coords = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
        for (const [lon, lat] of coords) {
          // Zero Leyte (lon >= 124.35 when lat >= 10.85)
          expect(lat >= 10.85 && lon >= 124.35).toBe(false);
          // Zero Bohol (lon >= 123.75 when lat <= 10.15)
          expect(lat <= 10.15 && lon >= 123.75).toBe(false);
          // Zero Negros west
          expect(lon >= 123.25).toBe(true);
        }
      }
    }
  });
});
