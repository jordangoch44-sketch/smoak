"use client";

import { useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { useCoachingRoster } from "@/hooks/useCoachingRoster";
import { cn } from "@/lib/utils";
import "@/styles/coaching.css";

/** Thread header control: invite this client onto the specialist's roster (Pro). */
export function RosterInviteButton({
  specialistId,
  conversationId,
  isPremium,
  onUpgrade,
}: {
  specialistId: string;
  conversationId: string;
  isPremium: boolean;
  onUpgrade?: () => void;
}) {
  const { relationshipForConversation, invite } = useCoachingRoster(specialistId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const relationship = relationshipForConversation(conversationId);

  if (relationship?.status === "active") {
    return <span className="roster-invite roster-invite--done">On roster</span>;
  }
  if (relationship?.status === "invited") {
    return <span className="roster-invite roster-invite--pending">Invited</span>;
  }

  async function handleInvite() {
    if (!isPremium) {
      onUpgrade?.();
      return;
    }
    setBusy(true);
    setError(null);
    const result = await invite(conversationId);
    setBusy(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <FastActivateButton
      className={cn("roster-invite roster-invite--action", Boolean(error) && "roster-invite--error")}
      disabled={busy}
      aria-label={error ?? "Add client to roster"}
      title={error ?? undefined}
      onActivate={() => void handleInvite()}
    >
      {busy ? "Adding…" : error ? "Try again" : isPremium ? "Add to roster" : "Add to roster · Pro"}
    </FastActivateButton>
  );
}
