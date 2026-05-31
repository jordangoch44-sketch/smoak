"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { buildJoinFlowHref } from "@/lib/join-flow";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/toast";
import { useSaveToast } from "@/contexts/SaveToastContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import {
  PUBLIC_INVALID_LOGIN_MESSAGE,
  validateDevLogin,
  type PublicAuthRole,
} from "@/lib/dev-auth";
import { isAuthReturnToSaved } from "@/lib/auth-return";
import { resolvePostLoginNavigation } from "@/lib/post-login-flow";
import { cn } from "@/lib/utils";

const LOGIN_FAILURE_DELAY_MS = 300;
const ERROR_FADE_MS = 220;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToSaved = isAuthReturnToSaved(searchParams);
  const reducedMotion = useReducedMotion();
  const { isReady, session, signIn } = useAuthSession();
  const { showToast: showSaveToast } = useSaveToast();
  const { showToast } = useToast();
  const [role, setRole] = useState<PublicAuthRole>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [fieldsError, setFieldsError] = useState(false);
  const [shakeFields, setShakeFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitPressed, setSubmitPressed] = useState(false);
  const errorFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isReady || !session || session.role === "admin") return;
    if (returnToSaved && session.role === "client") {
      router.replace("/saved");
      return;
    }
    router.replace(getDashboardPathForRole(session.role));
  }, [isReady, session, router, returnToSaved]);

  useEffect(() => {
    return () => {
      if (errorFadeTimerRef.current) {
        clearTimeout(errorFadeTimerRef.current);
      }
    };
  }, []);

  function clearLoginError() {
    if (!fieldsError && !error) return;

    setFieldsError(false);
    setShakeFields(false);
    setErrorVisible(false);

    if (errorFadeTimerRef.current) {
      clearTimeout(errorFadeTimerRef.current);
    }

    errorFadeTimerRef.current = setTimeout(() => {
      setError(null);
      errorFadeTimerRef.current = null;
    }, ERROR_FADE_MS);
  }

  function triggerFieldsShake() {
    if (reducedMotion) return;
    setShakeFields(false);
    requestAnimationFrame(() => setShakeFields(true));
  }

  async function showLoginFailure() {
    setError(PUBLIC_INVALID_LOGIN_MESSAGE);
    setFieldsError(true);
    setErrorVisible(true);
    triggerFieldsShake();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (errorFadeTimerRef.current) {
      clearTimeout(errorFadeTimerRef.current);
      errorFadeTimerRef.current = null;
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

    const validatedRole = validateDevLogin(role, trimmedEmail, trimmedPassword);
    if (!validatedRole || validatedRole === "admin") {
      setSubmitPressed(false);
      setSubmitting(false);
      await showLoginFailure();
      return;
    }

    setSubmitPressed(false);
    signIn(validatedRole, trimmedEmail);

    showToast({
      type: "success",
      message: "Welcome back.",
    });

    const { path, toast } = resolvePostLoginNavigation(validatedRole, {
      returnToSaved,
    });
    if (toast) {
      showSaveToast(toast);
    }

    window.setTimeout(() => {
      router.push(path);
      setSubmitting(false);
    }, 80);
  }

  return (
    <div className="login-page">
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
            <h1 className="login-card__title">Welcome back</h1>
            <p className="login-card__subtitle">
              Choose how you want to continue.
            </p>
          </div>

          <form className="login-card__form" onSubmit={handleSubmit} noValidate>
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
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearLoginError();
                  }}
                  placeholder="Password"
                  className="login-field__input"
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

            <div className="login-card__links">
              <Link href={buildJoinFlowHref()} className="login-card__link">
                Create account
              </Link>
              <button
                type="button"
                className="login-card__link"
                onClick={() =>
                  showToast({
                    type: "info",
                    message:
                      "Password reset will be available when accounts launch.",
                  })
                }
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
