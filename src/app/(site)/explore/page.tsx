import { Suspense } from "react";
import { ExplorePageClient } from "@/components/explore";

export const metadata = {
  title: "Explore Specialists",
};

/** Route transition overlay covers mobile nav loads; avoid skeleton flash */
function ExploreFallback() {
  return null;
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreFallback />}>
      <ExplorePageClient />
    </Suspense>
  );
}
