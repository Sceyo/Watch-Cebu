/**
 * My Barangay Service (Phase 2 Resident Convenience).
 *
 * Persists the resident's home barangay in local browser storage (zero login/accounts).
 * Calculates upcoming scheduled power interruptions specifically for the user's barangay.
 */

import type { PowerAdvisory } from "../../types/index.js";

const STORAGE_KEY = "watch_cebu_my_barangay";
export const MAX_FAVORITES = 3;

export function getFavorites(): string[] {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val || val.trim().length === 0) return [];
    if (val.trim().startsWith("[")) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed
          .map((s) => String(s).trim())
          .filter((s) => s.length > 0)
          .slice(0, MAX_FAVORITES);
      }
    }
    return [val.trim()];
  } catch {
    return [];
  }
}

export function getMyBarangay(): string | null {
  const favs = getFavorites();
  return favs.length > 0 ? favs[0] : null;
}

export function setMyBarangay(barangay: string | null): void {
  try {
    if (!barangay || barangay.trim().length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const clean = barangay.trim();
      const current = getFavorites().filter((b) => b.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...current].slice(0, MAX_FAVORITES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Local storage unavailable (private mode quota)
  }
}

export function addFavorite(barangay: string): boolean {
  try {
    const clean = barangay.trim();
    if (!clean) return false;
    const current = getFavorites();
    if (current.some((b) => b.toLowerCase() === clean.toLowerCase())) return true;
    if (current.length >= MAX_FAVORITES) return false;
    current.push(clean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return true;
  } catch {
    return false;
  }
}

export function removeFavorite(barangay: string): void {
  try {
    const clean = barangay.trim().toLowerCase();
    const current = getFavorites().filter((b) => b.toLowerCase() !== clean);
    if (current.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // Local storage unavailable (private mode quota)
  }
}

export function isFavorite(barangay: string): boolean {
  if (!barangay) return false;
  const clean = barangay.trim().toLowerCase();
  return getFavorites().some((b) => b.toLowerCase() === clean);
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
