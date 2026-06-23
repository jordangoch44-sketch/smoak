"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/toast";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { updatePassword } from "@/lib/auth/marketplace-auth";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { useSupabaseConfig } from "@/contexts/SupabaseConfigContext";
import { cn } from "@/lib/utils";

export function ResetPasswordPageClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enabled: supabaseEnabled } = useSupabaseConfig();
  const [sessionReady, setSessionReady] = useState(() => !supabaseEnabled);

  useEffect(() => {
    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    showToast({ type: "success", message: result.message });
    router.replace(LOGIN_PATH);
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
            <h1 className="login-card__title">Choose a new password</h1>
            <p className="login-card__subtitle">
              {sessionReady
                ? "Enter your new password below."
                : "Loading secure session…"}
            </p>
          </div>

          <form className="login-card__form" onSubmit={handleSubmit} noValidate>
            <div className="login-form__section login-fields">
              <label className="login-field">
                <span className="login-field__label">New password</span>
                <PasswordInput
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                />
              </label>

              <label className="login-field">
                <span className="login-field__label">Confirm password</span>
                <PasswordInput
                  name="confirm"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError(null);
                  }}
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
                disabled={submitting || !sessionReady}
                aria-busy={submitting}
              >
                {submitting ? "Updating…" : "Update password"}
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
