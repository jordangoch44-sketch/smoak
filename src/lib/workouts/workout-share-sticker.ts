import { LOGO_ICON_SRC, WORDMARK_SRC } from "@/lib/brand";
import { shareSafeName, shareSafeTitle } from "@/lib/text/share-language";
import { formatWorkoutDayHeading, parseWorkoutSetCount } from "@/lib/workouts/client-workout";
import type { ClientWorkoutDay, ClientWorkoutExercise } from "@/types/client-workout";

export type WorkoutStickerId = "one" | "two" | "three";

export const WORKOUT_STICKER_OPTIONS: readonly { id: WorkoutStickerId; label: string }[] = [
  { id: "one", label: "Option 1" },
  { id: "two", label: "Option 2" },
  { id: "three", label: "Option 3" },
];

export interface WorkoutStickerCard {
  title: string;
  /** The workout name was replaced so it is not printed on the sticker. */
  censored: boolean;
  dateLabel: string;
  exerciseCount: number;
  setCount: number;
  volumeLb: number;
  streakWeeks: number;
  topLiftName: string;
  topLiftLb: number | null;
}

const SCALE = 2;

interface BrandMarks {
  mark: HTMLCanvasElement | null;
  word: HTMLCanvasElement | null;
}

function positiveNumber(value: string): number | null {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function exerciseSetCount(exercise: ClientWorkoutExercise): number {
  if (exercise.setLogs && exercise.setLogs.length > 0) return exercise.setLogs.length;
  return parseWorkoutSetCount(exercise.sets) ?? 1;
}

export function buildWorkoutStickerCard(
  day: ClientWorkoutDay,
  streakWeeks = 0
): WorkoutStickerCard {
  const named = day.exercises.filter((exercise) => exercise.name.trim());
  const safeTitle = shareSafeTitle(day.title);
  let volumeLb = 0;
  let setCount = 0;
  let topLiftLb: number | null = null;
  let topLiftRaw = "";

  for (const exercise of named) {
    setCount += exerciseSetCount(exercise);
    const logs = exercise.setLogs ?? [];
    for (const log of logs) {
      const weight = positiveNumber(log.weight);
      const reps = positiveNumber(log.reps);
      if (weight && reps) volumeLb += weight * reps;
      if (weight && (topLiftLb === null || weight > topLiftLb)) {
        topLiftLb = weight;
        topLiftRaw = exercise.name;
      }
    }
  }

  const safeLift = shareSafeName(topLiftRaw, "Lift");
  return {
    title: safeTitle.text,
    censored: safeTitle.blocked || safeLift.blocked,
    dateLabel: formatWorkoutDayHeading(day.date),
    exerciseCount: named.length,
    setCount,
    volumeLb: Math.round(volumeLb),
    streakWeeks: Math.max(0, Math.round(streakWeeks)),
    topLiftName: topLiftLb === null ? "—" : safeLift.text,
    topLiftLb,
  };
}

export function workoutShareSummary(card: WorkoutStickerCard): string {
  const exercises =
    card.exerciseCount === 1 ? "1 exercise" : `${card.exerciseCount} exercises`;
  return [card.title, card.dateLabel, exercises].filter(Boolean).join(" · ");
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("logo"));
    image.src = src;
  });
}

function knockOutBlack(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frame.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    if (max < 26 && max - min < 14) pixels[index + 3] = 0;
  }
  ctx.putImageData(frame, 0, 0);
  return cropAlpha(canvas);
}

function cropAlpha(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext("2d");
  if (!ctx) return source;
  const { width, height } = source;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((pixels[(y * width + x) * 4 + 3] ?? 0) < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return source;
  const canvas = document.createElement("canvas");
  canvas.width = maxX - minX + 1;
  canvas.height = maxY - minY + 1;
  canvas
    .getContext("2d")
    ?.drawImage(source, minX, minY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

let brandPromise: Promise<BrandMarks> | null = null;

function loadBrand(): Promise<BrandMarks> {
  brandPromise ??= Promise.all([loadImage(LOGO_ICON_SRC), loadImage(WORDMARK_SRC)])
    .then(([mark, word]) => ({ mark: knockOutBlack(mark), word: knockOutBlack(word) }))
    .catch(() => ({ mark: null, word: null }));
  return brandPromise;
}

function displayFont(size: number): string {
  return `italic 800 ${size}px Impact, "Arial Black", Arial, sans-serif`;
}

function fitLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let next = text.trimEnd();
  while (next.length > 1 && ctx.measureText(`${next}…`).width > maxWidth) {
    next = next.slice(0, -1).trimEnd();
  }
  return `${next}…`;
}

function fillTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: "left" | "center"
) {
  const chars = [...text];
  let width = -tracking;
  for (const char of chars) width += ctx.measureText(char).width + tracking;
  let cursor = align === "center" ? x - width / 2 : x;
  const previous = ctx.textAlign;
  ctx.textAlign = "left";
  for (const char of chars) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }
  ctx.textAlign = previous;
}

function drawBrand(
  ctx: CanvasRenderingContext2D,
  brand: BrandMarks,
  x: number,
  y: number,
  height: number
): number {
  let cursor = x;
  if (brand.mark) {
    const scale = height / brand.mark.height;
    const width = brand.mark.width * scale;
    ctx.drawImage(brand.mark, cursor, y, width, height);
    cursor += width + 10;
  }
  if (brand.word) {
    const wordHeight = height * 0.46;
    const scale = wordHeight / brand.word.height;
    const width = brand.word.width * scale;
    ctx.drawImage(brand.word, cursor, y + (height - wordHeight) / 2, width, wordHeight);
    cursor += width;
  }
  if (!brand.mark && !brand.word) {
    ctx.fillStyle = "#fff";
    ctx.font = "700 18px Inter, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("SMOAC", x, y + height / 2);
    cursor = x + ctx.measureText("SMOAC").width;
    ctx.textBaseline = "top";
  }
  return cursor - x;
}

function iconDumbbell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.1);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(size * 0.28, size * 0.5);
  ctx.lineTo(size * 0.72, size * 0.5);
  ctx.stroke();
  ctx.fillRect(size * 0.12, size * 0.3, size * 0.14, size * 0.4);
  ctx.fillRect(size * 0.74, size * 0.3, size * 0.14, size * 0.4);
  ctx.restore();
}

function iconClipboard(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, size * 0.08);
  ctx.strokeRect(size * 0.22, size * 0.24, size * 0.56, size * 0.58);
  ctx.fillRect(size * 0.38, size * 0.14, size * 0.24, size * 0.14);
  ctx.restore();
}

function iconCheck(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.1);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeRect(size * 0.18, size * 0.18, size * 0.64, size * 0.64);
  ctx.beginPath();
  ctx.moveTo(size * 0.32, size * 0.52);
  ctx.lineTo(size * 0.46, size * 0.66);
  ctx.lineTo(size * 0.7, size * 0.36);
  ctx.stroke();
  ctx.restore();
}

function iconFlame(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.font = `${Math.round(size)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🔥", x + size / 2, y + size * 0.58);
  ctx.restore();
}

function iconTrophy(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(size * 0.32, size * 0.18);
  ctx.lineTo(size * 0.68, size * 0.18);
  ctx.lineTo(size * 0.64, size * 0.48);
  ctx.quadraticCurveTo(size * 0.5, size * 0.62, size * 0.36, size * 0.48);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.32, size * 0.28);
  ctx.quadraticCurveTo(size * 0.16, size * 0.28, size * 0.2, size * 0.44);
  ctx.moveTo(size * 0.68, size * 0.28);
  ctx.quadraticCurveTo(size * 0.84, size * 0.28, size * 0.8, size * 0.44);
  ctx.stroke();
  ctx.fillRect(size * 0.46, size * 0.58, size * 0.08, size * 0.14);
  ctx.fillRect(size * 0.36, size * 0.72, size * 0.28, size * 0.08);
  ctx.restore();
}

function traceChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  point: number
) {
  ctx.beginPath();
  ctx.moveTo(x + point, y);
  ctx.lineTo(x + width - point, y);
  ctx.lineTo(x + width, y + height / 2);
  ctx.lineTo(x + width - point, y + height);
  ctx.lineTo(x + point, y + height);
  ctx.lineTo(x, y + height / 2);
  ctx.closePath();
}

function paintEditorial(
  ctx: CanvasRenderingContext2D,
  card: WorkoutStickerCard,
  brand: BrandMarks,
  width: number
) {
  const pad = 36;
  drawBrand(ctx, brand, pad, 28, 54);

  ctx.fillStyle = "#fff";
  ctx.font = displayFont(68);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(fitLine(ctx, card.title, width - pad * 2), pad, 96);

  const stats = [
    { label: "VOLUME", value: formatCount(card.volumeLb), unit: "lb" },
    { label: "EXERCISES", value: String(card.exerciseCount), unit: "" },
    { label: "SETS", value: String(card.setCount), unit: "" },
    { label: "STREAK", value: String(card.streakWeeks), unit: "wk" },
  ];
  const gap = 18;
  const colW = (width - pad * 2 - gap * 3) / 4;
  stats.forEach((stat, index) => {
    const x = pad + index * (colW + gap);
    const streak = stat.label === "STREAK";
    const contentX = streak ? x + 42 : x;
    if (streak) iconFlame(ctx, x - 4, 188, 42);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "600 11px Inter, Arial, sans-serif";
    fillTracked(ctx, stat.label, contentX, 184, 1.6, "left");
    ctx.fillStyle = "#fff";
    ctx.font = displayFont(40);
    ctx.textAlign = "left";
    ctx.fillText(stat.value, contentX, 202);
    const valueWidth = ctx.measureText(stat.value).width;
    if (stat.unit) {
      ctx.font = "600 16px Inter, Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(stat.unit, contentX + valueWidth + 6, 222);
    }
    if (index < stats.length - 1) {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(x + colW + gap / 2, 190, 1, 52);
    }
  });

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 11px Inter, Arial, sans-serif";
  fillTracked(ctx, "TOP LIFT", pad, 272, 1.6, "left");
  ctx.fillStyle = "#fff";
  ctx.font = displayFont(32);
  const lift = fitLine(ctx, card.topLiftName, width * 0.48);
  ctx.fillText(lift, pad, 292);
  if (card.topLiftLb === null) return;
  const liftWidth = ctx.measureText(lift).width;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "500 28px Inter, Arial, sans-serif";
  ctx.fillText("|", pad + liftWidth + 12, 294);
  ctx.fillStyle = "#fff";
  ctx.font = displayFont(36);
  const pounds = formatCount(card.topLiftLb);
  ctx.fillText(pounds, pad + liftWidth + 32, 290);
  const poundsWidth = ctx.measureText(pounds).width;
  ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("lb", pad + liftWidth + 40 + poundsWidth, 306);
}

function paintChevron(
  ctx: CanvasRenderingContext2D,
  card: WorkoutStickerCard,
  brand: BrandMarks,
  width: number
) {
  const rows = [
    { y: 8, w: width - 16, h: 76 },
    { y: 96, w: width - 28, h: 92 },
    { y: 200, w: width - 88, h: 76 },
  ];
  rows.forEach((row, index) => {
    const x = (width - row.w) / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    traceChevron(ctx, x, row.y, row.w, row.h, 22);
    ctx.fillStyle = "#0c0c12";
    ctx.fill();
    ctx.shadowColor = "transparent";
    const edge = ctx.createLinearGradient(x, row.y, x + row.w, row.y + row.h);
    edge.addColorStop(0, "rgba(255,255,255,0.72)");
    edge.addColorStop(0.5, "rgba(120,120,130,0.45)");
    edge.addColorStop(1, "rgba(255,255,255,0.7)");
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (index === 0) {
      const brandWidth = drawBrand(ctx, brand, x + 36, row.y + 16, 46);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x + 44 + brandWidth, row.y + 18, 1, 42);
      ctx.fillStyle = "#fff";
      ctx.font = displayFont(34);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(fitLine(ctx, card.title, row.w - brandWidth - 110), x + 58 + brandWidth, row.y + 22);
    }
  });

  const stats = [
    { label: "TOTAL VOLUME", value: formatCount(card.volumeLb), unit: "lb", color: "#c084fc", icon: iconDumbbell },
    { label: "EXERCISES", value: String(card.exerciseCount), unit: "", color: "#38bdf8", icon: iconClipboard },
    { label: "TOTAL SETS", value: String(card.setCount), unit: "", color: "#c084fc", icon: iconCheck },
    { label: "WEEK STREAK", value: String(card.streakWeeks), unit: "wk", color: "#fb923c", icon: iconFlame },
  ];
  const statRow = rows[1]!;
  const statX = (width - statRow.w) / 2;
  const inner = statRow.w - 70;
  const col = inner / 4;
  stats.forEach((stat, index) => {
    const x = statX + 36 + index * col;
    const flame = stat.icon === iconFlame;
    const iconSize = flame ? 44 : 26;
    const textX = x + (flame ? 46 : 32);
    stat.icon(ctx, x, statRow.y + (flame ? 20 : 28), iconSize, stat.color);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "600 11px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    fillTracked(ctx, stat.label, textX, statRow.y + 16, 0.7, "left");
    ctx.fillStyle = "#fff";
    ctx.font = displayFont(32);
    ctx.fillText(stat.value, textX, statRow.y + 36);
    if (stat.unit) {
      const valueWidth = ctx.measureText(stat.value).width;
      ctx.font = "600 14px Inter, Arial, sans-serif";
      ctx.fillText(stat.unit, textX + 6 + valueWidth, statRow.y + 52);
    }
  });

  const liftRow = rows[2]!;
  const liftX = (width - liftRow.w) / 2;
  iconTrophy(ctx, liftX + 36, liftRow.y + 18, 32, "#fbbf24");
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "600 9px Inter, Arial, sans-serif";
  fillTracked(ctx, "TOP LIFT", liftX + 76, liftRow.y + 16, 0.8, "left");
  ctx.fillStyle = "#fff";
  ctx.font = displayFont(24);
  const lift = fitLine(ctx, card.topLiftName, liftRow.w * 0.42);
  ctx.fillText(lift, liftX + 76, liftRow.y + 32);
  if (card.topLiftLb === null) return;
  const liftWidth = ctx.measureText(lift).width;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 20px Inter, Arial, sans-serif";
  ctx.fillText("|", liftX + 88 + liftWidth, liftRow.y + 34);
  ctx.fillStyle = "#fff";
  ctx.font = displayFont(28);
  const pounds = formatCount(card.topLiftLb);
  ctx.fillText(pounds, liftX + 106 + liftWidth, liftRow.y + 30);
  const poundsWidth = ctx.measureText(pounds).width;
  ctx.font = "600 13px Inter, Arial, sans-serif";
  ctx.fillText("lb", liftX + 112 + liftWidth + poundsWidth, liftRow.y + 42);
}

function neonPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string | CanvasGradient
) {
  ctx.save();
  ctx.shadowColor = typeof stroke === "string" ? stroke : "#a855f7";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 22);
  ctx.fillStyle = "rgba(8, 8, 18, 0.94)";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function paintNeon(
  ctx: CanvasRenderingContext2D,
  card: WorkoutStickerCard,
  brand: BrandMarks,
  width: number
) {
  const pad = 16;
  const gap = 12;
  const headerH = 78;
  const rowH = 86;
  const header = ctx.createLinearGradient(pad, 0, width - pad, 0);
  header.addColorStop(0, "#e879f9");
  header.addColorStop(0.55, "#818cf8");
  header.addColorStop(1, "#38bdf8");
  neonPill(ctx, pad, 12, width - pad * 2, headerH, header);

  const brandWidth = drawBrand(ctx, brand, pad + 18, 26, 50);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(pad + 28 + brandWidth, 30, 1, 42);
  const titleX = pad + 42 + brandWidth;
  ctx.font = displayFont(32);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const title = fitLine(ctx, card.title, width - titleX - pad - 20);
  const titleWidth = ctx.measureText(title).width;
  const titleGradient = ctx.createLinearGradient(titleX, 0, titleX + titleWidth, 0);
  titleGradient.addColorStop(0, "#f472b6");
  titleGradient.addColorStop(0.55, "#a855f7");
  titleGradient.addColorStop(1, "#60a5fa");
  ctx.fillStyle = titleGradient;
  ctx.fillText(title, titleX, 36);

  const colW = (width - pad * 2 - gap) / 2;
  const tiles = [
    { x: pad, y: 102, label: "TOTAL VOLUME", value: formatCount(card.volumeLb), unit: "lb", color: "#c084fc", icon: iconDumbbell },
    { x: pad + colW + gap, y: 102, label: "STREAK", value: String(card.streakWeeks), unit: "wk", color: "#fb923c", icon: iconFlame },
    { x: pad, y: 102 + rowH + gap, label: "EXERCISES", value: String(card.exerciseCount), unit: "", color: "#38bdf8", icon: iconClipboard },
    { x: pad + colW + gap, y: 102 + rowH + gap, label: "TOTAL SETS", value: String(card.setCount), unit: "sets", color: "#c084fc", icon: iconCheck },
  ];
  for (const tile of tiles) {
    neonPill(ctx, tile.x, tile.y, colW, rowH, tile.color);
    const flame = tile.icon === iconFlame;
    const iconSize = flame ? 46 : 32;
    const textX = tile.x + (flame ? 60 : 54);
    tile.icon(ctx, tile.x + 10, tile.y + (flame ? 16 : 26), iconSize, tile.color);
    ctx.fillStyle = "rgba(255,255,255,0.66)";
    ctx.font = "600 10px Inter, Arial, sans-serif";
    fillTracked(ctx, tile.label, textX, tile.y + 16, 0.8, "left");
    ctx.fillStyle = "#fff";
    ctx.font = displayFont(30);
    ctx.fillText(tile.value, textX, tile.y + 34);
    if (tile.unit) {
      const valueWidth = ctx.measureText(tile.value).width;
      ctx.font = "600 14px Inter, Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.fillText(tile.unit, textX + 8 + valueWidth, tile.y + 48);
    }
  }

  const liftY = 102 + (rowH + gap) * 2;
  const gold = ctx.createLinearGradient(pad, liftY, width - pad, liftY);
  gold.addColorStop(0, "#fbbf24");
  gold.addColorStop(0.45, "#f472b6");
  gold.addColorStop(1, "#818cf8");
  neonPill(ctx, pad, liftY, width - pad * 2, 78, gold);
  iconTrophy(ctx, pad + 16, liftY + 20, 36, "#fbbf24");
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(pad + 60, liftY + 18, 1, 42);
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  ctx.font = "600 10px Inter, Arial, sans-serif";
  fillTracked(ctx, "TOP LIFT", pad + 74, liftY + 16, 0.8, "left");
  ctx.fillStyle = "#fff";
  ctx.font = displayFont(22);
  const lift = fitLine(ctx, card.topLiftName, 180);
  ctx.fillText(lift, pad + 74, liftY + 34);
  if (card.topLiftLb === null) return;
  const pounds = formatCount(card.topLiftLb);
  ctx.font = displayFont(32);
  const poundsWidth = ctx.measureText(pounds).width;
  const poundsX = width - pad - 36 - poundsWidth;
  const poundsGradient = ctx.createLinearGradient(poundsX, 0, poundsX + poundsWidth, 0);
  poundsGradient.addColorStop(0, "#c084fc");
  poundsGradient.addColorStop(1, "#60a5fa");
  ctx.fillStyle = poundsGradient;
  ctx.fillText(pounds, poundsX, liftY + 28);
  ctx.font = "600 14px Inter, Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillText("lb", poundsX + poundsWidth + 6, liftY + 42);
}

function renderCanvas(
  id: WorkoutStickerId,
  card: WorkoutStickerCard,
  brand: BrandMarks
): HTMLCanvasElement {
  const width = id === "three" ? 640 : id === "two" ? 900 : 860;
  const height = id === "three" ? 392 : id === "two" ? 286 : 360;
  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn’t prepare the sticker.");
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "top";
  if (id === "one") paintEditorial(ctx, card, brand, width);
  else if (id === "two") paintChevron(ctx, card, brand, width);
  else paintNeon(ctx, card, brand, width);
  return canvas;
}

/** Draws one of the three share stickers. Option 1 is type and the logo on a clear background. */
export async function renderWorkoutSticker(
  id: WorkoutStickerId,
  card: WorkoutStickerCard
): Promise<HTMLCanvasElement> {
  const brand = await loadBrand();
  return renderCanvas(id, card, brand);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Couldn’t create the sticker."));
    }, "image/png");
  });
}

function canShareFile(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Opens the system share sheet with the PNG, or downloads it when sharing files isn’t available. */
export async function shareWorkoutSticker(blob: Blob): Promise<"shared" | "saved"> {
  const file = new File([blob], "smoac-workout.png", { type: "image/png" });
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: "Workout" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }
  downloadBlob(blob, file.name);
  return "saved";
}
