import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

describe("Project NOAH Metro Cebu Static GeoJSON Asset", () => {
  const assetPath = join(process.cwd(), "public", "data", "cebu-flood-hazards.geojson");

  it("exists, is under 600 KB uncompressed, and contains valid 100-year Metro Cebu flood polygons", () => {
    expect(existsSync(assetPath)).toBe(true);
    const stats = statSync(assetPath);
    expect(stats.size).toBeGreaterThan(1000);
    expect(stats.size).toBeLessThan(600 * 1024);

    const geojson = JSON.parse(readFileSync(assetPath, "utf-8"));
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.metadata?.source).toContain("Project NOAH");
    expect(geojson.metadata?.license).toContain("ODC-ODbL");
    expect(Array.isArray(geojson.features)).toBe(true);
    expect(geojson.features.length).toBeGreaterThanOrEqual(15);

    const vars = new Set<number>();
    for (const f of geojson.features) {
      expect(["Polygon", "MultiPolygon"]).toContain(f.geometry.type);
      expect([1, 2, 3]).toContain(f.properties.Var);
      expect(["Low", "Medium", "High"]).toContain(f.properties.hazard_level);
      expect(f.properties.return_period).toBe("100-Year");
      vars.add(f.properties.Var);
    }
    expect(vars.has(1)).toBe(true);
    expect(vars.has(2)).toBe(true);
    expect(vars.has(3)).toBe(true);
  });
});
