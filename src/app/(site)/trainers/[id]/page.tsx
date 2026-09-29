import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrainerProfilePageClient } from "@/components/profile/TrainerProfilePageClient";
import {
  loadPublicCatalogForServer,
  loadPublicTrainerByIdForServer,
} from "@/lib/profiles/fetch-approved-catalog-server";
import { loadSmoacReviewAggregatesForServer } from "@/lib/reviews/load-review-aggregates-server";
import { serializeReviewAggregates } from "@/lib/reviews/specialist-review-types";
import { getLiveTrainerCityRanking } from "@/lib/smoac-rankings";
import { buildTrainerPageMetadata } from "@/lib/seo/trainer-metadata";
import { buildTrainerProfileJsonLd } from "@/lib/seo/trainer-json-ld";
import {
  decodePublicTrainerKey,
  preferCanonicalTrainerSlug,
  publicTrainerSlug,
  trainerProfilePath,
} from "@/lib/trainer-profile-path";
import { trainers } from "@/data/trainers";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** New approvals must resolve without a rebuild. */
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  const { trainers: catalog, mode } = await loadPublicCatalogForServer();
  const list = mode === "live" ? catalog : trainers;
  return list.map((t) => ({ id: t.slug?.trim() || t.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [{ trainers: catalog }, trainer] = await Promise.all([
    loadPublicCatalogForServer(),
    loadPublicTrainerByIdForServer(id),
  ]);
  if (!trainer) return { title: "Specialist Not Found" };
  return buildTrainerPageMetadata(preferCanonicalTrainerSlug(trainer, catalog));
}

export default async function TrainerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [{ trainers: catalog }, trainer] = await Promise.all([
    loadPublicCatalogForServer(),
    loadPublicTrainerByIdForServer(id),
  ]);
  if (!trainer) notFound();

  const published = preferCanonicalTrainerSlug(trainer, catalog);
  const requested = decodePublicTrainerKey(id);
  const canonicalKey = publicTrainerSlug(published);
  if (requested.toLowerCase() !== canonicalKey.toLowerCase()) {
    permanentRedirect(trainerProfilePath(published));
  }

  const city = published.city.trim().toLowerCase();
  const cityPeers =
    city.length > 0
      ? catalog.filter((t) => t.city.trim().toLowerCase() === city)
      : [published];
  const peerIds =
    cityPeers.length > 0 ? cityPeers.map((t) => t.id) : [published.id];
  const aggregates = await loadSmoacReviewAggregatesForServer(peerIds);
  const initialCityRanking = getLiveTrainerCityRanking(
    published,
    cityPeers.length > 0 ? cityPeers : [published],
    aggregates
  );

  return (
    <>
      <JsonLd data={buildTrainerProfileJsonLd(published)} />
      <TrainerProfilePageClient
        trainerId={published.id}
        initialTrainer={published}
        initialCatalog={cityPeers.length > 0 ? cityPeers : [published]}
        initialAggregates={serializeReviewAggregates(aggregates)}
        initialCityRanking={initialCityRanking}
      />
    </>
  );
}
