"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { buildJoinFlowHref } from "@/lib/join-flow";
import { Logo } from "@/components/ui/Logo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AlertTriangleIcon, CloseIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useSaveToast } from "@/contexts/SaveToastContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import { PUBLIC_INVALID_LOGIN_MESSAGE, type PublicAuthRole } from "@/lib/dev-auth";
import type { AuthRole } from "@/types/auth";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { getUserRole } from "@/lib/specialist-saves";
import { isAuthReturnToSaved } from "@/lib/auth-return";
import { resolvePostLoginNavigation, navigateAfterAuth } from "@/lib/post-login-flow";
import { cn } from "@/lib/utils";

const LOGIN_FAILURE_DELAY_MS = 300;
const ERROR_FADE_MS = 220;

interface RoleMismatchState {
  expectedRole: PublicAuthRole;
  actualRole: AuthRole;
  message: string;
}

const PUBLIC_LOGIN_ROLES: {
  id: PublicAuthRole;
  title: string;
  description: string;
}[] = [
  {
    id: "client",
    title: "Continue as Client",
    description: "Save specialists, compare profiles, and manage inquiries.",
  },
  {
    id: "specialist",
    title: "Continue as Specialist",
    description: "Manage your profile, leads, and marketplace visibility.",
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const returnToSaved = isAuthReturnToSaved(searchParams);
  const reducedMotion = useReducedMotion();
  const { isReady, session, signInWithPassword } = useAuthSession();
  const { showToast: showSaveToast } = useSaveToast();
  const { showToast } = useToast();
  const [role, setRole] = useState<PublicAuthRole>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [roleMismatch, setRoleMismatch] = useState<RoleMismatchState | null>(null);
  const [roleMismatchActive, setRoleMismatchActive] = useState(false);
  const roleMismatchDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [fieldsError, setFieldsError] = useState(false);
  const [shakeFields, setShakeFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitPressed, setSubmitPressed] = useState(false);
  const errorFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roleMismatchActive) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearRoleMismatchModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [roleMismatchActive]);

  function clearRoleMismatchModal() {
    setRoleMismatchActive(false);
    if (roleMismatchDismissTimerRef.current) {
      clearTimeout(roleMismatchDismissTimerRef.current);
    }
    roleMismatchDismissTimerRef.current = setTimeout(() => {
      setRoleMismatch(null);
      roleMismatchDismissTimerRef.current = null;
    }, 220);
    setFieldsError(false);
    setError(null);
    setErrorVisible(false);
  }

  function handleSwitchRole(targetRole: PublicAuthRole) {
    setRole(targetRole);
    clearRoleMismatchModal();
  }

  useEffect(() => {
    return () => {
      if (errorFadeTimerRef.current) {
        clearTimeout(errorFadeTimerRef.current);
      }
      if (roleMismatchDismissTimerRef.current) {
        clearTimeout(roleMismatchDismissTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (submitting || submitPressed || roleMismatch || roleMismatchActive) return;
    if (!isReady || !session || session.role === "admin") return;
    const publicRole = getUserRole(session);
    if (!publicRole) return;
    /* Pending specialists must land on their dashboard, not the homepage. */
    navigateAfterAuth(
      returnToSaved && publicRole === "client"
        ? "/saved"
        : getDashboardPathForRole(publicRole)
    );
  }, [isReady, session, returnToSaved, submitting, submitPressed, roleMismatch, roleMismatchActive]);

  useEffect(() => {
    if (searchParams.get("error") !== "auth_callback") return;
    setRoleMismatch(null);
    setError(
      "That email link is invalid or has expired. Sign in with your password, or use Forgot password."
    );
    setErrorVisible(true);
    setFieldsError(true);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (errorFadeTimerRef.current) {
        clearTimeout(errorFadeTimerRef.current);
      }
    };
  }, []);

  function clearLoginError() {
    if (!fieldsError && !error && !roleMismatchActive) return;

    setFieldsError(false);
    setShakeFields(false);
    setErrorVisible(false);

    if (errorFadeTimerRef.current) {
      clearTimeout(errorFadeTimerRef.current);
    }

    errorFadeTimerRef.current = setTimeout(() => {
      setError(null);
      if (!roleMismatchActive) {
        setRoleMismatch(null);
      }
      errorFadeTimerRef.current = null;
    }, ERROR_FADE_MS);
  }

  function triggerFieldsShake() {
    if (reducedMotion) return;
    setShakeFields(false);
    requestAnimationFrame(() => setShakeFields(true));
  }

  async function showLoginFailure(message?: string) {
    setRoleMismatchActive(false);
    setRoleMismatch(null);
    setError(message ?? PUBLIC_INVALID_LOGIN_MESSAGE);
    setFieldsError(true);
    setErrorVisible(true);
    triggerFieldsShake();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (errorFadeTimerRef.current) {
      clearTimeout(errorFadeTimerRef.current);
      errorFadeTimerRef.current = null;
    }
    if (roleMismatchDismissTimerRef.current) {
      clearTimeout(roleMismatchDismissTimerRef.current);
      roleMismatchDismissTimerRef.current = null;
    }

    setErrorVisible(false);
    setFieldsError(false);
    setShakeFields(false);

    setSubmitPressed(true);
    setSubmitting(true);

    await delay(LOGIN_FAILURE_DELAY_MS);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setSubmitPressed(false);
      setSubmitting(false);
      await showLoginFailure();
      return;
    }

    const result = await signInWithPassword(
      role,
      trimmedEmail,
      trimmedPassword
    );

    if (result.ok === false) {
      setSubmitPressed(false);
      setSubmitting(false);
      if (
        result.reason === "role_mismatch" &&
        result.expectedRole &&
        result.actualRole
      ) {
        setRoleMismatch({
          expectedRole: result.expectedRole,
          actualRole: result.actualRole,
          message: result.message,
        });
        setRoleMismatchActive(true);
        setError(null);
        setFieldsError(false);
        setErrorVisible(false);
        return;
      }
      setRoleMismatchActive(false);
      setRoleMismatch(null);
      await showLoginFailure(result.message);
      return;
    }

    if (result.ok !== true) {
      setSubmitPressed(false);
      setSubmitting(false);
      await showLoginFailure();
      return;
    }

    setSubmitPressed(false);

    showToast({
      type: "success",
      message: "Welcome back.",
    });

    const signedInRole = getUserRole(result.session);
    if (!signedInRole) {
      setSubmitPressed(false);
      setSubmitting(false);
      await showLoginFailure();
      return;
    }

    /* Keep the picker in sync with the account we actually signed into. */
    if (signedInRole !== role) {
      setRole(signedInRole);
    }

    const { path, toast } = resolvePostLoginNavigation(signedInRole, {
      returnToSaved,
    });
    if (toast) {
      showSaveToast(toast);
    }

    /* Hard navigate so the proxy sees auth cookies (soft push can bounce to /login). */
    navigateAfterAuth(path);
  }

  const publicSessionRole =
    !submitting &&
    !roleMismatch &&
    !roleMismatchActive &&
    isReady &&
    session &&
    session.role !== "admin"
      ? getUserRole(session)
      : null;

  if (publicSessionRole) {
    return (
      <div className="login-page" aria-busy="true">
        <div className="login-page__canvas" aria-hidden>
          <div className="atmosphere-mesh">
            <div className="atmosphere-blob atmosphere-blob--indigo" />
            <div className="atmosphere-blob atmosphere-blob--blue" />
            <div className="atmosphere-blob atmosphere-blob--violet" />
            <div className="atmosphere-blob atmosphere-blob--magenta" />
            <div className="atmosphere-blob atmosphere-blob--pink" />
            <div className="atmosphere-blob atmosphere-blob--core" />
          </div>
          <div className="login-page__card-glow" />
          <div className="atmosphere-vignette atmosphere-vignette--soft" />
          <div className="atmosphere-grain" />
        </div>
        <div className="login-page__shell">
          <div className="login-card">
            <p className="login-card__eyebrow">Welcome back</p>
            <h1 className="login-card__title">Opening your account…</h1>
            <p className="login-card__subtitle">
              Taking you to your {publicSessionRole} dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page" data-login-role={role}>
      <div className="login-page__canvas" aria-hidden>
        <div className="atmosphere-mesh">
          <div className="atmosphere-blob atmosphere-blob--indigo" />
          <div className="atmosphere-blob atmosphere-blob--blue" />
          <div className="atmosphere-blob atmosphere-blob--violet" />
          <div className="atmosphere-blob atmosphere-blob--magenta" />
          <div className="atmosphere-blob atmosphere-blob--pink" />
          <div className="atmosphere-blob atmosphere-blob--core" />
        </div>
        <div className="login-page__card-glow" />
        <div className="atmosphere-vignette atmosphere-vignette--soft" />
        <div className="atmosphere-grain" />
      </div>

      <div className="login-page__shell">
        <header className="login-page__brand">
          <Logo href="/" size="lg" priority />
        </header>

        <div className="login-card">
          <div className="login-card__header">
            <h1 className="login-card__title">Log In</h1>
            <p className="login-card__subtitle">
              Sign in to your SMOAC account.
            </p>
          </div>

          <form
            className="login-card__form"
            onSubmit={handlePasswordSubmit}
            noValidate
          >
            <div
              className="login-form__section login-role-list"
              role="radiogroup"
              aria-label="Account type"
            >
              {PUBLIC_LOGIN_ROLES.map((option) => {
                const selected = role === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setRole(option.id);
                      clearLoginError();
                    }}
                    className={cn(
                      "login-role-card",
                      option.id === "client" && "login-role-card--client",
                      option.id === "specialist" && "login-role-card--specialist",
                      selected && "login-role-card--active"
                    )}
                  >
                    <span className="login-role-card__indicator" aria-hidden>
                      <span className="login-role-card__indicator-dot" />
                    </span>
                    <span className="login-role-card__copy">
                      <span className="login-role-card__title">
                        {option.title}
                      </span>
                      <span className="login-role-card__desc">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                "login-form__section login-fields",
                fieldsError && "login-fields--error",
                shakeFields && "login-fields--shake"
              )}
              onAnimationEnd={() => setShakeFields(false)}
            >
              <label className="login-field">
                <span className="login-field__label">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearLoginError();
                  }}
                  placeholder="you@example.com"
                  className="login-field__input"
                  aria-invalid={fieldsError}
                />
              </label>

              <label className="login-field">
                <span className="login-field__label">Password</span>
                <PasswordInput
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearLoginError();
                  }}
                  placeholder="Password"
                  aria-invalid={fieldsError}
                />
              </label>

              {error ? (
                <p
                  className={cn(
                    "login-card__message login-card__message--error",
                    errorVisible && "login-card__message--error-visible",
                    !errorVisible && "login-card__message--error-hidden"
                  )}
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div className="login-form__section login-form__section--cta">
              <button
                type="submit"
                className={cn(
                  "login-submit",
                  submitting && "login-submit--loading",
                  submitPressed && "login-submit--pressed"
                )}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </div>

            <div className="login-card__links login-card__links--compact">
              <Link href={buildJoinFlowHref()} className="login-card__link">
                Create account
              </Link>
              <Link
                href="/login/forgot-password"
                className="login-card__link"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>

      {roleMismatch && (
        <div
          className={cn(
            "login-modal-backdrop",
            roleMismatchActive && "login-modal-backdrop--active",
            !roleMismatchActive && "login-modal-backdrop--closing"
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-mismatch-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              clearRoleMismatchModal();
            }
          }}
        >
          <div
            className={cn(
              "login-modal-dialog",
              roleMismatchActive && "login-modal-dialog--active",
              !roleMismatchActive && "login-modal-dialog--closing"
            )}
          >
            <button
              type="button"
              className="login-modal-dialog__close"
              onClick={clearRoleMismatchModal}
              aria-label="Close dialog"
            >
              <CloseIcon className="h-4 w-4" />
            </button>

            <div className="login-modal-dialog__badge" aria-hidden>
              <AlertTriangleIcon className="login-modal-dialog__badge-icon" />
            </div>

            <h2 id="role-mismatch-title" className="login-modal-dialog__title">
              {roleMismatch.actualRole === "client"
                ? "Client Account Detected"
                : roleMismatch.actualRole === "specialist"
                ? "Specialist Account Detected"
                : roleMismatch.actualRole === "admin"
                ? "Admin Account Detected"
                : "Account Type Mismatch"}
            </h2>

            <p className="login-modal-dialog__desc">
              {roleMismatch.actualRole === "client"
                ? "This email is registered as a client account. Switch to Client Sign In to continue without retyping your password."
                : roleMismatch.actualRole === "specialist"
                ? "This email is registered as a specialist account. Switch to Specialist Sign In to access your portal."
                : roleMismatch.message}
            </p>

            <div className="login-modal-dialog__actions">
              {roleMismatch.actualRole === "client" ? (
                <button
                  type="button"
                  onClick={() => handleSwitchRole("client")}
                  className="login-modal-dialog__btn login-modal-dialog__btn--primary"
                  autoFocus
                >
                  Switch to Client Login
                </button>
              ) : roleMismatch.actualRole === "specialist" ? (
                <button
                  type="button"
                  onClick={() => handleSwitchRole("specialist")}
                  className="login-modal-dialog__btn login-modal-dialog__btn--primary"
                  autoFocus
                >
                  Switch to Specialist Login
                </button>
              ) : (
                <Link
                  href="/internal/login"
                  className="login-modal-dialog__btn login-modal-dialog__btn--primary"
                >
                  Go to Admin Portal
                </Link>
              )}

              <button
                type="button"
                onClick={clearRoleMismatchModal}
                className="login-modal-dialog__btn login-modal-dialog__btn--ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
