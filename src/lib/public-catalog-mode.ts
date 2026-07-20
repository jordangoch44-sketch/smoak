/**
 * Public marketplace catalog mode (client + SSR handoff).
 *
 * - `live`: Supabase is configured — approved `specialist_profiles` only.
 * - `seed`: Supabase not configured — local demo seed trainers only.
 * - `unknown`: not yet primed (treat as seed only when Supabase inactive).
 */

export type PublicCatalogMode = "live" | "seed" | "unknown";

let catalogMode: PublicCatalogMode = "unknown";

export function getPublicCatalogMode(): PublicCatalogMode {
  return catalogMode;
}

export function setPublicCatalogMode(mode: PublicCatalogMode): void {
  catalogMode = mode;
}

/** True when the marketplace must not use seed trainers. */
export function isLivePublicCatalogMode(
  mode: PublicCatalogMode = catalogMode
): boolean {
  return mode === "live";
}
