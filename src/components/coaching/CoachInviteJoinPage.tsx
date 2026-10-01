"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { CLIENT_DASHBOARD_PATH } from "@/lib/auth-routes";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { getAuthCallbackUrl } from "@/lib/auth/site-origin";
import {
  claimCoachingInviteLink,
  coachingInvitePath,
  fetchCoachingInvitePreview,
  requestAcceptCoaching,
  type CoachingInvitePreview,
} from "@/lib/coaching/coaching-service";
import { formatCoachName } from "@/lib/coaching/coach-workout";
import { SITE_ROUTES } from "@/lib/navigation";
import "@/styles/coaching.css";

type Mode = "signup" | "signin";

const DEAD_LINK_COPY: Record<string, string> = {
  missing: "This invite link doesn’t exist. Check the link or ask your specialist for a new one.",
  revoked: "This invite link is no longer active. Ask your specialist for a new one.",
  expired: "This invite link has expired. Ask your specialist for a new one.",
  claimed: "This invite link was already used. Ask your specialist for a new one.",
};

/** /join/<token>: sign up (or log in) and accept a specialist's roster invite. */
export function CoachInviteJoinPage({ token }: { token: string }) {
  const router = useRouter();
  const { isReady, session, signUp, signInWithPassword, signOut } = useAuthSession();
  const [preview, setPreview] = useState<CoachingInvitePreview | "missing" | null>(null);
  const [mode, setMode] = useState<Mode>("signup");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;
    let cancelled = false;
    void fetchCoachingInvitePreview(supabase, token).then((result) => {
      if (cancelled) return;
      setPreview(result ?? "missing");
      if (result?.clientFirstName) setFirstName((current) => current || result.clientFirstName);
    });
    return () => {
      cancelled = true;
    };
  }, [token, session?.userId]);

  async function accept() {
    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    let result = await requestAcceptCoaching({ token });
    if (!result.ok && result.message === "Sign in to continue.") {
      // Fresh sign-up whose session cookie hasn't reached the server yet: claim without emails.
      result = await claimCoachingInviteLink(supabase, token);
    }
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    router.replace(CLIENT_DASHBOARD_PATH);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "signup"
        ? await signUp("client", email, password, {
            firstName: firstName.trim(),
            emailRedirectTo: getAuthCallbackUrl(coachingInvitePath(token)) ?? undefined,
          })
        : await signInWithPassword("client", email, password);
    if (result.ok === "confirm_email") {
      setBusy(false);
      setConfirmEmail(result.email);
      return;
    }
    if (result.ok !== true) {
      setBusy(false);
      setError(result.message);
      return;
    }
    if (result.session.role !== "client") {
      setBusy(false);
      setError("That’s a specialist account. Use a client account to join.");
      return;
    }
    await accept();
  }

  const coach =
    preview && preview !== "missing" && preview.specialistName.trim()
      ? preview.specialistName.trim()
      : "Your specialist";
  const coachFirst = coach === "Your specialist" ? "they" : formatCoachName(coach);
  const status = preview === "missing" ? "missing" : preview?.status;

  function renderBody() {
    if (!preview || !isReady) {
      return <p className="coach-join__muted">Loading your invite…</p>;
    }
    if (status === "accepted") {
      return (
        <>
          <p className="coach-join__copy">You’re on {coach}’s roster.</p>
          <FastActivateButton
            className="coaching-btn coaching-btn--primary coach-join__cta"
            onActivate={() => router.replace(CLIENT_DASHBOARD_PATH)}
          >
            Go to your dashboard
          </FastActivateButton>
        </>
      );
    }
    if (status && status !== "valid") {
      return (
        <>
          <p className="coach-join__copy">{DEAD_LINK_COPY[status]}</p>
          <FastActivateButton
            className="coaching-btn coach-join__cta"
            onActivate={() => router.push(SITE_ROUTES.home)}
          >
            Browse SMOAC
          </FastActivateButton>
        </>
      );
    }
    if (confirmEmail) {
      return (
        <p className="coach-join__copy">
          We sent a confirmation link to <strong>{confirmEmail}</strong>. Tap it and you’ll come
          back here to accept.
        </p>
      );
    }
    if (session?.role === "specialist") {
      return (
        <>
          <p className="coach-join__copy">
            You’re signed in as a specialist. Sign out, then join with a client account.
          </p>
          <FastActivateButton
            className="coaching-btn coach-join__cta"
            onActivate={() => void signOut()}
          >
            Sign out
          </FastActivateButton>
        </>
      );
    }
    if (session) {
      return (
        <>
          <p className="coach-join__copy">
            Signed in as {session.email}. Accept to let {coachFirst} send workouts to your
            calendar.
          </p>
          <FastActivateButton
            className="coaching-btn coaching-btn--primary coach-join__cta"
            disabled={busy}
            onActivate={() => void accept()}
          >
            {busy ? "Accepting…" : "Accept invite"}
          </FastActivateButton>
        </>
      );
    }
    return (
      <form className="coach-join__form" onSubmit={(event) => void submit(event)}>
        {mode === "signup" ? (
          <label className="coach-join__field">
            First name
            <input
              className="roster-send__input"
              value={firstName}
              autoComplete="given-name"
              required
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
        ) : null}
        <label className="coach-join__field">
          Email
          <input
            className="roster-send__input"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="coach-join__field">
          Password
          <input
            className="roster-send__input"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === "signup" ? (
          <p className="coach-join__muted">At least 8 characters.</p>
        ) : null}
        {error ? <p className="coaching-error">{error}</p> : null}
        <button
          type="submit"
          className="coaching-btn coaching-btn--primary coach-join__cta"
          disabled={busy}
        >
          {busy
            ? "One moment…"
            : mode === "signup"
              ? "Create account & accept"
              : "Log in & accept"}
        </button>
        <FastActivateButton
          className="coaching-btn coaching-btn--quiet coach-join__switch"
          onActivate={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
        >
          {mode === "signup" ? "Already have an account? Log in" : "New here? Create an account"}
        </FastActivateButton>
      </form>
    );
  }

  return (
    <main className="coach-join">
      <section className="coach-join__card">
        <p className="coaching-card__eyebrow">Coaching invite</p>
        <h1 className="coach-join__title">
          {status === "valid" || status === "accepted"
            ? `${coach} invited you to train on SMOAC`
            : "Join your coach on SMOAC"}
        </h1>
        {status === "valid" && !session ? (
          <p className="coach-join__muted">
            Create an account to get workouts from {coachFirst} on your calendar. They only see
            the workouts they send you.
          </p>
        ) : null}
        {renderBody()}
        {session && status === "valid" && error ? <p className="coaching-error">{error}</p> : null}
      </section>
    </main>
  );
}
