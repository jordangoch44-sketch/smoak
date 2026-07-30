/**
 * SMOAC review aggregate queries — shared by browser + server (no "use client").
 * Source: `specialist_review_aggregates` view (published SMOAC reviews only).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";

type AggregateRow = {
  specialist_id: string;
  review_count: number | null;
  avg_rating: number | null;
};

function mapRow(row: AggregateRow): SpecialistReviewAggregate {
  return {
    specialistId: row.specialist_id,
    reviewCount: Number(row.review_count) || 0,
    avgRating: row.avg_rating == null ? null : Number(row.avg_rating),
  };
}

/** Batch-fetch SMOAC review aggregates for ranking / Top Rated. */
export async function fetchSmoacReviewAggregates(
  supabase: SupabaseClient,
  specialistIds: string[]
): Promise<Map<string, SpecialistReviewAggregate>> {
  const map = new Map<string, SpecialistReviewAggregate>();
  const ids = [...new Set(specialistIds.filter(Boolean))];
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("specialist_review_aggregates")
    .select("specialist_id, review_count, avg_rating")
    .in("specialist_id", ids);

  if (error || !data) return map;

  for (const row of data as AggregateRow[]) {
    map.set(row.specialist_id, mapRow(row));
  }
  return map;
}
