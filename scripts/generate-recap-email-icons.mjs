/**
 * Line icons for the Sunday week-in-review email.
 * Run: node scripts/generate-recap-email-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public/email");

function svg(color, body, fill = "none") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function filled(color, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="${color}" stroke="none">${body}</svg>`;
}

const icons = {
  "recap-dumbbell": svg(
    "#c4b5fd",
    `<path d="M6 8.5v7M18 8.5v7M3.6 10.2v3.6M20.4 10.2v3.6M6 12h12"/>`
  ),
  "recap-heart": svg(
    "#fb7185",
    `<path d="M12 19.4s-6.4-4-6.4-8.1A3.55 3.55 0 0 1 12 8.2a3.55 3.55 0 0 1 6.4 3.1c0 4.1-6.4 8.1-6.4 8.1z"/>`,
    "#fb7185"
  ),
  "recap-flame": filled(
    "#fb923c",
    `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`
  ),
  "recap-scale": svg(
    "#7dd3fc",
    `<path d="M12 3.5v16.5M8 20h8"/><path d="M12 6.2 5.2 9.2M12 6.2 18.8 9.2"/><path d="M5.2 9.2c0 1.7 1.2 2.8 2.6 2.8S10.4 10.9 10.4 9.2"/><path d="M13.6 9.2c0 1.7 1.2 2.8 2.6 2.8s2.6-1.1 2.6-2.8"/>`
  ),
  "recap-shoe": svg(
    "#2dd4bf",
    `<path d="M4.4 15.4c0-1.4 1-2.4 2.4-2.9l4.8-1.4c1.2-.4 2.2-1 3-2l1.8-1.5c.4-.5 1.1-.7 1.6-.4.7.3 1 1.1.7 1.7l-1.1 2.5c-.4.9-.4 1.8 0 2.7l.5 1.3c.3.7 0 1.5-.7 1.7H6.1c-1 0-1.7-.8-1.7-1.7v-.1z"/><path d="M8 14.4h5.2"/>`
  ),
  "recap-trophy": svg(
    "#d8b4fe",
    `<path d="M8 4.5h8v2.2a4 4 0 0 1-8 0V4.5z"/><path d="M8 6.2H5.6A2 2 0 0 0 5.8 9c1 .7 2.2.8 2.2.8"/><path d="M16 6.2h2.4a2 2 0 0 1-.2 2.8c-1 .7-2.2.8-2.2.8"/><path d="M12 10.7V14"/><path d="M9 19.5h6"/><path d="M10 14.2h4l.6 5.3h-5.2z"/>`
  ),
  "recap-chart": svg(
    "#60a5fa",
    `<path d="M5 19.5V11M12 19.5V6.5M19 19.5V9"/>`
  ),
  "recap-kettlebell": svg(
    "#fbbf24",
    `<path d="M9.2 10V8.2a2.8 2.8 0 0 1 5.6 0V10"/><circle cx="12" cy="14.6" r="4.3" fill="none"/>`
  ),
  "recap-calendar": svg(
    "#f4f4f5",
    `<path d="M7 3.8v2.2M17 3.8v2.2"/><path d="M4.8 8.2h14.4"/><path d="M6.2 5.6h11.6A1.6 1.6 0 0 1 19.4 7.2v11.2a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6V7.2a1.6 1.6 0 0 1 1.6-1.6z"/>`
  ),
  "recap-target": svg(
    "#f4f4f5",
    `<circle cx="12" cy="12" r="7.2" fill="none"/><circle cx="12" cy="12" r="3.6" fill="none"/><circle cx="12" cy="12" r="1.3" fill="#f4f4f5" stroke="none"/>`
  ),
  "recap-people": svg(
    "#f4f4f5",
    `<circle cx="9" cy="8" r="2.15" fill="none"/><path d="M4.8 18.4c.4-2.7 2-4.1 4.2-4.1s3.8 1.4 4.2 4.1"/><circle cx="16.1" cy="9.1" r="1.65" fill="none"/><path d="M14.2 14.8c1.5-.2 2.7.6 3.3 1.8.4.8.6 1.6.6 2"/>`
  ),
};

await mkdir(OUT, { recursive: true });
for (const [name, markup] of Object.entries(icons)) {
  const png = await sharp(Buffer.from(markup)).png().toBuffer();
  const file = path.join(OUT, `${name}.png`);
  await writeFile(file, png);
  console.log(name, png.length);
}
