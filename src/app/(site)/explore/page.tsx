import { Suspense } from "react";
import type { Metadata } from "next";
import { ExplorePageClient } from "@/components/explore/ExplorePageClient";
import { ExploreRouteLoading } from "@/components/explore/ExploreRouteLoading";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";

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

/** Search results render from the approved catalog on the server. */
async function ExploreCatalog() {
  const { trainers, mode } = await loadPublicCatalogForServer();
  return (
    <ExplorePageClient initialCatalog={trainers} catalogMode={mode} />
  );
}

/**
 * Suspense covers the catalog read and useSearchParams. Results are in the
 * server payload, so Search does not wait on a second browser fetch.
 */
export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreRouteLoading />}>
      <ExploreCatalog />
    </Suspense>
  );
}
