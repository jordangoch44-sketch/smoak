import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api-auth";
import { uploadHomeEssenceImage } from "@/lib/home-essence-config-store";

const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function normalizeMime(mime: string): string {
  const lower = mime.toLowerCase().trim();
  if (lower === "image/jpg" || lower === "image/pjpeg") return "image/jpeg";
  return lower;
}

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

/** Upload one homepage essence image (admin). Body: { dataUrl }. */
export async function POST(request: Request) {
  if (!(await requireAdminApiAccess())) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  let body: { dataUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  const match = dataUrl.match(
    /^data:([a-z]+\/[a-z0-9+.-]+);base64,([\s\S]+)$/i
  );
  if (!match) {
    return NextResponse.json(
      { ok: false, message: "Expected a base64 data URL." },
      { status: 400 }
    );
  }

  const mime = normalizeMime(match[1]);
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { ok: false, message: `Unsupported file type: ${mime}` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "File must be between 1 byte and 8MB." },
      { status: 400 }
    );
  }

  const uploaded = await uploadHomeEssenceImage({
    buffer,
    mime,
    extension: extensionForMime(mime),
  });

  if (!uploaded.ok) {
    return NextResponse.json(
      { ok: false, message: uploaded.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, publicUrl: uploaded.publicUrl });
}
