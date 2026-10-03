"use client";

import { useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  DashboardLoadingState,
  DashboardPageShell,
} from "@/components/dashboard";
import { ClientSuggestedWorkout } from "@/components/dashboard/client/workouts/ClientSuggestedWorkout";
import { ClientWorkoutsEntry } from "@/components/dashboard/client/workouts/ClientWorkoutsEntry";

export function ClientWorkoutsPageClient() {
  const { isReady, session } = useRequireAuth("client");
  const [pasteFrom, setPasteFrom] = useState<string | null>(null);

  if (!isReady || !session) {
    return <DashboardLoadingState />;
  }

  return (
    <DashboardPageShell
      variant="client"
      eyebrow="Workouts"
      title="Your training"
      headerClassName="client-workouts-header"
    >
      <section className="client-workouts-page">
        <ClientWorkoutsEntry
          userId={session.userId}
          pasteFrom={pasteFrom}
          onPasteFromChange={setPasteFrom}
        />
        <ClientSuggestedWorkout userId={session.userId} onPaste={setPasteFrom} />
      </section>
    </DashboardPageShell>
  );
}
