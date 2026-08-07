"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import {
  QuickClientAccountAuthActions,
  QuickClientAccountAuthError,
  QuickClientAccountSigninFields,
  QuickClientAccountSignupFields,
} from "@/components/auth/QuickClientAccountAuthUI";
import {
  ensureInquiryClientProfileAfterAuth,
  signInClientForAccount,
  signInClientForSave,
  startMenuQuickAccount,
  startSaveQuickAccount,
} from "@/lib/auth/inquiry-auth";
import { setAuthSession } from "@/lib/auth-session-store";
import { useAuthSession } from "@/hooks/useAuthSession";
import { cn } from "@/lib/utils";

type View = "signup" | "signin" | "awaiting_email";

export type QuickClientAccountPurpose = "save" | "account";

export interface QuickClientAccountModalProps {
  open: boolean;
  onClose: () => void;
  purpose: QuickClientAccountPurpose;
  returnPath: string;
  /** Used when purpose is save — specialist display name for copy */
  specialistName?: string;
  /** After session exists (and profile ensured). Caller may apply pending save. */
  onAuthenticated: () => void | Promise<void>;
  signupTitle?: string;
  signupSupport?: string;
  signupCta?: string;
  signInTitle?: string;
  signInSupport?: string;
  signInCta?: string;
  awaitingSupport?: string;
}

export function QuickClientAccountModal({
  open,
  onClose,
  purpose,
  returnPath,
  specialistName,
  onAuthenticated,
  signupTitle,
  signupSupport,
  signupCta,
  signInTitle,
  signInSupport,
  signInCta,
  awaitingSupport,
}: QuickClientAccountModalProps) {
  const titleId = useId();
  const descId = useId();
  const formId = useId();
  const submittingRef = useRef(false);
  const closingRef = useRef(false);
  const { refreshSession } = useAuthSession();
  const [view, setView] = useState<View>("signup");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [syncedKey, setSyncedKey] = useState("");

  const openKey = open ? `${purpose}:${returnPath}` : "";

  if (open && syncedKey !== openKey) {
    setSyncedKey(openKey);
    setView("signup");
    setError(null);
    setSending(false);
    setPassword("");
    closingRef.current = false;
  } else if (!open && syncedKey) {
    setSyncedKey("");
  }

  function hideGateDom(target: EventTarget | null) {
    const el =
      (target instanceof Element ? target.closest(".login-gate") : null) ??
      document.querySelector(".login-gate");
    if (!(el instanceof HTMLElement)) return;

    el.setAttribute("aria-hidden", "true");
    el.classList.add("login-gate--dismissed");
    /* Inline display:none wins immediately — do not wait on class cascade / React. */
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("pointer-events", "none", "important");
    el.style.setProperty("opacity", "0", "important");
    el.style.backdropFilter = "none";
    el.style.setProperty("-webkit-backdrop-filter", "none");
    el.querySelectorAll<HTMLElement>(".login-gate__dialog").forEach((dialog) => {
      dialog.style.animation = "none";
      dialog.style.setProperty("display", "none", "important");
      dialog.style.backdropFilter = "none";
      dialog.style.setProperty("-webkit-backdrop-filter", "none");
    });
  }

  function dismissGateNow(target: EventTarget | null = null) {
    if (closingRef.current) return;
    closingRef.current = true;
    /*
     * Hide in this gesture turn, then defer React/store close until after paint.
     * Sync closeSaveSignupModal() re-renders before the browser can paint
     * display:none; unlocking .app-main scroll then reflows Explore and the
     * dismiss feels multi-second on Search (iPhone).
     */
    hideGateDom(target);
    requestAnimationFrame(() => {
      onClose();
    });
  }

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("login-gate-open");
    document.documentElement.classList.add("login-gate-open");

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      dismissGateNow(document.querySelector(".login-gate"));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      /* Unlock after the closed frame paints — Explore reflow stays off the critical path. */
      requestAnimationFrame(() => {
        document.body.classList.remove("login-gate-open");
        document.documentElement.classList.remove("login-gate-open");
      });
    };
  }, [open, onClose]);

  function requestClose(
    _source: "x" | "backdrop" | "link",
    event?: React.SyntheticEvent
  ) {
    event?.preventDefault();
    event?.stopPropagation();
    dismissGateNow(event?.currentTarget ?? null);
  }

  async function handleQuickSignup() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    setError(null);

    const start =
      purpose === "save" ? startSaveQuickAccount : startMenuQuickAccount;
    const result = await start({
      firstName,
      email,
      returnPath,
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
    await onAuthenticated();
    setSending(false);
    submittingRef.current = false;
  }

  async function handleSignIn() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    setError(null);

    const signIn =
      purpose === "save" ? signInClientForSave : signInClientForAccount;
    const result = await signIn(email, password);
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
    await onAuthenticated();
    setSending(false);
    submittingRef.current = false;
  }

  if (!open || typeof document === "undefined") return null;

  const resolvedSignupTitle =
    signupTitle ??
    (purpose === "save" ? "Save this specialist" : "Create your account");
  const resolvedSignupSupport =
    signupSupport ??
    (purpose === "save"
      ? "Enter your first name and email to add this specialist to your saved list."
      : "Enter your first name and email to create a lightweight account.");
  const resolvedSignupCta =
    signupCta ?? (purpose === "save" ? "Continue & Save" : "Continue");
  const resolvedSignInTitle =
    signInTitle ?? (purpose === "save" ? "Log in to save" : "Log in");
  const resolvedSignInSupport =
    signInSupport ??
    (purpose === "save"
      ? `Sign in to add${specialistName ? ` ${specialistName}` : " this specialist"} to your saved list.`
      : "Sign in to access your shortlist and account.");
  const resolvedSignInCta =
    signInCta ?? (purpose === "save" ? "Log in & Save" : "Log in");
  const resolvedAwaiting =
    awaitingSupport ??
    (purpose === "save"
      ? "Open the secure link we sent. Your save is stored — we’ll finish it as soon as you’re signed in."
      : "Open the secure link we sent. Your account will be ready once you verify.");

  const title =
    view === "signin"
      ? resolvedSignInTitle
      : view === "awaiting_email"
        ? "Check your email"
        : resolvedSignupTitle;
  const support =
    view === "signin"
      ? resolvedSignInSupport
      : view === "awaiting_email"
        ? resolvedAwaiting
        : resolvedSignupSupport;

  return createPortal(
    <div
      className="login-gate"
      role="presentation"
      onPointerUp={(event) => {
        if (event.target !== event.currentTarget) return;
        requestClose("backdrop", event);
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        requestClose("backdrop", event);
      }}
    >
      <div
        className={cn("login-gate__dialog", "login-gate__dialog--save")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="login-gate__glow" aria-hidden />

        <button
          type="button"
          className="smoac-control login-gate__close"
          aria-label="Close"
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            /* Dismiss on press — waiting for click/up feels laggy on iOS. */
            requestClose("x", event);
          }}
          onClick={(event) => requestClose("x", event)}
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="login-gate__content login-gate__content--save">
          {view === "signup" ? (
            <div className="login-gate__reassure">
              <h2 id={titleId} className="login-gate__reassure-title">
                Quick sign up
              </h2>
              <p className="login-gate__reassure-punch">
                Email and that&apos;s it!
              </p>
              <p id={descId} className="login-gate__reassure-sub">
                Browse and compare specialists near you instantly.
              </p>
            </div>
          ) : (
            <>
              <h2 id={titleId} className="login-gate__title">
                {title}
              </h2>
              <p id={descId} className="login-gate__body">
                {support}
              </p>
            </>
          )}

          {view === "signup" ? (
            <QuickClientAccountSignupFields
              variant="login-gate"
              idPrefix={formId}
              firstName={firstName}
              email={email}
              onFirstNameChange={setFirstName}
              onEmailChange={setEmail}
            />
          ) : null}

          {view === "signin" ? (
            <QuickClientAccountSigninFields
              variant="login-gate"
              idPrefix={formId}
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
            />
          ) : null}

          <QuickClientAccountAuthError variant="login-gate" message={error} />

          {view !== "awaiting_email" ? (
            <QuickClientAccountAuthActions
              variant="login-gate"
              view={view === "signin" ? "signin" : "signup"}
              sending={sending}
              signupCta={resolvedSignupCta}
              signInCta={resolvedSignInCta}
              onSignup={() => void handleQuickSignup()}
              onSignIn={() => void handleSignIn()}
              onSwitchToSignin={() => {
                setView("signin");
                setError(null);
              }}
              onSwitchToSignup={() => {
                setView("signup");
                setError(null);
              }}
              onOpenFullLogin={(event) => {
                if (event) requestClose("link", event);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
