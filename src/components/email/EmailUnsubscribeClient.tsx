"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function EmailUnsubscribeClient() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Updating your preferences…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This unsubscribe link is missing or incomplete.");
      return;
    }
    let cancelled = false;
    void fetch("/api/email/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((body: { ok?: boolean; message?: string }) => {
        if (cancelled) return;
        if (body.ok) {
          setStatus("ok");
          setMessage("You’re unsubscribed from SMOAC marketing emails.");
          return;
        }
        setStatus("error");
        setMessage(body.message ?? "Could not unsubscribe.");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not unsubscribe. Try again later.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">Email preferences</p>
        <h1 className="legal-page__title">Unsubscribe</h1>
        <p className={status === "error" ? "admin-status-error" : "legal-page__lede"}>
          {message}
        </p>
      </div>
    </main>
  );
}
