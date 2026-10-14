/**
 * Generates valid PNG icons for PWA manifest without external dependencies.
 * Uses Node.js built-in zlib to output standard uncompressed/deflated RGBA PNG chunks.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { deflateSync } from "zlib";

function crc32(buf: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      if ((crc ^ byte) & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
      byte = byte >>> 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

function createPng(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from("IHDR"),
    ihdrData,
    Buffer.alloc(4),
  ]);
  const ihdrCrc = crc32(Buffer.concat([Buffer.from("IHDR"), ihdrData]));
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);

  // Raw image scanlines (filter byte 0 + RGBA pixels)
  // Background: Slate 900 (#0F172A = 15, 23, 42)
  // Center logo accent: Gold (#EAB308 = 234, 179, 8)
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.45;
  const innerRadius = width * 0.25;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= innerRadius) {
        // Gold emblem center
        rawData[pxOffset] = 234;     // R
        rawData[pxOffset + 1] = 179; // G
        rawData[pxOffset + 2] = 8;   // B
        rawData[pxOffset + 3] = 255; // A
      } else if (dist <= radius) {
        // Dark slate badge
        rawData[pxOffset] = 15;      // R
        rawData[pxOffset + 1] = 23;  // G
        rawData[pxOffset + 2] = 42;  // B
        rawData[pxOffset + 3] = 255; // A
      } else {
        // Rounded corner border
        rawData[pxOffset] = 2;       // R
        rawData[pxOffset + 1] = 6;   // G
        rawData[pxOffset + 2] = 23;  // B
        rawData[pxOffset + 3] = 255; // A
      }
    }
  }

  const deflated = deflateSync(rawData);
  const idatLen = deflated.length;
  const idatChunk = Buffer.concat([
    Buffer.alloc(4),
    Buffer.from("IDAT"),
    deflated,
    Buffer.alloc(4),
  ]);
  idatChunk.writeUInt32BE(idatLen, 0);
  const idatCrc = crc32(Buffer.concat([Buffer.from("IDAT"), deflated]));
  idatChunk.writeUInt32BE(idatCrc, 8 + idatLen);

  // IEND chunk
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("IEND"),
    Buffer.alloc(4),
  ]);
  const iendCrc = crc32(Buffer.from("IEND"));
  iendChunk.writeUInt32BE(iendCrc, 8);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = resolve(process.cwd(), "public/icons");
mkdirSync(outDir, { recursive: true });

const png192 = createPng(192, 192);
writeFileSync(resolve(outDir, "icon-192.png"), png192);
console.log(`Generated icon-192.png (${png192.length} bytes)`);

const png512 = createPng(512, 512);
writeFileSync(resolve(outDir, "icon-512.png"), png512);
console.log(`Generated icon-512.png (${png512.length} bytes)`);
