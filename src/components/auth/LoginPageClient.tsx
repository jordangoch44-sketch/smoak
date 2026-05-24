"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CREATE_ACCOUNT_PATH } from "@/components/auth/LoginGateModal";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/toast";
import { useSaveToast } from "@/contexts/SaveToastContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import {
  DEV_INVALID_LOGIN_MESSAGE,
  validateDevLogin,
} from "@/lib/dev-auth";
import { resolvePostLoginNavigation } from "@/lib/post-login-flow";
import type { AuthRole } from "@/types/auth";
import { cn } from "@/lib/utils";

const ROLES: {
  id: AuthRole;
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

export function LoginPageClient() {
  const router = useRouter();
  const { isReady, session, signIn } = useAuthSession();
  const { showToast: showSaveToast } = useSaveToast();
  const { showToast } = useToast();
  const [role, setRole] = useState<AuthRole>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isReady || !session) return;
    router.replace(getDashboardPathForRole(session.role));
  }, [isReady, session, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setError(DEV_INVALID_LOGIN_MESSAGE);
      return;
    }

    const validatedRole = validateDevLogin(role, trimmedEmail, password);
    if (!validatedRole) {
      setError(DEV_INVALID_LOGIN_MESSAGE);
      return;
    }

    setSubmitting(true);
    signIn(validatedRole, trimmedEmail);

    showToast({
      type: "success",
      message: `Logged in as ${trimmedEmail}`,
    });

    const { path, toast } = resolvePostLoginNavigation(validatedRole);
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
              {ROLES.map((option) => {
                const selected = role === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRole(option.id)}
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

            <div className="login-form__section login-fields">
              <label className="login-field">
                <span className="login-field__label">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="login-field__input"
                />
              </label>

              <label className="login-field">
                <span className="login-field__label">Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="login-field__input"
                />
              </label>
            </div>

            <div className="login-form__section login-form__section--cta">
              {error ? (
                <p className="login-card__message" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="login-submit"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Continue"}
              </button>
            </div>

            <div className="login-card__links">
              <Link href={CREATE_ACCOUNT_PATH} className="login-card__link">
                Create account
              </Link>
              <button type="button" className="login-card__link">
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
