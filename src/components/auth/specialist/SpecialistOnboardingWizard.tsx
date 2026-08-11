"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/toast";
import { SmoacSavingMark } from "@/components/brand/SmoacSavingMark";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfilePhotoCropSession } from "@/hooks/useProfilePhotoCropSession";
import {
  SPECIALIST_ONBOARDING_STEP_LABELS,
  SPECIALIST_ONBOARDING_TOTAL_STEPS,
} from "@/constants/specialist-onboarding-options";
import { LOGIN_PATH, SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import { ApplicationSubmitError } from "@/lib/specialist-application-validation";
import { submitSpecialistApplication } from "@/lib/specialist-application-submit";
import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
  loadSpecialistOnboardingDraft,
  persistSpecialistOnboardingDraft,
} from "@/lib/specialist-application-storage";
import { patchAuthSessionAvatarUrl } from "@/lib/profiles/update-profile-avatar";
import {
  getSpecialistOnboardingAuthGaps,
  getSpecialistOnboardingMissingFields,
} from "@/lib/specialist-onboarding-validation";
import { isValidEmail } from "@/lib/validation/email";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistOnboardingState,
} from "@/types/specialist-application";
import { SpecialistOnboardingSteps } from "@/components/auth/specialist/SpecialistOnboardingSteps";
import {
  sendSpecialistEmailVerificationCode,
  verifySpecialistEmailVerificationCode,
} from "@/lib/auth/specialist-email-verify";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { saveSpecialistSignupProfile } from "@/lib/profiles/profile-service";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

function stepProgressPercent(step: OnboardingStep): number {
  return Math.round(((step - 1) / SPECIALIST_ONBOARDING_TOTAL_STEPS) * 100);
}

interface SpecialistOnboardingWizardProps {
  onBackToRole: () => void;
}

export function SpecialistOnboardingWizard({
  onBackToRole,
}: SpecialistOnboardingWizardProps) {
  const router = useRouter();
  const { signInWithPassword, refreshSession } = useAuthSession();
  const { showToast } = useToast();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [state, setState] = useState<SpecialistOnboardingState>(() => {
    if (typeof window === "undefined") {
      return INITIAL_SPECIALIST_ONBOARDING_STATE;
    }
    return loadSpecialistOnboardingDraft() ?? INITIAL_SPECIALIST_ONBOARDING_STATE;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState<string | null>(
    null
  );
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [resendingConfirm, setResendingConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFieldsError, setPasswordFieldsError] = useState(false);
  const [shakePasswordFields, setShakePasswordFields] = useState(false);
  const profilePhotoCrop = useProfilePhotoCropSession();

  function flagPasswordFieldsError(message: string) {
    setError(message);
    setPasswordFieldsError(true);
    setShakePasswordFields(true);
  }

  function clearPasswordFieldsError() {
    setPasswordFieldsError(false);
    setError(null);
  }

  const progressPercent = stepProgressPercent(step);

  useEffect(() => {
    persistSpecialistOnboardingDraft(state);
  }, [state]);

  /* Each Continue / Back question should land the user at the top of the step. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [step]);

  const goToPendingApplicationPortal = useCallback(async () => {
    const priorAvatar = getAuthSessionSnapshot()?.avatarUrl?.trim() || "";
    try {
      await refreshSession();
    } catch {
      /* Session may already be current — still open the pending portal. */
    }

    const session = getAuthSessionSnapshot();
    const application =
      (session?.userId
        ? findSpecialistApplicationByUserId(session.userId)
        : null) ??
      (session?.email
        ? findSpecialistApplicationByEmail(session.email)
        : null);
    const photoFromApp = application?.media.profilePhotoUrl?.trim() || "";
    const nextAvatar = photoFromApp || priorAvatar;
    if (nextAvatar) {
      patchAuthSessionAvatarUrl(nextAvatar);
    }

    router.replace(`${SPECIALIST_DASHBOARD_PATH}?submitted=1`);
  }, [refreshSession, router]);

  const patchState = useCallback((partial: Partial<SpecialistOnboardingState>) => {
    setState((prev) => {
      if (
        partial.email !== undefined &&
        partial.email.trim().toLowerCase() !== prev.email.trim().toLowerCase()
      ) {
        setVerifiedEmail(null);
        setAwaitingEmailConfirm(null);
        setEmailOtpCode("");
      }
      return {
        ...prev,
        ...partial,
        pricing: partial.pricing
          ? { ...prev.pricing, ...partial.pricing }
          : prev.pricing,
        availability: partial.availability
          ? { ...prev.availability, ...partial.availability }
          : prev.availability,
        social: partial.social ? { ...prev.social, ...partial.social } : prev.social,
        media: partial.media ? { ...prev.media, ...partial.media } : prev.media,
      };
    });
    setError(null);
  }, []);

  function handleBack() {
    if (submitting) return;
    if (step === 1) {
      onBackToRole();
      return;
    }
    setStep((prev) => (prev - 1) as OnboardingStep);
    setError(null);
  }

  async function verifyEmailBeforeContinue(): Promise<boolean> {
    const trimmedEmail = state.email.trim().toLowerCase();
    const firstName = state.fullName.trim().split(/\s+/)[0] ?? "";

    if (
      verifiedEmail &&
      verifiedEmail === trimmedEmail &&
      getAuthSessionSnapshot()?.email?.toLowerCase() === trimmedEmail
    ) {
      return true;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!isMarketplaceSupabaseActive()) {
        /* Local/dev without Supabase — allow continue after password checks. */
        setVerifiedEmail(trimmedEmail);
        setAwaitingEmailConfirm(null);
        return true;
      }

      const result = await sendSpecialistEmailVerificationCode({
        email: trimmedEmail,
        password: state.password,
        firstName,
      });

      if (!result.ok) {
        setError(result.message);
        return false;
      }

      if (result.alreadyVerified) {
        const signInResult = await signInWithPassword(
          "specialist",
          trimmedEmail,
          state.password
        );
        if (signInResult.ok === false) {
          setError(signInResult.message);
          return false;
        }
        if (signInResult.ok === "confirm_email") {
          setAwaitingEmailConfirm(trimmedEmail);
          setEmailOtpCode("");
          showToast({
            type: "info",
            message: `Enter the code we emailed to ${trimmedEmail}.`,
          });
          return false;
        }
        setVerifiedEmail(trimmedEmail);
        setAwaitingEmailConfirm(null);
        setEmailOtpCode("");
        return true;
      }

      persistSpecialistOnboardingDraft(state);
      setAwaitingEmailConfirm(trimmedEmail);
      setEmailOtpCode("");
      showToast({
        type: "info",
        message: `We sent a 6-digit code to ${trimmedEmail}. Paste it below to continue.`,
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinue() {
    if (submitting) return;

    if (step >= 1 && step <= 5) {
      const stepGaps = getSpecialistOnboardingMissingFields(state).filter(
        (field) => field.step === step
      );
      if (step === 2) {
        if (!isValidEmail(state.email)) {
          setPasswordFieldsError(false);
          setError("Enter a valid email — you’ll use it to sign in.");
          return;
        }
        if (state.password.trim().length < 8) {
          flagPasswordFieldsError("Create a password with at least 8 characters.");
          return;
        }
        if (state.password !== confirmPassword) {
          flagPasswordFieldsError("Passwords do not match.");
          return;
        }
        setPasswordFieldsError(false);
      }
      if (stepGaps.length > 0) {
        setError(`Complete required fields: ${stepGaps.map((g) => g.label).join(", ")}`);
        return;
      }
    }

    if (step === 2) {
      const verified = await verifyEmailBeforeContinue();
      if (!verified) return;
      setStep(3);
      setError(null);
      return;
    }

    if (step === 6) {
      void handleSubmitApplication();
      return;
    }

    if (step < SPECIALIST_ONBOARDING_TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as OnboardingStep);
      setError(null);
    }
  }

  async function handleVerifyEmailCode() {
    if (!awaitingEmailConfirm) return;
    const code = emailOtpCode.replace(/\s+/g, "").trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const verified = await verifySpecialistEmailVerificationCode({
        email: awaitingEmailConfirm,
        password: state.password,
        code,
      });
      if (!verified.ok) {
        setError(verified.message);
        return;
      }

      const signInResult = await signInWithPassword(
        "specialist",
        awaitingEmailConfirm,
        state.password
      );
      if (signInResult.ok === false) {
        setError(signInResult.message);
        return;
      }
      if (signInResult.ok === "confirm_email") {
        setError(
          "Email still isn’t verified. Check the code and try again, or resend a new one."
        );
        return;
      }

      setVerifiedEmail(awaitingEmailConfirm.toLowerCase());
      setAwaitingEmailConfirm(null);
      setEmailOtpCode("");
      setStep(3);
      showToast({
        type: "success",
        message: "Email verified — continue your application.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendConfirmEmail() {
    if (!awaitingEmailConfirm || resendingConfirm) return;
    setResendingConfirm(true);
    setError(null);
    try {
      const firstName = state.fullName.trim().split(/\s+/)[0] ?? "";
      const result = await sendSpecialistEmailVerificationCode({
        email: awaitingEmailConfirm,
        password: state.password,
        firstName,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.alreadyVerified) {
        const signInResult = await signInWithPassword(
          "specialist",
          awaitingEmailConfirm,
          state.password
        );
        if (signInResult.ok === true) {
          setVerifiedEmail(awaitingEmailConfirm.toLowerCase());
          setAwaitingEmailConfirm(null);
          setEmailOtpCode("");
          setStep(3);
          showToast({
            type: "success",
            message: "Email already verified — continue your application.",
          });
          return;
        }
      }
      showToast({
        type: "info",
        message: `New code sent to ${awaitingEmailConfirm}.`,
      });
    } finally {
      setResendingConfirm(false);
    }
  }

  async function handleSubmitApplication() {
    if (submitting) return;

    const authGaps = getSpecialistOnboardingAuthGaps(state);
    if (authGaps.length > 0 || state.password !== confirmPassword) {
      setStep(2);
      if (state.password !== confirmPassword && state.password.trim().length >= 8) {
        flagPasswordFieldsError("Passwords do not match.");
      } else if (authGaps.some((g) => g.label.startsWith("Password"))) {
        flagPasswordFieldsError(
          "Create a password (8+ characters) so you can sign in while pending."
        );
      } else {
        setPasswordFieldsError(false);
        setError("Enter a valid email and password so you can sign in.");
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const trimmedEmail = state.email.trim().toLowerCase();
      if (
        !verifiedEmail ||
        verifiedEmail !== trimmedEmail ||
        getAuthSessionSnapshot()?.email?.toLowerCase() !== trimmedEmail
      ) {
        setSubmitting(false);
        setStep(2);
        setError("Verify your email with the code we sent before submitting.");
        const gated = await verifyEmailBeforeContinue();
        if (!gated) return;
        setSubmitting(true);
      }

      const existing = getAuthSessionSnapshot();
      let userId = existing?.userId ?? "";

      const alreadyAuthed =
        Boolean(existing) &&
        existing!.role === "specialist" &&
        existing!.email.trim().toLowerCase() === trimmedEmail;

      if (!alreadyAuthed) {
        const signInResult = await signInWithPassword(
          "specialist",
          trimmedEmail,
          state.password
        );
        if (signInResult.ok === false) {
          setError(signInResult.message);
          return;
        }
        if (signInResult.ok === "confirm_email") {
          setAwaitingEmailConfirm(trimmedEmail);
          setEmailOtpCode("");
          setError("Verify your email with the code we sent, then submit again.");
          return;
        }
        userId = signInResult.session.userId;
      }

      if (isMarketplaceSupabaseActive()) {
        const supabase = getMarketplaceAuthClient();
        if (supabase && userId) {
          const profileResult = await saveSpecialistSignupProfile(
            supabase,
            userId,
            state
          );
          if (!profileResult.ok) {
            setError(profileResult.message);
            return;
          }
        }
      }

      const submitResult = await submitSpecialistApplication(state, { userId });

      showToast({
        type: "success",
        message: submitResult.emailSent
          ? "Application submitted — check your email for a welcome note."
          : "Application submitted — you're under review.",
      });

      await goToPendingApplicationPortal();
    } catch (err) {
      const message =
        err instanceof ApplicationSubmitError
          ? err.message
          : err instanceof Error && err.message.trim()
            ? err.message
            : "Something went wrong. Please try again.";

      if (/already approved/i.test(message)) {
        showToast({ type: "info", message });
        router.replace(SPECIALIST_DASHBOARD_PATH);
        return;
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function continueLabel(): string {
    if (submitting) return step === 2 ? "Verifying email…" : "Submitting…";
    if (step === 6) return "Submit Application";
    if (step === 2) return "Verify email & continue";
    return "Continue";
  }

  const stepLabel = SPECIALIST_ONBOARDING_STEP_LABELS[step - 1];

  return (
    <>
      <div className="login-page login-page--wizard login-page--specialist-onboarding">
        <div className="login-page__canvas" aria-hidden>
          <div className="wizard-aurora-pool wizard-aurora-pool--primary" />
          <div className="wizard-aurora-pool wizard-aurora-pool--secondary" />
          <div className="atmosphere-mesh wizard-atmosphere-mesh">
            <div className="atmosphere-blob atmosphere-blob--indigo" />
            <div className="atmosphere-blob atmosphere-blob--blue" />
            <div className="atmosphere-blob atmosphere-blob--violet" />
            <div className="atmosphere-blob atmosphere-blob--magenta" />
            <div className="atmosphere-blob atmosphere-blob--pink" />
            <div className="atmosphere-blob atmosphere-blob--core" />
          </div>
          <div className="login-page__card-glow wizard-card-glow" />
          <div className="atmosphere-vignette atmosphere-vignette--soft wizard-vignette" />
          <div className="atmosphere-grain" />
        </div>

        <div className="login-page__shell">
          <header className="login-page__brand wizard-page-brand">
            <Logo href="/" size="lg" priority className="wizard-page-brand__logo" />
          </header>

          <div className="login-card wizard-card">
            <div className="wizard-progress">
              <div className="wizard-signup-reassure">
                <p className="wizard-signup-reassure__title">Quick &amp; easy signup</p>
                <p className="wizard-signup-reassure__sub">
                  About 5 minutes — short steps, then you&apos;re in.
                </p>
              </div>
              <div className="wizard-progress__header">
                <p className="wizard-progress__step">
                  Step {step} of {SPECIALIST_ONBOARDING_TOTAL_STEPS}
                </p>
                <p className="wizard-progress__complete">
                  {progressPercent}% complete
                </p>
              </div>
              <p className="wizard-progress__label">{stepLabel}</p>
              <div className="wizard-progress__track">
                <div
                  className="wizard-progress__fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="login-card__form">
              <SpecialistOnboardingSteps
                step={step}
                state={state}
                onPatch={(partial) => {
                  if (partial.password !== undefined) {
                    clearPasswordFieldsError();
                  }
                  patchState(partial);
                }}
                onEditStep={(editStep) => setStep(editStep as OnboardingStep)}
                profilePhotoCrop={profilePhotoCrop}
                confirmPassword={confirmPassword}
                passwordFieldsError={passwordFieldsError}
                shakePasswordFields={shakePasswordFields}
                onPasswordShakeEnd={() => setShakePasswordFields(false)}
                onConfirmPasswordChange={(value) => {
                  setConfirmPassword(value);
                  clearPasswordFieldsError();
                }}
              />
            </div>

            <div className="login-form__section login-form__section--cta">
              {error ? (
                <p
                  className="login-card__message login-card__message--error login-card__message--error-visible"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <div className="wizard-nav">
                <button
                  type="button"
                  className="wizard-nav__back"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  {step === 1 ? "Change role" : "Back"}
                </button>
                <button
                  type="button"
                  className="login-submit wizard-nav__continue"
                  onClick={() => void handleContinue()}
                  disabled={submitting}
                >
                  {continueLabel()}
                </button>
              </div>
            </div>

            <p className="wizard-footer-link">
              <span>Already have an account?</span>
              <Link href={LOGIN_PATH}>Log in</Link>
            </p>
          </div>
        </div>

        {submitting
          ? createPortal(
              <div
                className="wizard-submitting-overlay"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label={
                  step === 2
                    ? "Verifying email"
                    : "Submitting profile to SMOAC admin"
                }
              >
                <div className="wizard-submitting-overlay__panel">
                  <SmoacSavingMark
                    label={
                      step === 2
                        ? "Verifying your email"
                        : "Submitting profile to SMOAC admin"
                    }
                  />
                </div>
              </div>,
              document.body
            )
          : null}
        {awaitingEmailConfirm ? (
          <div
            className="wizard-incomplete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wizard-confirm-email-title"
          >
            <div className="wizard-incomplete-modal__panel">
              <header className="wizard-incomplete-modal__header">
                <h2
                  id="wizard-confirm-email-title"
                  className="wizard-incomplete-modal__title"
                >
                  Enter your verification code
                </h2>
                <p className="wizard-incomplete-modal__lead">
                  We emailed a 6-digit code from SMOAC to{" "}
                  <strong>{awaitingEmailConfirm}</strong>. Paste it below to
                  unlock the rest of your application.
                </p>
              </header>
              <label className="wizard-email-otp-label">
                Verification code
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  name="specialist-email-otp"
                  className="login-input wizard-email-otp-input"
                  value={emailOtpCode}
                  onChange={(e) => {
                    setEmailOtpCode(
                      e.target.value.replace(/[^\d]/g, "").slice(0, 6)
                    );
                    setError(null);
                  }}
                  placeholder="6-digit code"
                  maxLength={6}
                  disabled={submitting}
                  autoFocus
                />
              </label>
              <p className="wizard-submitted-modal__note">
                Tip: check spam/junk. Wrong inbox? Change email and continue again.
              </p>
              {error ? (
                <p
                  className="login-card__message login-card__message--error login-card__message--error-visible"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <footer className="wizard-incomplete-modal__footer">
                <button
                  type="button"
                  className="login-submit wizard-nav__continue wizard-incomplete-modal__btn"
                  onClick={() => void handleVerifyEmailCode()}
                  disabled={
                    submitting || emailOtpCode.replace(/\s+/g, "").length !== 6
                  }
                >
                  {submitting ? "Verifying…" : "Verify & continue"}
                </button>
                <button
                  type="button"
                  className="wizard-nav__back wizard-incomplete-modal__btn"
                  onClick={() => void handleResendConfirmEmail()}
                  disabled={resendingConfirm || submitting}
                >
                  {resendingConfirm ? "Sending…" : "Resend code"}
                </button>
                <button
                  type="button"
                  className="wizard-nav__back wizard-incomplete-modal__btn"
                  onClick={() => {
                    setAwaitingEmailConfirm(null);
                    setEmailOtpCode("");
                    setStep(2);
                    setError(null);
                  }}
                >
                  Change email
                </button>
              </footer>
            </div>
          </div>
        ) : null}
      </div>

      {profilePhotoCrop.cropModal}
    </>
  );
}
