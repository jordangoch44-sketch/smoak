import { Suspense } from "react";
import { ExplorePageClient } from "@/components/explore/ExplorePageClient";

export const metadata = {
  title: "Explore Trainers",
};

function ExploreFallback() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-32">
      <div className="h-8 w-48 animate-pulse rounded bg-graphite-800" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-graphite-800"
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
