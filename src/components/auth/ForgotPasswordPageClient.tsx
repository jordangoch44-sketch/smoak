"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/toast";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { resetPasswordForEmail } from "@/lib/auth/marketplace-auth";
import { cn } from "@/lib/utils";

export function ForgotPasswordPageClient() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await resetPasswordForEmail(email);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    showToast({ type: "success", message: result.message });
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
            <h1 className="login-card__title">Reset password</h1>
            <p className="login-card__subtitle">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          <form className="login-card__form" onSubmit={handleSubmit} noValidate>
            <div className="login-form__section login-fields">
              <label className="login-field">
                <span className="login-field__label">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  className="login-field__input"
                />
              </label>

              {error ? (
                <p
                  className="login-card__message login-card__message--error login-card__message--error-visible"
                  role="alert"
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
                  submitting && "login-submit--loading"
                )}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </div>

            <div className="login-card__links">
              <Link href={LOGIN_PATH} className="login-card__link">
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
