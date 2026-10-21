"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WORKOUTS_PATH } from "@/lib/auth-routes";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { isNativeShell } from "@/lib/native-billing";
import { fetchSharedWorkout } from "@/lib/workouts/shared-workout-service";
import {
  isSharedWorkoutToken,
  sharedExerciseCountLabel,
  sharedWorkoutAppUrl,
  sharedWorkoutTitle,
  SMOAC_APP_STORE_URL,
  type SharedWorkoutPreview,
} from "@/lib/workouts/shared-workout";
import { useAuthSession } from "@/hooks/useAuthSession";
import { SharedWorkoutReceiveSheet } from "./SharedWorkoutReceiveSheet";
import "@/styles/client-workouts.css";

/** The text link. The website explains how to open it. The app adds it to a day. */
export function SharedWorkoutLinkPage({ token }: { token: string }) {
  const router = useRouter();
  const { session } = useAuthSession();
  const [shell, setShell] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<SharedWorkoutPreview | "missing" | "error" | null>(null);

  useEffect(() => {
    setShell(isNativeShell());
  }, []);

  useEffect(() => {
    if (!isSharedWorkoutToken(token)) {
      setPreview("missing");
      return;
    }
    const supabase = getMarketplaceAuthClient();
    if (!supabase) {
      setPreview("error");
      return;
    }
    let cancelled = false;
    void fetchSharedWorkout(supabase, token).then((result) => {
      if (cancelled) return;
      setPreview(result.ok ? result.preview : result.reason);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (preview === null || shell === null) {
    return (
      <main className="shared-workout">
        <p className="shared-workout__muted">Loading…</p>
      </main>
    );
  }

  if (preview === "missing" || preview === "error") {
    return (
      <main className="shared-workout">
        <section className="shared-workout__card">
          <h1 className="shared-workout__title">Workout link</h1>
          <p className="shared-workout__copy">
            {preview === "missing"
              ? "This workout link doesn’t exist."
              : "This workout link can’t be opened right now."}
          </p>
        </section>
      </main>
    );
  }

  if (shell) {
    return (
      <SharedWorkoutReceiveSheet
        token={token}
        preview={preview}
        onClose={() => router.push(session?.role === "client" ? WORKOUTS_PATH : "/")}
      />
    );
  }

  const title = sharedWorkoutTitle(preview.title);

  return (
    <main className="shared-workout">
      <section className="shared-workout__card">
        <h1 className="shared-workout__title">{preview.senderName} sent you a workout</h1>
        <p className="shared-workout__plan">
          {title} · {sharedExerciseCountLabel(preview.exercises.length)}
        </p>
        <a className="shared-workout__download" href={SMOAC_APP_STORE_URL}>
          Download SMOAC
        </a>
        <p className="shared-workout__copy">
          Once it’s installed, come back to this text and tap the link again. The workout will be waiting.
        </p>
        <p className="shared-workout__open">
          Already on SMOAC? <a href={sharedWorkoutAppUrl(token)}>Open the workout</a>
        </p>
      </section>
    </main>
  );
}
