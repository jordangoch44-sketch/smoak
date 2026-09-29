"use client";

import { useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import { TRUST_REPORT_REASONS } from "@/lib/trust/report-reasons";
import "@/styles/trust-sheet.css";

type TrustMode = "report" | "block";

interface TrustActionSheetProps {
  mode: TrustMode;
  surface: "profile" | "thread";
  specialistId?: string;
  specialistName?: string;
  conversationId?: string;
  counterpartName?: string;
  onClose: () => void;
}

export function TrustActionSheet({
  mode,
  surface,
  specialistId,
  specialistName,
  conversationId,
  counterpartName,
  onClose,
}: TrustActionSheetProps) {
  const { session } = useAuthSession();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(mode === "block");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const name = counterpartName || specialistName || "them";

  async function submit() {
    if (!session) {
      setError("Sign in to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "block") {
        const response = await fetch("/api/trust/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ conversationId, specialistId }),
        });
        const data = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string }
          | null;
        if (!response.ok || !data?.ok) {
          setError(data?.message ?? "Could not block.");
          return;
        }
        setDone(`Blocked. ${name} can no longer message you here.`);
        return;
      }

      if (!reason) {
        setError("Choose a reason.");
        return;
      }
      const response = await fetch("/api/trust/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          surface,
          reason,
          details,
          specialistId,
          conversationId,
          alsoBlock,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; blocked?: boolean }
        | null;
      if (!response.ok || !data?.ok) {
        setError(data?.message ?? "Could not send the report.");
        return;
      }
      setDone(
        alsoBlock
          ? "Report sent, and they can no longer message you here."
          : "Report sent. SMOAC will review it."
      );
    } catch {
      setError("Could not reach SMOAC. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="trust-sheet" role="presentation" onClick={onClose}>
      <div
        className="trust-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="trust-sheet-title" className="trust-sheet__title">
          {mode === "block" ? `Block ${name}` : `Report ${name}`}
        </h2>
        {done ? (
          <p className="trust-sheet__done">{done}</p>
        ) : mode === "block" ? (
          <p className="trust-sheet__copy">
            They will not be able to message you, and you will not be able to
            message them in this conversation.
          </p>
        ) : (
          <>
            <div className="trust-sheet__reasons" role="radiogroup" aria-label="Reason">
              {TRUST_REPORT_REASONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    reason === item.id
                      ? "trust-sheet__reason trust-sheet__reason--on"
                      : "trust-sheet__reason"
                  }
                  aria-pressed={reason === item.id}
                  onClick={() => setReason(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <textarea
              className="trust-sheet__details"
              value={details}
              maxLength={1000}
              placeholder="Add details if you want."
              onChange={(event) => setDetails(event.target.value)}
            />
            <label className="trust-sheet__check">
              <input
                type="checkbox"
                checked={alsoBlock}
                onChange={(event) => setAlsoBlock(event.target.checked)}
              />
              Also block them
            </label>
          </>
        )}
        {error ? <p className="trust-sheet__error">{error}</p> : null}
        <div className="trust-sheet__actions">
          <button type="button" className="trust-sheet__cancel" onClick={onClose}>
            {done ? "Close" : "Cancel"}
          </button>
          {done ? null : (
            <button
              type="button"
              className="trust-sheet__submit"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Sending…" : mode === "block" ? "Block" : "Send report"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
