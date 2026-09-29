"use client";

import { useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import "@/styles/trust-sheet.css";

interface DeleteAccountButtonProps {
  role: "client" | "specialist";
  className?: string;
}

export function DeleteAccountButton({ role, className }: DeleteAccountButtonProps) {
  const { signOut } = useAuthSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeAccount() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!response.ok || !data?.ok) {
        setError(data?.message ?? "Could not delete this account.");
        setBusy(false);
        return;
      }
      try {
        await signOut();
      } catch {
        /* Session is already gone once the auth user is deleted. */
      }
      afterLogoutNavigation("/");
    } catch {
      setError("Could not reach SMOAC. Try again.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => setConfirming(true)}
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="trust-delete">
      <p className="trust-delete__copy">
        {role === "specialist"
          ? "This permanently deletes your login and removes your SMOAC listing. Cancel an active plan in billing first if you have one. This cannot be undone."
          : "This permanently deletes your SMOAC login, saved specialists, and inquiries. This cannot be undone."}
      </p>
      {error ? <p className="trust-delete__error">{error}</p> : null}
      <div className="trust-delete__actions">
        <button
          type="button"
          className={className}
          disabled={busy}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className={className}
          disabled={busy}
          onClick={() => void removeAccount()}
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </div>
  );
}
