/**
 * Animated GIF of the Founding 100 launch countdown.
 * Email clients cannot run a script, so the message loads this image
 * when it is opened and the frames tick from that moment.
 */
import {
  FOUNDING_LAUNCH_LABEL,
  getFoundingCountdownParts,
  padCountdownUnit,
} from "@/lib/founding-50-invite";

const WIDTH = 456;
const HEIGHT = 92;
const FRAMES = 45;

const DIGIT = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
} as const;

const LETTER = {
  A: ["010", "101", "111", "101", "101"],
  C: ["111", "100", "100", "100", "111"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  M: ["101", "111", "101", "101", "101"],
  N: ["110", "101", "101", "101", "101"],
  O: ["111", "101", "101", "101", "111"],
  R: ["110", "101", "110", "101", "101"],
  S: ["111", "100", "111", "001", "111"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  Y: ["101", "101", "010", "010", "010"],
} as const;

/** Panel, box, border, digit, label. */
const PALETTE: Array<[number, number, number]> = [
  [18, 18, 22],
  [28, 24, 36],
  [90, 78, 64],
  [245, 245, 247],
  [196, 181, 160],
];

const UNITS = [
  { key: "days" as const, label: "DAYS", digits: 3 },
  { key: "hours" as const, label: "HOURS", digits: 2 },
  { key: "minutes" as const, label: "MINUTES", digits: 2 },
  { key: "seconds" as const, label: "SECONDS", digits: 2 },
];

function setPixel(buf: Uint8Array, x: number, y: number, color: number) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  buf[y * WIDTH + x] = color;
}

function fillRect(
  buf: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number
) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(buf, xx, yy, color);
  }
}

function strokeRect(
  buf: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number
) {
  for (let xx = x; xx < x + w; xx++) {
    setPixel(buf, xx, y, color);
    setPixel(buf, xx, y + h - 1, color);
  }
  for (let yy = y; yy < y + h; yy++) {
    setPixel(buf, x, yy, color);
    setPixel(buf, x + w - 1, yy, color);
  }
}

function blitGlyph(
  buf: Uint8Array,
  glyph: readonly string[],
  x: number,
  y: number,
  scale: number,
  color: number
) {
  for (let row = 0; row < glyph.length; row++) {
    const line = glyph[row] ?? "";
    for (let col = 0; col < line.length; col++) {
      if (line[col] !== "1") continue;
      fillRect(buf, x + col * scale, y + row * scale, scale, scale, color);
    }
  }
}

function textWidth(text: string, glyphW: number, scale: number, gap: number) {
  if (!text.length) return 0;
  return text.length * glyphW * scale + (text.length - 1) * gap;
}

function drawText(
  buf: Uint8Array,
  text: string,
  font: Record<string, readonly string[]>,
  glyphW: number,
  x: number,
  y: number,
  scale: number,
  gap: number,
  color: number
) {
  let cursor = x;
  for (const ch of text) {
    const glyph = font[ch];
    if (glyph) blitGlyph(buf, glyph, cursor, y, scale, color);
    cursor += glyphW * scale + gap;
  }
}

function renderFrame(nowMs: number): Uint8Array {
  const buf = new Uint8Array(WIDTH * HEIGHT);
  const parts = getFoundingCountdownParts(nowMs);
  const gap = 8;
  const boxW = Math.floor((WIDTH - gap * (UNITS.length + 1)) / UNITS.length);
  const boxH = 76;
  const boxY = 8;

  UNITS.forEach((unit, index) => {
    const x = gap + index * (boxW + gap);
    fillRect(buf, x, boxY, boxW, boxH, 1);
    strokeRect(buf, x, boxY, boxW, boxH, 2);

    const value = parts.done ? "0".repeat(unit.digits) : padCountdownUnit(parts[unit.key], unit.digits);
    const digitScale = 3;
    const digitGap = 2;
    const valueW = textWidth(value, 5, digitScale, digitGap);
    drawText(
      buf,
      value,
      DIGIT,
      5,
      x + Math.floor((boxW - valueW) / 2),
      boxY + 14,
      digitScale,
      digitGap,
      3
    );

    const labelScale = 2;
    const labelGap = 1;
    const labelW = textWidth(unit.label, 3, labelScale, labelGap);
    drawText(
      buf,
      unit.label,
      LETTER,
      3,
      x + Math.floor((boxW - labelW) / 2),
      boxY + 50,
      labelScale,
      labelGap,
      4
    );
  });

  return buf;
}

function lzw(indices: Uint8Array, minCodeSize: number): number[] {
  const initBits = minCodeSize + 1;
  const clearCode = 1 << (initBits - 1);
  const eoiCode = clearCode + 1;
  const maxMax = 4096;
  const hsize = 5003;
  const htab = new Int32Array(hsize);
  const codetab = new Int32Array(hsize);
  htab.fill(-1);

  let nBits = initBits;
  let maxCode = (1 << nBits) - 1;
  let freeEnt = eoiCode + 1;
  let clearFlag = false;
  const out: number[] = [];
  let acc = 0;
  let accBits = 0;

  const emit = (code: number) => {
    acc |= code << accBits;
    accBits += nBits;
    while (accBits >= 8) {
      out.push(acc & 255);
      acc >>= 8;
      accBits -= 8;
    }
    if (freeEnt > maxCode || clearFlag) {
      if (clearFlag) {
        nBits = initBits;
        maxCode = (1 << nBits) - 1;
        clearFlag = false;
      } else {
        nBits += 1;
        maxCode = nBits === 12 ? maxMax : (1 << nBits) - 1;
      }
    }
    if (code === eoiCode) {
      while (accBits > 0) {
        out.push(acc & 255);
        acc >>= 8;
        accBits -= 8;
      }
    }
  };

  const clear = () => {
    htab.fill(-1);
    freeEnt = eoiCode + 1;
    clearFlag = true;
    emit(clearCode);
  };

  emit(clearCode);
  let ent = indices[0] ?? 0;
  const hshift = 3;
  for (let i = 1; i < indices.length; i++) {
    const pixel = indices[i] ?? 0;
    const fcode = (pixel << 12) + ent;
    let idx = (pixel << hshift) ^ ent;
    if (htab[idx] === fcode) {
      ent = codetab[idx] ?? 0;
      continue;
    }
    if (htab[idx] !== -1) {
      let disp = hsize - idx;
      if (idx === 0) disp = 1;
      let found = false;
      do {
        idx -= disp;
        if (idx < 0) idx += hsize;
        if (htab[idx] === fcode) {
          ent = codetab[idx] ?? 0;
          found = true;
          break;
        }
      } while (htab[idx] !== -1);
      if (found) continue;
    }
    emit(ent);
    ent = pixel;
    if (freeEnt < maxMax) {
      codetab[idx] = freeEnt;
      freeEnt += 1;
      htab[idx] = fcode;
    } else {
      clear();
    }
  }
  emit(ent);
  emit(eoiCode);
  return out;
}

function subBlocks(data: number[]): Buffer[] {
  const parts: Buffer[] = [];
  for (let i = 0; i < data.length; i += 255) {
    const slice = data.slice(i, i + 255);
    parts.push(Buffer.from([slice.length, ...slice]));
  }
  parts.push(Buffer.from([0]));
  return parts;
}

function encodeGif(frames: Uint8Array[]): Buffer {
  const minCodeSize = 3;
  const header = Buffer.from("GIF89a");
  const screen = Buffer.alloc(7);
  screen.writeUInt16LE(WIDTH, 0);
  screen.writeUInt16LE(HEIGHT, 2);
  screen[4] = 0x80 | 0x70 | 2; // GCT, 8 colors (2^(2+1))
  screen[5] = 0;
  screen[6] = 0;
  const gct = Buffer.alloc(8 * 3);
  PALETTE.forEach(([r, g, b], i) => {
    gct[i * 3] = r;
    gct[i * 3 + 1] = g;
    gct[i * 3 + 2] = b;
  });
  const chunks: Buffer[] = [header, screen, gct];
  for (const frame of frames) {
    const gce = Buffer.from([
      0x21, 0xf9, 0x04, 0x04, 0x64, 0x00, 0x00, 0x00,
    ]);
    const desc = Buffer.alloc(10);
    desc[0] = 0x2c;
    desc.writeUInt16LE(WIDTH, 5);
    desc.writeUInt16LE(HEIGHT, 7);
    const lzwBytes = lzw(frame, minCodeSize);
    chunks.push(
      gce,
      desc,
      Buffer.from([minCodeSize]),
      ...subBlocks(lzwBytes)
    );
  }
  chunks.push(Buffer.from([0x3b]));
  return Buffer.concat(chunks);
}

let cached: { second: number; body: Buffer } | null = null;

export function foundingCountdownGif(nowMs = Date.now()): Buffer {
  const second = Math.floor(nowMs / 1000);
  if (cached?.second === second) return cached.body;
  const frames = Array.from({ length: FRAMES }, (_, i) =>
    renderFrame((second + i) * 1000)
  );
  const body = encodeGif(frames);
  cached = { second, body };
  return body;
}

export const FOUNDING_COUNTDOWN_ALT = `Countdown to SMOAC launch on ${FOUNDING_LAUNCH_LABEL}`;
