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
  title: "Search",
};

/** Soft aurora placeholder — avoids hard black cut while the client chunk loads */
function ExploreFallback() {
  return (
    <div className="explore-page explore-page--loading" aria-busy="true">
      <div className="explore-page__content">
        <div className="explore-loading">
          <div className="explore-loading__bar explore-loading__bar--title" />
          <div className="explore-loading__bar explore-loading__bar--search" />
          <div className="explore-loading__cards">
            <div className="explore-loading__card" />
            <div className="explore-loading__card" />
            <div className="explore-loading__card" />
          </div>
        </div>
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
