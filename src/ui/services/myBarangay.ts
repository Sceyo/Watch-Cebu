/**
 * My Barangay Service (Phase 2 Resident Convenience).
 *
 * Persists the resident's home barangay in local browser storage (zero login/accounts).
 * Calculates upcoming scheduled power interruptions specifically for the user's barangay.
 */

import type { PowerAdvisory } from "../../types/index.js";

const STORAGE_KEY = "watch_cebu_my_barangay";

export function getMyBarangay(): string | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val && val.trim().length > 0 ? val.trim() : null;
  } catch {
    return null;
  }
}

export function setMyBarangay(barangay: string | null): void {
  try {
    if (!barangay || barangay.trim().length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, barangay.trim());
    }
  } catch {
    // Local storage unavailable (private mode quota)
  }
}

export interface MyBarangayStatus {
  barangay: string;
  hasAdvisories: boolean;
  count: number;
  dates: string[];
  advisories: PowerAdvisory[];
}

export function getMyBarangayStatus(
  barangay: string,
  advisories: PowerAdvisory[]
): MyBarangayStatus {
  const normalized = barangay.toLowerCase().trim();
  const matched = advisories.filter((a) =>
    a.barangay.some((b) => b.toLowerCase().trim() === normalized || b.toLowerCase().includes(normalized))
  );

  const dates = [...new Set(matched.map((a) => a.date))].sort();

  return {
    barangay,
    hasAdvisories: matched.length > 0,
    count: matched.length,
    dates,
    advisories: matched,
  };
}
