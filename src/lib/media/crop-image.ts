import type { Area } from "react-easy-crop";

const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_QUALITY = 0.86;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode image."));
      },
      mimeType,
      quality
    );
  });
}

/** Render cropped region to JPEG/PNG data URL for specialist onboarding. */
export async function getCroppedImageDataUrl(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL(mimeType, quality);
}

/**
 * Crop + resize to a square avatar File (512×512).
 * Prefers WebP; falls back to JPEG when WebP encoding is unavailable.
 * Browser-decoded images already honor EXIF orientation in modern Safari/Chrome.
 */
export async function getCroppedAvatarFile(
  imageSrc: string,
  pixelCrop: Area,
  fileNameBase = "avatar"
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE
  );

  let mimeType = "image/webp";
  let blob: Blob;
  try {
    blob = await canvasToBlob(canvas, mimeType, AVATAR_QUALITY);
    if (!blob.type.includes("webp")) {
      throw new Error("webp unsupported");
    }
  } catch {
    mimeType = "image/jpeg";
    blob = await canvasToBlob(canvas, mimeType, AVATAR_QUALITY);
  }

  const extension = mimeType === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${fileNameBase}.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export { AVATAR_OUTPUT_SIZE };
