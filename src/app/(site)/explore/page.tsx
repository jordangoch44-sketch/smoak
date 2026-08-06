import { ExplorePageClient } from "@/components/explore/ExplorePageClient";

export const metadata = {
  title: "Search",
};

/**
 * Sync shell — no server catalog await. Explore reads the session catalog
 * store (same as Marketplace) so Search tab soft-nav stays snappy.
 */
export default function ExplorePage() {
  return <ExplorePageClient />;
}
