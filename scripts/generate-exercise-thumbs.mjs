/**
 * Small same-origin stills for the exercise picker.
 * The library ships 360px PNGs on exercisedb.dev; list circles are ~44px.
 * Run: node scripts/generate-exercise-thumbs.mjs
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const OUT = path.join(process.cwd(), "public/exercises/thumbs");
const SIZE = 128;

function slug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function mapPool(items, limit, run) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await run(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

const source = await readFile(new URL("../src/data/workout-exercise-media.ts", import.meta.url), "utf8");
const items = [];
const pattern = /^  "([^"]+)": \{\n    "imageUrl": "(https:\/\/[^"]+)"/gm;
for (const match of source.matchAll(pattern)) {
  items.push({ name: match[1], url: match[2], slug: slug(match[1]) });
}

const seen = new Map();
for (const item of items) {
  const prior = seen.get(item.slug);
  if (prior) throw new Error(`Thumb slug collision: ${prior} and ${item.name}`);
  seen.set(item.slug, item.name);
}

await mkdir(OUT, { recursive: true });
const tmp = await import("node:fs/promises").then((fs) => fs.mkdtemp(path.join(os.tmpdir(), "smoac-thumbs-")));

try {
  await mapPool(items, 6, async (item) => {
    const png = path.join(tmp, `${item.slug}.png`);
    const jpg = path.join(OUT, `${item.slug}.jpg`);
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(item.url);
        if (!response.ok) throw new Error(`${response.status} ${item.url}`);
        await writeFile(png, Buffer.from(await response.arrayBuffer()));
        await execFileAsync("sips", [
          "-z",
          String(SIZE),
          String(SIZE),
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          "60",
          png,
          "--out",
          jpg,
        ]);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`Could not thumbnail ${item.name}: ${lastError}`);
  });
} finally {
  await rm(tmp, { recursive: true, force: true });
}

console.log(`Wrote ${items.length} thumbs to ${OUT}`);
