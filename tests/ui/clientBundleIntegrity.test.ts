/**
 * Client Bundle Integrity & Browser-Safety Guard Test.
 *
 * Ensures that:
 * 1. src/utils/index.ts is 100% browser-safe and contains ZERO Node.js built-ins (e.g. crypto, fs, path).
 * 2. makeId() and crypto.createHash are strictly quarantined to src/utils/hash.ts (server-only).
 * 3. Zero client-side files (under src/ui/ or src/main.ts) import from src/utils/hash.ts or Node built-ins.
 * 4. A future shared-utils edit cannot silently reintroduce Node dependencies into client code.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const NODE_BUILTINS = [
  "crypto",
  "node:crypto",
  "fs",
  "node:fs",
  "path",
  "node:path",
  "os",
  "node:os",
  "child_process",
  "node:child_process",
  "stream",
  "node:stream",
  "http",
  "node:http",
  "https",
  "node:https",
  "net",
  "node:net",
  "tls",
  "node:tls",
  "buffer",
  "node:buffer",
  "process",
  "node:process",
];

function getAllFiles(dir: string, ext = ".ts"): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, ext));
    } else if (fullPath.endsWith(ext) && !fullPath.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Client Bundle Integrity — Browser Safety Guard", () => {
  const srcRoot = resolve(__dirname, "../../src");
  const utilsIndex = join(srcRoot, "utils/index.ts");
  const utilsHash = join(srcRoot, "utils/hash.ts");
  const uiDir = join(srcRoot, "ui");
  const mainTs = join(srcRoot, "main.ts");

  it("src/utils/index.ts does not import any Node.js built-in module", () => {
    const content = readFileSync(utilsIndex, "utf-8");
    for (const builtin of NODE_BUILTINS) {
      const importRegex = new RegExp(`from\\s+["']${builtin}["']`, "i");
      expect(
        importRegex.test(content),
        `src/utils/index.ts must NOT import Node built-in "${builtin}"`
      ).toBe(false);
    }
  });

  it("src/utils/index.ts does not export makeId or reference createHash", () => {
    const content = readFileSync(utilsIndex, "utf-8");
    expect(content).not.toContain("makeId");
    expect(content).not.toContain("createHash");
  });

  it("src/utils/hash.ts correctly isolates makeId and createHash for server use", () => {
    const content = readFileSync(utilsHash, "utf-8");
    expect(content).toContain("createHash");
    expect(content).toContain("export function makeId");
  });

  it("no client-side file under src/ui/ or src/main.ts imports from hash.js/hash.ts", () => {
    const clientFiles = [...getAllFiles(uiDir), mainTs];
    for (const file of clientFiles) {
      const content = readFileSync(file, "utf-8");
      expect(
        /from\s+["'].*hash(?:\.js)?["']/i.test(content),
        `Client file ${file} must NOT import from hash module`
      ).toBe(false);
    }
  });

  it("no client-side file under src/ui/ or src/main.ts imports any Node.js built-in module", () => {
    const clientFiles = [...getAllFiles(uiDir), mainTs];
    for (const file of clientFiles) {
      const content = readFileSync(file, "utf-8");
      for (const builtin of NODE_BUILTINS) {
        const importRegex = new RegExp(`from\\s+["']${builtin}["']`, "i");
        expect(
          importRegex.test(content),
          `Client file ${file} must NOT import Node built-in "${builtin}"`
        ).toBe(false);
      }
    }
  });
});
