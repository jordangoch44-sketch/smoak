"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon, LockIcon, MailIcon } from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { useAuthSession } from "@/hooks/useAuthSession";
import { setAuthSession } from "@/lib/auth-session-store";
import type { AuthSession } from "@/types/auth";
import { SITE_ROUTES } from "@/lib/navigation";
import {
  ensureInquiryClientProfileAfterAuth,
  QUICK_CLIENT_EMAIL_PATTERN,
  QUICK_CLIENT_PASSWORD_MIN_LENGTH,
  signInClientForAccount,
  startMenuQuickAccount,
} from "@/lib/auth/inquiry-auth";

type GateView = "signup" | "signin" | "awaiting_email";

interface ReviewAccountGateProps {
  initialMode: "signup" | "signin";
  onClose: () => void;
  onAuthenticated: (result: {
    created: boolean;
    email: string;
    firstName?: string;
  }) => void | Promise<void>;
}

export function ReviewAccountGate({
  initialMode,
  onClose,
  onAuthenticated,
}: ReviewAccountGateProps) {
  const titleId = useId();
  const formId = useId();
  const submittingRef = useRef(false);
  const { refreshSession } = useAuthSession();
  const [view, setView] = useState<GateView>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const backdropDismiss = useOwnPointerDismiss(() => {
    if (submittingRef.current) return;
    onClose();
  });

  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || submittingRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function finishAuthenticated(created: boolean, session: AuthSession) {
    await refreshSession();
    setSending(false);
    submittingRef.current = false;
    await onAuthenticated({
      created,
      email: session.email,
      firstName: session.firstName,
    });
  }

  async function handleSignup() {
    if (submittingRef.current || view !== "signup") return;
    setError(null);

    const nextEmail = email.trim().toLowerCase();
    if (!QUICK_CLIENT_EMAIL_PATTERN.test(nextEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < QUICK_CLIENT_PASSWORD_MIN_LENGTH) {
      setError(
        `Password must be at least ${QUICK_CLIENT_PASSWORD_MIN_LENGTH} characters.`
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don’t match.");
      return;
    }

    submittingRef.current = true;
    setSending(true);
    setEmail(nextEmail);

    const returnPath = `${window.location.pathname}${window.location.search}`;
    const result = await startMenuQuickAccount({
      email: nextEmail,
      password,
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
        setConfirmPassword("");
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
    await finishAuthenticated(true, ensured.session);
  }

  async function handleSignIn() {
    if (submittingRef.current || view !== "signin") return;
    setError(null);

    const nextEmail = email.trim().toLowerCase();
    if (!QUICK_CLIENT_EMAIL_PATTERN.test(nextEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    submittingRef.current = true;
    setSending(true);
    setEmail(nextEmail);

    const result = await signInClientForAccount(nextEmail, password);
    if (result.ok !== true) {
      setSending(false);
      submittingRef.current = false;
      setError(
        result.ok === "confirm_email"
          ? "Check your email to confirm your account, then return here to submit your review."
          : result.message
      );
      if (result.ok === "confirm_email") {
        setView("awaiting_email");
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
    await finishAuthenticated(false, ensured.session);
  }

  function switchMode(next: "signup" | "signin") {
    if (sending) return;
    setView(next);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  const title =
    view === "signin"
      ? "Log in"
      : view === "awaiting_email"
        ? "Check your email"
        : "Create an account";

  return (
    <div
      className="review-account-gate"
      role="presentation"
      onPointerDown={(event) => {
        event.stopPropagation();
        backdropDismiss.onPointerDown(event);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        backdropDismiss.onPointerUp(event);
      }}
      onClick={(event) => {
        event.stopPropagation();
        backdropDismiss.onClick();
      }}
    >
      <FastActivateButton
        className="review-account-gate__backdrop smoac-control"
        aria-label="Back to review"
        disabled={sending}
        onActivate={onClose}
      />
      <div
        className="review-account-gate__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="review-account-gate__header">
          <h2 id={titleId} className="review-account-gate__title">
            {title}
          </h2>
          <FastActivateButton
            className="smoac-control review-modal__close"
            aria-label="Back to review"
            disabled={sending}
            onActivate={onClose}
          >
            <CloseIcon className="h-5 w-5" />
          </FastActivateButton>
        </header>

        {view === "awaiting_email" ? (
          <div className="review-account-gate__body">
            <p className="review-account-gate__support">
              Confirm {email || "your email"} from the link we sent. This
              review stays here — come back and submit it once you’re signed
              in.
            </p>
            <FastActivateButton
              className="smoac-control review-modal__submit"
              onActivate={onClose}
            >
              Back to review
            </FastActivateButton>
          </div>
        ) : (
          <form
            className="review-account-gate__body"
            onSubmit={(event) => {
              event.preventDefault();
              if (view === "signup") void handleSignup();
              else void handleSignIn();
            }}
          >
            <p className="review-account-gate__support">
              Email sign-up or sign-in to leave a review.
            </p>

            <label className="review-modal__label" htmlFor={`${formId}-email`}>
              Email
            </label>
            <div className="review-account-gate__field">
              <MailIcon className="review-account-gate__field-icon" />
              <input
                id={`${formId}-email`}
                type="email"
                className="review-account-gate__input"
                autoComplete="email"
                inputMode="email"
                placeholder="you@email.com"
                value={email}
                disabled={sending}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <label
              className="review-modal__label"
              htmlFor={`${formId}-password`}
            >
              Password
            </label>
            <div className="review-account-gate__field">
              <LockIcon className="review-account-gate__field-icon" />
              <input
                id={`${formId}-password`}
                type="password"
                className="review-account-gate__input"
                autoComplete={
                  view === "signup" ? "new-password" : "current-password"
                }
                placeholder={
                  view === "signup" ? "Create a password" : "Your password"
                }
                value={password}
                disabled={sending}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {view === "signup" ? (
              <>
                <label
                  className="review-modal__label"
                  htmlFor={`${formId}-confirm`}
                >
                  Verify password
                </label>
                <div className="review-account-gate__field">
                  <LockIcon className="review-account-gate__field-icon" />
                  <input
                    id={`${formId}-confirm`}
                    type="password"
                    className="review-account-gate__input"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    disabled={sending}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </>
            ) : null}

            {error ? (
              <p className="review-modal__error" role="alert">
                {error}
              </p>
            ) : null}

            <FastActivateButton
              className="smoac-control review-modal__submit review-account-gate__submit"
              disabled={sending}
              onActivate={() => {
                if (view === "signup") void handleSignup();
                else void handleSignIn();
              }}
            >
              {sending
                ? view === "signup"
                  ? "Creating…"
                  : "Logging in…"
                : view === "signup"
                  ? "Create account"
                  : "Log in"}
            </FastActivateButton>

            <FastActivateButton
              className="smoac-control review-modal__or-login"
              disabled={sending}
              onActivate={() =>
                switchMode(view === "signup" ? "signin" : "signup")
              }
            >
              {view === "signup" ? "or log in" : "or create an account"}
            </FastActivateButton>

            {view === "signup" ? (
              <p className="auth-legal-notice">
                By continuing, you agree to SMOAC’s{" "}
                <a
                  href={SITE_ROUTES.terms}
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href={SITE_ROUTES.privacy}
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy
                </a>
                .
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
