/**
 * Watch Cebu — Comprehensive Local Automated Verification & Scenario Runner.
 *
 * Usage:
 *   npm run test:local          (Runs all 5 stages including full stress & build)
 *   npm run test:local -- --fast (Runs Stages 1, 2, and 3 in ~3 seconds)
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, statSync, readdirSync } from "fs";
import { join } from "path";

interface StageResult {
  stage: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const isFastMode = process.argv.includes("--fast");
const results: StageResult[] = [];

function logHeader(title: string): void {
  console.log("\n========================================================================");
  console.log(`  ${title}`);
  console.log("========================================================================");
}

function runStage(name: string, fn: () => string): void {
  const start = Date.now();
  process.stdout.write(`\n▶ Running ${name}...\n`);
  try {
    const details = fn();
    const durationMs = Date.now() - start;
    results.push({ stage: name, passed: true, durationMs, details });
    console.log(`✓ PASS: ${name} (${(durationMs / 1000).toFixed(2)}s) — ${details}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const msg = err?.message ? String(err.message).split("\n")[0] : "Failed";
    results.push({ stage: name, passed: false, durationMs, details: msg });
    console.error(`✗ FAIL: ${name} (${(durationMs / 1000).toFixed(2)}s)`);
    if (err?.stdout) console.error(String(err.stdout));
    if (err?.stderr) console.error(String(err.stderr));
    else console.error(err);
  }
}

logHeader("WATCH CEBU — LOCAL AUTOMATED SYSTEM VERIFICATION SUITE");

// ---------------------------------------------------------------------------
// STAGE 1: Static Type Check & Client Browser Bundle Guard
// ---------------------------------------------------------------------------
runStage("Stage 1: TypeScript & Client Bundle Safety Audit", () => {
  execSync("npx tsc --noEmit", { stdio: "pipe" });

  const uiDir = join(process.cwd(), "src", "ui");
  const scanTs = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...scanTs(full));
      else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
    }
    return out;
  };

  const uiFiles = scanTs(uiDir);
  const forbidden = ["fs", "path", "crypto", "zlib", "child_process"];
  for (const file of uiFiles) {
    const src = readFileSync(file, "utf-8");
    for (const mod of forbidden) {
      if (new RegExp(`from\\s+["'](node:)?${mod}["']`).test(src)) {
        throw new Error(`Forbidden Node.js module "${mod}" imported in client file: ${file}`);
      }
    }
  }
  return `0 TypeScript errors across project; ${uiFiles.length} client UI modules verified browser-safe`;
});

// ---------------------------------------------------------------------------
// STAGE 2: Project NOAH Regional Flood Hazard GeoJSON & Provincial Boundary Audit
// ---------------------------------------------------------------------------
runStage("Stage 2: Project NOAH Regional Flood Hazard Asset & Boundary Audit", () => {
  const dataDir = join(process.cwd(), "public", "data");
  const chunks = [
    { region: "metro", file: "cebu-flood-metro.geojson", minFeatures: 15 },
    { region: "north", file: "cebu-flood-north.geojson", minFeatures: 40 },
    { region: "south", file: "cebu-flood-south.geojson", minFeatures: 80 },
  ];

  const summaryParts: string[] = [];
  let sanFernandoCorridorCount = 0;

  for (const c of chunks) {
    const fullPath = join(dataDir, c.file);
    if (!existsSync(fullPath)) {
      throw new Error(`Missing regional flood asset: ${c.file}`);
    }
    const sizeKb = statSync(fullPath).size / 1024;
    if (sizeKb >= 400) {
      throw new Error(`${c.file} exceeds 400 KB mobile ceiling (${sizeKb.toFixed(1)} KB)`);
    }

    const geojson = JSON.parse(readFileSync(fullPath, "utf-8"));
    const count = geojson.features?.length ?? 0;
    if (count < c.minFeatures) {
      throw new Error(`${c.file} has only ${count} features (expected >= ${c.minFeatures})`);
    }

    for (const f of geojson.features) {
      const coords =
        f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
      for (const [lon, lat] of coords) {
        if (lat >= 10.85 && lon >= 124.35) {
          throw new Error(`Leyte coordinate leakage detected in ${c.file}: [${lon}, ${lat}]`);
        }
        if (lat <= 10.15 && lon >= 123.75) {
          throw new Error(`Bohol coordinate leakage detected in ${c.file}: [${lon}, ${lat}]`);
        }
        if (lon < 123.25) {
          throw new Error(`Negros coordinate leakage detected in ${c.file}: [${lon}, ${lat}]`);
        }
      }
      if (c.region === "south") {
        const [lon0, lat0] = coords[0];
        if (lat0 >= 10.14 && lat0 <= 10.23 && lon0 >= 123.48 && lon0 <= 123.72) {
          sanFernandoCorridorCount++;
        }
      }
    }

    summaryParts.push(`${c.region}: ${count} feats (${sizeKb.toFixed(1)} KB)`);
  }

  if (sanFernandoCorridorCount < 8) {
    throw new Error(
      `San Fernando / Aloguinsan corridor gap detected (found ${sanFernandoCorridorCount} features, expected >= 8)`
    );
  }

  return `${summaryParts.join(", ")} | San Fernando/Aloguinsan corridor: ${sanFernandoCorridorCount} feats`;
});

// ---------------------------------------------------------------------------
// STAGE 3: 10-Scenario End-to-End Civic Simulation Suite
// ---------------------------------------------------------------------------
runStage("Stage 3: 10-Scenario Full-System Automated Simulation", () => {
  execSync("npx vitest run tests/e2e/fullSystemScenarios.test.ts", { stdio: "inherit" });
  return "All 10 end-to-end civic scenarios passed";
});

// ---------------------------------------------------------------------------
// STAGE 4: Complete Unit, UI, Integration & Stress Test Suite
// ---------------------------------------------------------------------------
if (!isFastMode) {
  runStage("Stage 4: Complete Unit, Integration & Stress Test Suite (All Test Files)", () => {
    execSync("npx vitest run", { stdio: "inherit" });
    return "All unit, UI, integration, and stress suites passed";
  });

  // ---------------------------------------------------------------------------
  // STAGE 5: Production PWA Bundle Build Verification
  // ---------------------------------------------------------------------------
  runStage("Stage 5: Production Vite Bundle Build Check", () => {
    execSync("npm run build", { stdio: "pipe" });
    return "Production client bundle compiled cleanly to dist-client/";
  });
}

// ---------------------------------------------------------------------------
// FINAL REPORT
// ---------------------------------------------------------------------------
logHeader("VERIFICATION SUMMARY REPORT");
for (const r of results) {
  const badge = r.passed ? "[PASS]" : "[FAIL]";
  console.log(`${badge} ${r.stage.padEnd(64)} ${(r.durationMs / 1000).toFixed(2)}s`);
  console.log(`       ↳ ${r.details}`);
}
console.log("========================================================================\n");

if (results.some((r) => !r.passed)) {
  process.exit(1);
}
