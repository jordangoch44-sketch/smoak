import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { DEV_HIDDEN_SPECIALISTS_KEY } from "@/lib/dev-storage-keys";

export function loadHiddenTrainerIds(): string[] {
  if (typeof window === "undefined") return [];
  /* Live: durable hide is specialist_profiles.status — do not seed from localStorage */
  if (isMarketplaceSupabaseActive()) return [];

  try {
    const raw = window.localStorage.getItem(DEV_HIDDEN_SPECIALISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function persistHiddenTrainerIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  /* Live: memory-only mirror after remote sync */
  if (isMarketplaceSupabaseActive()) return;

  try {
    window.localStorage.setItem(
      DEV_HIDDEN_SPECIALISTS_KEY,
      JSON.stringify(ids)
    );
  } catch {
    /* ignore */
  }
}
