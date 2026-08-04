"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { buildJoinFlowHref } from "@/lib/join-flow";
import { Logo } from "@/components/ui/Logo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/toast";
import { useSaveToast } from "@/contexts/SaveToastContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import { PUBLIC_INVALID_LOGIN_MESSAGE, type PublicAuthRole } from "@/lib/dev-auth";
import { sendMagicLinkForLogin } from "@/lib/auth/marketplace-auth";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { getUserRole } from "@/lib/specialist-saves";
import { isAuthReturnToSaved } from "@/lib/auth-return";
import { resolvePostLoginNavigation, navigateAfterAuth } from "@/lib/post-login-flow";
import { cn } from "@/lib/utils";

const LOGIN_FAILURE_DELAY_MS = 300;
const ERROR_FADE_MS = 220;

type SignInMethod = "password" | "magic_link";

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
  const [signInMethod, setSignInMethod] = useState<SignInMethod>(() =>
    searchParams.get("method") === "magic_link" ? "magic_link" : "password"
  );
  const [magicLinkSent, setMagicLinkSent] = useState(false);
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
    const publicRole = getUserRole(session);
    if (!publicRole) return;
    /* Pending specialists must land on their dashboard, not the homepage. */
    navigateAfterAuth(
      returnToSaved && publicRole === "client"
        ? "/saved"
        : getDashboardPathForRole(publicRole)
    );
  }, [isReady, session, returnToSaved]);

  useEffect(() => {
    if (searchParams.get("error") !== "auth_callback") return;
    setMagicLinkSent(false);
    setSignInMethod("password");
    setError(
      "That sign-in link is invalid or has expired. Request a new link or sign in with your password."
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

  async function showLoginFailure(message?: string) {
    setError(message ?? PUBLIC_INVALID_LOGIN_MESSAGE);
    setFieldsError(true);
    setErrorVisible(true);
    triggerFieldsShake();
  }

  function switchSignInMethod(next: SignInMethod) {
    setSignInMethod(next);
    setMagicLinkSent(false);
    clearLoginError();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
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

    const result = await signInWithPassword(
      role,
      trimmedEmail,
      trimmedPassword
    );

    if (result.ok === false) {
      setSubmitPressed(false);
      setSubmitting(false);
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

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (errorFadeTimerRef.current) {
      clearTimeout(errorFadeTimerRef.current);
      errorFadeTimerRef.current = null;
    }

    setErrorVisible(false);
    setFieldsError(false);
    setShakeFields(false);
    setSubmitting(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setSubmitting(false);
      await showLoginFailure("Enter your email address.");
      return;
    }

    const result = await sendMagicLinkForLogin({
      email: trimmedEmail,
      role,
      returnToSaved,
    });

    setSubmitting(false);

    if (!result.ok) {
      await showLoginFailure(result.message);
      return;
    }

    setMagicLinkSent(true);
    setEmail(result.email);
  }

  const title = magicLinkSent ? "Check your email" : "Log In";
  const subtitle = magicLinkSent
    ? `We sent a secure sign-in link to ${email}. Open it on this device to continue.`
    : signInMethod === "magic_link"
      ? "Enter your email and we’ll send you a sign-in link."
      : "Sign in to your SMOAC account.";

  const publicSessionRole =
    isReady && session && session.role !== "admin"
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
            <h1 className="login-card__title">{title}</h1>
            <p className="login-card__subtitle">{subtitle}</p>
          </div>

          {magicLinkSent ? (
            <div className="login-card__form">
              <p className="login-card__message login-card__message--success">
                Open the link on this device to sign in. Your account and saved
                specialists will be waiting.
              </p>
              <div className="login-form__section login-form__section--cta">
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => {
                    setMagicLinkSent(false);
                    clearLoginError();
                  }}
                >
                  Send another link
                </button>
              </div>
              <div className="login-card__links login-card__links--compact">
                <button
                  type="button"
                  className="login-card__link login-card__link--button"
                  onClick={() => switchSignInMethod("password")}
                >
                  Sign in with password instead
                </button>
              </div>
            </div>
          ) : (
            <form
              className="login-card__form"
              onSubmit={
                signInMethod === "password"
                  ? handlePasswordSubmit
                  : handleMagicLinkSubmit
              }
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
                className="login-form__section login-method-switch"
                role="tablist"
                aria-label="Sign-in method"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={signInMethod === "password"}
                  className={cn(
                    "login-method-switch__btn",
                    signInMethod === "password" &&
                      "login-method-switch__btn--active"
                  )}
                  onClick={() => switchSignInMethod("password")}
                >
                  Password
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={signInMethod === "magic_link"}
                  className={cn(
                    "login-method-switch__btn",
                    signInMethod === "magic_link" &&
                      "login-method-switch__btn--active"
                  )}
                  onClick={() => switchSignInMethod("magic_link")}
                >
                  Email link
                </button>
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

                {signInMethod === "password" ? (
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
                ) : null}

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
                  {submitting
                    ? signInMethod === "magic_link"
                      ? "Sending link…"
                      : "Signing in…"
                    : signInMethod === "magic_link"
                      ? "Email me a sign-in link"
                      : "Sign in"}
                </button>
              </div>

              <div className="login-card__links login-card__links--compact">
                <Link href={buildJoinFlowHref()} className="login-card__link">
                  Create account
                </Link>
                {signInMethod === "password" ? (
                  <Link
                    href="/login/forgot-password"
                    className="login-card__link"
                  >
                    Forgot password?
                  </Link>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
