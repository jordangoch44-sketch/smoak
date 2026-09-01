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

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function calculateRotatedBoundingBox(
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

  if (normalizedRotation === 0) {
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
  } else {
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
  }

  const cropX = Math.max(0, Math.round(pixelCrop.x));
  const cropY = Math.max(0, Math.round(pixelCrop.y));
  const cropWidth = Math.min(canvas.width - cropX, Math.round(pixelCrop.width));
  const cropHeight = Math.min(canvas.height - cropY, Math.round(pixelCrop.height));

  const finalCanvas = document.createElement("canvas");
  const finalCtx = finalCanvas.getContext("2d");
  if (!finalCtx) {
    throw new Error("Could not get canvas context");
  }

  let outWidth = Math.max(1, cropWidth);
  let outHeight = Math.max(1, cropHeight);
  if (maxEdge && Math.max(outWidth, outHeight) > maxEdge) {
    const scale = maxEdge / Math.max(outWidth, outHeight);
    outWidth = Math.max(1, Math.round(outWidth * scale));
    outHeight = Math.max(1, Math.round(outHeight * scale));
  }

  finalCanvas.width = outWidth;
  finalCanvas.height = outHeight;
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = "high";

  if (normalizedRotation === 0) {
    finalCtx.drawImage(canvas, 0, 0, outWidth, outHeight);
  } else {
    finalCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outWidth,
      outHeight
    );
  }

  let outQuality = quality;
  let dataUrl = finalCanvas.toDataURL(mimeType, outQuality);
  while (dataUrl.length > UPLOAD_MAX_DATA_URL_CHARS && outQuality > 0.45) {
    outQuality -= 0.08;
    dataUrl = finalCanvas.toDataURL(mimeType, outQuality);
  }

  return dataUrl;
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

  if (normalizedRotation === 0) {
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

    ctx.drawImage(
      rotCanvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
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

/** Keep base64 JSON under typical serverless body limits (~4.5MB). */
const UPLOAD_MAX_DATA_URL_CHARS = 3_800_000;

/**
 * Decode + JPEG-compress a phone photo for `/api/media/specialist-application`.
 * Large HEIC/JPEG camera files often fail silently when posted raw as data URLs.
 */
export async function prepareImageDataUrlForUpload(
  file: File,
  kind: keyof typeof UPLOAD_MAX_EDGE = "gallery"
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await createImage(objectUrl);
    const maxEdge = UPLOAD_MAX_EDGE[kind];
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height, 1));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, width, height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > UPLOAD_MAX_DATA_URL_CHARS && quality > 0.45) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    if (dataUrl.length > UPLOAD_MAX_DATA_URL_CHARS) {
      throw new Error("Photo is still too large. Try a smaller image.");
    }
    return dataUrl;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Photo is still")) {
      throw error;
    }
    throw new Error("Could not read this photo. Use JPEG or PNG.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export { AVATAR_OUTPUT_SIZE };
