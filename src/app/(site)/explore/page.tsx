import dynamic from "next/dynamic";
import { Suspense } from "react";

const ExplorePageClient = dynamic(
  () =>
    import("@/components/explore/ExplorePageClient").then(
      (mod) => mod.ExplorePageClient
    ),
  { ssr: true }
);

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
