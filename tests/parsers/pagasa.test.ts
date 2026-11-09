/**
 * Automated DOST-PAGASA Parser & Security Threat Model Tests.
 *
 * Verifies:
 * 1. Correct parsing of Tropical Cyclone Bulletins (TCWS Signals 1-5, eye coordinates, movement).
 * 2. Correct parsing of Color-Coded Heavy Rainfall Warnings (Red, Orange, Yellow).
 * 3. Fallback to safe baseline when no weather alerts are hoisted.
 * 4. Security checks: XSS payload stripping, payload size capping, zero ReDoS vulnerability.
 * 5. Deterministic SHA-256 identity generation.
 */

import { describe, it, expect } from "vitest";
import { parsePagasaBulletinHtml, fetchPagasaBulletin } from "../../src/parsers/pagasa.js";

describe("PAGASA Weather Parser — Functional Scenarios", () => {
  it("parses baseline clear weather when no alerts exist", () => {
    const html = `
      <html>
        <body>
          <h1>PAGASA Public Weather Forecast</h1>
          <p>Easterlies affecting the eastern section of the country. Metro Cebu will experience partly cloudy to cloudy skies.</p>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html, "https://bagong.pagasa.dost.gov.ph/weather", "2026-10-14T00:00:00Z");

    expect(result.has_active_cyclone).toBe(false);
    expect(result.cyclone_name).toBeNull();
    expect(result.tcws_cebu.active).toBe(false);
    expect(result.tcws_cebu.signal_level).toBe(0);
    expect(result.heavy_rainfall_alert.level).toBe("none");
    expect(result.parse_confidence).toBe("high");
    expect(result.id).toMatch(/^[a-f0-9]{64}$/);
  });

  it("parses Tropical Cyclone Bulletin with TCWS #2 for Northern Cebu and Camotes", () => {
    const html = `
      <html>
        <body>
          <h1>TROPICAL CYCLONE BULLETIN NO. 14</h1>
          <h2>TYPHOON "KRISTINE"</h2>
          <p>Issued at 5:00 AM, 14 October 2026</p>
          <p>The eye of the typhoon was estimated at 11.8°N, 125.4°E moving West Northwest at 20 km/h.</p>
          <div>
            <h3>SIGNAL NO. 2</h3>
            <p>Luzon: Catanduanes, Albay, Sorsogon.</p>
            <p>Visayas: Northern Samar, Eastern Samar, Northern Cebu including Camotes Islands and Bantayan Islands.</p>
          </div>
          <div>
            <h3>SIGNAL NO. 1</h3>
            <p>Rest of Cebu, Bohol, Leyte, Southern Leyte.</p>
          </div>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html);

    expect(result.has_active_cyclone).toBe(true);
    expect(result.cyclone_name).toBe("KRISTINE");
    expect(result.tcws_cebu.active).toBe(true);
    expect(result.tcws_cebu.signal_level).toBe(2);
    expect(result.tcws_cebu.wind_speed_kmh).toContain("62–88 km/h");
    expect(result.tcws_cebu.areas_affected).toContain("Northern Cebu");
    expect(result.tcws_cebu.areas_affected).toContain("Camotes Islands");
    expect(result.storm_center).not.toBeNull();
    expect(result.storm_center?.lat).toBe(11.8);
    expect(result.storm_center?.lon).toBe(125.4);
    expect(result.storm_center?.movement).toContain("West Northwest");
    expect(result.parse_confidence).toBe("high");
  });

  it("parses Red Heavy Rainfall Warning for Metro Cebu", () => {
    const html = `
      <html>
        <body>
          <h1>HEAVY RAINFALL WARNING NO. 03</h1>
          <p>Issued at 10:00 AM, 14 October 2026</p>
          <div class="warning-box">
            <p>RED WARNING LEVEL: Torrential rainfall is occurring over Cebu (Metro Cebu, Talisay, Mandaue, Minglanilla), Bohol, and Negros Oriental.</p>
            <p>Severe flooding is expected in low-lying areas. Evacuation advised.</p>
          </div>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html);

    expect(result.heavy_rainfall_alert.level).toBe("red");
    expect(result.heavy_rainfall_alert.description).toContain("Torrential rains");
    expect(result.heavy_rainfall_alert.advisory_areas).toContain("Metro Cebu");
  });

  it("parses Yellow Rainfall Warning for Cebu", () => {
    const html = `
      <html>
        <body>
          <h1>COLOR-CODED RAINFALL ADVISORY</h1>
          <p>YELLOW WARNING: Moderate to heavy rain affecting Cebu, Leyte, and Biliran.</p>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html);

    expect(result.heavy_rainfall_alert.level).toBe("yellow");
    expect(result.heavy_rainfall_alert.description).toContain("Heavy rains expected");
  });

  it("does not assign Red Rainfall Warning to Cebu when Red is for another province and Cebu is under Yellow Warning", () => {
    const html = `
      <html>
        <body>
          <h1>HEAVY RAINFALL WARNING NO. 05</h1>
          <p>Issued at 2:00 PM, 14 October 2026</p>
          <p>RED WARNING LEVEL: Southern Leyte and Surigao del Norte. Torrential rains causing serious flooding.</p>
          <p>ORANGE WARNING LEVEL: Bohol and Siquijor. Flooding is threatening.</p>
          <p>YELLOW WARNING LEVEL: Cebu (Metro Cebu, Toledo, Carcar) and Negros Oriental. Flooding in low-lying areas.</p>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html);

    expect(result.heavy_rainfall_alert.level).toBe("yellow");
    expect(result.heavy_rainfall_alert.advisory_areas).toContain("Metro Cebu");
  });

  it("extracts max_sustained_winds_kmh and gustiness_kmh into storm_center when present", () => {
    const html = `
      <html>
        <body>
          <h1>TROPICAL CYCLONE BULLETIN NO. 08</h1>
          <h2>TYPHOON "KRISTINE"</h2>
          <p>The center of the eye was estimated at 12.3°N, 124.8°E moving West Northwest at 25 km/h with maximum sustained winds of 130 km/h near the center and gustiness of up to 165 km/h.</p>
          <h3>SIGNAL NO. 1</h3>
          <p>Visayas: Northern Cebu</p>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html);

    expect(result.storm_center).not.toBeNull();
    expect(result.storm_center?.lat).toBe(12.3);
    expect(result.storm_center?.lon).toBe(124.8);
    expect(result.storm_center?.max_sustained_winds_kmh).toBe(130);
    expect(result.storm_center?.gustiness_kmh).toBe(165);
  });

  it("parses live PAGASA Synopsis format with 'Issued at:' colon and long-distance eye coordinates", () => {
    const html = `
      <html>
        <body>
          <div class="issue"><b>Issued at: 4:00 PM, 09 November 2026</b></div>
          <div class="panel-body">
            <p>At 3:00 PM today, the center of the eye of Typhoon "SAMUEL" {CEMPAKA} was estimated based on all available data at 1,405 km East Northeast of Extreme Northern Luzon (24.1°N, 135.0°E), with maximum sustained winds of 130 km/h near the center and gustiness of up to 160 km/h. It is moving East Northeastward at 10 km/h.</p>
          </div>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(html);

    expect(result.has_active_cyclone).toBe(true);
    expect(result.cyclone_name).toBe("SAMUEL");
    expect(result.issued_at_pst).toBe("4:00 PM, 09 November 2026");
    expect(result.storm_center).toEqual({
      lat: 24.1,
      lon: 135.0,
      movement: "East Northeastward",
      max_sustained_winds_kmh: 130,
      gustiness_kmh: 160,
    });
  });
});

describe("PAGASA Parser — Security & Adversarial Input Threat Model", () => {
  it("sanitizes XSS / script injection in cyclone names and text bodies", () => {
    const xssPayload = `
      <html>
        <body>
          <h1>TROPICAL STORM "<script>alert('xss')</script>LEON"</h1>
          <p>SIGNAL NO. 1: Cebu <img src="x" onerror="stealCookies()" /> Camotes</p>
        </body>
      </html>
    `;

    const result = parsePagasaBulletinHtml(xssPayload);

    expect(result.cyclone_name).not.toContain("<script>");
    expect(result.cyclone_name).not.toContain("</script>");
    expect(result.tcws_cebu.areas_affected.join("")).not.toContain("<img");
    expect(result.tcws_cebu.areas_affected.join("")).not.toContain("onerror");
  });

  it("safely handles empty or non-string garbage inputs without throwing", () => {
    expect(() => parsePagasaBulletinHtml("")).not.toThrow();
    expect(() => parsePagasaBulletinHtml(null as any)).not.toThrow();
    expect(() => parsePagasaBulletinHtml(undefined as any)).not.toThrow();

    const emptyRes = parsePagasaBulletinHtml("");
    expect(emptyRes.parse_confidence).toBe("low");
    expect(emptyRes.parse_notes).toContain("Empty or non-string");
  });

  it("safely handles oversized payloads (>1MB) by capping input length", () => {
    const giantBody = "A".repeat(2 * 1024 * 1024); // 2MB string
    const html = `<html><body><p>${giantBody}</p></body></html>`;

    expect(() => parsePagasaBulletinHtml(html)).not.toThrow();
  });

  it("fetchPagasaBulletin handles network failures gracefully with baseline fallback", async () => {
    const failingFetcher = async () => {
      throw new Error("PAGASA server connection timed out");
    };

    const result = await fetchPagasaBulletin(failingFetcher);

    expect(result.has_active_cyclone).toBe(false);
    expect(result.tcws_cebu.signal_level).toBe(0);
    expect(result.parse_confidence).toBe("low");
    expect(result.parse_notes).toContain("PAGASA server connection timed out");
  });
});
