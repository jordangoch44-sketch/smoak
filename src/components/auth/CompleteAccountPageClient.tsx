"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Logo } from "@/components/ui/Logo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  getMarketplaceAuthClient,
  getCurrentMarketplaceSession,
  updatePassword,
} from "@/lib/auth/marketplace-auth";
import { ensureClientProfileForAuthUser } from "@/lib/auth/ensure-client-profile";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { setAuthSession } from "@/lib/auth-session-store";
import {
  lockPendingSaveUntilPasswordDone,
  markPasswordSetupDoneLocally,
  schedulePendingSaveResume,
} from "@/lib/auth/pending-save-resume";
import { peekPendingSaveRecord } from "@/lib/pending-save-storage";
import { cn } from "@/lib/utils";

const VERIFY_TIMEOUT_MS = 9_000;
const MIN_PASSWORD_LENGTH = 8;
const LOCK_BODY_CLASS = "complete-account-lock";

type PagePhase = "verifying" | "password" | "success" | "recovery";

function passwordStrengthLabel(password: string): string {
  if (password.length === 0) return "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `At least ${MIN_PASSWORD_LENGTH} characters required`;
  }
  return "Meets minimum length";
}

function SecuringAccountLoader() {
  return (
    <div className="complete-account-loader" role="status" aria-live="polite">
      <div className="complete-account-loader__ring" aria-hidden>
        <span className="complete-account-loader__orbit" />
      </div>
      <div className="complete-account-loader__dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p className="complete-account-loader__title">Securing your account…</p>
      <p className="complete-account-loader__sub">
        This should only take a moment.
      </p>
    </div>
  );
}

function ButtonSpinner() {
  return <span className="complete-account-btn-spinner" aria-hidden />;
}

function SuccessMark() {
  return (
    <div className="complete-account-success-mark" aria-hidden>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function CompleteAccountPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuthSession();
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [phase, setPhase] = useState<PagePhase>("verifying");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settledRef = useRef(false);

  const resumeSave = searchParams.get("save") === "1";

  const email = (authUser?.email ?? "").trim().toLowerCase();
  const passwordsMatch =
    password.length > 0 && confirm.length > 0 && password === confirm;
  const passwordValid = password.trim().length >= MIN_PASSWORD_LENGTH;
  const canSubmit = passwordValid && passwordsMatch && !submitting;

  useEffect(() => {
    setMounted(true);
    lockPendingSaveUntilPasswordDone();
    document.body.classList.add(LOCK_BODY_CLASS);
    document.documentElement.classList.add(LOCK_BODY_CLASS);
    return () => {
      document.body.classList.remove(LOCK_BODY_CLASS);
      document.documentElement.classList.remove(LOCK_BODY_CLASS);
    };
  }, []);

  function settleWithUser(user: User) {
    if (settledRef.current) return;
    settledRef.current = true;
    setAuthUser(user);

    const setupStatus =
      typeof user.user_metadata?.password_setup_status === "string"
        ? user.user_metadata.password_setup_status
        : null;

    if (setupStatus === "complete" || setupStatus === "skipped") {
      markPasswordSetupDoneLocally();
      setPhase("success");
    } else {
      setPhase("password");
    }

    const supabase = getMarketplaceAuthClient();
    if (supabase) {
      void ensureClientProfileForAuthUser(supabase, user).then((result) => {
        if (!result.ok) {
          console.error("[complete-account] profile ensure", result.message);
        }
      });
    }
  }

  function settleRecovery() {
    if (settledRef.current) return;
    settledRef.current = true;
    setPhase("recovery");
  }

  useEffect(() => {
    const supabase = getMarketplaceAuthClient();
    if (!supabase) {
      settleRecovery();
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled && !settledRef.current) {
        settleRecovery();
      }
    }, VERIFY_TIMEOUT_MS);

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (cancelled || settledRef.current) return;
      if (sessionError) {
        console.error("[complete-account] getSession", sessionError.message);
      }
      const user = data.session?.user ?? null;
      if (user) {
        settleWithUser(user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || settledRef.current) return;
      if (
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED") &&
        session?.user
      ) {
        settleWithUser(session.user);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const strengthText = useMemo(
    () => passwordStrengthLabel(password),
    [password]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      markPasswordSetupDoneLocally();
      void refreshSession();

      /* Profile sync only — do NOT apply pending save until the user chooses. */
      void (async () => {
        try {
          const supabase = getMarketplaceAuthClient();
          if (supabase && authUser) {
            const ensure = await ensureClientProfileForAuthUser(
              supabase,
              authUser
            );
            if (!ensure.ok) {
              console.error(
                "[complete-account] profile ensure after password",
                ensure.message
              );
            }
          }
          await refreshSession();
          const nextSession = await getCurrentMarketplaceSession();
          if (nextSession) setAuthSession(nextSession);
        } catch (syncError) {
          console.error("[complete-account] post-password sync", syncError);
        }
      })();

      setPhase("success");
      showToast({ type: "success", message: "Password created." });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save your password. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function unlockAndContinue(choice: "profile" | "browse") {
    const pending = peekPendingSaveRecord();
    const returnPath =
      pending?.profilePath?.trim() ||
      (pending?.specialistId
        ? `/trainers/${pending.specialistId}`
        : "/explore");

    if (choice === "profile") {
      if (resumeSave || pending) {
        schedulePendingSaveResume("after_profile");
      }
      document.body.classList.remove(LOCK_BODY_CLASS);
      document.documentElement.classList.remove(LOCK_BODY_CLASS);
      void refreshSession();
      router.replace("/client-dashboard?editProfile=1");
      return;
    }

    if (resumeSave || pending) {
      schedulePendingSaveResume("immediate");
    }
    document.body.classList.remove(LOCK_BODY_CLASS);
    document.documentElement.classList.remove(LOCK_BODY_CLASS);
    void refreshSession();
    router.replace(returnPath);
  }

  const card = (
    <div className="login-card login-card--complete">
      {phase === "verifying" ? (
        <>
          <div className="login-card__header">
            <h1 id="complete-account-title" className="login-card__title">
              Finish setting up your account
            </h1>
          </div>
          <SecuringAccountLoader />
        </>
      ) : null}

      {phase === "recovery" ? (
        <>
          <div className="login-card__header">
            <h1 id="complete-account-title" className="login-card__title">
              We couldn’t verify this sign-in link
            </h1>
            <p className="login-card__subtitle">
              The link may have expired or already been used. Request a new link
              to continue.
            </p>
          </div>
          <div className="login-form__section login-form__section--cta complete-account-actions">
            <Link
              href={`${LOGIN_PATH}?method=magic_link`}
              className="login-submit complete-account-actions__primary"
            >
              Send a new sign-in link
            </Link>
            <Link
              href={LOGIN_PATH}
              className="login-card__link complete-account-actions__secondary"
            >
              Return to sign in
            </Link>
          </div>
        </>
      ) : null}

      {phase === "success" ? (
        <>
          <div className="login-card__header login-card__header--success">
            <SuccessMark />
            <h1 id="complete-account-title" className="login-card__title">
              Your account is ready
            </h1>
            <p className="login-card__subtitle">
              Your password has been created. You can now securely sign back in
              anytime.
            </p>
          </div>
          <div className="login-form__section login-form__section--cta complete-account-actions">
            <button
              type="button"
              className="login-submit"
              onClick={() => unlockAndContinue("profile")}
            >
              Finish creating your profile
            </button>
            <button
              type="button"
              className="login-submit login-submit--ghost"
              onClick={() => unlockAndContinue("browse")}
            >
              Continue browsing
            </button>
          </div>
        </>
      ) : null}

      {phase === "password" ? (
        <>
          <div className="login-card__header complete-account-header">
            <h1 id="complete-account-title" className="login-card__title complete-account-title">
              Finish setting up your account
            </h1>
            <p className="login-card__subtitle complete-account-subtitle">
              Your email is confirmed. Create a password so you can securely sign
              back in.
            </p>
          </div>

          <form
            className="login-card__form complete-account-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="complete-account-field">
              <label className="complete-account-field__label" htmlFor="complete-account-email">
                Email
              </label>
              <input
                id="complete-account-email"
                type="email"
                name="email"
                value={email}
                readOnly
                aria-readonly="true"
                className="login-field__input complete-account-field__input login-field__input--confirmed"
              />
              <div className="complete-account-confirmed" aria-live="polite">
                <svg
                  className="complete-account-confirmed__icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Confirmed</span>
              </div>
            </div>

            <div className="complete-account-field">
              <label
                className="complete-account-field__label"
                htmlFor="complete-account-password"
              >
                Create password
              </label>
              <PasswordInput
                id="complete-account-password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                className="complete-account-field__input"
              />
              {strengthText ? (
                <p
                  className={cn(
                    "complete-account-field__helper",
                    passwordValid
                      ? "complete-account-field__helper--ok"
                      : "complete-account-field__helper--warn"
                  )}
                >
                  {strengthText}
                </p>
              ) : null}
            </div>

            <div className="complete-account-field">
              <label
                className="complete-account-field__label"
                htmlFor="complete-account-confirm"
              >
                Confirm password
              </label>
              <PasswordInput
                id="complete-account-confirm"
                name="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError(null);
                }}
                placeholder="Re-enter password"
                className="complete-account-field__input"
              />
              {confirm.length > 0 ? (
                <p
                  className={cn(
                    "complete-account-field__helper",
                    passwordsMatch
                      ? "complete-account-field__helper--ok"
                      : "complete-account-field__helper--warn"
                  )}
                >
                  {passwordsMatch
                    ? "Passwords match"
                    : "Passwords do not match"}
                </p>
              ) : null}
            </div>

            {error ? (
              <p
                className="login-card__message login-card__message--error login-card__message--error-visible"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="complete-account-form__submit">
              <button
                type="submit"
                className={cn(
                  "login-submit complete-account-submit",
                  submitting && "login-submit--loading"
                )}
                disabled={!canSubmit}
                aria-busy={submitting}
              >
                {submitting ? (
                  <span className="complete-account-submit-row">
                    <ButtonSpinner />
                    Creating password…
                  </span>
                ) : (
                  "Create password"
                )}
              </button>
            </div>
          </form>
        </>
      ) : null}
    </div>
  );

  if (!mounted || typeof document === "undefined") {
    return (
      <div className="complete-account-lock-shell" aria-hidden>
        <div className="complete-account-lock-shell__brand">
          <Logo href="/" size="lg" priority />
        </div>
      </div>
    );
  }

  return createPortal(
    <div
      className="complete-account-lock"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.preventDefault();
      }}
    >
      <div className="complete-account-lock__backdrop" aria-hidden />
      <div
        className="complete-account-lock__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-account-title"
      >
        <div className="complete-account-lock__brand">
          <Logo href="/" size="lg" priority />
        </div>
        {card}
      </div>
    </div>,
    document.body
  );
}
