import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendSpecialistReviewNotificationEmail } from "@/lib/email/review-email-service";
import {
  resolveSpecialistNotifyEmail,
  resolveSpecialistUserId,
} from "@/lib/specialist-notify-email";
import { SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { getAuthSiteOrigin } from "@/lib/auth/site-origin";
import {
  mapReviewRow,
  type SubmitSpecialistReviewResult,
} from "@/lib/reviews/specialist-review-types";

export const runtime = "nodejs";

interface ReviewSubmitBody {
  specialistId?: string;
  specialistName?: string;
  rating?: number;
  reviewText?: string;
}

function revalidateMarketplaceAfterReview(): void {
  try {
    revalidateTag("public-catalog", { expire: 0 });
    revalidatePath("/explore");
    revalidatePath("/");
    revalidatePath("/rankings");
    revalidatePath("/trainers", "layout");
  } catch (error) {
    console.warn("[SMOAC reviews] cache revalidate failed", error);
  }
}

/**
 * Authenticated SMOAC review submit: RPC + specialist email + catalog revalidate.
 * Client must not call submit_specialist_review directly — keeps email + cache in sync.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "network" } satisfies SubmitSpecialistReviewResult,
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "not_authenticated" } satisfies SubmitSpecialistReviewResult,
      { status: 401 }
    );
  }

  let body: ReviewSubmitBody;
  try {
    body = (await request.json()) as ReviewSubmitBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_text" } satisfies SubmitSpecialistReviewResult,
      { status: 400 }
    );
  }

  const specialistId =
    typeof body.specialistId === "string" ? body.specialistId.trim() : "";
  const specialistName =
    typeof body.specialistName === "string" ? body.specialistName.trim() : "";
  const rating =
    typeof body.rating === "number" ? body.rating : Number(body.rating);
  const reviewText =
    typeof body.reviewText === "string" ? body.reviewText : "";

  if (!specialistId) {
    return NextResponse.json(
      {
        ok: false,
        error: "specialist_not_found",
      } satisfies SubmitSpecialistReviewResult,
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("submit_specialist_review", {
    p_specialist_id: specialistId,
    p_rating: rating,
    p_review_text: reviewText,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[submit_specialist_review]", error.code, error.message);
    }
    if (
      error.code === "PGRST202" ||
      error.code === "PGRST205" ||
      /schema cache|could not find/i.test(error.message)
    ) {
      return NextResponse.json(
        { ok: false, error: "unavailable" } satisfies SubmitSpecialistReviewResult,
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "network" } satisfies SubmitSpecialistReviewResult,
      { status: 502 }
    );
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
    const code = knownErrors.has(raw)
      ? (raw as Exclude<SubmitSpecialistReviewResult, { ok: true }>["error"])
      : "unknown";
    return NextResponse.json({
      ok: false,
      error: code,
      nextEligibleAt: payload?.next_eligible_at,
    } satisfies SubmitSpecialistReviewResult);
  }

  if (!payload.review) {
    return NextResponse.json(
      { ok: false, error: "unknown" } satisfies SubmitSpecialistReviewResult,
      { status: 500 }
    );
  }

  const review = mapReviewRow(payload.review);
  const origin = getAuthSiteOrigin() ?? "https://smoac.com";
  const profilePath = `${origin}/trainers/${encodeURIComponent(specialistId)}`;
  const dashboardPath = `${origin}${SPECIALIST_DASHBOARD_PATH}`;

  const specialistUserId = await resolveSpecialistUserId(supabase, specialistId);
  const specialistEmail = await resolveSpecialistNotifyEmail(
    supabase,
    specialistId,
    specialistUserId
  );

  if (specialistEmail) {
    await sendSpecialistReviewNotificationEmail({
      to: specialistEmail,
      specialistName: specialistName || "your profile",
      authorDisplayName: review.authorDisplayName,
      rating: review.rating,
      reviewText: review.reviewText,
      profilePath,
      dashboardPath,
    });
  } else {
    console.warn(
      "[SMOAC EMAIL] No specialist email found for review notify",
      specialistId
    );
  }

  revalidateMarketplaceAfterReview();

  return NextResponse.json({
    ok: true,
    review,
  } satisfies SubmitSpecialistReviewResult);
}
