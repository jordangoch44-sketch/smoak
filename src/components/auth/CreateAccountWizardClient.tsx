"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  BUDGET_RANGE_OPTIONS,
  CLIENT_ACCOUNT_OPTION,
  CLIENT_GOAL_OPTIONS,
  CREATE_ACCOUNT_TOTAL_STEPS,
  SESSION_FORMAT_OPTIONS,
  SPECIALIST_ACCOUNT_OPTION,
  SPECIALIST_TYPE_OPTIONS,
  TRAINING_STYLE_OPTIONS,
} from "@/constants/create-account-options";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import { persistCreateAccountProfile } from "@/lib/create-account-profile-storage";
import { validateDevSignup } from "@/lib/dev-auth";
import type { AuthRole } from "@/types/auth";
import {
  INITIAL_CREATE_ACCOUNT_STATE,
  type CreateAccountProfile,
  type CreateAccountWizardState,
} from "@/types/create-account";
import { cn } from "@/lib/utils";
import { SpecialistOnboardingWizard } from "@/components/auth/specialist/SpecialistOnboardingWizard";

type WizardStep = 1 | 2 | 3 | 4 | 5;

const ACCOUNT_OPTIONS = [CLIENT_ACCOUNT_OPTION, SPECIALIST_ACCOUNT_OPTION];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function stepProgressPercent(step: WizardStep): number {
  return Math.round(((step - 1) / CREATE_ACCOUNT_TOTAL_STEPS) * 100);
}

function isStepValid(step: WizardStep, state: CreateAccountWizardState): boolean {
  switch (step) {
    case 1:
      return state.accountType != null;
    case 2:
      return (
        state.firstName.trim().length > 0 &&
        state.lastName.trim().length > 0 &&
        isValidEmail(state.email) &&
        state.password.trim().length >= 6
      );
    case 3:
      if (state.accountType === "client") {
        return state.clientGoals.length > 0;
      }
      return state.specialistType.length > 0;
    case 4:
      if (state.accountType === "client") {
        return (
          state.clientCity.trim().length > 0 &&
          state.clientBudget.length > 0 &&
          state.clientTrainingStyle.length > 0
        );
      }
      return (
        state.specialistCity.trim().length > 0 &&
        state.specialistFormat.length > 0 &&
        state.specialistStartingPrice.trim().length > 0
      );
    case 5:
      return (
        isStepValid(1, state) &&
        isStepValid(2, state) &&
        isStepValid(3, state) &&
        isStepValid(4, state)
      );
    default:
      return false;
  }
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function accountTypeLabel(role: AuthRole | null): string {
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
  id: AuthRole;
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

interface OptionCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}

function OptionCard({ title, description, selected, onSelect }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "wizard-option-card",
        selected && "wizard-option-card--active"
      )}
    >
      <span className="wizard-option-card__indicator" aria-hidden>
        <span className="wizard-option-card__indicator-dot" />
      </span>
      <span className="wizard-option-card__copy">
        <span className="wizard-option-card__title">{title}</span>
        {description ? (
          <span className="wizard-option-card__desc">{description}</span>
        ) : null}
      </span>
    </button>
  );
}

export function CreateAccountWizardClient() {
  const router = useRouter();
  const { isReady, session, signIn } = useAuthSession();
  const { showToast } = useToast();
  const [step, setStep] = useState<WizardStep>(1);
  const [state, setState] = useState<CreateAccountWizardState>(
    INITIAL_CREATE_ACCOUNT_STATE
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSpecialistOnboarding, setShowSpecialistOnboarding] = useState(false);

  const progressPercent = stepProgressPercent(step);
  const canContinue = isStepValid(step, state);
  const isClient = state.accountType === "client";

  useEffect(() => {
    if (!isReady || !session) return;
    router.replace(getDashboardPathForRole(session.role));
  }, [isReady, session, router]);

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
    if (!canContinue) return;
    if (step === 1 && state.accountType === "specialist") {
      setShowSpecialistOnboarding(true);
      setError(null);
      return;
    }
    if (step < CREATE_ACCOUNT_TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as WizardStep);
      setError(null);
      return;
    }
    handleCreateAccount();
  }

  function handleCreateAccount() {
    if (!state.accountType || submitting) return;

    const trimmedEmail = state.email.trim();
    const validatedRole = validateDevSignup(
      state.accountType,
      trimmedEmail,
      state.password
    );

    if (!validatedRole) {
      setError("Enter a valid email and a password with at least 6 characters.");
      return;
    }

    setSubmitting(true);

    const profile: CreateAccountProfile = {
      accountType: validatedRole,
      firstName: state.firstName.trim(),
      lastName: state.lastName.trim(),
      email: trimmedEmail,
      createdAt: new Date().toISOString(),
      ...(validatedRole === "client"
        ? {
            clientGoals: state.clientGoals,
            clientCity: state.clientCity.trim(),
            clientNeighborhood: state.clientNeighborhood.trim(),
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
    signIn(validatedRole, trimmedEmail);

    showToast({
      type: "success",
      message: "Account created — welcome to SMOAC",
    });

    window.setTimeout(() => {
      router.push(getDashboardPathForRole(validatedRole));
      setSubmitting(false);
    }, 80);
  }

  const reviewSummary = useMemo(() => {
    const locationLine =
      state.accountType === "client"
        ? [state.clientCity, state.clientNeighborhood].filter(Boolean).join(", ")
        : [state.specialistCity, state.specialistNeighborhood]
            .filter(Boolean)
            .join(", ");

    const goalsOrSpecialty =
      state.accountType === "client"
        ? state.clientGoals.join(", ")
        : state.specialistType;

    const extraLine =
      state.accountType === "client"
        ? `${state.clientBudget} · ${state.clientTrainingStyle}`
        : `${state.specialistFormat} · ${state.specialistStartingPrice}`;

    return {
      locationLine,
      goalsOrSpecialty,
      extraLine,
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
            <WizardStepHeading
              title="Tell us about yourself"
              subtitle="We'll use this to set up your account."
            />
            <div className="login-fields">
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
                <span className="login-field__label">Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={state.password}
                  onChange={(e) => patchState({ password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="login-field__input"
                />
              </label>
            </div>
          </WizardStepPanel>
        );

      case 3:
        if (isClient) {
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
        }

        return (
          <WizardStepPanel key="step-3-specialist">
            <h2 className="wizard-question">What type of specialist are you?</h2>
            <div className="wizard-option-list wizard-option-list--compact">
              {SPECIALIST_TYPE_OPTIONS.map((type) => (
                <OptionCard
                  key={type}
                  title={type}
                  selected={state.specialistType === type}
                  onSelect={() => patchState({ specialistType: type })}
                />
              ))}
            </div>
          </WizardStepPanel>
        );

      case 4:
        if (isClient) {
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
        }

        return (
          <WizardStepPanel key="step-4-specialist">
            <h2 className="wizard-question">Where do you work with clients?</h2>
            <div className="login-fields">
              <label className="login-field">
                <span className="login-field__label">City</span>
                <input
                  type="text"
                  name="specialistCity"
                  autoComplete="address-level2"
                  value={state.specialistCity}
                  onChange={(e) =>
                    patchState({ specialistCity: e.target.value })
                  }
                  placeholder="e.g. Austin"
                  className="login-field__input"
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Neighborhood</span>
                <input
                  type="text"
                  name="specialistNeighborhood"
                  value={state.specialistNeighborhood}
                  onChange={(e) =>
                    patchState({ specialistNeighborhood: e.target.value })
                  }
                  placeholder="Optional"
                  className="login-field__input"
                />
              </label>
              <fieldset className="login-field">
                <legend className="login-field__label">
                  In-person, online, or both
                </legend>
                <div className="wizard-pill-grid" role="group">
                  {SESSION_FORMAT_OPTIONS.map((format) => {
                    const active = state.specialistFormat === format;
                    return (
                      <button
                        key={format}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          patchState({ specialistFormat: format })
                        }
                        className={cn(
                          "wizard-pill",
                          active && "wizard-pill--active"
                        )}
                      >
                        {format}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="login-field">
                <span className="login-field__label">Starting price</span>
                <input
                  type="text"
                  name="specialistStartingPrice"
                  value={state.specialistStartingPrice}
                  onChange={(e) =>
                    patchState({ specialistStartingPrice: e.target.value })
                  }
                  placeholder="e.g. $120 / session"
                  className="login-field__input"
                />
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
                <span className="wizard-review__label">
                  {isClient ? "Goals" : "Specialty"}
                </span>
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

  if (showSpecialistOnboarding) {
    return (
      <SpecialistOnboardingWizard
        onBackToRole={() => setShowSpecialistOnboarding(false)}
      />
    );
  }

  return (
    <div className="login-page login-page--wizard">
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
          </div>

          <div className="login-card__form">{renderStepContent()}</div>

          <div className="login-form__section login-form__section--cta">
            {error ? (
              <p className="login-card__message" role="alert">
                {error}
              </p>
            ) : null}

            <div className="wizard-nav">
              {step > 1 ? (
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
                disabled={!canContinue || submitting}
              >
                {submitting
                  ? "Creating account…"
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
