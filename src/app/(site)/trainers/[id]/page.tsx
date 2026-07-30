import { notFound } from "next/navigation";
import { TrainerProfilePageClient } from "@/components/profile/TrainerProfilePageClient";
import {
  loadPublicCatalogForServer,
  loadPublicTrainerByIdForServer,
} from "@/lib/profiles/fetch-approved-catalog-server";
import { loadSmoacReviewAggregatesForServer } from "@/lib/reviews/load-review-aggregates-server";
import { serializeReviewAggregates } from "@/lib/reviews/specialist-review-types";
import { getLiveTrainerCityRanking } from "@/lib/smoac-rankings";
import { trainers } from "@/data/trainers";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** New approvals must resolve without a rebuild. */
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  const { trainers: catalog, mode } = await loadPublicCatalogForServer();
  if (mode === "live") {
    return catalog.map((t) => ({ id: t.id }));
  }
  return trainers.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const trainer = await loadPublicTrainerByIdForServer(id);
  if (!trainer) return { title: "Specialist Not Found" };
  return {
    title: trainer.name,
    description: trainer.bio,
  };
}

export default async function TrainerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [{ trainers: catalog }, trainer] = await Promise.all([
    loadPublicCatalogForServer(),
    loadPublicTrainerByIdForServer(id),
  ]);
  if (!trainer) notFound();

  const city = trainer.city.trim().toLowerCase();
  const cityPeers =
    city.length > 0
      ? catalog.filter((t) => t.city.trim().toLowerCase() === city)
      : [trainer];
  const peerIds =
    cityPeers.length > 0 ? cityPeers.map((t) => t.id) : [trainer.id];
  const aggregates = await loadSmoacReviewAggregatesForServer(peerIds);
  const initialCityRanking = getLiveTrainerCityRanking(
    trainer,
    cityPeers.length > 0 ? cityPeers : [trainer],
    aggregates
  );

  return (
    <TrainerProfilePageClient
      trainerId={id}
      initialTrainer={trainer}
      initialCatalog={cityPeers.length > 0 ? cityPeers : [trainer]}
      initialAggregates={serializeReviewAggregates(aggregates)}
      initialCityRanking={initialCityRanking}
    />
  );
}
