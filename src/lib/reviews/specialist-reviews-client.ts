"use client";

/**
 * Live SMOAC client reviews — Supabase `specialist_reviews` + `submit_specialist_review` RPC.
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
  options?: { limit?: number; offset?: number }
): Promise<SpecialistReview[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || !specialistId) return [];

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const { data, error } = await supabase
    .from("specialist_reviews")
    .select(
      "id, specialist_id, rating, review_text, author_display_name, created_at, status"
    )
    .eq("specialist_id", specialistId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

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
  const map = new Map<string, SpecialistReviewAggregate>();
  const supabase = createSupabaseBrowserClient();
  const ids = [...new Set(specialistIds.filter(Boolean))];
  if (!supabase || ids.length === 0) return map;

  const { data, error } = await supabase
    .from("specialist_review_aggregates")
    .select("specialist_id, review_count, avg_rating")
    .in("specialist_id", ids);

  if (error || !data) return map;

  for (const row of data) {
    map.set(row.specialist_id as string, {
      specialistId: row.specialist_id as string,
      reviewCount: Number(row.review_count) || 0,
      avgRating:
        row.avg_rating == null ? null : Number(row.avg_rating),
    });
  }
  return map;
}

export async function submitSpecialistReview(input: {
  specialistId: string;
  rating: number;
  reviewText: string;
}): Promise<SubmitSpecialistReviewResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, error: "network" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "not_authenticated" };
  }

  const { data, error } = await supabase.rpc("submit_specialist_review", {
    p_specialist_id: input.specialistId,
    p_rating: input.rating,
    p_review_text: input.reviewText,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[submit_specialist_review]", error.code, error.message);
    }
    // Table / RPC missing from schema cache (migration not applied)
    if (
      error.code === "PGRST202" ||
      error.code === "PGRST205" ||
      /schema cache|could not find/i.test(error.message)
    ) {
      return { ok: false, error: "unavailable" };
    }
    return { ok: false, error: "network" };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    next_eligible_at?: string;
    review?: {
      id: string;
      specialist_id: string;
      rating: number;
      review_text: string;
      author_display_name: string;
      created_at: string;
      status: string;
    };
  } | null;

  if (!payload?.ok) {
    const knownErrors = new Set([
      "not_authenticated",
      "not_client",
      "specialist_not_found",
      "self_review",
      "already_reviewed",
      "cooldown",
      "invalid_rating",
      "invalid_text",
    ]);
    const raw = payload?.error ?? "unknown";
    const error = knownErrors.has(raw)
      ? (raw as Exclude<
          SubmitSpecialistReviewResult,
          { ok: true }
        >["error"])
      : "unknown";
    return {
      ok: false,
      error,
      nextEligibleAt: payload?.next_eligible_at,
    };
  }

  if (!payload.review) {
    return { ok: false, error: "unknown" };
  }

  return { ok: true, review: mapReviewRow(payload.review) };
}
