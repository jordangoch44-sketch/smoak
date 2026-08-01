import {
  Hero,
  LocationPersonalizationGate,
  SponsoredSpecialists,
  FeaturedSpotlightSpecialists,
  Top50InYourCity,
  Categories,
  NewSpecialists,
} from "@/components/home";
import { SitePromoSlot } from "@/components/promo/SitePromoSlot";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";
import {
  loadSmoacReviewAggregatesForServer,
} from "@/lib/reviews/load-review-aggregates-server";
import { serializeReviewAggregates } from "@/lib/reviews/specialist-review-types";

/** Live catalog must not be frozen at build time. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { trainers, mode } = await loadPublicCatalogForServer();
  const aggregates = await loadSmoacReviewAggregatesForServer(
    trainers.map((t) => t.id)
  );

  return (
    <div className="home-page home-page--discovery">
      <div className="home-page__sky" aria-hidden />
      <LocationPersonalizationGate />
      <Hero />
      <SponsoredSpecialists initialCatalog={trainers} catalogMode={mode} />
      <FeaturedSpotlightSpecialists
        initialCatalog={trainers}
        catalogMode={mode}
      />
      <Top50InYourCity
        catalogMode={mode}
        initialCatalog={trainers}
        initialAggregates={serializeReviewAggregates(aggregates)}
      />
      <div className="home-section__inner home-promo-stack mx-auto max-w-7xl px-4 sm:px-6">
        <SitePromoSlot slotId="home_mid_promo" variant="banner" />
        <SitePromoSlot slotId="home_client_promo" variant="banner" />
      </div>
      <Categories />
      <NewSpecialists initialCatalog={trainers} catalogMode={mode} />
    </div>
  );
}
