/**
 * One-off outlined icons for the Independent Trainers email.
 * Run: node scripts/generate-outreach-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const W = 64;
const H = 64;
const R = 196;
const G = 181;
const B = 253;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    pixels.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function blank() {
  return Buffer.alloc(W * H * 4);
}

function stamp(pixels, x, y, alpha) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  const a = Math.max(0, Math.min(255, alpha));
  if (a <= 0) return;
  const i = (iy * W + ix) * 4;
  const prev = pixels[i + 3];
  if (a >= prev) {
    pixels[i] = R;
    pixels[i + 1] = G;
    pixels[i + 2] = B;
    pixels[i + 3] = a;
  }
}

function fillDot(pixels, cx, cy, radius) {
  const r = radius + 1;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= radius) {
        const edge = radius - d;
        stamp(pixels, x, y, edge >= 1 ? 255 : edge * 255);
      }
    }
  }
}

function strokePolyline(pixels, points, width) {
  const radius = width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      fillDot(pixels, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius);
    }
  }
}

function arcPoints(cx, cy, radius, a0, a1, steps = 48) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    points.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return points;
}

function pin() {
  const pixels = blank();
  const cx = 32;
  const cy = 22;
  const r = 14;
  const left = Math.PI / 2 + 0.48;
  const right = Math.PI / 2 - 0.48;
  const arc = arcPoints(cx, cy, r, left, right + Math.PI * 2, 60);
  strokePolyline(pixels, [...arc, [32, 58], arc[0]], 3.4);
  strokePolyline(pixels, arcPoints(cx, cy - 1, 4.2, 0, Math.PI * 2, 36), 2.6);
  return pixels;
}

function person(pixels, hx, hy, headR, bx, by, bodyR) {
  strokePolyline(pixels, arcPoints(hx, hy, headR, 0, Math.PI * 2, 56), 3.2);
  strokePolyline(pixels, arcPoints(bx, by, bodyR, Math.PI, Math.PI * 2, 40), 3.2);
}

function people() {
  const pixels = blank();
  person(pixels, 22, 22, 7, 22, 46, 12);
  person(pixels, 43, 25, 8, 43, 50, 13);
  return pixels;
}

function dollar() {
  const pixels = blank();
  const s = [
    [44, 20],
    [38, 14],
    [28, 15],
    [22, 22],
    [24, 30],
    [34, 34],
    [42, 40],
    [40, 50],
    [30, 53],
    [20, 48],
  ];
  strokePolyline(pixels, s, 3.4);
  strokePolyline(pixels, [[32, 10], [32, 56]], 3.2);
  return pixels;
}

const icons = {
  "public/email/outreach-icon-pin.png": pin(),
  "public/email/outreach-icon-people.png": people(),
  "public/email/outreach-icon-dollar.png": dollar(),
};

for (const [path, pixels] of Object.entries(icons)) {
  const png = encodePNG(pixels);
  writeFileSync(path, png);
  console.log(path, png.length);
}
