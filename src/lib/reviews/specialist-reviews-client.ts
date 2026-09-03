"use client";

/**
 * Live SMOAC client reviews — Supabase `specialist_reviews` via `/api/reviews/submit`.
 *
 * Powers: `SmoacReviewsSection`, `WriteSpecialistReviewModal`, `useSpecialistReviews`.
 *
 * Data: published rows only; submit enforces client role, one review per specialist,
 * platform-wide cooldown (see migration RPC).
 *
 * Do **not** average or merge with `lib/trainer-reviews.ts` (catalog/demo ★) or
 * `lib/specialist-reputation.ts` (dashboard mock feed). Specialist IDs are text slugs.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  mapReviewRow,
  type SpecialistReview,
  type SpecialistReviewAggregate,
  type SpecialistReviewSort,
  type SubmitSpecialistReviewResult,
} from "@/lib/reviews/specialist-review-types";

type ReviewRow = {
  id: string;
  specialist_id: string;
  rating: number;
  review_text: string;
  author_display_name: string;
  created_at: string;
  status: string;
  client_user_id?: string;
};

export async function fetchPublishedSpecialistReviews(
  specialistId: string,
  options?: { limit?: number; offset?: number; sort?: SpecialistReviewSort }
): Promise<SpecialistReview[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || !specialistId) return [];

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const sort = options?.sort ?? "newest";

  let query = supabase
    .from("specialist_reviews")
    .select(
      "id, specialist_id, rating, review_text, author_display_name, created_at, status"
    )
    .eq("specialist_id", specialistId)
    .eq("status", "published");

  if (sort === "highest") {
    query = query
      .order("rating", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (sort === "lowest") {
    query = query
      .order("rating", { ascending: true })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error || !data) return [];
  return (data as ReviewRow[]).map(mapReviewRow);
}

export async function fetchSpecialistReviewAggregate(
  specialistId: string
): Promise<SpecialistReviewAggregate | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || !specialistId) return null;

  const { data, error } = await supabase
    .from("specialist_review_aggregates")
    .select("specialist_id, review_count, avg_rating")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error || !data) {
    return { specialistId, reviewCount: 0, avgRating: null };
  }

  return {
    specialistId: data.specialist_id as string,
    reviewCount: Number(data.review_count) || 0,
    avgRating:
      data.avg_rating == null ? null : Number(data.avg_rating),
  };
}

export async function fetchClientReviewForSpecialist(
  specialistId: string,
  clientUserId: string
): Promise<SpecialistReview | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || !specialistId || !clientUserId) return null;

  const { data, error } = await supabase
    .from("specialist_reviews")
    .select(
      "id, specialist_id, rating, review_text, author_display_name, created_at, status, client_user_id"
    )
    .eq("specialist_id", specialistId)
    .eq("client_user_id", clientUserId)
    .maybeSingle();

  if (error || !data) return null;
  return mapReviewRow(data as ReviewRow);
}

export async function fetchSpecialistReviewAggregates(
  specialistIds: string[]
): Promise<Map<string, SpecialistReviewAggregate>> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return new Map();
  const { fetchSmoacReviewAggregates } = await import(
    "@/lib/reviews/specialist-review-aggregates-query"
  );
  return fetchSmoacReviewAggregates(supabase, specialistIds);
}

export async function submitSpecialistReview(input: {
  specialistId: string;
  specialistName?: string;
  rating: number;
  reviewText: string;
}): Promise<SubmitSpecialistReviewResult> {
  try {
    const response = await fetch("/api/reviews/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        specialistId: input.specialistId,
        specialistName: input.specialistName,
        rating: input.rating,
        reviewText: input.reviewText,
      }),
    });

    const payload = (await response.json()) as SubmitSpecialistReviewResult & {
      nextEligibleAt?: string;
    };

    if (payload.ok) {
      return payload;
    }

    if (payload.error) {
      return {
        ok: false,
        error: payload.error,
        nextEligibleAt: payload.nextEligibleAt,
      };
    }

    if (response.status === 401) {
      return { ok: false, error: "not_authenticated" };
    }
    if (response.status === 503) {
      return { ok: false, error: "unavailable" };
    }

    return { ok: false, error: "network" };
  } catch {
    return { ok: false, error: "network" };
  }
}
