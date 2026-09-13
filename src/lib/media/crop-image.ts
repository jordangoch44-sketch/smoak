import type { Area } from "react-easy-crop";

const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_QUALITY = 0.86;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not decode image."))
    );
    /* blob: / data: URLs break in Safari if crossOrigin is set. */
    if (/^https?:\/\//i.test(url)) {
      image.crossOrigin = "anonymous";
    }
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

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/** Keep base64 JSON under typical serverless body limits (~4.5MB). */
const UPLOAD_MAX_DATA_URL_CHARS = 3_800_000;

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function calculateRotatedBoundingBox(
  width: number,
  height: number,
  rotation: number
) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

function encodeCanvasDataUrl(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): string {
  let outQuality = quality;
  let dataUrl = canvas.toDataURL(mimeType, outQuality);
  while (dataUrl.length > UPLOAD_MAX_DATA_URL_CHARS && outQuality > 0.45) {
    outQuality -= 0.08;
    dataUrl = canvas.toDataURL(mimeType, outQuality);
  }
  return dataUrl;
}

function scaleToMaxEdge(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  let outWidth = Math.max(1, Math.round(width));
  let outHeight = Math.max(1, Math.round(height));
  if (maxEdge && Math.max(outWidth, outHeight) > maxEdge) {
    const scale = maxEdge / Math.max(outWidth, outHeight);
    outWidth = Math.max(1, Math.round(outWidth * scale));
    outHeight = Math.max(1, Math.round(outHeight * scale));
  }
  return { width: outWidth, height: outHeight };
}

/** Keep the crop rectangle on real photo pixels — never pad with empty/black. */
export function clampPixelCrop(
  crop: Area,
  imageWidth: number,
  imageHeight: number
): Area {
  const maxW = Math.max(1, imageWidth);
  const maxH = Math.max(1, imageHeight);
  const aspect = crop.width / Math.max(crop.height, 1e-6);

  let width = Math.min(Math.max(1, crop.width), maxW);
  let height = Math.min(Math.max(1, crop.height), maxH);

  if (width / height > aspect) {
    width = Math.min(maxW, height * aspect);
    height = width / aspect;
  } else {
    height = Math.min(maxH, width / aspect);
    width = height * aspect;
  }

  width = Math.min(Math.max(1, width), maxW);
  height = Math.min(Math.max(1, height), maxH);

  const x = Math.min(Math.max(0, crop.x), Math.max(0, maxW - width));
  const y = Math.min(Math.max(0, crop.y), Math.max(0, maxH - height));
  return { x, y, width, height };
}

/** Render cropped region to JPEG/PNG data URL for specialist onboarding & profile editor. */
export async function getCroppedImageDataUrl(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92,
  rotation = 0,
  maxEdge = 1920
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const crop = clampPixelCrop(pixelCrop, image.width, image.height);
  const cropWidth = Math.max(1, Math.round(crop.width));
  const cropHeight = Math.max(1, Math.round(crop.height));
  const { width: outWidth, height: outHeight } = scaleToMaxEdge(
    cropWidth,
    cropHeight,
    maxEdge
  );

  if (normalizedRotation === 0) {
    /* Draw the crop directly. Re-applying pixelCrop.x/y on an already-cropped
     * canvas changed the aspect and stretched the photo. */
    canvas.width = outWidth;
    canvas.height = outHeight;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      outWidth,
      outHeight
    );
    return encodeCanvasDataUrl(canvas, mimeType, quality);
  }

  const rotRad = getRadianAngle(normalizedRotation);
  const { width: bBoxWidth, height: bBoxHeight } = calculateRotatedBoundingBox(
    image.width,
    image.height,
    normalizedRotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const rotatedCrop = clampPixelCrop(crop, canvas.width, canvas.height);
  const cropX = Math.round(rotatedCrop.x);
  const cropY = Math.round(rotatedCrop.y);
  const srcWidth = Math.round(rotatedCrop.width);
  const srcHeight = Math.round(rotatedCrop.height);

  const finalCanvas = document.createElement("canvas");
  const finalCtx = finalCanvas.getContext("2d");
  if (!finalCtx) {
    throw new Error("Could not get canvas context");
  }

  finalCanvas.width = outWidth;
  finalCanvas.height = outHeight;
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = "high";
  finalCtx.drawImage(
    canvas,
    cropX,
    cropY,
    srcWidth,
    srcHeight,
    0,
    0,
    outWidth,
    outHeight
  );

  return encodeCanvasDataUrl(finalCanvas, mimeType, quality);
}

/**
 * Crop + resize to a square avatar File (512×512).
 * Prefers WebP; falls back to JPEG when WebP encoding is unavailable.
 * Browser-decoded images already honor EXIF orientation in modern Safari/Chrome.
 */
export async function getCroppedAvatarFile(
  imageSrc: string,
  pixelCrop: Area,
  fileNameBase = "avatar",
  rotation = 0
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const crop = clampPixelCrop(pixelCrop, image.width, image.height);

  if (normalizedRotation === 0) {
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE
    );
  } else {
    const rotRad = getRadianAngle(normalizedRotation);
    const { width: bBoxWidth, height: bBoxHeight } = calculateRotatedBoundingBox(
      image.width,
      image.height,
      normalizedRotation
    );

    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = bBoxWidth;
    rotCanvas.height = bBoxHeight;
    const rotCtx = rotCanvas.getContext("2d");
    if (!rotCtx) throw new Error("Could not get canvas context");

    rotCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
    rotCtx.rotate(rotRad);
    rotCtx.translate(-image.width / 2, -image.height / 2);
    rotCtx.drawImage(image, 0, 0);

    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const rotatedCrop = clampPixelCrop(crop, rotCanvas.width, rotCanvas.height);
    ctx.drawImage(
      rotCanvas,
      rotatedCrop.x,
      rotatedCrop.y,
      rotatedCrop.width,
      rotatedCrop.height,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE
    );
  }

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

const UPLOAD_MAX_EDGE = {
  profile: 1200,
  cover: 1920,
  gallery: 1600,
} as const;

function jpegDataUrlFromSize(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  kind: keyof typeof UPLOAD_MAX_EDGE
): string {
  const maxEdge = UPLOAD_MAX_EDGE[kind];
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  draw(ctx, outWidth, outHeight);

  const dataUrl = encodeCanvasDataUrl(canvas, "image/jpeg", 0.82);
  if (dataUrl.length > UPLOAD_MAX_DATA_URL_CHARS) {
    throw new Error("Photo is still too large. Try a smaller image.");
  }
  return dataUrl;
}

async function jpegDataUrlFromImageSrc(
  src: string,
  kind: keyof typeof UPLOAD_MAX_EDGE
): Promise<string> {
  const image = await createImage(src);
  return jpegDataUrlFromSize(
    image.width,
    image.height,
    (ctx, width, height) => ctx.drawImage(image, 0, 0, width, height),
    kind
  );
}

async function jpegDataUrlFromBitmap(
  bitmap: ImageBitmap,
  kind: keyof typeof UPLOAD_MAX_EDGE
): Promise<string> {
  try {
    return jpegDataUrlFromSize(
      bitmap.width,
      bitmap.height,
      (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
      kind
    );
  } finally {
    bitmap.close();
  }
}

/**
 * Decode + JPEG-compress a phone photo for `/api/media/specialist-application`.
 * Large HEIC/JPEG camera files often fail silently when posted raw as data URLs.
 */
export async function prepareImageDataUrlForUpload(
  file: File,
  kind: keyof typeof UPLOAD_MAX_EDGE = "gallery"
): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return await jpegDataUrlFromBitmap(bitmap, kind);
    } catch (bitmapError) {
      if (
        bitmapError instanceof Error &&
        bitmapError.message.startsWith("Photo is still")
      ) {
        throw bitmapError;
      }
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    try {
      return await jpegDataUrlFromImageSrc(objectUrl, kind);
    } catch (blobError) {
      if (
        blobError instanceof Error &&
        blobError.message.startsWith("Photo is still")
      ) {
        throw blobError;
      }
      const asDataUrl = await readFileAsDataUrl(file);
      return await jpegDataUrlFromImageSrc(asDataUrl, kind);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Photo is still")) {
      throw error;
    }
    throw new Error("Could not read this photo. Try another image.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export { AVATAR_OUTPUT_SIZE };
