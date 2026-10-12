/**
 * Global Vitest Data Directory Integrity Guard (Fix 4).
 *
 * Runs before and after the test suite.
 * Records SHA-256 hashes of all files in `data/`.
 * In teardown, asserts that ZERO files in `data/` were modified, added, or removed.
 *
 * If any test ever accidentally writes to `data/`, this teardown hook immediately
 * fails the suite to prevent dirty/fixture commits to production snapshots.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const DATA_DIR = join(ROOT_DIR, "data");

function computeDataHashes(): Map<string, string> {
  const hashes = new Map<string, string>();
  const files = readdirSync(DATA_DIR);

  for (const file of files) {
    const fullPath = join(DATA_DIR, file);
    if (statSync(fullPath).isFile()) {
      const content = readFileSync(fullPath);
      const hash = createHash("sha256").update(content).digest("hex");
      hashes.set(file, hash);
    }
  }

  return hashes;
}

let initialHashes: Map<string, string>;

export async function setup() {
  initialHashes = computeDataHashes();
}

export async function teardown() {
  const finalHashes = computeDataHashes();
  const violations: string[] = [];

  // Check for modified or removed files
  for (const [file, originalHash] of initialHashes.entries()) {
    const currentHash = finalHashes.get(file);
    if (!currentHash) {
      violations.push(`File deleted: data/${file}`);
    } else if (currentHash !== originalHash) {
      violations.push(`File modified: data/${file} (hash changed from ${originalHash.slice(0, 8)} to ${currentHash.slice(0, 8)})`);
    }
  }

  // Check for newly created files
  for (const file of finalHashes.keys()) {
    if (!initialHashes.has(file)) {
      violations.push(`New file written: data/${file}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `\n❌ [DATA GUARD FAILURE] The test suite modified files in the real data/ directory!\n` +
      `Tests must use WATCH_CEBU_DATA_DIR to point to an isolated temporary directory.\n` +
      `Violations:\n  - ${violations.join("\n  - ")}\n`
    );
  }
}
