import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapCoachingRelationship,
  mapCoachWorkout,
  sanitizeCoachNote,
} from "@/lib/coaching/coach-workout";
import { sendCoachWorkoutEmail } from "@/lib/email/coaching-email-service";
import {
  createWorkoutExerciseId,
  isWorkoutDateKey,
  sanitizeWorkoutExercises,
  sanitizeWorkoutTitle,
} from "@/lib/workouts/client-workout";
import type { ClientWorkoutExercise } from "@/types/client-workout";
import type { CoachingRelationshipRow, CoachWorkoutRow } from "@/types/coaching";

export const runtime = "nodejs";

interface SendBody {
  relationshipId?: unknown;
  dateKey?: unknown;
  title?: unknown;
  note?: unknown;
  exercises?: unknown;
}

/** Specialist sends a workout to an active roster client. RPC enforces ownership + Pro. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SendBody | null;
  const relationshipId = typeof body?.relationshipId === "string" ? body.relationshipId : "";
  const dateKey = typeof body?.dateKey === "string" ? body.dateKey : "";
  const exercises = sanitizeWorkoutExercises(
    Array.isArray(body?.exercises) ? (body.exercises as ClientWorkoutExercise[]) : []
  ).map((exercise) => ({
    // Fresh ids so a started workout's exercises map back to this send only.
    ...exercise,
    id: createWorkoutExerciseId(),
    completed: undefined,
  }));
  if (!relationshipId || !isWorkoutDateKey(dateKey)) {
    return NextResponse.json({ ok: false, message: "Pick a client and a day." }, { status: 400 });
  }
  if (exercises.length === 0) {
    return NextResponse.json({ ok: false, message: "Add at least one exercise." }, { status: 400 });
  }

  const title = sanitizeWorkoutTitle(body?.title);
  const note = sanitizeCoachNote(body?.note);
  const { data, error } = await supabase.rpc("send_coach_workout", {
    p_relationship_id: relationshipId,
    p_date_key: dateKey,
    p_title: title,
    p_note: note,
    p_exercises: exercises,
  });
  if (error || !data) {
    const proRequired = error?.message.includes("pro_required");
    return NextResponse.json(
      {
        ok: false,
        message: proRequired
          ? "Sending workouts is a SMOAC Pro feature."
          : "This client isn’t on your roster.",
      },
      { status: proRequired ? 402 : 403 }
    );
  }

  const workout = mapCoachWorkout(data as CoachWorkoutRow);

  const { data: relRow } = await supabase
    .from("coaching_relationships")
    .select("*")
    .eq("id", relationshipId)
    .maybeSingle();
  if (relRow) {
    const relationship = mapCoachingRelationship(relRow as CoachingRelationshipRow);
    const { data: conversation } = relationship.conversationId
      ? await supabase
          .from("inquiry_conversations")
          .select("client_email")
          .eq("id", relationship.conversationId)
          .maybeSingle()
      : { data: null };
    const to = String(conversation?.client_email ?? "").trim();
    if (to) {
      await sendCoachWorkoutEmail({
        to,
        clientFirstName: relationship.clientFirstName,
        specialistName: relationship.specialistName,
        dateKey: workout.dateKey,
        title: workout.title,
        note: workout.note,
        exerciseCount: workout.exercises.length,
      });
    }
  }

  return NextResponse.json({ ok: true, data: workout });
}
