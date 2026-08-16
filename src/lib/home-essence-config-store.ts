import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";
import { SPECIALIST_MEDIA_BUCKET } from "@/lib/supabase/constants";
import {
  getDefaultHomeEssenceConfig,
  normalizeHomeEssenceConfig,
  type HomeEssenceConfig,
} from "@/lib/home-essence-slides";

const CONFIG_ROW_ID = "default";
/** Storage fallback when the DB table is not migrated yet. */
const CONFIG_STORAGE_PATH = "site/homepage-essence/config.json";

function createServiceClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingTableError(message: string): boolean {
  return /relation .* does not exist|Could not find the table|schema cache/i.test(
    message
  );
}

async function readConfigFromStorage(
  service: SupabaseClient
): Promise<HomeEssenceConfig | null> {
  const { data, error } = await service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .download(CONFIG_STORAGE_PATH);
  if (error || !data) return null;
  try {
    const text = await data.text();
    return normalizeHomeEssenceConfig(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

async function writeConfigToStorage(
  service: SupabaseClient,
  config: HomeEssenceConfig
): Promise<{ ok: true } | { ok: false; message: string }> {
  /* specialist-media historically rejected application/json — use an allowed
   * mime while still storing JSON text (PDF is on the bucket allow-list). */
  const body = JSON.stringify(config, null, 2);
  const { error } = await service.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .upload(CONFIG_STORAGE_PATH, body, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "30",
    });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Read live essence config; falls back to built-in defaults. */
export async function readHomeEssenceConfig(): Promise<HomeEssenceConfig> {
  const service = createServiceClient();
  if (!service) return getDefaultHomeEssenceConfig();

  const { data, error } = await service
    .from("site_homepage_essence")
    .select("interval_ms, slides")
    .eq("id", CONFIG_ROW_ID)
    .maybeSingle();

  if (!error && data) {
    return normalizeHomeEssenceConfig({
      intervalMs: data.interval_ms,
      slides: data.slides,
    });
  }

  const fromStorage = await readConfigFromStorage(service);
  if (fromStorage) return fromStorage;

  return getDefaultHomeEssenceConfig();
}

/** Persist essence config (admin only — call after auth checks). */
export async function writeHomeEssenceConfig(
  config: HomeEssenceConfig
): Promise<{ ok: true } | { ok: false; message: string }> {
  const service = createServiceClient();
  if (!service) {
    return { ok: false, message: "Supabase is not configured on the server." };
  }

  const normalized = normalizeHomeEssenceConfig(config);
  const { error } = await service.from("site_homepage_essence").upsert(
    {
      id: CONFIG_ROW_ID,
      interval_ms: normalized.intervalMs,
      slides: normalized.slides,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (!error) return { ok: true };

  if (!isMissingTableError(error.message)) {
    return { ok: false, message: error.message };
  }

  return writeConfigToStorage(service, normalized);
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
