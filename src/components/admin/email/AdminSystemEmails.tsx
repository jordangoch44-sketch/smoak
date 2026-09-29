"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import { emailSiteOrigin } from "@/lib/email/email-html-shell";
import { SUPPORT_EMAIL } from "@/lib/site-contact";
import {
  SYSTEM_EMAILS,
  type SystemEmailDefinition,
} from "@/lib/email/system-emails";
import { cn } from "@/lib/utils";

/** Images point at the public site; load them from this host so undeployed assets still show. */
function withLocalAssets(html: string): string {
  if (typeof window === "undefined") return html;
  const origin = emailSiteOrigin();
  return html
    .replaceAll(`${origin}/email/`, `${window.location.origin}/email/`)
    .replaceAll(`${origin}/smoac-`, `${window.location.origin}/smoac-`);
}

type SendState = { id: string; status: "sending" | "sent" | "error"; message: string };

export function AdminSystemEmails() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [send, setSend] = useState<SendState | null>(null);
  const open = SYSTEM_EMAILS.find((email) => email.id === openId) ?? null;
  const recipient = testTo.trim() || SUPPORT_EMAIL;

  async function sendTest(email: SystemEmailDefinition) {
    if (!recipient) {
      setSend({ id: email.id, status: "error", message: "Enter an email address first." });
      return;
    }
    setSend({ id: email.id, status: "sending", message: "Sending…" });
    try {
      const response = await fetch("/api/admin/emails/system-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailId: email.id, to: recipient }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      setSend({
        id: email.id,
        status: response.ok && data?.ok ? "sent" : "error",
        message: data?.message ?? "Send failed.",
      });
    } catch {
      setSend({ id: email.id, status: "error", message: "Send failed." });
    }
  }

  return (
    <section className="admin-email-list" aria-label="System emails">
      <div className="admin-email-list__head">
        <div>
          <h2>System emails</h2>
          <p>Built in code and sent automatically. Preview or send yourself a test.</p>
        </div>
        <label className="admin-email-system__to">
          <span>Send tests to</span>
          <input
            type="email"
            className="admin-field"
            value={testTo}
            placeholder={SUPPORT_EMAIL}
            onChange={(event) => setTestTo(event.target.value)}
          />
        </label>
      </div>
      <ul className="admin-email-system">
        {SYSTEM_EMAILS.map((email) => {
          const state = send?.id === email.id ? send : null;
          return (
            <li key={email.id} className="admin-email-tool admin-email-system__row">
              <div>
                <strong>{email.name}</strong>
                <span>{email.subject}</span>
                <span className="admin-email-system__trigger">{email.trigger}</span>
                {state ? (
                  <span
                    className={cn(
                      "admin-email-system__status",
                      state.status === "error" && "admin-email-system__status--error"
                    )}
                    role="status"
                  >
                    {state.message}
                  </span>
                ) : null}
              </div>
              <div className="admin-email-system__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--compact admin-btn--ghost"
                  onClick={() => setOpenId(email.id)}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--compact"
                  disabled={state?.status === "sending"}
                  onClick={() => void sendTest(email)}
                >
                  {state?.status === "sending" ? "Sending…" : "Send test"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <SystemEmailPreviewSheet email={open} onClose={() => setOpenId(null)} />
    </section>
  );
}

function SystemEmailPreviewSheet({
  email,
  onClose,
}: {
  email: SystemEmailDefinition | null;
  onClose: () => void;
}) {
  const open = email != null;
  useBlockingModalOpen(open);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const html = useMemo(
    () => (email ? withLocalAssets(email.render().html) : ""),
    [email]
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="admin-email-sheet">
      <button
        type="button"
        className="admin-email-sheet__backdrop"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div
        className="admin-email-sheet__panel admin-email-sheet__panel--preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-system-email-title"
      >
        <div className="admin-email-sheet__head">
          <h2 id="admin-system-email-title">{email.name}</h2>
          <div className="admin-email-sheet__head-actions admin-email-preview">
            <div className="admin-app-segments" role="tablist" aria-label="Preview size">
              {(["desktop", "mobile"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  role="tab"
                  aria-selected={mode === size}
                  className={cn(
                    "admin-app-segment",
                    mode === size && "admin-app-segment--active"
                  )}
                  onClick={() => setMode(size)}
                >
                  {size === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
            <button
              ref={closeRef}
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--compact"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        <p className="admin-email-sheet__meta">Subject: {email.subject}</p>
        <div
          className={cn(
            "admin-email-preview__stage",
            mode === "mobile" && "admin-email-preview__stage--mobile"
          )}
        >
          <iframe
            title={`${email.name} preview`}
            className="admin-email-preview__frame admin-email-preview__frame--tall"
            srcDoc={html}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
