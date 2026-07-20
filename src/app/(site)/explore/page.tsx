import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";

/** Live catalog must not be frozen at build time. */
export const dynamic = "force-dynamic";

const ExplorePageClient = nextDynamic(
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

export default async function ExplorePage() {
  const { trainers, mode } = await loadPublicCatalogForServer();

  return (
    <Suspense fallback={<ExploreFallback />}>
      <ExplorePageClient
        initialCatalog={trainers}
        catalogMode={mode}
      />
    </Suspense>
  );
}
