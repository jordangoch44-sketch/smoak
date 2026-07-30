import { RankingsPageClient } from "@/components/rankings";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";
import {
  loadSmoacReviewAggregatesForServer,
} from "@/lib/reviews/load-review-aggregates-server";
import { serializeReviewAggregates } from "@/lib/reviews/specialist-review-types";

export const metadata = {
  title: "City Rankings",
  description:
    "SMOAC city rankings based on verified client reviews — rating and review count.",
};

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const { trainers, mode } = await loadPublicCatalogForServer();
  const aggregates = await loadSmoacReviewAggregatesForServer(
    trainers.map((t) => t.id)
  );

  return (
    <RankingsPageClient
      initialCatalog={trainers}
      catalogMode={mode}
      initialAggregates={serializeReviewAggregates(aggregates)}
    />
  );
}
