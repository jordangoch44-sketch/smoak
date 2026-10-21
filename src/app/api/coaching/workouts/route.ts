import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  mapCoachingRelationship,
  mapCoachWorkout,
  sanitizeCoachNote,
} from "@/lib/coaching/coach-workout";
import { sendCoachWorkoutEmail } from "@/lib/email/coaching-email-service";
import { sendCoachWorkoutPush } from "@/lib/push/coaching-push";
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

interface UpdateBody {
  workoutId?: unknown;
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
    await sendCoachWorkoutPush({
      clientUserId: relationship.clientUserId,
      specialistName: relationship.specialistName,
      workoutId: workout.id,
    });
  }

  return NextResponse.json({ ok: true, data: workout });
}

/** Specialist revises a workout the client has not started. */
export async function PATCH(request: Request) {
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

  const body = (await request.json().catch(() => null)) as UpdateBody | null;
  const workoutId = typeof body?.workoutId === "string" ? body.workoutId : "";
  const dateKey = typeof body?.dateKey === "string" ? body.dateKey : "";
  const exercises = sanitizeWorkoutExercises(
    Array.isArray(body?.exercises) ? (body.exercises as ClientWorkoutExercise[]) : []
  ).map((exercise) => ({
    ...exercise,
    completed: undefined,
  }));
  if (!workoutId || !isWorkoutDateKey(dateKey)) {
    return NextResponse.json({ ok: false, message: "Pick a day for this workout." }, { status: 400 });
  }
  if (exercises.length === 0) {
    return NextResponse.json({ ok: false, message: "Add at least one exercise." }, { status: 400 });
  }

  const title = sanitizeWorkoutTitle(body?.title);
  const note = sanitizeCoachNote(body?.note);
  const { data, error } = await supabase.rpc("update_coach_workout", {
    p_workout_id: workoutId,
    p_date_key: dateKey,
    p_title: title,
    p_note: note,
    p_exercises: exercises,
  });
  if (!error && data) {
    return NextResponse.json({ ok: true, data: mapCoachWorkout(data as CoachWorkoutRow) });
  }
  if (error && /could not find the function/i.test(error.message ?? "")) {
    return reviseSentWorkout(supabase, { workoutId, dateKey, title, note, exercises });
  }

  const proRequired = error?.message.includes("pro_required");
  const started = error?.message.includes("already_started");
  return NextResponse.json(
    {
      ok: false,
      message: proRequired
        ? "Sending workouts is a SMOAC Pro feature."
        : started
          ? "This workout has already been started, so it can’t be edited."
          : "Could not save the workout.",
    },
    { status: proRequired ? 402 : 403 }
  );
}

/** Same rules as update_coach_workout, for databases that do not have that function yet. */
async function reviseSentWorkout(
  supabase: SupabaseClient,
  input: {
    workoutId: string;
    dateKey: string;
    title: string;
    note: string;
    exercises: ClientWorkoutExercise[];
  }
) {
  const { data: premium, error: premiumError } = await supabase.rpc("caller_is_premium_specialist");
  if (premiumError || premium !== true) {
    return NextResponse.json(
      { ok: false, message: "Sending workouts is a SMOAC Pro feature." },
      { status: 402 }
    );
  }

  const { data: row, error: readError } = await supabase
    .from("coach_workouts")
    .select("*")
    .eq("id", input.workoutId)
    .maybeSingle();
  if (readError || !row) {
    return NextResponse.json({ ok: false, message: "Could not save the workout." }, { status: 403 });
  }
  const current = row as CoachWorkoutRow;
  const { data: owns, error: ownsError } = await supabase.rpc("owns_marketplace_specialist", {
    p_specialist_id: current.specialist_id,
  });
  if (ownsError || owns !== true) {
    return NextResponse.json({ ok: false, message: "Could not save the workout." }, { status: 403 });
  }
  if (current.status !== "sent") {
    return NextResponse.json(
      { ok: false, message: "This workout has already been started, so it can’t be edited." },
      { status: 403 }
    );
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ ok: false, message: "Could not save the workout." }, { status: 503 });
  }
  const { data: updated, error: updateError } = await service
    .from("coach_workouts")
    .update({
      date_key: input.dateKey,
      title: input.title,
      note: input.note,
      exercises: input.exercises,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.workoutId)
    .eq("status", "sent")
    .select("*")
    .maybeSingle();
  if (updateError) {
    return NextResponse.json({ ok: false, message: "Could not save the workout." }, { status: 403 });
  }
  if (!updated) {
    return NextResponse.json(
      { ok: false, message: "This workout has already been started, so it can’t be edited." },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true, data: mapCoachWorkout(updated as CoachWorkoutRow) });
}
