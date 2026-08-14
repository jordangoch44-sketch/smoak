import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";
import { SPECIALIST_MEDIA_BUCKET } from "@/lib/supabase/constants";

/**
 * Uploads one specialist-application media file (sent as a base64 data URL)
 * to the specialist-media bucket and returns its public URL.
 *
 * Server-side with the service role because the live project does not have
 * storage.objects RLS policies for authenticated client uploads. Requires a
 * signed-in user (cookie session) — admins approving applications and
 * specialists submitting onboarding are both authenticated.
 */

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function normalizeUploadMime(mime: string): string {
  const lower = mime.toLowerCase().trim();
  if (lower === "image/jpg" || lower === "image/pjpeg") return "image/jpeg";
  return lower;
}

/* `{specialistId}/{profile|cover|gallery}/...` — safe segments only */
const SAFE_PATH =
  /^[a-z0-9][a-z0-9_-]{0,127}\/(profile|cover|gallery)(\/[a-z0-9][a-z0-9._-]{0,127}){1,3}$/i;

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("pdf")) return "pdf";
  return "jpg";
}

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

  let body: { path?: unknown; dataUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const path = typeof body.path === "string" ? body.path.trim() : "";
  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  if (!SAFE_PATH.test(path)) {
    return NextResponse.json(
      { ok: false, message: "Invalid media path." },
      { status: 400 }
    );
  }

  const match = dataUrl.match(/^data:([a-z]+\/[a-z0-9+.-]+);base64,([\s\S]+)$/i);
  if (!match) {
    return NextResponse.json(
      { ok: false, message: "Expected a base64 data URL." },
      { status: 400 }
    );
  }
  const mime = normalizeUploadMime(match[1]);
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { ok: false, message: `Unsupported file type: ${mime}` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, message: "File must be between 1 byte and 8MB." },
      { status: 400 }
    );
  }

  const service = createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const fullPath = `${path}.${extensionForMime(mime)}`;
  const { error } = await service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .upload(fullPath, buffer, {
      contentType: mime,
      upsert: true,
      /* Short cache — profile avatars are re-uploaded often; long CDN cache
       * made replaced files look "stuck" when the public URL stayed the same. */
      cacheControl: "60",
    });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 }
    );
  }

  const { data } = service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .getPublicUrl(fullPath);

  return NextResponse.json({ ok: true, publicUrl: data.publicUrl });
}
