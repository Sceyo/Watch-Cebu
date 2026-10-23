import { describe, it, expect, vi } from "vitest";
import { lookupCebuLocation, geocodeCebuOnline, CEBU_LOCATIONS } from "../../src/ui/services/cebuLocations.js";

describe("Cebu Locations Offline Index (Tier 2)", () => {
  it("contains more than 400 indexed Cebu locations", () => {
    expect(CEBU_LOCATIONS.length).toBeGreaterThan(400);
  });

  it("finds exact city matches", () => {
    const cebu = lookupCebuLocation("Cebu City");
    expect(cebu).not.toBeNull();
    expect(cebu?.name).toBe("Cebu City");
    expect(cebu?.type).toBe("city");

    const mandaue = lookupCebuLocation("Mandaue City");
    expect(mandaue).not.toBeNull();
    expect(mandaue?.name).toBe("Mandaue City");
  });

  it("finds city matches with colloquial/alternate names", () => {
    const mandaue = lookupCebuLocation("Mandaue");
    expect(mandaue).not.toBeNull();
    expect(mandaue?.city).toBe("Mandaue City");

    const lapuLapu = lookupCebuLocation("Lapu-Lapu");
    expect(lapuLapu).not.toBeNull();
    expect(lapuLapu?.city).toBe("Lapu-Lapu City");

    const opon = lookupCebuLocation("Opon");
    expect(opon).not.toBeNull();
    expect(opon?.name).toBe("Lapu-Lapu City");
  });

  it("finds barangays with and without 'Brgy.' or 'Barangay' prefix", () => {
    const lahug = lookupCebuLocation("Lahug");
    expect(lahug).not.toBeNull();
    expect(lahug?.name).toBe("Lahug");
    expect(lahug?.city).toBe("Cebu City");

    const brgyLahug = lookupCebuLocation("Brgy. Lahug");
    expect(brgyLahug).not.toBeNull();
    expect(brgyLahug?.name).toBe("Lahug");

    const barangayGuadalupe = lookupCebuLocation("Barangay Guadalupe");
    expect(barangayGuadalupe).not.toBeNull();
    expect(barangayGuadalupe?.name).toBe("Guadalupe");

    const banilad = lookupCebuLocation("Banilad, Mandaue City");
    expect(banilad).not.toBeNull();
    expect(banilad?.name).toBe("Banilad");
  });

  it("finds key Cebu landmarks", () => {
    const itPark = lookupCebuLocation("Cebu IT Park");
    expect(itPark).not.toBeNull();
    expect(itPark?.name).toBe("Cebu IT Park");
    expect(itPark?.type).toBe("landmark");

    const ayala = lookupCebuLocation("Ayala");
    expect(ayala).not.toBeNull();
    expect(ayala?.name).toBe("Cebu Business Park");

    const smSeaside = lookupCebuLocation("SM Seaside");
    expect(smSeaside).not.toBeNull();
    expect(smSeaside?.name).toBe("SM Seaside City");

    const fuente = lookupCebuLocation("Fuente Osmeña");
    expect(fuente).not.toBeNull();
  });

  it("returns null for non-existent or irrelevant queries", () => {
    expect(lookupCebuLocation("Tokyo")).toBeNull();
    expect(lookupCebuLocation("Manila Ocean Park")).toBeNull();
    expect(lookupCebuLocation("")).toBeNull();
  });

  it("resolves previously missing locations (Ward II, Liburon, North Reclamation Area)", () => {
    const ward2 = lookupCebuLocation("Ward II");
    expect(ward2).not.toBeNull();
    expect(ward2?.city).toBe("Minglanilla");

    const ward2Alt = lookupCebuLocation("Ward 2");
    expect(ward2Alt).not.toBeNull();
    expect(ward2Alt?.city).toBe("Minglanilla");

    const nra = lookupCebuLocation("North Reclamation Area");
    expect(nra).not.toBeNull();
    expect(nra?.city).toBe("Cebu City");

    const liburon = lookupCebuLocation("Liburon");
    expect(liburon).not.toBeNull();
    expect(liburon?.city).toBe("San Fernando");
  });
});

describe("Cebu Bounded Online Geocoding (Tier 3)", () => {
  it("validates coordinates stay within Cebu bounding box", async () => {
    // Mock fetch with a valid Cebu coordinate
    const fakeFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          lat: "10.3150",
          lon: "123.8850",
          display_name: "Gorordo Avenue, Cebu City, Central Visayas, Philippines",
          type: "secondary",
        },
      ],
    });
    vi.stubGlobal("fetch", fakeFetch);

    const res = await geocodeCebuOnline("Gorordo Avenue");
    expect(res).not.toBeNull();
    expect(res?.lat).toBe(10.315);
    expect(res?.lon).toBe(123.885);
    expect(res?.displayName).toBe("Gorordo Avenue");

    vi.unstubAllGlobals();
  });

  it("rejects coordinates outside Cebu bounding box", async () => {
    // Mock fetch returning Manila coordinates (approx 14.59°N, 120.98°E)
    const fakeFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          lat: "14.5995",
          lon: "120.9842",
          display_name: "Rizal Park, Manila, Metro Manila, Philippines",
          type: "park",
        },
      ],
    });
    vi.stubGlobal("fetch", fakeFetch);

    const res = await geocodeCebuOnline("Rizal Park");
    expect(res).toBeNull(); // Rejected because it's in Manila, not Cebu

    vi.unstubAllGlobals();
  });

  it("handles network failure or empty results gracefully without throwing", async () => {
    const fakeFetch = vi.fn().mockRejectedValueOnce(new Error("Network timeout"));
    vi.stubGlobal("fetch", fakeFetch);

    const res = await geocodeCebuOnline("Unknown Alley");
    expect(res).toBeNull();

    vi.unstubAllGlobals();
  });
});
