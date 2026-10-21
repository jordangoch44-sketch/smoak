import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  apnsConfigured,
  sendApnsAlerts,
  type ApnsEnvironment,
} from "@/lib/push/apns";

export interface UserPushInput {
  userId: string;
  title: string;
  body: string;
  /** Site path opened when the notification is tapped. */
  path: string;
  collapseId?: string;
}

function clip(value: string, max: number): string {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

function safePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

/**
 * Deliver an alert to the user's registered iPhones.
 * Missing credentials or a failed send never throws.
 */
export async function sendUserPush(input: UserPushInput): Promise<void> {
  try {
    await deliverUserPush(input);
  } catch (error) {
    console.warn("[SMOAC PUSH] delivery failed", error);
  }
}

async function deliverUserPush(input: UserPushInput): Promise<void> {
  const userId = input.userId.trim();
  const path = safePath(input.path);
  const title = clip(input.title, 80);
  const body = clip(input.body, 180);
  if (!userId || !path || !title || !body) return;
  if (!apnsConfigured()) return;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const { data, error } = await supabase
    .from("device_push_tokens")
    .select("token, environment")
    .eq("user_id", userId)
    .eq("platform", "ios");

  if (error || !data?.length) {
    if (error) console.warn("[SMOAC PUSH] token lookup failed", error.message);
    return;
  }

  const grouped = new Map<ApnsEnvironment, string[]>();
  for (const row of data) {
    const environment = row.environment === "sandbox" ? "sandbox" : "production";
    const token = typeof row.token === "string" ? row.token.trim() : "";
    if (!token) continue;
    const list = grouped.get(environment) ?? [];
    list.push(token);
    grouped.set(environment, list);
  }

  const drop: string[] = [];
  for (const [environment, tokens] of grouped) {
    try {
      const results = await sendApnsAlerts(environment, tokens, {
        title,
        body,
        path,
        collapseId: input.collapseId,
      });
      results.forEach((result, index) => {
        if (result.dropToken) drop.push(tokens[index] ?? "");
        else if (!result.ok) {
          console.warn("[SMOAC PUSH] delivery failed", result.status, result.reason);
        }
      });
    } catch (sendError) {
      console.warn("[SMOAC PUSH] delivery failed", sendError);
    }
  }

  const stale = drop.filter(Boolean);
  if (stale.length === 0) return;
  const { error: deleteError } = await supabase
    .from("device_push_tokens")
    .delete()
    .in("token", stale);
  if (deleteError) {
    console.warn("[SMOAC PUSH] stale token cleanup failed", deleteError.message);
  }
}
