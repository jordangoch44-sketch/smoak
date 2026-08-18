"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { createPortal } from "react-dom";

const SmoacWelcomeIntro = dynamic(
  () =>
    import("@/components/brand/SmoacWelcomeIntro").then(
      (mod) => mod.SmoacWelcomeIntro
    ),
  { ssr: false }
);
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/toast";
import { useSaveToast } from "@/contexts/SaveToastContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  BUDGET_RANGE_OPTIONS,
  CLIENT_ACCOUNT_OPTION,
  CLIENT_GOAL_OPTIONS,
  CREATE_ACCOUNT_TOTAL_STEPS,
  SPECIALIST_ACCOUNT_OPTION,
  TRAINING_STYLE_OPTIONS,
} from "@/constants/create-account-options";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import { isAuthReturnToSaved } from "@/lib/auth-return";
import { resolvePostLoginNavigation } from "@/lib/post-login-flow";
import { persistCreateAccountProfile } from "@/lib/create-account-profile-storage";
import { ApplicationSubmitError } from "@/lib/specialist-application-validation";
import type { PublicAuthRole } from "@/types/auth-roles";
import {
  INITIAL_CREATE_ACCOUNT_STATE,
  type CreateAccountProfile,
  type CreateAccountWizardState,
} from "@/types/create-account";
import { getClientAccountMissingFieldsForStep } from "@/lib/client-account-validation";
import { hydrateClientLocationFromSession } from "@/lib/client-profile-location";
import { cn } from "@/lib/utils";
import { SpecialistOnboardingWizard } from "@/components/auth/specialist/SpecialistOnboardingWizard";
import { useCreateAccountIntroGate } from "@/hooks/useCreateAccountIntroGate";

type WizardStep = 1 | 2 | 3 | 4 | 5;

const ACCOUNT_OPTIONS = [CLIENT_ACCOUNT_OPTION, SPECIALIST_ACCOUNT_OPTION];

function stepProgressPercent(step: WizardStep): number {
  return Math.round(((step - 1) / CREATE_ACCOUNT_TOTAL_STEPS) * 100);
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function accountTypeLabel(role: PublicAuthRole | null): string {
  if (role === "client") return "Client";
  if (role === "specialist") return "Health & Wellness Professional";
  return "—";
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

function WizardStepHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="wizard-step-heading">
      <h2 className="wizard-question">{title}</h2>
      {subtitle ? (
        <p className="wizard-question__subtitle">{subtitle}</p>
      ) : null}
    </div>
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
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn("login-role-card wizard-account-card", selected && "login-role-card--active")}
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
    </button>
  );
}

interface CreateAccountWizardClientProps {
  initialJoinIntro?: boolean;
  initialReturnToSaved?: boolean;
  /** From `?role=specialist|client` — deep links from promos / save complete */
  initialAccountType?: PublicAuthRole | null;
}

export function CreateAccountWizardClient({
  initialJoinIntro = false,
  initialReturnToSaved = false,
  initialAccountType = null,
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
    () => initialAccountType === "specialist" && !initialJoinIntro
  );
  const { ready: introReady, showIntro, completeIntro } =
    useCreateAccountIntroGate(initialJoinIntro);
  const portalReady = useHydrated();
  const [introVisible, setIntroVisible] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "join-intro-open",
      showIntro && introVisible
    );
    document.body.classList.toggle("join-intro-open", showIntro && introVisible);
    return () => {
      document.documentElement.classList.remove("join-intro-open");
      document.body.classList.remove("join-intro-open");
    };
  }, [showIntro, introVisible]);

  const progressPercent = stepProgressPercent(step);
  const isClientQuickSignup = state.accountType === "client";
  /* Keep the role-picker header stable — client copy only after they continue. */
  const showClientQuickHeader = isClientQuickSignup && step > 1;

  function wantsReturnToSaved(): boolean {
    if (initialReturnToSaved) return true;
    if (typeof window === "undefined") return false;
    return isAuthReturnToSaved(new URLSearchParams(window.location.search));
  }

  const wantsSaved =
    initialReturnToSaved ||
    (typeof window !== "undefined" &&
      isAuthReturnToSaved(new URLSearchParams(window.location.search)));

  useEffect(() => {
    if (!isReady || !session || session.role === "admin") return;
    /* Specialist onboarding owns navigation after submit — don't bounce
     * mid-signup when Auth session appears (that aborted saves + sent people home). */
    if (showSpecialistOnboarding) return;
    if (wantsSaved && session.role === "client") {
      router.replace("/saved");
      return;
    }
    router.replace(getDashboardPathForRole(session.role));
  }, [isReady, session, router, wantsSaved, showSpecialistOnboarding]);

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
    setStep((prev) => (prev - 1) as WizardStep);
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
    /* Client path: credentials only — sign up from this screen */
    if (isClientQuickSignup && step === 2) {
      void handleCreateAccount();
      return;
    }
    if (
      step === 4 &&
      state.accountType === "client" &&
      getClientAccountMissingFieldsForStep(4, state).length > 0
    ) {
      const labels = getClientAccountMissingFieldsForStep(4, state).map(
        (field) => field.label
      );
      setError(`Complete required fields: ${labels.join(", ")}`);
      return;
    }
    if (step < CREATE_ACCOUNT_TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as WizardStep);
      setError(null);
      return;
    }
    void handleCreateAccount();
  }

  async function handleCreateAccount() {
    if (submitting) return;

    if (!state.accountType) {
      setError("Choose Client or Health & Wellness Professional to continue.");
      setStep(1);
      return;
    }

    const resolvedAccountType = state.accountType;
    const trimmedEmail = state.email.trim();
    const quickClient = resolvedAccountType === "client";

    if (quickClient) {
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
    }

    setSubmitting(true);
    setError(null);

    const derivedFirst =
      state.firstName.trim() ||
      trimmedEmail.split("@")[0]?.trim() ||
      "Client";

    try {
      const profile: CreateAccountProfile = {
        accountType: resolvedAccountType,
        firstName: derivedFirst,
        lastName: state.lastName.trim(),
        email: trimmedEmail,
        createdAt: new Date().toISOString(),
        ...(resolvedAccountType === "client"
          ? {
              clientGoals: state.clientGoals,
              clientCity: state.clientCity.trim(),
              clientNeighborhood: state.clientNeighborhood.trim(),
              clientZipCode: state.clientZipCode.trim(),
              clientBudget: state.clientBudget,
              clientTrainingStyle: state.clientTrainingStyle,
            }
          : {
              specialistType: state.specialistType,
              specialistCity: state.specialistCity.trim(),
              specialistNeighborhood: state.specialistNeighborhood.trim(),
              specialistFormat: state.specialistFormat,
              specialistStartingPrice: state.specialistStartingPrice.trim(),
            }),
      };

      persistCreateAccountProfile(profile);

      const signUpResult = await signUp(
        resolvedAccountType,
        trimmedEmail,
        state.password,
        {
          firstName: derivedFirst,
          lastName: state.lastName.trim(),
          clientProfile:
            resolvedAccountType === "client" ? profile : undefined,
          specialistProfile:
            resolvedAccountType === "specialist" ? profile : undefined,
        }
      );

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

      if (resolvedAccountType === "client" && signUpResult.ok === true) {
        await hydrateClientLocationFromSession(signUpResult.session);
      }

      showToast({
        type: "success",
        message: quickClient
          ? "You're in — edit your full profile anytime!"
          : "Account created — welcome to SMOAC",
      });

      const navRole: PublicAuthRole =
        signUpResult.session.role === "specialist" ? "specialist" : "client";

      const { path, toast } = resolvePostLoginNavigation(navRole, {
        returnToSaved: wantsReturnToSaved(),
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

  const reviewSummary = useMemo(() => {
    const locationLine = [
      state.clientZipCode.trim(),
      state.clientCity.trim(),
      state.clientNeighborhood.trim(),
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      locationLine,
      goalsOrSpecialty: state.clientGoals.join(", "),
      extraLine: `${state.clientBudget} · ${state.clientTrainingStyle}`,
    };
  }, [state]);

  function renderStepContent() {
    switch (step) {
      case 1:
        return (
          <WizardStepPanel key="step-1">
            <WizardStepHeading
              title="What best describes you?"
              subtitle="This helps us personalize your experience."
            />
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

      case 2:
        return (
          <WizardStepPanel key="step-2">
            {isClientQuickSignup ? null : (
              <WizardStepHeading
                title="Tell us about yourself"
                subtitle="We'll use this to set up your account."
              />
            )}
            <div className="login-fields">
              {isClientQuickSignup ? null : (
                <>
                  <label className="login-field">
                    <span className="login-field__label">First name</span>
                    <input
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      value={state.firstName}
                      onChange={(e) => patchState({ firstName: e.target.value })}
                      placeholder="First name"
                      className="login-field__input"
                    />
                  </label>
                  <label className="login-field">
                    <span className="login-field__label">Last name</span>
                    <input
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      value={state.lastName}
                      onChange={(e) => patchState({ lastName: e.target.value })}
                      placeholder="Last name"
                      className="login-field__input"
                    />
                  </label>
                </>
              )}
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
                <span className="login-field__label">
                  {isClientQuickSignup ? "Create password" : "Password"}
                </span>
                <PasswordInput
                  name="password"
                  autoComplete="new-password"
                  value={state.password}
                  onChange={(e) => patchState({ password: e.target.value })}
                  placeholder="At least 6 characters"
                />
              </label>
              {isClientQuickSignup ? (
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
              ) : null}
            </div>
          </WizardStepPanel>
        );

      case 3:
        return (
          <WizardStepPanel key="step-3-client">
              <h2 className="wizard-question">
                What are you looking for help with?
              </h2>
              <p className="wizard-question__hint">Select all that apply</p>
              <div className="wizard-pill-grid" role="group">
                {CLIENT_GOAL_OPTIONS.map((goal) => {
                  const active = state.clientGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        patchState({
                          clientGoals: toggleInList(state.clientGoals, goal),
                        })
                      }
                      className={cn(
                        "wizard-pill",
                        active && "wizard-pill--active"
                      )}
                    >
                      {goal}
                    </button>
                  );
                })}
              </div>
            </WizardStepPanel>
        );

      case 4:
        return (
          <WizardStepPanel key="step-4-client">
              <h2 className="wizard-question">Where are you looking?</h2>
              <div className="login-fields">
                <label className="login-field">
                  <span className="login-field__label">City</span>
                  <input
                    type="text"
                    name="clientCity"
                    autoComplete="address-level2"
                    value={state.clientCity}
                    onChange={(e) =>
                      patchState({ clientCity: e.target.value })
                    }
                    placeholder="e.g. Austin"
                    className="login-field__input"
                  />
                </label>
                <label className="login-field">
                  <span className="login-field__label">Neighborhood</span>
                  <input
                    type="text"
                    name="clientNeighborhood"
                    value={state.clientNeighborhood}
                    onChange={(e) =>
                      patchState({ clientNeighborhood: e.target.value })
                    }
                    placeholder="Optional"
                    className="login-field__input"
                  />
                </label>
                <label className="login-field">
                  <span className="login-field__label">ZIP code</span>
                  <input
                    type="text"
                    name="clientZipCode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={state.clientZipCode}
                    onChange={(e) =>
                      patchState({
                        clientZipCode: e.target.value.replace(/\D/g, "").slice(0, 5),
                      })
                    }
                    placeholder="92126"
                    maxLength={5}
                    required
                    className="login-field__input"
                  />
                </label>
                <label className="login-field">
                  <span className="login-field__label">Budget range</span>
                  <select
                    name="clientBudget"
                    value={state.clientBudget}
                    onChange={(e) =>
                      patchState({ clientBudget: e.target.value })
                    }
                    className="login-field__input login-field__select"
                  >
                    <option value="">Select a range</option>
                    {BUDGET_RANGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="login-field">
                  <span className="login-field__label">
                    Preferred training style
                  </span>
                  <select
                    name="clientTrainingStyle"
                    value={state.clientTrainingStyle}
                    onChange={(e) =>
                      patchState({ clientTrainingStyle: e.target.value })
                    }
                    className="login-field__input login-field__select"
                  >
                    <option value="">Select a style</option>
                    {TRAINING_STYLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </WizardStepPanel>
        );

      case 5:
        return (
          <WizardStepPanel key="step-5">
            <h2 className="wizard-question">Review your account</h2>
            <div className="wizard-review">
              <div className="wizard-review__row">
                <span className="wizard-review__label">Account type</span>
                <span className="wizard-review__value">
                  {accountTypeLabel(state.accountType)}
                </span>
              </div>
              <div className="wizard-review__row">
                <span className="wizard-review__label">Name</span>
                <span className="wizard-review__value">
                  {state.firstName.trim()} {state.lastName.trim()}
                </span>
              </div>
              <div className="wizard-review__row">
                <span className="wizard-review__label">Email</span>
                <span className="wizard-review__value">{state.email.trim()}</span>
              </div>
              <div className="wizard-review__row">
                <span className="wizard-review__label">Goals</span>
                <span className="wizard-review__value">
                  {reviewSummary.goalsOrSpecialty}
                </span>
              </div>
              <div className="wizard-review__row">
                <span className="wizard-review__label">Location</span>
                <span className="wizard-review__value">
                  {reviewSummary.locationLine || "—"}
                </span>
              </div>
              <div className="wizard-review__row">
                <span className="wizard-review__label">Details</span>
                <span className="wizard-review__value">
                  {reviewSummary.extraLine}
                </span>
              </div>
            </div>
          </WizardStepPanel>
        );

      default:
        return null;
    }
  }

  function handleIntroComplete() {
    completeIntro();
    if (
      initialAccountType === "specialist" ||
      state.accountType === "specialist"
    ) {
      setShowSpecialistOnboarding(true);
    }
  }

  if (showIntro) {
    if (!introReady) {
      return null;
    }
    const intro = (
      <SmoacWelcomeIntro
        variant="join"
        onComplete={handleIntroComplete}
        onVisible={() => setIntroVisible(true)}
      />
    );
    return portalReady ? createPortal(intro, document.body) : intro;
  }

  if (showSpecialistOnboarding) {
    return (
      <SpecialistOnboardingWizard
        onBackToRole={() => setShowSpecialistOnboarding(false)}
      />
    );
  }

  return (
    <div
      className="login-page login-page--wizard"
      data-login-role={state.accountType ?? "client"}
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

      <div className="login-page__shell">
        <header className="login-page__brand wizard-page-brand">
          <Logo href="/" size="lg" priority className="wizard-page-brand__logo" />
        </header>

        <div className="login-card wizard-card">
          <div className="wizard-progress">
            <div className="wizard-signup-reassure">
              {showClientQuickHeader ? (
                <>
                  <p className="wizard-signup-reassure__title">Quick sign up</p>
                  <p className="wizard-signup-reassure__punch">
                    Email and that&apos;s it!
                  </p>
                  <p className="wizard-signup-reassure__sub">
                    Browse and compare specialists near you instantly.
                  </p>
                </>
              ) : (
                <>
                  <p className="wizard-signup-reassure__title">
                    Quick &amp; easy signup
                  </p>
                  <p className="wizard-signup-reassure__sub">
                    About 5 minutes — short steps, then you&apos;re in.
                  </p>
                </>
              )}
            </div>
            {showClientQuickHeader ? null : (
              <>
                <div className="wizard-progress__header">
                  <p className="wizard-progress__step">
                    Step {step} of {CREATE_ACCOUNT_TOTAL_STEPS}
                  </p>
                  <p className="wizard-progress__complete">
                    {progressPercent}% complete
                  </p>
                </div>
                <div className="wizard-progress__track">
                  <div
                    className="wizard-progress__fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="login-card__form">{renderStepContent()}</div>

          <div className="login-form__section login-form__section--cta">
            {error ? (
              <p className="login-card__message" role="alert">
                {error}
              </p>
            ) : null}

            <div className="wizard-nav">
              {step > 1 && !(isClientQuickSignup && initialAccountType === "client") ? (
                <button
                  type="button"
                  className="wizard-nav__back"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                className="login-submit wizard-nav__continue"
                onClick={handleContinue}
                disabled={
                  submitting || (step === 1 && state.accountType == null)
                }
              >
                {submitting
                  ? "Creating account…"
                  : isClientQuickSignup && step === 2
                    ? "Sign up"
                    : step === CREATE_ACCOUNT_TOTAL_STEPS
                      ? "Create Account"
                      : "Continue"}
              </button>
            </div>
          </div>

          <p className="wizard-footer-link">
            <span>Already have an account?</span>
            <Link href={LOGIN_PATH}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
