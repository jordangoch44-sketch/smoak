import { Suspense } from "react";
import { ExplorePageClient } from "@/components/explore/ExplorePageClient";
import { ExploreRouteLoading } from "@/components/explore/ExploreRouteLoading";

export const metadata = {
  title: "Search",
};

/**
 * Sync shell — no server catalog await. Explore reads the session catalog
 * store (same as Marketplace) so Search tab soft-nav stays snappy.
 * Suspense wraps useSearchParams client tree to avoid nav render errors.
 */
export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreRouteLoading />}>
      <ExplorePageClient />
    </Suspense>
  );
}
