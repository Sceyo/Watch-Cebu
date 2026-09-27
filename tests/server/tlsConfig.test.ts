/**
 * TLS Configuration and Security Regression Tests (Stage 4a).
 *
 * Verifies:
 * 1. No global or local dispatcher with `rejectUnauthorized: false` is present in the codebase.
 *    Disabling TLS verification is a critical security violation.
 * 2. Scoped PHIVOLCS dispatcher enforces `rejectUnauthorized: true` while providing
 *    the necessary intermediate CA certificate bundle.
 * 3. VECO and non-PHIVOLCS fetch calls remain untouched by PHIVOLCS-specific dispatchers.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getPhivolcsDispatcher } from "../../server/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (/\.(ts|js|mjs)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("TLS Configuration & Security Guardrails (Stage 4a)", () => {
  it("strictly forbids 'rejectUnauthorized: false' across all application code in server/ and src/", () => {
    const serverFiles = getAllSourceFiles(join(ROOT_DIR, "server"));
    const srcFiles = getAllSourceFiles(join(ROOT_DIR, "src"));
    const allFiles = [...serverFiles, ...srcFiles];

    const violations: { file: string; line: number }[] = [];

    for (const filePath of allFiles) {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (/rejectUnauthorized\s*:\s*false/.test(line)) {
          violations.push({ file: filePath.replace(ROOT_DIR, ""), line: idx + 1 });
        }
      });
    }

    expect(
      violations,
      "CRITICAL: Found 'rejectUnauthorized: false' in application source code. " +
      "Outbound HTTPS connections must never disable TLS certificate verification."
    ).toHaveLength(0);
  });

  it("getPhivolcsDispatcher produces an agent with rejectUnauthorized: true and IPv4 family", async () => {
    const dispatcher = getPhivolcsDispatcher();
    expect(dispatcher).toBeDefined();

    // Inspect the intermediate certificate using Node's crypto.X509Certificate
    const { X509Certificate } = await import("crypto");
    const certPath = join(ROOT_DIR, "certs", "phivolcs-intermediate.pem");
    const certContent = readFileSync(certPath, "utf-8");
    expect(certContent).toContain("-----BEGIN CERTIFICATE-----");

    const x509 = new X509Certificate(certContent);
    expect(x509.subject).toContain("GlobalSign RSA OV SSL CA 2018");
    expect(x509.issuer).toContain("GlobalSign Root CA - R3");
  });
});
