"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  HeartIcon,
  LockIcon,
  MailIcon,
  UserPlusIcon,
} from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import {
  QuickClientAccountAuthActions,
  QuickClientAccountAuthError,
  QuickClientAccountSigninFields,
} from "@/components/auth/QuickClientAccountAuthUI";
import {
  ensureInquiryClientProfileAfterAuth,
  QUICK_CLIENT_EMAIL_PATTERN,
  QUICK_CLIENT_PASSWORD_MIN_LENGTH,
  signInClientForAccount,
  signInClientForSave,
  startMenuQuickAccount,
  startSaveQuickAccount,
} from "@/lib/auth/inquiry-auth";
import { setAuthSession } from "@/lib/auth-session-store";
import { blockSaveSignupReopen } from "@/lib/save-signup-modal-store";
import { useAuthSession } from "@/hooks/useAuthSession";
import { cn } from "@/lib/utils";

type View = "signup" | "signin" | "awaiting_email";
type SignupStep = "email" | "password";

export type QuickClientAccountPurpose = "save" | "account";

export interface QuickClientAccountModalProps {
  open: boolean;
  onClose: () => void;
  purpose: QuickClientAccountPurpose;
  returnPath: string;
  /** Used when purpose is save — specialist display name for copy */
  specialistName?: string;
  /** After session exists (and profile ensured). Caller may apply pending save. */
  onAuthenticated: () => void | Promise<void>;
  signupTitle?: string;
  signupSupport?: string;
  signupCta?: string;
  signInTitle?: string;
  signInSupport?: string;
  signInCta?: string;
  awaitingSupport?: string;
}

export function QuickClientAccountModal({
  open,
  onClose,
  purpose,
  returnPath,
  specialistName,
  onAuthenticated,
  signupTitle,
  signupSupport,
  signupCta,
  signInTitle,
  signInSupport,
  signInCta,
  awaitingSupport,
}: QuickClientAccountModalProps) {
  const titleId = useId();
  const descId = useId();
  const formId = useId();
  const submittingRef = useRef(false);
  const closingRef = useRef(false);
  const gestureEatCleanupRef = useRef<(() => void) | null>(null);
  const { session, refreshSession } = useAuthSession();
  const isSpecialistSession = session?.role === "specialist";
  const [view, setView] = useState<View>("signup");
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [syncedKey, setSyncedKey] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  /** React-owned hide — imperative-only styles get wiped if OverlayHost re-renders. */
  const [dismissed, setDismissed] = useState(false);
  const backdropDismiss = useOwnPointerDismiss(() => requestClose("backdrop"));

  const openKey = open ? `${purpose}:${returnPath}` : "";

  if (open && syncedKey !== openKey) {
    setSyncedKey(openKey);
    setView("signup");
    setSignupStep("email");
    setError(null);
    setSending(false);
    setPassword("");
    setConfirmPassword("");
    closingRef.current = false;
    setDismissed(false);
  } else if (!open && syncedKey) {
    setSyncedKey("");
  }

  useEffect(() => {
    if (!open || view !== "signup" || signupStep !== "password") return;
    const frame = window.requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, view, signupStep]);

  useEffect(() => {
    return () => {
      gestureEatCleanupRef.current?.();
      gestureEatCleanupRef.current = null;
    };
  }, []);

  function armGestureEat() {
    gestureEatCleanupRef.current?.();
    const eat = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener("pointerup", eat, true);
    document.addEventListener("mouseup", eat, true);
    document.addEventListener("touchend", eat, true);
    document.addEventListener("click", eat, true);
    const timeoutId = window.setTimeout(() => {
      document.removeEventListener("pointerup", eat, true);
      document.removeEventListener("mouseup", eat, true);
      document.removeEventListener("touchend", eat, true);
      document.removeEventListener("click", eat, true);
      if (gestureEatCleanupRef.current) gestureEatCleanupRef.current = null;
    }, 650);
    gestureEatCleanupRef.current = () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("pointerup", eat, true);
      document.removeEventListener("mouseup", eat, true);
      document.removeEventListener("touchend", eat, true);
      document.removeEventListener("click", eat, true);
    };
  }

  function hideGateDom(target: EventTarget | null) {
    const el =
      (target instanceof Element ? target.closest(".login-gate") : null) ??
      document.querySelector(".login-gate");
    if (!(el instanceof HTMLElement)) return;

    el.setAttribute("aria-hidden", "true");
    el.classList.add("login-gate--dismissed");
    /*
     * Opacity hide only — keep the layer hit-testing so the rest of this
     * gesture cannot fall through to Explore hearts / card links.
     * Never use display:none or pointer-events:none here.
     */
    el.style.setProperty("opacity", "0", "important");
    el.style.backdropFilter = "none";
    el.style.setProperty("-webkit-backdrop-filter", "none");
    el.querySelectorAll<HTMLElement>(".login-gate__dialog").forEach((dialog) => {
      dialog.style.animation = "none";
      dialog.style.setProperty("opacity", "0", "important");
      dialog.style.backdropFilter = "none";
      dialog.style.setProperty("-webkit-backdrop-filter", "none");
    });
  }

  function dismissGateNow(target: EventTarget | null = null) {
    if (closingRef.current || dismissed) return;
    closingRef.current = true;
    /*
     * Order matters on Search/iPhone:
     * 1) Block heart reopen for the residual click
     * 2) Visually hide while STILL capturing taps
     * 3) Eat the rest of the gesture at document level
     * 4) Close React after paint; unlock scroll later so Explore blur
     *    reveal does not stall the dismiss frame
     */
    blockSaveSignupReopen();
    setDismissed(true);
    hideGateDom(target);
    armGestureEat();
    requestAnimationFrame(() => {
      onClose();
    });
  }

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("login-gate-open");
    document.documentElement.classList.add("login-gate-open");

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      dismissGateNow(document.querySelector(".login-gate"));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      /* Keep scroll lock briefly so Explore GPU layers unlock off the dismiss frame. */
      window.setTimeout(() => {
        if (document.querySelector(".login-gate")) return;
        document.body.classList.remove("login-gate-open");
        document.documentElement.classList.remove("login-gate-open");
      }, 180);
    };
  }, [open, onClose]);

  function requestClose(
    _source: "x" | "backdrop" | "link",
    event?: React.SyntheticEvent
  ) {
    event?.preventDefault();
    event?.stopPropagation();
    dismissGateNow(event?.currentTarget ?? null);
  }

  async function handleQuickSignup() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    setError(null);

    const start =
      purpose === "save" ? startSaveQuickAccount : startMenuQuickAccount;
    const result = await start({
      email,
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
        setSignupStep("email");
        setPassword("");
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
    await refreshSession();
    await onAuthenticated();
    setSending(false);
    submittingRef.current = false;
  }

  function handleSignupPrimary() {
    if (sending) return;
    setError(null);

    if (signupStep === "email") {
      const nextEmail = email.trim().toLowerCase();
      if (!QUICK_CLIENT_EMAIL_PATTERN.test(nextEmail)) {
        setError("Enter a valid email address.");
        return;
      }
      setEmail(nextEmail);
      setSignupStep("password");
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

    void handleQuickSignup();
  }

  function handleBackToEmail() {
    setSignupStep("email");
    setError(null);
    window.requestAnimationFrame(() => emailInputRef.current?.focus());
  }

  async function handleSignIn() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    setError(null);

    const signIn =
      purpose === "save" ? signInClientForSave : signInClientForAccount;
    const result = await signIn(email, password);
    if (result.ok !== true) {
      setSending(false);
      submittingRef.current = false;
      setError(
        result.ok === "confirm_email"
          ? "Check your email to confirm your account, then return here."
          : result.message
      );
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
    await refreshSession();
    await onAuthenticated();
    setSending(false);
    submittingRef.current = false;
  }

  if (!open || typeof document === "undefined") return null;

  const resolvedSignupTitle =
    signupTitle ??
    (purpose === "save" ? "Save this specialist" : "Create your account");
  const resolvedSignupSupport =
    signupSupport ??
    (purpose === "save"
      ? "Save them now. Finish setting up your account later."
      : "Save specialists now. Finish setting up your account later.");
  const resolvedSignupCta =
    signupCta ?? (purpose === "save" ? "Save Specialist" : "Continue");
  const resolvedSignInTitle =
    signInTitle ?? (purpose === "save" ? "Log in to save" : "Log in");
  const resolvedSignInSupport =
    signInSupport ??
    (purpose === "save"
      ? `Sign in to add${specialistName ? ` ${specialistName}` : " this specialist"} to your saved list.`
      : "Sign in to access your shortlist and account.");
  const resolvedSignInCta =
    signInCta ?? (purpose === "save" ? "Log in & Save" : "Log in");
  const resolvedAwaiting =
    awaitingSupport ??
    (purpose === "save"
      ? "Open the secure link we sent. Your save is stored — we’ll finish it as soon as you’re signed in."
      : "Open the secure link we sent. Your account will be ready once you verify.");

  const title =
    view === "signin"
      ? resolvedSignInTitle
      : view === "awaiting_email"
        ? "Check your email"
        : isSpecialistSession
          ? (signupTitle ?? "Client account required")
          : resolvedSignupTitle;
  const support =
    view === "signin"
      ? resolvedSignInSupport
      : view === "awaiting_email"
        ? resolvedAwaiting
        : isSpecialistSession
          ? (signupSupport ??
            "You are signed in to a specialist profile. To save favorites, create or log in to a client account.")
          : resolvedSignupSupport;
  const signupButtonLabel =
    sending && signupStep === "password"
      ? purpose === "save"
        ? "Saving…"
        : "Creating…"
      : resolvedSignupCta;

  return createPortal(
    <div
      className={cn("login-gate", dismissed && "login-gate--dismissed")}
      role="presentation"
      onPointerDown={(event) => {
        if (dismissed) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        backdropDismiss.onPointerDown(event);
      }}
      onPointerUp={(event) => {
        if (dismissed) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        backdropDismiss.onPointerUp(event);
      }}
      onClick={(event) => {
        if (dismissed) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        backdropDismiss.onClick();
      }}
    >
      <div
        className={cn("login-gate__dialog", "login-gate__dialog--save")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="login-gate__glow" aria-hidden />

        <FastActivateButton
          className="smoac-control login-gate__close"
          aria-label="Close"
          onActivate={() => requestClose("x")}
        >
          <CloseIcon className="h-4 w-4" />
        </FastActivateButton>

        <div className="login-gate__content login-gate__content--save">
          <div className="login-gate__hero">
            <div className="login-gate__hero-icon">
              <span className="login-gate__hero-icon-ring" />
              {purpose === "save" ? (
                <HeartIcon className="login-gate__hero-glyph" />
              ) : (
                <UserPlusIcon className="login-gate__hero-glyph" />
              )}
            </div>
            <h2 id={titleId} className="login-gate__title">
              {title}
            </h2>
            <p id={descId} className="login-gate__body">
              {support}
            </p>
          </div>

          {view === "signup" ? (
            <form
              className="login-gate__form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSignupPrimary();
              }}
            >
              <div
                className={cn(
                  "login-gate__slides",
                  signupStep === "password" && "login-gate__slides--password"
                )}
              >
                <div
                  className="login-gate__slide login-gate__slide--email"
                  {...(signupStep !== "email" ? { inert: true } : {})}
                >
                  <label
                    className="login-gate__label"
                    htmlFor={`${formId}-email`}
                  >
                    Email address
                  </label>
                  <div className="login-gate__field">
                    <MailIcon className="login-gate__field-icon" />
                    <input
                      ref={emailInputRef}
                      id={`${formId}-email`}
                      type="email"
                      className="login-gate__input login-gate__input--icon"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </div>

                <div
                  className="login-gate__slide login-gate__slide--password"
                  {...(signupStep !== "password" ? { inert: true } : {})}
                >
                  <FastActivateButton
                    className="smoac-control login-gate__email-back"
                    onActivate={handleBackToEmail}
                  >
                    <ChevronLeftIcon className="login-gate__email-back-icon" />
                    <span>{email || "Use a different email"}</span>
                  </FastActivateButton>
                  <label
                    className="login-gate__label"
                    htmlFor={`${formId}-password`}
                  >
                    Password
                  </label>
                  <div className="login-gate__field">
                    <LockIcon className="login-gate__field-icon" />
                    <input
                      ref={passwordInputRef}
                      id={`${formId}-password`}
                      type="password"
                      className="login-gate__input login-gate__input--icon"
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                  <label
                    className="login-gate__label"
                    htmlFor={`${formId}-confirm-password`}
                  >
                    Confirm password
                  </label>
                  <div className="login-gate__field">
                    <LockIcon className="login-gate__field-icon" />
                    <input
                      id={`${formId}-confirm-password`}
                      type="password"
                      className="login-gate__input login-gate__input--icon"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <QuickClientAccountAuthError
                variant="login-gate"
                message={error}
              />

              <FastActivateButton
                className="smoac-control login-gate__btn login-gate__btn--aurora"
                disabled={sending}
                onActivate={handleSignupPrimary}
              >
                <span className="login-gate__cta-label">
                  {signupButtonLabel}
                  {sending ? null : (
                    <ChevronRightIcon className="login-gate__cta-arrow" />
                  )}
                </span>
              </FastActivateButton>

              <p className="login-gate__footnote">
                Already have an account?{" "}
                <FastActivateButton
                  className="smoac-control login-gate__footnote-link"
                  onActivate={() => {
                    setView("signin");
                    setSignupStep("email");
                    setPassword("");
                    setConfirmPassword("");
                    setError(null);
                  }}
                >
                  Log in
                </FastActivateButton>
              </p>
            </form>
          ) : null}

          {view === "signin" ? (
            <>
              <QuickClientAccountSigninFields
                variant="login-gate"
                idPrefix={formId}
                email={email}
                password={password}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
              />
              <QuickClientAccountAuthError
                variant="login-gate"
                message={error}
              />
              <QuickClientAccountAuthActions
                variant="login-gate"
                view="signin"
                sending={sending}
                signupCta={resolvedSignupCta}
                signInCta={resolvedSignInCta}
                onSignup={() => void handleQuickSignup()}
                onSignIn={() => void handleSignIn()}
                onSwitchToSignin={() => {
                  setView("signin");
                  setError(null);
                }}
                onSwitchToSignup={() => {
                  setView("signup");
                  setSignupStep("email");
                  setPassword("");
                  setConfirmPassword("");
                  setError(null);
                }}
                onOpenFullLogin={(event) => {
                  if (event) requestClose("link", event);
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
