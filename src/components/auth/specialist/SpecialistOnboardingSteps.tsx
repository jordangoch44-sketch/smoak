"use client";

import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  PROFESSIONAL_TYPE_OPTIONS,
  SPECIALIST_SPECIALTY_OPTIONS,
} from "@/constants/specialist-onboarding-options";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import { cn } from "@/lib/utils";
import { SpecialistApplicationPreview } from "@/components/auth/specialist/SpecialistApplicationPreview";
import { SpecialistServiceAreaFields } from "@/components/auth/specialist/SpecialistServiceAreaFields";
import type { useProfilePhotoCropSession } from "@/hooks/useProfilePhotoCropSession";

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function WizardStepPanel({
  children,
  className,
  stepKey,
}: {
  children: React.ReactNode;
  className?: string;
  stepKey: string;
}) {
  return (
    <div key={stepKey} className={cn("wizard-step", className)}>
      {children}
    </div>
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

export interface SpecialistOnboardingStepsProps {
  step: number;
  state: SpecialistOnboardingState;
  onPatch: (partial: Partial<SpecialistOnboardingState>) => void;
  onEditStep: (step: number) => void;
  profilePhotoCrop: ReturnType<typeof useProfilePhotoCropSession>;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  passwordFieldsError?: boolean;
  shakePasswordFields?: boolean;
  onPasswordShakeEnd?: () => void;
}

export function SpecialistOnboardingSteps({
  step,
  state,
  onPatch,
  onEditStep,
  profilePhotoCrop,
  confirmPassword,
  onConfirmPasswordChange,
  passwordFieldsError = false,
  shakePasswordFields = false,
  onPasswordShakeEnd,
}: SpecialistOnboardingStepsProps) {
  function handleProfilePhotoFile(file: File) {
    profilePhotoCrop.openCropFromFile(file, (payload) => {
      onPatch({
        media: {
          ...state.media,
          profilePhotoUrl: payload.croppedImageData,
          profilePhotoOriginalUrl: payload.originalImageData,
          profilePhotoCrop: payload.cropSettings,
        },
      });
    });
  }

  function handleEditProfilePhotoCrop() {
    const original =
      state.media.profilePhotoOriginalUrl.trim() ||
      state.media.profilePhotoUrl.trim();
    if (!original) return;
    profilePhotoCrop.openCropFromOriginal(
      original,
      (payload) => {
        onPatch({
          media: {
            ...state.media,
            profilePhotoUrl: payload.croppedImageData,
            profilePhotoOriginalUrl: payload.originalImageData,
            profilePhotoCrop: payload.cropSettings,
          },
        });
      },
      state.media.profilePhotoCrop
    );
  }

  const primaryCert = state.certifications[0] ?? {
    name: "",
    issuer: "",
    year: new Date().getFullYear(),
  };

  switch (step) {
    case 1:
      return (
        <WizardStepPanel stepKey="sp-1">
          <WizardStepHeading
            title="What type of professional are you?"
            subtitle="Choose the role that best describes your practice."
          />
          <div className="wizard-scroll-options">
            {PROFESSIONAL_TYPE_OPTIONS.map((type) => {
              const active = state.professionalType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onPatch({ professionalType: type })}
                  className={cn(
                    "wizard-option-card",
                    active && "wizard-option-card--active"
                  )}
                >
                  <span className="wizard-option-card__indicator" aria-hidden>
                    <span className="wizard-option-card__indicator-dot" />
                  </span>
                  <span className="wizard-option-card__copy">
                    <span className="wizard-option-card__title">{type}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </WizardStepPanel>
      );

    case 2:
      return (
        <WizardStepPanel stepKey="sp-2">
          <WizardStepHeading
            title="Create your specialist account"
            subtitle="You’ll use this email to sign in — including while your application is under review."
          />
          <div className="login-fields">
            <label className="login-field">
              <span className="login-field__label">Full name</span>
              <input
                className="login-field__input"
                value={state.fullName}
                onChange={(e) => onPatch({ fullName: e.target.value })}
                autoComplete="name"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Display name</span>
              <input
                className="login-field__input"
                value={state.displayName}
                onChange={(e) => onPatch({ displayName: e.target.value })}
                placeholder="How clients will see you"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Profile headline</span>
              <input
                className="login-field__input"
                value={state.headline}
                onChange={(e) => onPatch({ headline: e.target.value })}
                placeholder="Hybrid Performance Coach"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Email</span>
              <input
                type="email"
                className="login-field__input"
                value={state.email}
                onChange={(e) => onPatch({ email: e.target.value })}
                autoComplete="email"
                required
              />
            </label>
            <div
              className={cn(
                "wizard-password-fields",
                passwordFieldsError && "login-fields--error",
                shakePasswordFields && "login-fields--shake"
              )}
              onAnimationEnd={onPasswordShakeEnd}
            >
              <label className="login-field">
                <span className="login-field__label">Create a password</span>
                <PasswordInput
                  value={state.password}
                  onChange={(e) => onPatch({ password: e.target.value })}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  required
                  aria-invalid={passwordFieldsError}
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Confirm password</span>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  required
                  aria-invalid={passwordFieldsError}
                />
              </label>
              {passwordFieldsError ? (
                <p className="wizard-field-error" role="alert">
                  {state.password.trim().length < 8
                    ? "Use at least 8 characters."
                    : "Passwords do not match."}
                </p>
              ) : null}
            </div>
            <label className="login-field">
              <span className="login-field__label">Phone number</span>
              <input
                type="tel"
                className="login-field__input"
                value={state.phone}
                onChange={(e) => onPatch({ phone: e.target.value })}
                autoComplete="tel"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">
                Profile photo
                <span className="login-field__label-hint">Required</span>
              </span>
              <input
                type="file"
                accept="image/*"
                className="login-field__input wizard-file-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfilePhotoFile(file);
                  e.target.value = "";
                }}
              />
              {state.media.profilePhotoUrl ? (
                <div className="wizard-profile-photo-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.media.profilePhotoUrl}
                    alt="Profile preview"
                    className="wizard-profile-photo-preview__img"
                  />
                  <button
                    type="button"
                    className="wizard-edit-crop-link"
                    onClick={handleEditProfilePhotoCrop}
                  >
                    Edit crop
                  </button>
                </div>
              ) : (
                <p className="wizard-field-hint">
                  Add a clear face or brand photo — clients see this on your card.
                </p>
              )}
            </label>
          </div>
        </WizardStepPanel>
      );

    case 3:
      return (
        <WizardStepPanel stepKey="sp-3">
          <WizardStepHeading
            title="Where do you work with clients?"
            subtitle="ZIP and service type help us match you nearby. Gym details and neighborhoods can be added later."
          />
          <SpecialistServiceAreaFields state={state} onPatch={onPatch} />
        </WizardStepPanel>
      );

    case 4:
      return (
        <WizardStepPanel stepKey="sp-4">
          <WizardStepHeading
            title="Your specialties"
            subtitle="Select the areas you coach. You can refine these anytime from your dashboard."
          />
          <div className="wizard-pill-grid wizard-pill-grid--wide">
            {SPECIALIST_SPECIALTY_OPTIONS.map((specialty) => {
              const active = state.specialties.includes(specialty);
              return (
                <button
                  key={specialty}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onPatch({
                      specialties: toggleInList(state.specialties, specialty),
                    })
                  }
                  className={cn(
                    "wizard-pill",
                    active && "wizard-pill--active"
                  )}
                >
                  {specialty}
                </button>
              );
            })}
          </div>
          <div className="login-fields" style={{ marginTop: "1.25rem" }}>
            <p className="wizard-step-subsection-title">
              Primary certification
              <span className="login-field__label-hint"> Optional</span>
            </p>
            <label className="login-field">
              <span className="login-field__label">Certification name</span>
              <input
                className="login-field__input"
                value={primaryCert.name}
                onChange={(e) =>
                  onPatch({
                    certifications: [
                      {
                        ...primaryCert,
                        name: e.target.value,
                        issuer: primaryCert.issuer || " ",
                        year: primaryCert.year || new Date().getFullYear(),
                      },
                    ],
                  })
                }
                placeholder="e.g. NASM-CPT"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Issuer</span>
              <input
                className="login-field__input"
                value={primaryCert.issuer.trim()}
                onChange={(e) =>
                  onPatch({
                    certifications: [
                      {
                        ...primaryCert,
                        name: primaryCert.name,
                        issuer: e.target.value,
                        year: primaryCert.year || new Date().getFullYear(),
                      },
                    ],
                  })
                }
                placeholder="e.g. NASM"
              />
            </label>
          </div>
        </WizardStepPanel>
      );

    case 5:
      return (
        <WizardStepPanel stepKey="sp-5">
          <WizardStepHeading
            title="A short intro"
            subtitle="Keep it brief for now. After approval, you’ll finish your full in-depth profile from the specialist dashboard."
          />
          <div className="login-fields">
            <label className="login-field">
              <span className="login-field__label">Short bio</span>
              <textarea
                className="login-field__input wizard-textarea"
                value={state.bio}
                onChange={(e) => onPatch({ bio: e.target.value })}
                rows={5}
                placeholder="Who you help, what you specialize in, and what clients can expect."
              />
            </label>
            <p className="wizard-field-hint">
              About 40+ characters · {state.bio.trim().length} entered
            </p>
            <label className="login-field">
              <span className="login-field__label">
                Instagram
                <span className="login-field__label-hint">Optional</span>
              </span>
              <input
                className="login-field__input"
                value={state.social.instagram ?? ""}
                onChange={(e) =>
                  onPatch({ social: { ...state.social, instagram: e.target.value } })
                }
                placeholder="@yourhandle"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">
                Website
                <span className="login-field__label-hint">Optional</span>
              </span>
              <input
                className="login-field__input"
                value={state.social.website ?? ""}
                onChange={(e) =>
                  onPatch({ social: { ...state.social, website: e.target.value } })
                }
                placeholder="https://"
              />
            </label>
            <p className="wizard-field-hint">
              Pricing, availability, media, and coaching style come later — once
              you’re approved, edit your in-depth profile anytime.
            </p>
          </div>
        </WizardStepPanel>
      );

    case 6:
      return (
        <WizardStepPanel stepKey="sp-6">
          <WizardStepHeading
            title="Preview & submit"
            subtitle="This is enough for review. After approval, finish your full profile from your dashboard."
          />
          <SpecialistApplicationPreview
            state={state}
            onEditCrop={
              state.media.profilePhotoUrl.trim() ||
              state.media.profilePhotoOriginalUrl.trim()
                ? handleEditProfilePhotoCrop
                : undefined
            }
          />
          <p className="wizard-field-hint" style={{ marginTop: "1rem" }}>
            After you’re approved, log in and open Edit profile to add pricing,
            availability, photos, credentials, and more.
          </p>
          <div className="wizard-preview-actions">
            <button
              type="button"
              className="wizard-nav__back wizard-preview-actions__edit"
              onClick={() => onEditStep(2)}
            >
              Edit account details
            </button>
          </div>
        </WizardStepPanel>
      );

    default:
      return null;
  }
}
