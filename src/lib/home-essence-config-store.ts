import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";
import { SPECIALIST_MEDIA_BUCKET } from "@/lib/supabase/constants";
import {
  getDefaultHomeEssenceConfig,
  HOME_ESSENCE_CONFIG_STORAGE_PATH,
  normalizeHomeEssenceConfig,
  type HomeEssenceConfig,
} from "@/lib/home-essence-slides";

function createServiceClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Read live essence config from storage; falls back to built-in defaults. */
export async function readHomeEssenceConfig(): Promise<HomeEssenceConfig> {
  const service = createServiceClient();
  if (!service) return getDefaultHomeEssenceConfig();

  const { data, error } = await service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .download(HOME_ESSENCE_CONFIG_STORAGE_PATH);

  if (error || !data) {
    return getDefaultHomeEssenceConfig();
  }

  try {
    const text = await data.text();
    return normalizeHomeEssenceConfig(JSON.parse(text) as unknown);
  } catch {
    return getDefaultHomeEssenceConfig();
  }
}

/** Persist essence config JSON (admin only — call after auth checks). */
export async function writeHomeEssenceConfig(
  config: HomeEssenceConfig
): Promise<{ ok: true } | { ok: false; message: string }> {
  const service = createServiceClient();
  if (!service) {
    return { ok: false, message: "Supabase is not configured on the server." };
  }

  const normalized = normalizeHomeEssenceConfig(config);
  const body = JSON.stringify(normalized, null, 2);
  const { error } = await service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .upload(HOME_ESSENCE_CONFIG_STORAGE_PATH, body, {
      contentType: "application/json",
      upsert: true,
      cacheControl: "30",
    });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function uploadHomeEssenceImage(params: {
  buffer: Buffer;
  mime: string;
  extension: string;
}): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const service = createServiceClient();
  const config = getSupabasePublicConfig();
  if (!service || !config) {
    return { ok: false, message: "Supabase is not configured on the server." };
  }

  const stamp = Date.now().toString(36);
  const path = `site/homepage-essence/slide-${stamp}.${params.extension}`;
  const { error } = await service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .upload(path, params.buffer, {
      contentType: params.mime,
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    return { ok: false, message: error.message };
  }

  const { data } = service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .getPublicUrl(path);

  const publicUrl = data.publicUrl.includes("?")
    ? `${data.publicUrl}&v=${stamp}`
    : `${data.publicUrl}?v=${stamp}`;

  return { ok: true, publicUrl };
}
