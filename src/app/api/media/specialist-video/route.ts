import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";
import { SPECIALIST_MEDIA_BUCKET } from "@/lib/supabase/constants";

/**
 * Issues a short-lived signed upload URL for a PRO+ profile video.
 * The file is PUT from the browser so a 45s iPhone clip is not sent through
 * the Next.js function body (too large for a data URL).
 */

const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

function normalizeUploadMime(mime: string): string {
  const lower = mime.toLowerCase().trim();
  if (lower === "video/x-quicktime") return "video/quicktime";
  return lower;
}

function extensionForVideoMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("x-m4v")) return "mov";
  return "mp4";
}

/* `{specialistId}/gallery/...` — same safe segments as photo uploads */
const SAFE_PATH =
  /^[a-z0-9][a-z0-9_-]{0,127}\/gallery(\/[a-z0-9][a-z0-9._-]{0,127}){1,3}$/i;

export async function POST(request: Request) {
  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in to upload media." },
      { status: 401 }
    );
  }

  let body: { path?: unknown; contentType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const path = typeof body.path === "string" ? body.path.trim() : "";
  const mime = normalizeUploadMime(
    typeof body.contentType === "string" ? body.contentType : ""
  );
  if (!SAFE_PATH.test(path)) {
    return NextResponse.json(
      { ok: false, message: "Invalid media path." },
      { status: 400 }
    );
  }
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { ok: false, message: `Unsupported file type: ${mime || "unknown"}` },
      { status: 400 }
    );
  }

  const fullPath = `${path}.${extensionForVideoMime(mime)}`;
  const service = createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .createSignedUploadUrl(fullPath, { upsert: true });

  if (error || !data?.signedUrl || !data.token) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? "Could not start video upload." },
      { status: 502 }
    );
  }

  const { data: publicData } = service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .getPublicUrl(fullPath);

  return NextResponse.json({
    ok: true,
    path: fullPath,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicData.publicUrl,
  });
}
