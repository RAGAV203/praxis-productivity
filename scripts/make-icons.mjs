// Generates Praxis PNG icons (gradient squircle + activity ring) with no dependencies.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, { maskable = false, rounded = true } = {}) {
  const SS = 3;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const c1 = [10, 132, 255], c2 = [94, 92, 230], c3 = [191, 90, 242];
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size, v = (y + (sy + 0.5) / SS) / size;
          // squircle mask
          let inside = true;
          if (rounded && !maskable) {
            const px = Math.abs(u - 0.5) * 2, py = Math.abs(v - 0.5) * 2;
            inside = Math.pow(px, 5) + Math.pow(py, 5) <= 1;
          }
          if (!inside) continue;
          const t = (u + v) / 2;
          let col = t < 0.5 ? c1.map((c, i) => c + (c2[i] - c) * (t / 0.5)) : c2.map((c, i) => c + (c3[i] - c) * ((t - 0.5) / 0.5));
          // ring + dot (scaled into safe zone for maskable)
          const s = maskable ? 0.78 : 1;
          const dx = (u - 0.5) / s, dy = (v - 0.5) / s;
          const dist = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const onRing = dist > 0.22 && dist < 0.31 && !(ang > -Math.PI / 2 && ang < -Math.PI / 2 + 1.2);
          const capA = Math.hypot(dx - 0.265 * Math.cos(-Math.PI / 2), dy - 0.265 * Math.sin(-Math.PI / 2)) < 0.045;
          const capB = Math.hypot(dx - 0.265 * Math.cos(-Math.PI / 2 + 1.2), dy - 0.265 * Math.sin(-Math.PI / 2 + 1.2)) < 0.045;
          const dot = Math.hypot(dx - 0.265 * Math.cos(-Math.PI / 2 + 0.6), dy - 0.265 * Math.sin(-Math.PI / 2 + 0.6)) < 0.05;
          const center = dist < 0.085;
          if (onRing || capA || capB || center) col = [255, 255, 255];
          if (dot) col = [255, 214, 10];
          r += col[0]; g += col[1]; b += col[2]; a += 255;
        }
      const n = SS * SS, o = y * (size * 4 + 1) + 1 + x * 4;
      const cov = a / 255;
      raw[o] = cov ? r / cov : 0; raw[o + 1] = cov ? g / cov : 0; raw[o + 2] = cov ? b / cov : 0; raw[o + 3] = a / n;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

writeFileSync("public/icon-192.png", png(192));
writeFileSync("public/icon-512.png", png(512));
writeFileSync("public/icon-maskable-512.png", png(512, { maskable: true }));
writeFileSync("public/apple-icon.png", png(180, { rounded: false }));
console.log("icons written");
