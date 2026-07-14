"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CloseIcon } from "@/components/ui/icons";
import { LOGIN_PATH } from "@/lib/auth-routes";
import {
  ensureInquiryClientProfileAfterAuth,
  signInClientForSave,
  startSaveQuickAccount,
} from "@/lib/auth/inquiry-auth";
import { setAuthSession } from "@/lib/auth-session-store";
import { useAuthSession } from "@/hooks/useAuthSession";
import { applyPendingSaveAfterLogin } from "@/lib/specialist-saves";
import type { PendingSaveRecord } from "@/lib/dev-storage-keys";
import { cn } from "@/lib/utils";

type View = "signup" | "signin" | "awaiting_email";

export interface SaveQuickSignupModalProps {
  open: boolean;
  onClose: () => void;
  specialistId: string;
  specialistName?: string;
  profilePath: string;
  /** Called after the specialist is written to the saved list */
  onSaved: (record: PendingSaveRecord) => void;
}

export function SaveQuickSignupModal({
  open,
  onClose,
  specialistId,
  specialistName,
  profilePath,
  onSaved,
}: SaveQuickSignupModalProps) {
  const titleId = useId();
  const descId = useId();
  const submittingRef = useRef(false);
  const { refreshSession } = useAuthSession();
  const [view, setView] = useState<View>("signup");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [syncedKey, setSyncedKey] = useState("");

  const openKey = open ? `${specialistId}:${profilePath}` : "";

  if (open && syncedKey !== openKey) {
    setSyncedKey(openKey);
    setView("signup");
    setError(null);
    setSending(false);
    setPassword("");
  } else if (!open && syncedKey) {
    setSyncedKey("");
  }

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("login-gate-open");
    document.documentElement.classList.add("login-gate-open");

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("login-gate-open");
      document.documentElement.classList.remove("login-gate-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function finishSaveAfterAuth() {
    const applied = await applyPendingSaveAfterLogin("client");
    if (applied.kind === "client-saved" && applied.record) {
      onSaved(applied.record);
      onClose();
      return;
    }
    if (applied.kind === "client-saved") {
      onSaved({
        specialistId: applied.specialistId,
        specialistName,
        profilePath,
        actionType: "save_specialist",
        createdAt: new Date().toISOString(),
      });
      onClose();
      return;
    }
    if (applied.kind === "specialist-blocked") {
      setError("Switch to a client account to save specialists.");
      return;
    }
    setError("Couldn’t save this specialist. Try again.");
  }

  async function handleQuickSignup() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    setError(null);

    const result = await startSaveQuickAccount({
      firstName,
      email,
      returnPath: profilePath || `/trainers/${specialistId}`,
    });

    if (result.ok === "email_sent") {
      setSending(false);
      submittingRef.current = false;
      setView("awaiting_email");
      return;
    }

    if (!result.ok) {
      setSending(false);
      submittingRef.current = false;
      setError(result.message);
      if (result.code === "existing_account") {
        setView("signin");
      }
      return;
    }

    setAuthSession(result.session);
    const ensured = await ensureInquiryClientProfileAfterAuth(result.session);
    if (!ensured.ok) {
      setSending(false);
      submittingRef.current = false;
      setError(ensured.message);
      return;
    }
    setAuthSession(ensured.session);
    await refreshSession();

    await finishSaveAfterAuth();
    setSending(false);
    submittingRef.current = false;
  }

  async function handleSignIn() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    setError(null);

    const result = await signInClientForSave(email, password);
    if (result.ok !== true) {
      setSending(false);
      submittingRef.current = false;
      setError(
        result.ok === "confirm_email"
          ? "Check your email to confirm your account, then return here."
          : result.message
      );
      return;
    }

    setAuthSession(result.session);
    const ensured = await ensureInquiryClientProfileAfterAuth(result.session);
    if (!ensured.ok) {
      setSending(false);
      submittingRef.current = false;
      setError(ensured.message);
      return;
    }
    setAuthSession(ensured.session);
    await refreshSession();

    await finishSaveAfterAuth();
    setSending(false);
    submittingRef.current = false;
  }

  if (!open || typeof document === "undefined") return null;

  const title =
    view === "signin"
      ? "Log in to save"
      : view === "awaiting_email"
        ? "Check your email"
        : "Save this specialist";

  const support =
    view === "signin"
      ? `Sign in to add${specialistName ? ` ${specialistName}` : " this specialist"} to your saved list.`
      : view === "awaiting_email"
        ? "Open the secure link we sent. Your save is stored — we’ll finish it as soon as you’re signed in."
        : "Enter your first name and email to add this specialist to your saved list.";

  return createPortal(
    <div className="login-gate" role="presentation" onClick={onClose}>
      <div
        className={cn("login-gate__dialog", "login-gate__dialog--save")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="login-gate__glow" aria-hidden />

        <button
          type="button"
          className="smoac-control login-gate__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="login-gate__content login-gate__content--save">
          <h2 id={titleId} className="login-gate__title">
            {title}
          </h2>
          <p id={descId} className="login-gate__body">
            {support}
          </p>

          {view === "signup" ? (
            <div className="login-gate__form">
              <label className="login-gate__label" htmlFor="save-quick-first-name">
                First name
              </label>
              <input
                id="save-quick-first-name"
                className="login-gate__input"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <label className="login-gate__label" htmlFor="save-quick-email">
                Email
              </label>
              <input
                id="save-quick-email"
                type="email"
                className="login-gate__input"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="login-gate__helper">
                You can complete your profile anytime.
              </p>
            </div>
          ) : null}

          {view === "signin" ? (
            <div className="login-gate__form">
              <label className="login-gate__label" htmlFor="save-quick-signin-email">
                Email
              </label>
              <input
                id="save-quick-signin-email"
                type="email"
                className="login-gate__input"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label
                className="login-gate__label"
                htmlFor="save-quick-signin-password"
              >
                Password
              </label>
              <input
                id="save-quick-signin-password"
                type="password"
                className="login-gate__input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : null}

          {error ? (
            <p className="login-gate__error" role="alert">
              {error}
            </p>
          ) : null}

          {view !== "awaiting_email" ? (
            <div className="login-gate__actions">
              {view === "signup" ? (
                <>
                  <button
                    type="button"
                    className="smoac-control login-gate__btn login-gate__btn--aurora"
                    disabled={sending}
                    onClick={() => void handleQuickSignup()}
                  >
                    {sending ? "Continuing…" : "Continue & Save"}
                  </button>
                  <button
                    type="button"
                    className="smoac-control login-gate__btn login-gate__btn--ghost"
                    onClick={() => {
                      setView("signin");
                      setError(null);
                    }}
                  >
                    Already have an account? Log in
                  </button>
                </>
              ) : null}

              {view === "signin" ? (
                <>
                  <button
                    type="button"
                    className="smoac-control login-gate__btn login-gate__btn--aurora"
                    disabled={sending}
                    onClick={() => void handleSignIn()}
                  >
                    {sending ? "Signing in…" : "Log in & Save"}
                  </button>
                  <button
                    type="button"
                    className="smoac-control login-gate__btn login-gate__btn--ghost"
                    onClick={() => {
                      setView("signup");
                      setError(null);
                    }}
                  >
                    Create a quick account instead
                  </button>
                  <Link
                    href={LOGIN_PATH}
                    className="login-gate__btn login-gate__btn--ghost"
                    onClick={onClose}
                  >
                    Open full sign in
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
