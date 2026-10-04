"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { DashboardLoadingState } from "@/components/dashboard/shared/DashboardLoadingState";
import { DashboardPageShell } from "@/components/dashboard/shared/DashboardPageShell";
import { ClientSuggestedWorkout } from "@/components/dashboard/client/workouts/ClientSuggestedWorkout";
import { ClientWorkoutsEntry } from "@/components/dashboard/client/workouts/ClientWorkoutsEntry";
import { ClientWorkoutsGate } from "@/components/dashboard/client/workouts/ClientWorkoutsGate";
import { SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { INTERNAL_DASHBOARD_PATH } from "@/lib/internal-routes";

export function ClientWorkoutsPageClient() {
  const router = useRouter();
  const { isReady, session } = useAuthSession();
  const [pasteFrom, setPasteFrom] = useState<string | null>(null);
  const signedInElsewhere = isReady && session != null && session.role !== "client";

  useEffect(() => {
    if (!signedInElsewhere || !session) return;
    router.replace(
      session.role === "specialist"
        ? SPECIALIST_DASHBOARD_PATH
        : INTERNAL_DASHBOARD_PATH
    );
  }, [signedInElsewhere, session, router]);

  if (!isReady || signedInElsewhere) {
    return <DashboardLoadingState />;
  }

  if (!session) {
    return <ClientWorkoutsGate />;
  }

  const userId = session.userId;

  return (
    <DashboardPageShell
      variant="client"
      eyebrow="Workouts"
      title="Your training"
      headerClassName="client-workouts-header"
    >
      <section className="client-workouts-page">
        <ClientWorkoutsEntry
          userId={userId}
          pasteFrom={pasteFrom}
          onPasteFromChange={setPasteFrom}
        />
        <ClientSuggestedWorkout userId={userId} onPaste={setPasteFrom} />
      </section>
    </DashboardPageShell>
  );
}
