"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { useInternalAuthSession } from "@/hooks/useInternalAuthSession";
import { INTERNAL_INVALID_LOGIN_MESSAGE } from "@/lib/internal-auth";
import { INTERNAL_DASHBOARD_PATH } from "@/lib/internal-routes";
import type { AdminRoleType } from "@/types/admin-permissions";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/PasswordInput";

const LOGIN_FAILURE_DELAY_MS = 280;

const INTERNAL_LOGIN_ROLES: {
  id: AdminRoleType;
  title: string;
  description: string;
}[] = [
  {
    id: "owner_admin",
    title: "Sign in as Admin",
    description: "Full platform access, revenue, and settings.",
  },
  {
    id: "staff_admin",
    title: "Sign in as Staff",
    description: "Applications, specialists, and client operations.",
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function InternalLoginPageClient() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { isReady, session, signInWithPassword } = useInternalAuthSession();
  const [adminRole, setAdminRole] = useState<AdminRoleType>("owner_admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldsError, setFieldsError] = useState(false);
  const [shakeFields, setShakeFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const errorFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isReady || !session) return;
    router.replace(INTERNAL_DASHBOARD_PATH);
  }, [isReady, session, router]);

  useEffect(() => {
    return () => {
      if (errorFadeTimerRef.current) {
        clearTimeout(errorFadeTimerRef.current);
      }
    };
  }, []);

  function clearLoginError() {
    setFieldsError(false);
    setShakeFields(false);
    setError(null);
  }

  function triggerFieldsShake() {
    if (reducedMotion) return;
    setShakeFields(false);
    requestAnimationFrame(() => setShakeFields(true));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    await delay(LOGIN_FAILURE_DELAY_MS);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError(INTERNAL_INVALID_LOGIN_MESSAGE);
      setFieldsError(true);
      triggerFieldsShake();
      setSubmitting(false);
      return;
    }

    const result = await signInWithPassword(
      adminRole,
      trimmedEmail,
      trimmedPassword
    );

    if (!result.ok) {
      setError(result.message ?? INTERNAL_INVALID_LOGIN_MESSAGE);
      setFieldsError(true);
      triggerFieldsShake();
      setSubmitting(false);
      return;
    }

    router.replace(INTERNAL_DASHBOARD_PATH);
    setSubmitting(false);
  }

  return (
    <div className="internal-login">
      <div className="internal-login__panel">
        <header className="internal-login__header">
          <p className="internal-login__eyebrow">SMOAC</p>
          <h1 className="internal-login__title">Executive Portal</h1>
          <p className="internal-login__subtitle">Authorized access only</p>
        </header>

        <form className="internal-login__form" onSubmit={handleSubmit} noValidate>
          <div
            className="internal-login__role-list"
            role="radiogroup"
            aria-label="Access level"
          >
            {INTERNAL_LOGIN_ROLES.map((option) => {
              const selected = adminRole === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setAdminRole(option.id);
                    clearLoginError();
                  }}
                  className={cn(
                    "internal-login__role",
                    selected && "internal-login__role--active"
                  )}
                >
                  <span className="internal-login__role-indicator" aria-hidden>
                    <span className="internal-login__role-dot" />
                  </span>
                  <span className="internal-login__role-copy">
                    <span className="internal-login__role-title">
                      {option.title}
                    </span>
                    <span className="internal-login__role-desc">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              "internal-login__fields",
              fieldsError && "internal-login__fields--error",
              shakeFields && "internal-login__fields--shake"
            )}
            onAnimationEnd={() => setShakeFields(false)}
          >
            <label className="internal-login__field">
              <span className="internal-login__label">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearLoginError();
                }}
                className="internal-login__input"
                aria-invalid={fieldsError}
              />
            </label>

            <label className="internal-login__field">
              <span className="internal-login__label">Password</span>
              <PasswordInput
                variant="internal"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearLoginError();
                }}
                aria-invalid={fieldsError}
              />
            </label>

            {error ? (
              <p className="internal-login__error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="internal-login__submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
