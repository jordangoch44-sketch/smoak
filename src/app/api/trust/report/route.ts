import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSpecialistUserId } from "@/lib/specialist-notify-email";
import {
  isTrustReportReason,
  labelForTrustReportReason,
} from "@/lib/trust/report-reasons";
import {
  isDemoInquiryConversationId,
  isSmoacWelcomeConversationId,
} from "@/lib/inquiry/inquiry-paths";

export const runtime = "nodejs";

interface ReportBody {
  surface?: "profile" | "thread";
  reason?: string;
  details?: string;
  specialistId?: string;
  conversationId?: string;
  alsoBlock?: boolean;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Authentication is not available." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in to report this." },
      { status: 401 }
    );
  }

  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const surface = body.surface === "thread" ? "thread" : "profile";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!isTrustReportReason(reason)) {
    return NextResponse.json(
      { ok: false, message: "Choose a reason." },
      { status: 400 }
    );
  }

  const details =
    typeof body.details === "string" ? body.details.trim().slice(0, 1000) : "";
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : "";
  let specialistId =
    typeof body.specialistId === "string" ? body.specialistId.trim() : "";
  let targetUserId: string | null = null;

  if (surface === "thread") {
    if (
      !conversationId ||
      isDemoInquiryConversationId(conversationId) ||
      isSmoacWelcomeConversationId(conversationId)
    ) {
      return NextResponse.json(
        { ok: false, message: "This conversation cannot be reported." },
        { status: 400 }
      );
    }
    const { data: conversation, error } = await supabase
      .from("inquiry_conversations")
      .select("id, client_user_id, specialist_user_id, specialist_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conversation) {
      return NextResponse.json(
        { ok: false, message: "Conversation not found." },
        { status: 404 }
      );
    }
    const clientId = String(conversation.client_user_id ?? "");
    const specialistUserId = String(conversation.specialist_user_id ?? "");
    specialistId = String(conversation.specialist_id ?? specialistId);
    const ownsListing =
      user.id !== clientId &&
      user.id !== specialistUserId &&
      specialistId
        ? await ownsSpecialist(supabase, user.id, specialistId)
        : false;
    if (user.id !== clientId && user.id !== specialistUserId && !ownsListing) {
      return NextResponse.json(
        { ok: false, message: "You cannot report this conversation." },
        { status: 403 }
      );
    }
    const viewerIsClient = user.id === clientId;
    targetUserId = viewerIsClient
      ? specialistUserId || (await resolveSpecialistUserId(supabase, specialistId))
      : clientId;
  } else if (!specialistId) {
    return NextResponse.json(
      { ok: false, message: "Specialist not found." },
      { status: 400 }
    );
  } else {
    targetUserId = await resolveSpecialistUserId(supabase, specialistId);
    if (targetUserId === user.id) {
      return NextResponse.json(
        { ok: false, message: "You cannot report your own profile." },
        { status: 400 }
      );
    }
  }

  const { error: insertError } = await supabase.from("trust_reports").insert({
    reporter_user_id: user.id,
    surface,
    reason: labelForTrustReportReason(reason),
    details,
    specialist_id: specialistId || null,
    conversation_id: conversationId || null,
    target_user_id: targetUserId,
  });

  if (insertError) {
    return NextResponse.json(
      { ok: false, message: insertError.message },
      { status: 400 }
    );
  }

  if (body.alsoBlock) {
    const block = await insertBlock(supabase, user.id, {
      specialistId,
      conversationId,
      blockedUserId: targetUserId,
    });
    if (!block.ok) {
      return NextResponse.json(
        { ok: true, reported: true, blocked: false, message: block.message }
      );
    }
  }

  return NextResponse.json({ ok: true, reported: true, blocked: Boolean(body.alsoBlock) });
}

async function ownsSpecialist(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
  specialistId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("specialist_profiles")
    .select("id")
    .eq("id", specialistId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.id);
}

async function insertBlock(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  blockerUserId: string,
  input: {
    specialistId: string;
    conversationId: string;
    blockedUserId: string | null;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.blockedUserId && input.blockedUserId === blockerUserId) {
    return { ok: false, message: "You cannot block yourself." };
  }
  const { error } = await supabase.from("user_blocks").insert({
    blocker_user_id: blockerUserId,
    blocked_user_id: input.blockedUserId,
    specialist_id: input.specialistId || null,
    conversation_id: input.conversationId || null,
  });
  if (error && /23505|duplicate/i.test(error.message)) return { ok: true };
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
