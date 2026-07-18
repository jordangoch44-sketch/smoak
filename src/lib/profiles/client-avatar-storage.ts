import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AVATARS_BUCKET,
  CLIENT_AVATAR_STORAGE_LIMITS,
} from "@/lib/supabase/constants";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type ClientAvatarPipelineStage =
  | "auth"
  | "canvas"
  | "storage_upload"
  | "storage_response"
  | "public_url"
  | "profile_update"
  | "session_refresh";

export class ClientAvatarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientAvatarValidationError";
  }
}

export class ClientAvatarPipelineError extends Error {
  readonly stage: ClientAvatarPipelineStage;
  readonly details: Record<string, unknown>;

  constructor(
    stage: ClientAvatarPipelineStage,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(`[${stage}] ${message}`);
    this.name = "ClientAvatarPipelineError";
    this.stage = stage;
    this.details = details;
  }
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function serializeUnknownError(error: unknown): Record<string, unknown> {
  if (error == null) return { value: null };
  if (typeof error === "string") return { message: error };
  if (error instanceof ClientAvatarPipelineError) {
    return {
      name: error.name,
      stage: error.stage,
      message: error.message,
      details: error.details,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: record.name,
      message: record.message,
      error: record.error,
      status: record.status,
      statusCode: record.statusCode,
      code: record.code,
      details: record.details,
      hint: record.hint,
      raw: safeJson(error),
    };
  }
  return { value: String(error) };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function logAvatarStage(
  stage: ClientAvatarPipelineStage,
  payload: Record<string, unknown>
): void {
  console.info(`[avatars:${stage}]`, payload);
}

/** Stable ownership path: clients/{user_id}/avatar.{ext} */
export function buildClientAvatarStoragePath(
  userId: string,
  mimeType: string
): string {
  const safeUser = userId.trim();
  if (!safeUser) {
    throw new ClientAvatarValidationError("User id is required");
  }
  return `clients/${safeUser}/avatar.${extensionForMime(mimeType)}`;
}

export function getAvatarPublicUrl(
  client: SupabaseClient,
  path: string
): string {
  const { data } = client.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Cache-bust once after upload/replace — do not randomize on every render. */
export function withAvatarCacheBust(
  publicUrl: string,
  version: number | string
): string {
  const base = publicUrl.split("?")[0] ?? publicUrl;
  return `${base}?v=${encodeURIComponent(String(version))}`;
}

/**
 * Development-first error text: always include stage + real backend message.
 * Never collapse Storage/DB failures into a generic sentence here.
 */
export function formatClientAvatarPipelineError(error: unknown): string {
  const serialized = serializeUnknownError(error);
  console.error("[avatars] pipeline failure", serialized);

  if (error instanceof ClientAvatarPipelineError) {
    const code =
      typeof error.details.code === "string"
        ? ` code=${error.details.code}`
        : typeof error.details.statusCode === "string" ||
            typeof error.details.statusCode === "number"
          ? ` statusCode=${error.details.statusCode}`
          : typeof error.details.status === "string" ||
              typeof error.details.status === "number"
            ? ` status=${error.details.status}`
            : "";
    return `${error.message}${code}`;
  }

  if (error instanceof ClientAvatarValidationError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const message =
    typeof serialized.message === "string" ? serialized.message : null;
  if (message) return message;

  return safeJson(serialized);
}

/** @deprecated Prefer formatClientAvatarPipelineError during diagnosis. */
export function mapClientAvatarUploadError(error: unknown): string {
  return formatClientAvatarPipelineError(error);
}

export function validateClientAvatarSourceFile(file: File): void {
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(mime) && mime !== "") {
    throw new ClientAvatarValidationError("Use a JPG, PNG, or WebP image.");
  }
  if (!mime && !/\.(jpe?g|png|webp)$/i.test(file.name || "")) {
    throw new ClientAvatarValidationError("Use a JPG, PNG, or WebP image.");
  }
  if (file.size > CLIENT_AVATAR_STORAGE_LIMITS.maxBytes) {
    throw new ClientAvatarValidationError("Photo must be 5 MB or smaller.");
  }
}

export async function uploadClientAvatar(
  client: SupabaseClient,
  userId: string,
  file: File
): Promise<{ path: string; publicUrl: string; version: number }> {
  const {
    data: { user: authUser },
    error: authError,
  } = await client.auth.getUser();

  const authUserId = authUser?.id?.trim() || "";
  logAvatarStage("auth", {
    passedUserId: userId,
    authUserId: authUserId || null,
    authError: authError?.message ?? null,
    idsMatch: Boolean(authUserId && authUserId === userId.trim()),
  });

  if (authError || !authUserId) {
    throw new ClientAvatarPipelineError(
      "auth",
      authError?.message || "Authenticated user id is null — cannot upload.",
      {
        passedUserId: userId,
        authUserId: authUserId || null,
        code: authError?.code,
        status: authError?.status,
      }
    );
  }

  if (authUserId !== userId.trim()) {
    throw new ClientAvatarPipelineError(
      "auth",
      `Session userId (${userId}) does not match auth.uid() (${authUserId}).`,
      { passedUserId: userId, authUserId }
    );
  }

  const mime = (file.type || "image/jpeg").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new ClientAvatarValidationError("Use a JPG, PNG, or WebP image.");
  }
  if (file.size > CLIENT_AVATAR_STORAGE_LIMITS.maxBytes) {
    throw new ClientAvatarValidationError("Photo must be 5 MB or smaller.");
  }

  const path = buildClientAvatarStoragePath(authUserId, mime);
  logAvatarStage("storage_upload", {
    bucket: AVATARS_BUCKET,
    path,
    authUserId,
    mime,
    fileSize: file.size,
    upsert: true,
  });

  const { data, error } = await client.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, {
      contentType: mime,
      upsert: true,
      cacheControl: "3600",
    });

  logAvatarStage("storage_response", {
    bucket: AVATARS_BUCKET,
    path,
    data,
    error: error
      ? {
          message: error.message,
          name: error.name,
          statusCode: (error as { statusCode?: string }).statusCode,
          status: (error as { status?: number }).status,
          error: (error as { error?: string }).error,
        }
      : null,
  });

  if (error) {
    throw new ClientAvatarPipelineError("storage_upload", error.message, {
      bucket: AVATARS_BUCKET,
      path,
      authUserId,
      statusCode: (error as { statusCode?: string }).statusCode,
      status: (error as { status?: number }).status,
      code: (error as { error?: string }).error,
      name: error.name,
    });
  }

  const publicUrl = getAvatarPublicUrl(client, path);
  logAvatarStage("public_url", {
    bucket: AVATARS_BUCKET,
    path,
    publicUrl,
  });

  if (!publicUrl.trim()) {
    throw new ClientAvatarPipelineError(
      "public_url",
      "Storage returned an empty public URL.",
      { bucket: AVATARS_BUCKET, path }
    );
  }

  const version = Date.now();
  return {
    path,
    publicUrl,
    version,
  };
}

export async function removeClientAvatarObject(
  client: SupabaseClient,
  path: string
): Promise<void> {
  const trimmed = path.trim();
  if (!trimmed) return;
  const { error } = await client.storage.from(AVATARS_BUCKET).remove([trimmed]);
  if (error) {
    console.error("[avatars] removeClientAvatarObject", serializeUnknownError(error));
    throw new ClientAvatarPipelineError("storage_upload", error.message, {
      bucket: AVATARS_BUCKET,
      path: trimmed,
      statusCode: (error as { statusCode?: string }).statusCode,
      status: (error as { status?: number }).status,
    });
  }
}

export { AVATARS_BUCKET };
