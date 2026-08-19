import { Suspense } from "react";
import type { Metadata } from "next";
import { ExplorePageClient } from "@/components/explore/ExplorePageClient";
import { ExploreRouteLoading } from "@/components/explore/ExploreRouteLoading";

export const metadata: Metadata = {
  title: "Search specialists near you",
  description:
    "Search personal trainers, coaches, and wellness professionals by location, specialty, and price. Map and filter specialists on SMOAC.",
  openGraph: {
    title: "Search specialists near you",
    description:
      "Search personal trainers, coaches, and wellness professionals by location, specialty, and price.",
  },
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
