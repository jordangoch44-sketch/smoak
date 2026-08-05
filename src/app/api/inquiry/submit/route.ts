import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { persistSpecialistInquiry } from "@/lib/inquiry/inquiry-persist";
import {
  sanitizeInquiryMessage,
  validateInquiryDraft,
} from "@/lib/pending-inquiry-storage";
import {
  isInquiryActionId,
  isInquiryTopicId,
  type InquiryTopicId,
} from "@/lib/inquiry-options";
import type { SubmitInquiryResult } from "@/types/inquiry";

export const runtime = "nodejs";

interface InquirySubmitBody {
  specialistId?: string;
  specialistName?: string;
  inquiryAction?: string;
  inquiryTopics?: unknown;
  message?: string;
  /** Optional display name hint — server prefers profiles.first_name */
  clientFirstName?: string;
  idempotencyKey?: string;
}

/**
 * Authenticated inquiry submit: verify session, write under RLS, email via Resend.
 * Client must not invent clientUserId / client email.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Authentication is not available." } satisfies SubmitInquiryResult,
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in to send your message." } satisfies SubmitInquiryResult,
      { status: 401 }
    );
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleRow?.role !== "client") {
    return NextResponse.json(
      {
        ok: false,
        message: "Client account required to contact specialists.",
      } satisfies SubmitInquiryResult,
      { status: 403 }
    );
  }

  let body: InquirySubmitBody;
  try {
    body = (await request.json()) as InquirySubmitBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request." } satisfies SubmitInquiryResult,
      { status: 400 }
    );
  }

  const specialistId =
    typeof body.specialistId === "string" ? body.specialistId.trim() : "";
  const specialistName =
    typeof body.specialistName === "string"
      ? body.specialistName.trim()
      : "Specialist";
  const inquiryAction = body.inquiryAction;
  const inquiryTopics = Array.isArray(body.inquiryTopics)
    ? body.inquiryTopics.filter(
        (t): t is InquiryTopicId =>
          typeof t === "string" && isInquiryTopicId(t)
      )
    : [];
  const message =
    typeof body.message === "string" ? sanitizeInquiryMessage(body.message) : "";

  if (typeof inquiryAction !== "string" || !isInquiryActionId(inquiryAction)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Choose how we can help you.",
      } satisfies SubmitInquiryResult,
      { status: 400 }
    );
  }

  const validation = validateInquiryDraft({
    specialistId,
    inquiryAction,
    inquiryTopics,
    message,
  });
  if (!validation.ok) {
    return NextResponse.json(validation satisfies SubmitInquiryResult, {
      status: 400,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileFirst =
    typeof profile?.first_name === "string" ? profile.first_name.trim() : "";
  const bodyFirst =
    typeof body.clientFirstName === "string" ? body.clientFirstName.trim() : "";
  const clientFirstName =
    profileFirst || bodyFirst || user.email?.split("@")[0] || "Client";

  const profileEmail =
    typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";
  const authEmail = user.email?.trim().toLowerCase() ?? "";
  const clientEmail = profileEmail || authEmail;

  if (!clientEmail.includes("@")) {
    return NextResponse.json(
      {
        ok: false,
        message: "Your account needs an email address to send inquiries.",
      } satisfies SubmitInquiryResult,
      { status: 400 }
    );
  }

  const result = await persistSpecialistInquiry(supabase, {
    specialistId,
    specialistName: specialistName || "Specialist",
    inquiryAction,
    inquiryTopics,
    message,
    clientUserId: user.id,
    clientFirstName,
    clientEmail,
    idempotencyKey:
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}
