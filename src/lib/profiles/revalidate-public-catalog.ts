import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Bust the SSR marketplace catalog so Explore, Home, and public profiles
 * pick up membership / placement changes without waiting for the 45s cache.
 */
export function revalidatePublicMarketplaceCatalog(): void {
  revalidateTag("public-catalog", { expire: 0 });
  revalidatePath("/explore");
  revalidatePath("/");
  revalidatePath("/rankings");
  revalidatePath("/trainers", "layout");
}
