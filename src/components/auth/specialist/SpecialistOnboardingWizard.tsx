"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  SPECIALIST_ONBOARDING_STEP_LABELS,
  SPECIALIST_ONBOARDING_TOTAL_STEPS,
} from "@/constants/specialist-onboarding-options";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { validateDevSignup } from "@/lib/dev-auth";
import { submitSpecialistApplication } from "@/lib/specialist-application-submit";
import {
  loadSpecialistOnboardingDraft,
  persistSpecialistOnboardingDraft,
} from "@/lib/specialist-application-storage";
import { isSpecialistOnboardingStepValid } from "@/lib/specialist-onboarding-validation";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistOnboardingState,
} from "@/types/specialist-application";
import { SpecialistOnboardingSteps } from "@/components/auth/specialist/SpecialistOnboardingSteps";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

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
  const { signIn } = useAuthSession();
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

  const progressPercent = stepProgressPercent(step);
  const canContinue = isSpecialistOnboardingStepValid(step, state);
  const isConfirmation = step === 12;

  useEffect(() => {
    persistSpecialistOnboardingDraft(state);
  }, [state]);

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
    if (isConfirmation) return;
    if (step === 1) {
      onBackToRole();
      return;
    }
    setStep((prev) => (prev - 1) as OnboardingStep);
    setError(null);
  }

  function handleContinue() {
    if (isConfirmation) return;
    if (!canContinue) return;

    if (step === 11) {
      handleSubmitApplication();
      return;
    }

    if (step < SPECIALIST_ONBOARDING_TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as OnboardingStep);
      setError(null);
    }
  }

  function handleSubmitApplication() {
    if (submitting) return;

    const trimmedEmail = state.email.trim();
    const validatedRole = validateDevSignup(
      "specialist",
      trimmedEmail,
      state.password
    );

    if (!validatedRole) {
      setError("Enter a valid email and a password with at least 6 characters.");
      setStep(2);
      return;
    }

    if (!isSpecialistOnboardingStepValid(11, state)) {
      setError("Complete all required fields before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      submitSpecialistApplication(state);
      signIn("specialist", trimmedEmail);
      showToast({
        type: "success",
        message: "Application submitted — pending SMOAC review.",
      });
      setStep(12);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function continueLabel(): string {
    if (submitting) return "Submitting…";
    if (step === 11) return "Submit Application";
    return "Continue";
  }

  const stepLabel = SPECIALIST_ONBOARDING_STEP_LABELS[step - 1];

  return (
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
          {!isConfirmation ? (
            <div className="wizard-progress">
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
          ) : null}

          <div className="login-card__form">
            <SpecialistOnboardingSteps
              step={step}
              state={state}
              onPatch={patchState}
              onEditStep={(editStep) => setStep(editStep as OnboardingStep)}
            />
          </div>

          <div className="login-form__section login-form__section--cta">
            {error ? (
              <p className="login-card__message" role="alert">
                {error}
              </p>
            ) : null}

            {isConfirmation ? (
              <div className="wizard-success-actions">
                <button
                  type="button"
                  className="login-submit wizard-nav__continue"
                  onClick={() => router.push("/")}
                >
                  Return Home
                </button>
                <Link
                  href="/explore"
                  className="wizard-success-actions__secondary"
                >
                  Explore Specialists
                </Link>
              </div>
            ) : (
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
                  disabled={!canContinue || submitting}
                >
                  {continueLabel()}
                </button>
              </div>
            )}
          </div>

          {!isConfirmation ? (
            <p className="wizard-footer-link">
              <span>Already have an account?</span>
              <Link href={LOGIN_PATH}>Log in</Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
