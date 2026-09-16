"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreateAccountPageSkeleton } from "@/components/auth/CreateAccountPageSkeleton";
import { LegalAgreementNotice } from "@/components/legal/LegalAgreementNotice";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/toast";
import { useSaveToast } from "@/contexts/SaveToastContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  CLIENT_ACCOUNT_OPTION,
  SPECIALIST_ACCOUNT_OPTION,
} from "@/constants/create-account-options";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import { isAuthReturnToSaved } from "@/lib/auth-return";
import { resolvePostLoginNavigation } from "@/lib/post-login-flow";
import { persistCreateAccountProfile } from "@/lib/create-account-profile-storage";
import { ApplicationSubmitError } from "@/lib/specialist-application-validation";
import { sendClientWelcomeEmail } from "@/lib/email/confirmation-email-service";
import { shouldResumeIncompleteSpecialistOnboarding } from "@/lib/specialist-onboarding-resume";
import {
  ensureSpecialistApplicationsHydrated,
  getSpecialistApplicationsHydratedServerSnapshot,
  getSpecialistApplicationsHydratedSnapshot,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";
import type { PublicAuthRole } from "@/types/auth-roles";
import {
  INITIAL_CREATE_ACCOUNT_STATE,
  type CreateAccountProfile,
  type CreateAccountWizardState,
} from "@/types/create-account";
import { hydrateClientLocationFromSession } from "@/lib/client-profile-location";
import { cn } from "@/lib/utils";
import { SpecialistOnboardingWizard } from "@/components/auth/specialist/SpecialistOnboardingWizard";
import { persistFounding50InviteSession } from "@/lib/founding-50-invite";

type WizardStep = 1 | 2;

const CREATE_ACCOUNT_STEP_COUNT = 2;
const ACCOUNT_OPTIONS = [CLIENT_ACCOUNT_OPTION, SPECIALIST_ACCOUNT_OPTION];

function createAccountInterviewCopy(step: WizardStep): {
  introTitle: string;
  introSub: string;
  cardTitle: string;
  cardSubtitle: string;
} {
  if (step === 2) {
    return {
      introTitle: "Quick sign up",
      introSub: "Browse and compare specialists near you instantly.",
      cardTitle: "Create your account",
      cardSubtitle: "Email and that’s it!",
    };
  }
  return {
    introTitle: "Quick & easy signup",
    introSub: "A few short questions — then you’re in.",
    cardTitle: "How would you like to join?",
    cardSubtitle: "We’ll tailor the next steps to you.",
  };
}

function WizardStepPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("wizard-step", className)}>{children}</div>;
}

function ClientAccountIcon() {
  return (
    <svg
      className="wizard-account-icon__svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SpecialistAccountIcon() {
  return (
    <svg
      className="wizard-account-icon__svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v3" />
      <path d="M12 15v6" />
      <path d="M6 9h12" />
      <path d="M8 9V6a4 4 0 0 1 8 0v3" />
      <rect x="4" y="9" width="16" height="10" rx="2" />
    </svg>
  );
}

interface AccountTypeCardProps {
  id: PublicAuthRole;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

function AccountTypeCard({
  id,
  title,
  description,
  selected,
  onSelect,
}: AccountTypeCardProps) {
  return (
    <FastActivateButton
      role="radio"
      aria-checked={selected}
      onActivate={onSelect}
      className={cn(
        "login-role-card wizard-account-card",
        id === "client" && "wizard-account-card--client",
        id === "specialist" && "wizard-account-card--specialist",
        selected && "login-role-card--active"
      )}
    >
      <span
        className={cn(
          "wizard-account-icon",
          selected && "wizard-account-icon--active"
        )}
        aria-hidden
      >
        {id === "client" ? <ClientAccountIcon /> : <SpecialistAccountIcon />}
      </span>
      <span className="login-role-card__copy">
        <span className="login-role-card__title">{title}</span>
        <span className="login-role-card__desc">{description}</span>
      </span>
    </FastActivateButton>
  );
}

interface CreateAccountWizardClientProps {
  initialReturnToSaved?: boolean;
  /** From `?role=specialist|client` — deep links from promos / save complete */
  initialAccountType?: PublicAuthRole | null;
  /** From Founding 100 invite CTA (`?founding=1`) */
  initialFoundingInvite?: boolean;
  initialFoundingInviteCode?: string | null;
}

export function CreateAccountWizardClient({
  initialReturnToSaved = false,
  initialAccountType = null,
  initialFoundingInvite = false,
  initialFoundingInviteCode = null,
}: CreateAccountWizardClientProps) {
  const router = useRouter();
  const { isReady, session, signUp } = useAuthSession();
  const { showToast } = useToast();
  const { showToast: showSaveToast } = useSaveToast();
  const [step, setStep] = useState<WizardStep>(() =>
    initialAccountType === "client" ? 2 : 1
  );
  const [state, setState] = useState<CreateAccountWizardState>(() =>
    initialAccountType
      ? { ...INITIAL_CREATE_ACCOUNT_STATE, accountType: initialAccountType }
      : INITIAL_CREATE_ACCOUNT_STATE
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSpecialistOnboarding, setShowSpecialistOnboarding] = useState(
    () => initialAccountType === "specialist"
  );

  useEffect(() => {
    if (!initialFoundingInvite) return;
    persistFounding50InviteSession({
      code: initialFoundingInviteCode?.trim() || "founding-100",
      acceptedAt: new Date().toISOString(),
    });
  }, [initialFoundingInvite, initialFoundingInviteCode]);

  const interviewCopy = createAccountInterviewCopy(step);
  const showBack = step > 1 && initialAccountType !== "client";
  const createAccountProgressPercent = step <= 1 ? 0 : 100;

  function wantsReturnToSaved(): boolean {
    if (initialReturnToSaved) return true;
    if (typeof window === "undefined") return false;
    return isAuthReturnToSaved(new URLSearchParams(window.location.search));
  }

  const wantsSaved =
    initialReturnToSaved ||
    (typeof window !== "undefined" &&
      isAuthReturnToSaved(new URLSearchParams(window.location.search)));

  const applicationsHydrated = useSyncExternalStore(
    subscribeSpecialistApplications,
    getSpecialistApplicationsHydratedSnapshot,
    getSpecialistApplicationsHydratedServerSnapshot
  );

  useEffect(() => {
    if (session?.role !== "specialist") return;
    ensureSpecialistApplicationsHydrated();
  }, [session?.role, session?.userId]);

  useEffect(() => {
    if (!isReady || !session || session.role === "admin") return;

    if (session.role === "specialist") {
      if (!applicationsHydrated) return;
      if (
        shouldResumeIncompleteSpecialistOnboarding(session, {
          applicationsHydrated: true,
        })
      ) {
        if (!showSpecialistOnboarding) {
          setShowSpecialistOnboarding(true);
        }
        return;
      }
    }

    /* Specialist onboarding owns navigation after submit — don't bounce
     * mid-signup when Auth session appears (that aborted saves + sent people home). */
    if (showSpecialistOnboarding) return;
    if (wantsSaved && session.role === "client") {
      router.replace("/saved");
      return;
    }
    router.replace(getDashboardPathForRole(session.role));
  }, [
    isReady,
    session,
    router,
    wantsSaved,
    showSpecialistOnboarding,
    applicationsHydrated,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [step]);

  function patchState(partial: Partial<CreateAccountWizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
    setError(null);
  }

  function handleBack() {
    if (step === 1) return;
    setStep(1);
    setError(null);
  }

  function handleContinue() {
    if (submitting) return;
    if (step === 1) {
      if (!state.accountType) {
        setError("Choose Client or Health & Wellness Professional to continue.");
        return;
      }
      if (state.accountType === "specialist") {
        setShowSpecialistOnboarding(true);
        setError(null);
        return;
      }
      setStep(2);
      setError(null);
      return;
    }
    void handleCreateAccount();
  }

  async function handleCreateAccount() {
    if (submitting) return;

    if (state.accountType !== "client") {
      setError("Choose Client or Health & Wellness Professional to continue.");
      setStep(1);
      return;
    }

    const trimmedEmail = state.email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (state.password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (state.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const derivedFirst =
      state.firstName.trim() ||
      trimmedEmail.split("@")[0]?.trim() ||
      "Client";

    try {
      const profile: CreateAccountProfile = {
        accountType: "client",
        firstName: derivedFirst,
        lastName: state.lastName.trim(),
        email: trimmedEmail,
        createdAt: new Date().toISOString(),
        clientGoals: state.clientGoals,
        clientCity: state.clientCity.trim(),
        clientNeighborhood: state.clientNeighborhood.trim(),
        clientZipCode: state.clientZipCode.trim(),
        clientBudget: state.clientBudget,
        clientTrainingStyle: state.clientTrainingStyle,
      };

      persistCreateAccountProfile(profile);

      const signUpResult = await signUp("client", trimmedEmail, state.password, {
        firstName: derivedFirst,
        lastName: state.lastName.trim(),
        clientProfile: profile,
      });

      if (signUpResult.ok === false) {
        setError(signUpResult.message);
        setSubmitting(false);
        return;
      }

      if (signUpResult.ok === "confirm_email") {
        showToast({
          type: "info",
          message: "Check your email to confirm your account, then sign in.",
        });
        setSubmitting(false);
        router.push(LOGIN_PATH);
        return;
      }

      if (signUpResult.ok === true) {
        await hydrateClientLocationFromSession(signUpResult.session);
        void sendClientWelcomeEmail({
          to: signUpResult.session.email,
          firstName: signUpResult.session.firstName ?? derivedFirst,
        });
      }

      showToast({
        type: "success",
        message: "You're in — edit your full profile anytime!",
      });

      const { path, toast } = resolvePostLoginNavigation("client", {
        returnToSaved: wantsReturnToSaved(),
        session: signUpResult.session,
      });
      if (toast) {
        showSaveToast(toast);
      }

      window.setTimeout(() => {
        router.push(path);
        setSubmitting(false);
      }, 80);
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof ApplicationSubmitError
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  }

  function renderStepContent() {
    if (step === 1) {
      return (
        <WizardStepPanel key="step-1">
          <div
            className="wizard-option-list login-role-list"
            role="radiogroup"
            aria-label="Account type"
          >
            {ACCOUNT_OPTIONS.map((option) => (
              <AccountTypeCard
                key={option.id}
                id={option.id}
                title={option.title}
                description={option.description}
                selected={state.accountType === option.id}
                onSelect={() => patchState({ accountType: option.id })}
              />
            ))}
          </div>
        </WizardStepPanel>
      );
    }

    return (
      <WizardStepPanel key="step-2">
        <div className="login-fields">
          <label className="login-field">
            <span className="login-field__label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={state.email}
              onChange={(e) => patchState({ email: e.target.value })}
              placeholder="you@example.com"
              className="login-field__input"
            />
          </label>
          <label className="login-field">
            <span className="login-field__label">Create password</span>
            <PasswordInput
              name="password"
              autoComplete="new-password"
              value={state.password}
              onChange={(e) => patchState({ password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </label>
          <label className="login-field">
            <span className="login-field__label">Confirm password</span>
            <PasswordInput
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              placeholder="Re-enter password"
            />
          </label>
        </div>
      </WizardStepPanel>
    );
  }

  if (showSpecialistOnboarding) {
    return (
      <SpecialistOnboardingWizard
        onBackToRole={() => setShowSpecialistOnboarding(false)}
      />
    );
  }

  if (isReady && session?.role === "specialist" && !applicationsHydrated) {
    return <CreateAccountPageSkeleton />;
  }

  return (
    <div
      className={cn(
        "login-page login-page--wizard login-page--specialist-onboarding login-page--create-account",
        step === 1 && "login-page--create-account-entry"
      )}
      data-login-role={state.accountType || undefined}
    >
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

      <div className="login-page__shell interview-shell">
        <div className="interview-stage">
          <div className="interview-intro">
            <h1 className="interview-intro__title">{interviewCopy.introTitle}</h1>
            <p className="interview-intro__sub">{interviewCopy.introSub}</p>
          </div>

          <form
            className="login-card wizard-card interview-card"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              handleContinue();
            }}
          >
            <div className="interview-card__chrome">
              <div className="interview-card__meta">
                <span className="interview-card__icon-btn interview-card__icon-btn--spacer" />
                <span className="interview-card__count">
                  {createAccountProgressPercent}% COMPLETE
                </span>
                {step === 1 ? (
                  <button
                    type="button"
                    className="interview-card__icon-btn"
                    onClick={() => router.push("/")}
                    disabled={submitting}
                    aria-label="Close"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M6 6l12 12M18 6 6 18"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                ) : (
                  <span className="interview-card__icon-btn interview-card__icon-btn--spacer" />
                )}
              </div>
              <div
                className="interview-progress"
                role="img"
                aria-label={`Step ${step} of ${CREATE_ACCOUNT_STEP_COUNT}`}
              >
                {Array.from({ length: CREATE_ACCOUNT_STEP_COUNT }, (_, index) => {
                  const section = index + 1;
                  return (
                    <span
                      key={section}
                      className={
                        section < step
                          ? "interview-progress__seg interview-progress__seg--done"
                          : section === step
                            ? "interview-progress__seg interview-progress__seg--current"
                            : "interview-progress__seg"
                      }
                    />
                  );
                })}
              </div>
            </div>

            <h2 className="interview-card__title">{interviewCopy.cardTitle}</h2>
            <p className="interview-card__subtitle">{interviewCopy.cardSubtitle}</p>

            <div className="interview-card__field">{renderStepContent()}</div>

            {error ? (
              <p
                className="login-card__message login-card__message--error login-card__message--error-visible"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="interview-card__footer">
              <div className="interview-card__actions">
                {showBack ? (
                  <button
                    type="button"
                    className="interview-back"
                    onClick={handleBack}
                    disabled={submitting}
                    aria-label="Back"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M15 5 8 12l7 7"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="interview-continue"
                  disabled={submitting || (step === 1 && state.accountType == null)}
                >
                  <span>
                    {submitting
                      ? "Creating account…"
                      : step === 2
                        ? "Sign up"
                        : "Continue"}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="interview-signin">
                <span>Already have an account?</span>
                <Link href={LOGIN_PATH}>Sign in</Link>
              </p>
              {step === 2 ? (
                <LegalAgreementNotice className="interview-legal" />
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
