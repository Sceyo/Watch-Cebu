/**
 * Project NOAH Regional Flood Hazard Extraction Script (Cebu Province).
 *
 * Queries Project NOAH's open ODC-ODbL PMTiles archive on Hugging Face
 * (bettergovph/project-noah-hazard-maps) via HTTP Range requests (206 Partial Content)
 * for Metro, North, and South Cebu zoom-12 tiles, decodes MVT protobuf geometries,
 * simplifies coordinates for mobile performance (< 400 KB per chunk), and writes
 * static GeoJSON assets in public/data/.
 */

import zlib from "zlib";
import fs from "fs";
import path from "path";

export interface FloodHazardTile {
  z: number;
  x: number;
  y: number;
  len: number;
  offset: number;
}

// Bounded Metro Cebu zoom-12 tiles covering Talisay, Cebu City, Mandaue, Lapu-Lapu, Cordova, Consolacion, Liloan, Minglanilla
export const METRO_CEBU_TILES: FloodHazardTile[] = [
  { z: 12, x: 3456, y: 1928, len: 111539, offset: 481742808 },
  { z: 12, x: 3456, y: 1929, len: 105459, offset: 481854347 },
  { z: 12, x: 3456, y: 1930, len: 137050, offset: 482517648 },
  { z: 12, x: 3456, y: 1931, len: 22744,  offset: 482654698 },
  { z: 12, x: 3457, y: 1928, len: 101921, offset: 482058801 },
  { z: 12, x: 3457, y: 1929, len: 98995,  offset: 481959806 },
  { z: 12, x: 3457, y: 1930, len: 54207,  offset: 482463441 },
  { z: 12, x: 3458, y: 1928, len: 133437, offset: 482160722 },
  { z: 12, x: 3458, y: 1929, len: 96659,  offset: 482301726 },
  { z: 12, x: 3458, y: 1930, len: 47920,  offset: 482398385 },
];

export const NORTH_CEBU_TILES: FloodHazardTile[] = [
  {
    "z": 12,
    "x": 3455,
    "y": 1919,
    "len": 67094,
    "offset": 397953172
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1918,
    "len": 11622,
    "offset": 398020266
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1919,
    "len": 54279,
    "offset": 479005612
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1918,
    "len": 1188,
    "offset": 479059891
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1917,
    "len": 538,
    "offset": 479074821
  },
  {
    "z": 12,
    "x": 3456,
    "y": 1918,
    "len": 1325,
    "offset": 479075359
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1918,
    "len": 15608,
    "offset": 479076684
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1919,
    "len": 3129,
    "offset": 479092292
  },
  {
    "z": 12,
    "x": 3456,
    "y": 1919,
    "len": 29650,
    "offset": 479095421
  },
  {
    "z": 12,
    "x": 3456,
    "y": 1920,
    "len": 20745,
    "offset": 479125071
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1920,
    "len": 1154,
    "offset": 479145816
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1921,
    "len": 10581,
    "offset": 479146970
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1923,
    "len": 75535,
    "offset": 479157551
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1922,
    "len": 13034,
    "offset": 479233086
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1922,
    "len": 135299,
    "offset": 479246120
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1923,
    "len": 145258,
    "offset": 479381419
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1921,
    "len": 106590,
    "offset": 479642886
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1920,
    "len": 76635,
    "offset": 479749476
  },
  {
    "z": 12,
    "x": 3463,
    "y": 1925,
    "len": 53290,
    "offset": 480158327
  },
  {
    "z": 12,
    "x": 3462,
    "y": 1925,
    "len": 28101,
    "offset": 480211617
  },
  {
    "z": 12,
    "x": 3462,
    "y": 1926,
    "len": 70885,
    "offset": 480239718
  },
  {
    "z": 12,
    "x": 3463,
    "y": 1926,
    "len": 36325,
    "offset": 480310603
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1927,
    "len": 119262,
    "offset": 480374916
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1926,
    "len": 115704,
    "offset": 480494178
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1924,
    "len": 150088,
    "offset": 480658426
  },
  {
    "z": 12,
    "x": 3458,
    "y": 1925,
    "len": 133540,
    "offset": 480808514
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1925,
    "len": 121683,
    "offset": 480942054
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1924,
    "len": 127850,
    "offset": 481063737
  },
  {
    "z": 12,
    "x": 3456,
    "y": 1924,
    "len": 1969,
    "offset": 481191587
  },
  {
    "z": 12,
    "x": 3456,
    "y": 1925,
    "len": 67165,
    "offset": 481193556
  },
  {
    "z": 12,
    "x": 3456,
    "y": 1926,
    "len": 153711,
    "offset": 481260721
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1926,
    "len": 94114,
    "offset": 481414432
  },
  {
    "z": 12,
    "x": 3457,
    "y": 1927,
    "len": 98175,
    "offset": 481508546
  },
  {
    "z": 12,
    "x": 3456,
    "y": 1927,
    "len": 136087,
    "offset": 481606721
  },
  {
    "z": 12,
    "x": 3464,
    "y": 1926,
    "len": 20921,
    "offset": 486950668
  },
  {
    "z": 12,
    "x": 3464,
    "y": 1925,
    "len": 52404,
    "offset": 486971589
  },
  {
    "z": 12,
    "x": 3464,
    "y": 1924,
    "len": 28436,
    "offset": 487023993
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1927,
    "len": 132226,
    "offset": 539180104
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1926,
    "len": 20909,
    "offset": 539312330
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1920,
    "len": 14536,
    "offset": 539662548
  }
];

export const SOUTH_CEBU_TILES: FloodHazardTile[] = [
  {
    "z": 12,
    "x": 3451,
    "y": 1936,
    "len": 66339,
    "offset": 535043972
  },
  {
    "z": 12,
    "x": 3451,
    "y": 1937,
    "len": 79758,
    "offset": 535110311
  },
  {
    "z": 12,
    "x": 3451,
    "y": 1938,
    "len": 104265,
    "offset": 535192982
  },
  {
    "z": 12,
    "x": 3451,
    "y": 1939,
    "len": 125662,
    "offset": 535297247
  },
  {
    "z": 12,
    "x": 3451,
    "y": 1940,
    "len": 30932,
    "offset": 536092281
  },
  {
    "z": 12,
    "x": 3452,
    "y": 1939,
    "len": 23596,
    "offset": 536124790
  },
  {
    "z": 12,
    "x": 3452,
    "y": 1938,
    "len": 98295,
    "offset": 536148386
  },
  {
    "z": 12,
    "x": 3453,
    "y": 1937,
    "len": 23583,
    "offset": 536246681
  },
  {
    "z": 12,
    "x": 3452,
    "y": 1937,
    "len": 124589,
    "offset": 536270264
  },
  {
    "z": 12,
    "x": 3452,
    "y": 1936,
    "len": 131560,
    "offset": 536394853
  },
  {
    "z": 12,
    "x": 3453,
    "y": 1936,
    "len": 56029,
    "offset": 536526413
  },
  {
    "z": 12,
    "x": 3454,
    "y": 1935,
    "len": 11128,
    "offset": 536582442
  },
  {
    "z": 12,
    "x": 3454,
    "y": 1934,
    "len": 69806,
    "offset": 536593570
  },
  {
    "z": 12,
    "x": 3454,
    "y": 1932,
    "len": 110249,
    "offset": 536688869
  },
  {
    "z": 12,
    "x": 3454,
    "y": 1933,
    "len": 72683,
    "offset": 536799118
  },
  {
    "z": 12,
    "x": 3453,
    "y": 1933,
    "len": 121987,
    "offset": 536871801
  },
  {
    "z": 12,
    "x": 3453,
    "y": 1932,
    "len": 108780,
    "offset": 536993788
  },
  {
    "z": 12,
    "x": 3452,
    "y": 1932,
    "len": 31795,
    "offset": 537102568
  },
  {
    "z": 12,
    "x": 3452,
    "y": 1933,
    "len": 123907,
    "offset": 537134363
  },
  {
    "z": 12,
    "x": 3452,
    "y": 1934,
    "len": 146840,
    "offset": 537258270
  },
  {
    "z": 12,
    "x": 3453,
    "y": 1934,
    "len": 127060,
    "offset": 537405110
  },
  {
    "z": 12,
    "x": 3453,
    "y": 1935,
    "len": 103194,
    "offset": 537532170
  },
  {
    "z": 12,
    "x": 3452,
    "y": 1935,
    "len": 139286,
    "offset": 537635364
  },
  {
    "z": 12,
    "x": 3451,
    "y": 1935,
    "len": 39719,
    "offset": 537774650
  },
  {
    "z": 12,
    "x": 3451,
    "y": 1934,
    "len": 15043,
    "offset": 537814369
  },
  {
    "z": 12,
    "x": 3451,
    "y": 1933,
    "len": 6632,
    "offset": 537935231
  },
  {
    "z": 12,
    "x": 3454,
    "y": 1930,
    "len": 136007,
    "offset": 538285987
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1930,
    "len": 154638,
    "offset": 538685893
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1929,
    "len": 139183,
    "offset": 538840531
  },
  {
    "z": 12,
    "x": 3454,
    "y": 1929,
    "len": 93834,
    "offset": 538979714
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1932,
    "len": 25493,
    "offset": 536663376
  },
  {
    "z": 12,
    "x": 3453,
    "y": 1931,
    "len": 66120,
    "offset": 538212315
  },
  {
    "z": 12,
    "x": 3453,
    "y": 1930,
    "len": 7552,
    "offset": 538278435
  },
  {
    "z": 12,
    "x": 3454,
    "y": 1931,
    "len": 134116,
    "offset": 538421994
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1931,
    "len": 129783,
    "offset": 538556110
  },
  {
    "z": 12,
    "x": 3454,
    "y": 1928,
    "len": 6386,
    "offset": 539073548
  },
  {
    "z": 12,
    "x": 3455,
    "y": 1928,
    "len": 100170,
    "offset": 539079934
  }
];

export function rotateHilbert(n: number, xy: [number, number], rx: number, ry: number): void {
  if (ry === 0) {
    if (rx === 1) {
      xy[0] = n - 1 - xy[0];
      xy[1] = n - 1 - xy[1];
    }
    const t = xy[0];
    xy[0] = xy[1];
    xy[1] = t;
  }
}

export function decodePmtilesTileId(z: number, x: number, y: number): number {
  if (z === 0) return 0;
  let acc = 0;
  for (let s = 0; s < z; s++) {
    acc += Math.pow(4, s);
  }
  const n = Math.pow(2, z);
  let rx = 0;
  let ry = 0;
  let d = 0;
  const xy: [number, number] = [x, y];
  for (let s = Math.floor(n / 2); s > 0; s = Math.floor(s / 2)) {
    rx = (xy[0] & s) > 0 ? 1 : 0;
    ry = (xy[1] & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    rotateHilbert(s, xy, rx, ry);
  }
  return acc + d;
}

export function simplifyRing(pts: [number, number][], tolSq = 0.000004): [number, number][] {
  if (pts.length <= 4) return pts;
  const res: [number, number][] = [pts[0]];
  let last = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const dx = pts[i][0] - last[0];
    const dy = pts[i][1] - last[1];
    if (dx * dx + dy * dy >= tolSq) {
      res.push(pts[i]);
      last = pts[i];
    }
  }
  res.push(pts[pts.length - 1]);
  return res;
}

export function ringArea(ring: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(area) / 2;
}


/**
 * Strict Cebu Provincial Boundary Guard:
 * Rejects any polygon whose coordinates lie outside the Province of Cebu
 * (guarantees zero leakage into Bohol, Leyte, Biliran, or Negros).
 */
export function isPointInsideCebuProvince(lat: number, lon: number): boolean {
  if (lat < 9.35 || lat > 11.45 || lon < 123.25 || lon > 124.60) return false;
  if (lat < 10.20 && lon > 123.72) return false; // Bohol (Tagbilaran, Panglao)
  if (lat >= 10.85 && lon > 124.10) return false; // Leyte (Ormoc, Kananga, Naval)
  if (lon > 124.10) {
    if (lat < 10.55 || lat > 10.85 || lon < 124.25 || lon > 124.58) return false;
  }
  if (lat >= 10.50 && lon < 123.65) return false; // Northern Negros
  if (lat >= 10.20 && lat < 10.50 && lon < 123.50) return false; // Central Negros
  if (lat < 10.20 && lon < 123.28) return false; // Southern Negros
  return true;
}

export function decodeMvt(
  buf: Buffer,
  z: number,
  x: number,
  y: number,
  tolSq = 0.000004,
  minArea = 0.000002
): any[] {
  let offset = 0;

  function readVarint(): number {
    let res = 0;
    let shift = 0;
    while (offset < buf.length) {
      const b = buf[offset++];
      res += (b & 0x7f) * Math.pow(2, shift);
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return res;
  }

  function readTag(): [number, number] {
    if (offset >= buf.length) return [0, 0];
    const val = readVarint();
    return [val >>> 3, val & 0x7];
  }

  function skipField(wireType: number): void {
    if (wireType === 0) readVarint();
    else if (wireType === 1) offset += 8;
    else if (wireType === 2) offset += readVarint();
    else if (wireType === 5) offset += 4;
  }

  const layers: any[] = [];

  while (offset < buf.length) {
    const [fieldNum, wireType] = readTag();
    if (fieldNum === 3 && wireType === 2) {
      const layerLen = readVarint();
      const layerEnd = offset + layerLen;
      let name = "";
      let extent = 4096;
      const keys: string[] = [];
      const values: any[] = [];
      const rawFeatures: any[] = [];

      while (offset < layerEnd) {
        const [lField, lWire] = readTag();
        if (lField === 1 && lWire === 2) {
          const nLen = readVarint();
          name = buf.toString("utf-8", offset, offset + nLen);
          offset += nLen;
        } else if (lField === 2 && lWire === 2) {
          const fLen = readVarint();
          const fEnd = offset + fLen;
          let geomType = 0;
          const tags: number[] = [];
          const geomCommands: number[] = [];

          while (offset < fEnd) {
            const [fField, fWire] = readTag();
            if (fField === 2 && fWire === 2) {
              const tLen = readVarint();
              const tEnd = offset + tLen;
              while (offset < tEnd) tags.push(readVarint());
            } else if (fField === 3 && fWire === 0) {
              geomType = readVarint();
            } else if (fField === 4 && fWire === 2) {
              const gLen = readVarint();
              const gEnd = offset + gLen;
              while (offset < gEnd) geomCommands.push(readVarint());
            } else {
              skipField(fWire);
            }
          }
          rawFeatures.push({ tags, geomType, geomCommands });
        } else if (lField === 3 && lWire === 2) {
          const kLen = readVarint();
          keys.push(buf.toString("utf-8", offset, offset + kLen));
          offset += kLen;
        } else if (lField === 4 && lWire === 2) {
          const vLen = readVarint();
          const vEnd = offset + vLen;
          let val: any = null;
          while (offset < vEnd) {
            const [vField, vWire] = readTag();
            if (vField === 1 && vWire === 2) {
              const sLen = readVarint();
              val = buf.toString("utf-8", offset, offset + sLen);
              offset += sLen;
            } else if (vField === 2 && vWire === 5) {
              val = buf.readFloatLE(offset);
              offset += 4;
            } else if (vField === 3 && vWire === 1) {
              val = buf.readDoubleLE(offset);
              offset += 8;
            } else if (vField === 4 || vField === 5) {
              val = readVarint();
            } else if (vField === 6) {
              const zVal = readVarint();
              val = (zVal >>> 1) ^ -(zVal & 1);
            } else if (vField === 7) {
              val = Boolean(readVarint());
            } else {
              skipField(vWire);
            }
          }
          values.push(val);
        } else if (lField === 5 && lWire === 0) {
          extent = readVarint();
        } else {
          skipField(lWire);
        }
      }
      layers.push({ name, extent, keys, values, rawFeatures });
    } else {
      skipField(wireType);
    }
  }

  const features: any[] = [];
  const n = Math.pow(2, z);

  for (const layer of layers) {
    for (const rf of layer.rawFeatures) {
      if (rf.geomType !== 3) continue;
      const props: Record<string, any> = {};
      for (let i = 0; i < rf.tags.length; i += 2) {
        props[layer.keys[rf.tags[i]]] = layer.values[rf.tags[i + 1]];
      }

      let cx = 0;
      let cy = 0;
      let cmdIdx = 0;
      const rings: [number, number][][] = [];
      let currentRing: [number, number][] = [];

      while (cmdIdx < rf.geomCommands.length) {
        const cmdInt = rf.geomCommands[cmdIdx++];
        const cmdId = cmdInt & 0x7;
        const count = cmdInt >>> 3;

        if (cmdId === 1) { // MoveTo
          for (let i = 0; i < count; i++) {
            const zx = rf.geomCommands[cmdIdx++];
            const zy = rf.geomCommands[cmdIdx++];
            cx += (zx >>> 1) ^ -(zx & 1);
            cy += (zy >>> 1) ^ -(zy & 1);
            if (currentRing.length > 0) rings.push(currentRing);
            currentRing = [[cx, cy]];
          }
        } else if (cmdId === 2) { // LineTo
          for (let i = 0; i < count; i++) {
            const zx = rf.geomCommands[cmdIdx++];
            const zy = rf.geomCommands[cmdIdx++];
            cx += (zx >>> 1) ^ -(zx & 1);
            cy += (zy >>> 1) ^ -(zy & 1);
            currentRing.push([cx, cy]);
          }
        } else if (cmdId === 7) { // ClosePath
          if (currentRing.length > 0) {
            currentRing.push(currentRing[0]);
            rings.push(currentRing);
            currentRing = [];
          }
        }
      }
      if (currentRing.length > 0) rings.push(currentRing);

      const validRings = rings.filter((ring) => {
        if (ring.length < 4) return false;
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
          area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
        }
        return Math.abs(area) >= 32;
      });

      if (validRings.length === 0) continue;

      const geoRings = validRings
        .map((ring) => {
          const wgsRing: [number, number][] = ring.map(([px, py]) => {
            const lon = (x + px / layer.extent) / n * 360 - 180;
            const yVal = (y + py / layer.extent) / n;
            const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * yVal)));
            const lat = (latRad * 180) / Math.PI;
            return [Number(lon.toFixed(5)), Number(lat.toFixed(5))];
          });
          return simplifyRing(wgsRing, tolSq);
        })
        .filter((r) => r.length >= 4 && ringArea(r) >= minArea);

      const cebuRings = geoRings.filter((ring) => {
        const [lon, lat] = ring[0];
        return isPointInsideCebuProvince(lat, lon);
      });
      if (cebuRings.length === 0) continue;

      const varCode = Number(props.Var);
      if (![1, 2, 3].includes(varCode)) continue;

      const hazardLevel = varCode === 1 ? "Low" : varCode === 2 ? "Medium" : "High";
      const depthRange = varCode === 1 ? "0 - 0.5m" : varCode === 2 ? "0.5 - 1.5m" : "> 1.5m";

      features.push({
        type: "Feature",
        properties: {
          Var: varCode,
          hazard_level: hazardLevel,
          depth_range: depthRange,
          return_period: "100-Year",
        },
        geometry: {
          type: cebuRings.length === 1 ? "Polygon" : "MultiPolygon",
          coordinates: cebuRings.length === 1 ? cebuRings : cebuRings.map((r) => [r]),
        },
      });
    }
  }

  return features;
}

export async function extractTilesToGeoJSON(
  tiles: FloodHazardTile[],
  regionName: string,
  coverageDesc: string,
  outputPath: string,
  tolSq = 0.000004,
  minArea = 0.000002
): Promise<void> {
  const pmtilesUrl =
    "https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/resolve/main/PMTiles/layers/flood_100yr.pmtiles";

  const allFeatures: any[] = [];
  for (let i = 0; i < tiles.length; i += 4) {
    const batch = tiles.slice(i, i + 4);
    await Promise.all(
      batch.map(async (t) => {
        const start = 117561 + t.offset;
        const end = start + t.len - 1;
        const res = await fetch(pmtilesUrl, { headers: { Range: `bytes=${start}-${end}` } });
        if (!res.ok) {
          throw new Error(`Failed to fetch tile ${t.z}/${t.x}/${t.y}: HTTP ${res.status}`);
        }
        const pbf = zlib.gunzipSync(Buffer.from(await res.arrayBuffer()));
        const feats = decodeMvt(pbf, t.z, t.x, t.y, tolSq, minArea);
        allFeatures.push(...feats);
      })
    );
  }

  const geojson = {
    type: "FeatureCollection",
    metadata: {
      source: "UP Project NOAH (Nationwide Operational Assessment of Hazards)",
      source_dataset: "bettergovph/project-noah-hazard-maps",
      region: regionName,
      return_period: "100-Year Return Period",
      license: "ODC-ODbL 1.0 (Open Data Commons Open Database License)",
      coverage: coverageDesc,
      total_features: allFeatures.length,
      retrieved_at: new Date().toISOString(),
    },
    features: allFeatures,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(geojson), "utf-8");
}

export async function extractMetroCebuFloodHazards(
  outputPath = path.join(process.cwd(), "public", "data", "cebu-flood-hazards.geojson")
): Promise<void> {
  await extractTilesToGeoJSON(
    METRO_CEBU_TILES,
    "metro",
    "Metro Cebu (Cebu City, Mandaue, Lapu-Lapu, Talisay, Cordova, Consolacion, Liloan, Minglanilla)",
    outputPath
  );
  // Also write cebu-flood-metro.geojson
  const metroAlias = path.join(path.dirname(outputPath), "cebu-flood-metro.geojson");
  fs.copyFileSync(outputPath, metroAlias);
}

export async function extractRegionalFloodHazards(): Promise<void> {
  const dataDir = path.join(process.cwd(), "public", "data");

  // 1. Metro
  await extractMetroCebuFloodHazards(path.join(dataDir, "cebu-flood-hazards.geojson"));

  // 2. North (using tolSq 0.000007, minArea 0.000004 for crisp mobile compression < 350 KB)
  await extractTilesToGeoJSON(
    NORTH_CEBU_TILES,
    "north",
    "North Cebu (Compostela, Danao, Carmen, Catmon, Sogod, Borbon, Tabogon, Bogo, Medellin, Daanbantayan, Bantayan Island, Camotes)",
    path.join(dataDir, "cebu-flood-north.geojson"),
    0.000007,
    0.000004
  );

  // 3. South
  await extractTilesToGeoJSON(
    SOUTH_CEBU_TILES,
    "south",
    "South & West Cebu (Naga, San Fernando, Carcar, Sibonga, Argao, Dalaguete, Oslob, Santander, Toledo, Balamban, Tuburan)",
    path.join(dataDir, "cebu-flood-south.geojson"),
    0.000004,
    0.000002
  );
}

if (process.argv[1] && process.argv[1].endsWith("extract_noah_cebu.ts")) {
  extractRegionalFloodHazards()
    .then(() => console.log("Extracted regional Cebu flood hazards successfully."))
    .catch((err) => {
      console.error("Extraction failed:", err);
      process.exit(1);
    });
}
