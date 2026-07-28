import {
  Hero,
  LocationPersonalizationGate,
  SponsoredSpecialists,
  Top50InYourCity,
  NewSpecialists,
} from "@/components/home";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";

/** Live catalog must not be frozen at build time. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { trainers, mode } = await loadPublicCatalogForServer();

  return (
    <div className="home-page home-page--discovery">
      <div className="home-page__sky" aria-hidden />
      <LocationPersonalizationGate />
      <Hero />
      <SponsoredSpecialists initialCatalog={trainers} catalogMode={mode} />
      <Top50InYourCity catalogMode={mode} initialCatalog={trainers} />
      <NewSpecialists initialCatalog={trainers} catalogMode={mode} />
    </div>
  );
}
