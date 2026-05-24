import { Suspense } from "react";
import { ExplorePageClient } from "@/components/explore";

export const metadata = {
  title: "Explore Specialists",
};

function ExploreFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
      <div className="h-8 w-48 animate-pulse rounded bg-graphite-800" />
      <div className="mt-6 flex flex-col gap-2 md:mt-8 md:grid md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-[132px] animate-pulse rounded-2xl bg-graphite-800 md:aspect-[3/4] md:h-auto"
          />
        ))}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreFallback />}>
      <ExplorePageClient />
    </Suspense>
  );
}
