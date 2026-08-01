"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfilePhotoCropSession } from "@/hooks/useProfilePhotoCropSession";
import { WizardIncompleteSubmitModal } from "@/components/auth/WizardIncompleteSubmitModal";
import { WizardApplicationSubmittedModal } from "@/components/auth/WizardApplicationSubmittedModal";
import {
  SPECIALIST_ONBOARDING_STEP_LABELS,
  SPECIALIST_ONBOARDING_TOTAL_STEPS,
} from "@/constants/specialist-onboarding-options";
import { LOGIN_PATH, SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { ApplicationSubmitError } from "@/lib/specialist-application-validation";
import { submitSpecialistApplication } from "@/lib/specialist-application-submit";
import {
  loadSpecialistOnboardingDraft,
  persistSpecialistOnboardingDraft,
} from "@/lib/specialist-application-storage";
import {
  getSpecialistOnboardingAuthGaps,
  getSpecialistOnboardingMissingFields,
  getSpecialistOnboardingOptionalMissingFields,
} from "@/lib/specialist-onboarding-validation";
import { isValidEmail } from "@/lib/validation/email";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistOnboardingState,
} from "@/types/specialist-application";
import { SpecialistOnboardingSteps } from "@/components/auth/specialist/SpecialistOnboardingSteps";

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
  const { signUp, signInWithPassword, refreshSession } = useAuthSession();
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
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [submittedEmailSent, setSubmittedEmailSent] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState<string | null>(
    null
  );
  const [confirmPassword, setConfirmPassword] = useState("");
  const profilePhotoCrop = useProfilePhotoCropSession();

  const progressPercent = stepProgressPercent(step);

  const missingFields = useMemo(
    () => getSpecialistOnboardingMissingFields(state),
    [state]
  );
  const optionalMissingFields = useMemo(
    () => getSpecialistOnboardingOptionalMissingFields(state),
    [state]
  );
  const missingLabels = useMemo(
    () => optionalMissingFields.map((field) => field.label),
    [optionalMissingFields]
  );

  useEffect(() => {
    persistSpecialistOnboardingDraft(state);
  }, [state]);

  /* Each Continue / Back question should land the user at the top of the step. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [step]);

  const goToPendingApplicationPortal = useCallback(async () => {
    setShowSubmittedModal(false);
    try {
      await refreshSession();
    } catch {
      /* Session may already be current — still open the pending portal. */
    }
    router.replace(`${SPECIALIST_DASHBOARD_PATH}?submitted=1`);
  }, [refreshSession, router]);

  const patchState = useCallback((partial: Partial<SpecialistOnboardingState>) => {
    setState((prev) => ({
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
    }));
    setError(null);
  }, []);

  function handleBack() {
    if (submitting || showSubmittedModal) return;
    if (step === 1) {
      onBackToRole();
      return;
    }
    setStep((prev) => (prev - 1) as OnboardingStep);
    setError(null);
  }

  function handleContinue() {
    if (showSubmittedModal || submitting) return;

    /* Step 2 creates the login — never skip email/password. */
    if (step === 2) {
      if (!isValidEmail(state.email)) {
        setError("Enter a valid email — you’ll use it to sign in.");
        return;
      }
      if (state.password.trim().length < 8) {
        setError("Create a password with at least 8 characters.");
        return;
      }
      if (state.password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    if (step === 6) {
      handleSubmitApplication(false);
      return;
    }

    if (step < SPECIALIST_ONBOARDING_TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as OnboardingStep);
      setError(null);
    }
  }

  async function handleSubmitApplication(force: boolean) {
    if (submitting) return;

    const authGaps = getSpecialistOnboardingAuthGaps(state);
    if (authGaps.length > 0 || state.password !== confirmPassword) {
      setShowIncompleteModal(false);
      setStep(2);
      if (state.password !== confirmPassword && state.password.trim().length >= 8) {
        setError("Passwords do not match.");
      } else if (authGaps.some((g) => g.label.startsWith("Password"))) {
        setError("Create a password (8+ characters) so you can sign in while pending.");
      } else {
        setError("Enter a valid email and password so you can sign in.");
      }
      return;
    }

    if (!force && optionalMissingFields.length > 0) {
      setShowIncompleteModal(true);
      return;
    }

    setShowIncompleteModal(false);
    setSubmitting(true);
    setError(null);

    try {
      const trimmedEmail = state.email.trim();
      let signUpResult = await signUp("specialist", trimmedEmail, state.password, {
        firstName: state.fullName.trim().split(/\s+/)[0] ?? "",
        specialistOnboarding: state,
      });

      /* Existing Auth user — sign in and reuse their application instead of duplicating */
      if (
        signUpResult.ok === false &&
        /already exists|already registered/i.test(signUpResult.message)
      ) {
        const signInResult = await signInWithPassword(
          "specialist",
          trimmedEmail,
          state.password
        );
        if (signInResult.ok === false) {
          setError(
            "An account with this email already exists. Sign in with your password, or reset it from the login page."
          );
          return;
        }
        if (signInResult.ok === "confirm_email") {
          setError("Confirm your email, then sign in to finish your application.");
          return;
        }
        signUpResult = { ok: true, session: signInResult.session };
      }

      if (signUpResult.ok === false) {
        setError(signUpResult.message);
        return;
      }

      if (signUpResult.ok === "confirm_email") {
        persistSpecialistOnboardingDraft(state);
        setAwaitingEmailConfirm(trimmedEmail);
        showToast({
          type: "info",
          message: `Confirm ${trimmedEmail} — then sign in and your application finishes automatically.`,
        });
        return;
      }

      const userId = signUpResult.session.userId;

      const submitResult = await submitSpecialistApplication(state, { userId });

      setSubmittedEmailSent(Boolean(submitResult.emailSent));
      setShowSubmittedModal(true);
      try {
        await refreshSession();
      } catch {
        /* Dashboard still opens with local session from signUp. */
      }
      /* Land them in the logged-in pending portal without an extra click. */
      window.setTimeout(() => {
        router.replace(`${SPECIALIST_DASHBOARD_PATH}?submitted=1`);
      }, 1600);
    } catch (err) {
      const message =
        err instanceof ApplicationSubmitError
          ? err.message
          : err instanceof Error && err.message.trim()
            ? err.message
            : "Something went wrong. Please try again.";

      /* Already approved — send them to the dashboard instead of trapping on submit */
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

  function handleGoBackFromIncompleteModal() {
    setShowIncompleteModal(false);
    const firstStep = optionalMissingFields[0]?.step ?? missingFields[0]?.step;
    if (firstStep != null && firstStep >= 1 && firstStep <= 5) {
      setStep(firstStep as OnboardingStep);
    }
  }

  function continueLabel(): string {
    if (submitting) return "Submitting…";
    if (step === 6) return "Submit Application";
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
              onPatch={patchState}
              onEditStep={(editStep) => setStep(editStep as OnboardingStep)}
              profilePhotoCrop={profilePhotoCrop}
              confirmPassword={confirmPassword}
              onConfirmPasswordChange={(value) => {
                setConfirmPassword(value);
                setError(null);
              }}
            />
          </div>

          <div className="login-form__section login-form__section--cta">
            {error ? (
              <p className="login-card__message" role="alert">
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
                onClick={handleContinue}
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

      <WizardIncompleteSubmitModal
        open={showIncompleteModal}
        missingLabels={missingLabels}
        submitting={submitting}
        onGoBack={handleGoBackFromIncompleteModal}
        onSubmitAnyway={() => handleSubmitApplication(true)}
      />
      <WizardApplicationSubmittedModal
        open={showSubmittedModal}
        emailSent={submittedEmailSent}
        onContinue={() => {
          void goToPendingApplicationPortal();
        }}
      />
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
                Confirm your email to finish
              </h2>
              <p className="wizard-incomplete-modal__lead">
                We sent a confirmation link to{" "}
                <strong>{awaitingEmailConfirm}</strong>. Open it, then sign in
                with the same email and password — your application draft will
                submit automatically.
              </p>
            </header>
            <p className="wizard-submitted-modal__note">
              Tip: use one email for the whole signup. Switching emails mid-flow
              can leave a half-created account.
            </p>
            <footer className="wizard-incomplete-modal__footer">
              <button
                type="button"
                className="login-submit wizard-nav__continue wizard-incomplete-modal__btn"
                onClick={() => router.replace(LOGIN_PATH)}
              >
                Go to log in
              </button>
              <button
                type="button"
                className="wizard-nav__back wizard-incomplete-modal__btn"
                onClick={() => setAwaitingEmailConfirm(null)}
              >
                Stay on application
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
