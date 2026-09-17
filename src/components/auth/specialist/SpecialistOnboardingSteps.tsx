"use client";

import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  GENDER_OPTIONS,
  PROFESSIONAL_TYPE_OPTIONS,
} from "@/constants/specialist-onboarding-options";
import { EMPTY_CERTIFICATION } from "@/lib/specialist-profile-overrides";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import type { Certification } from "@/types/trainer";
import { cn } from "@/lib/utils";
import { applicationPricingFromRange } from "@/lib/session-price";
import { SpecialistApplicationPreview } from "@/components/auth/specialist/SpecialistApplicationPreview";
import { MarketplaceSpecialtyPicker } from "@/components/auth/specialist/MarketplaceSpecialtyPicker";
import { SpecialistServiceAreaFields } from "@/components/auth/specialist/SpecialistServiceAreaFields";
import { SpecialistTrainingOptionsFields } from "@/components/auth/specialist/SpecialistTrainingOptionsFields";
import type { SpecialistInterviewBeatId } from "@/lib/specialist-onboarding-interview";
import type { useProfilePhotoCropSession } from "@/hooks/useProfilePhotoCropSession";

export interface SpecialistOnboardingStepsProps {
  beatId: SpecialistInterviewBeatId;
  state: SpecialistOnboardingState;
  onPatch: (partial: Partial<SpecialistOnboardingState>) => void;
  onEditBeat: (beatId: SpecialistInterviewBeatId) => void;
  profilePhotoCrop: ReturnType<typeof useProfilePhotoCropSession>;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  passwordFieldsError?: boolean;
  shakePasswordFields?: boolean;
  onPasswordShakeEnd?: () => void;
  hidePasswordFields?: boolean;
  emailLocked?: boolean;
  invalidFieldLabels?: string[];
}

export function SpecialistOnboardingSteps({
  beatId,
  state,
  onPatch,
  onEditBeat,
  profilePhotoCrop,
  confirmPassword,
  onConfirmPasswordChange,
  passwordFieldsError = false,
  shakePasswordFields = false,
  onPasswordShakeEnd,
  hidePasswordFields = false,
  emailLocked = false,
  invalidFieldLabels = [],
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

  const certRows: Certification[] =
    state.certifications.length > 0
      ? state.certifications
      : [{ ...EMPTY_CERTIFICATION }];

  function setCertifications(next: Certification[]) {
    onPatch({
      certifications:
        next.length > 0 ? next : [{ ...EMPTY_CERTIFICATION }],
    });
  }

  switch (beatId) {
    case "professional-type":
      return (
        <div
          className="wizard-scroll-options"
          role="radiogroup"
          aria-label="Professional type"
          aria-required="true"
        >
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
      );

    case "full-name":
      return (
        <label className="login-field">
          <span className="sr-only">Full name</span>
          <input
            className="login-field__input"
            value={state.fullName}
            onChange={(e) => onPatch({ fullName: e.target.value })}
            autoComplete="name"
            placeholder="Jane Doe"
            aria-required="true"
          />
        </label>
      );

    case "gender":
      return (
        <div
          className="wizard-gender-options"
          role="radiogroup"
          aria-label="Gender"
          aria-required="true"
        >
          {GENDER_OPTIONS.map((option) => {
            const active = state.gender === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPatch({ gender: option.value })}
                className={cn(
                  "wizard-option-card wizard-gender-option",
                  active && "wizard-option-card--active"
                )}
              >
                <span className="wizard-option-card__indicator" aria-hidden>
                  <span className="wizard-option-card__indicator-dot" />
                </span>
                <span className="wizard-option-card__copy">
                  <span className="wizard-option-card__title">
                    {option.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      );

    case "business-name":
      return (
        <label className="login-field">
          <span className="sr-only">Business name</span>
          <input
            className="login-field__input"
            value={state.displayName}
            onChange={(e) => onPatch({ displayName: e.target.value })}
            placeholder="How clients will see you"
            aria-required="true"
          />
        </label>
      );

    case "professional-title":
      return (
        <label className="login-field">
          <span className="sr-only">Professional title</span>
          <input
            className="login-field__input"
            value={state.headline}
            onChange={(e) => onPatch({ headline: e.target.value })}
            placeholder="e.g. Strength coach, Mobility and recovery"
            aria-required="true"
          />
        </label>
      );

    case "email":
      return (
        <label className="login-field">
          <span className="sr-only">Email</span>
          <input
            type="email"
            className="login-field__input"
            value={state.email}
            onChange={(e) => onPatch({ email: e.target.value })}
            autoComplete="email"
            placeholder="you@studio.com"
            readOnly={emailLocked}
            aria-readonly={emailLocked}
          />
        </label>
      );

    case "password":
      if (hidePasswordFields) return null;
      return (
        <div
          className={cn(
            "login-fields wizard-password-fields",
            passwordFieldsError && "login-fields--error",
            shakePasswordFields && "login-fields--shake"
          )}
          onAnimationEnd={onPasswordShakeEnd}
        >
          <label className="login-field">
            <span className="sr-only">Create a password</span>
            <PasswordInput
              value={state.password}
              onChange={(e) => onPatch({ password: e.target.value })}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-required="true"
              aria-invalid={passwordFieldsError}
            />
          </label>
          <label className="login-field">
            <span className="sr-only">Confirm password</span>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              aria-required="true"
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
      );

    case "phone":
      return (
        <label className="login-field">
          <span className="sr-only">Phone number</span>
          <input
            type="tel"
            className="login-field__input"
            value={state.phone}
            onChange={(e) => onPatch({ phone: e.target.value })}
            autoComplete="tel"
            placeholder="(555) 555-5555"
            aria-required="true"
          />
        </label>
      );

    case "photo":
      return (
        <label className="login-field">
          <span className="sr-only">Profile photo</span>
          <input
            type="file"
            accept="image/*"
            className="login-field__input wizard-file-input"
            aria-required="true"
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
      );

    case "service-type":
      return (
        <SpecialistServiceAreaFields
          state={state}
          onPatch={onPatch}
          invalidFieldLabels={invalidFieldLabels}
          focus="service-type"
        />
      );

    case "location":
      return (
        <SpecialistServiceAreaFields
          state={state}
          onPatch={onPatch}
          invalidFieldLabels={invalidFieldLabels}
          focus="location"
        />
      );

    case "street":
      return (
        <SpecialistServiceAreaFields
          state={state}
          onPatch={onPatch}
          invalidFieldLabels={invalidFieldLabels}
          focus="street"
        />
      );

    case "service-area":
      return (
        <SpecialistServiceAreaFields
          state={state}
          onPatch={onPatch}
          invalidFieldLabels={invalidFieldLabels}
          focus="description"
        />
      );

    case "specialties":
      return (
        <MarketplaceSpecialtyPicker
          variant="wizard"
          required
          selected={state.specialties}
          homepageSpecialties={state.homepageSpecialties}
          onChange={({ specialty, homepageSpecialties }) =>
            onPatch({
              specialties: specialty,
              homepageSpecialties,
            })
          }
        />
      );

    case "certifications":
      return (
        <div className="login-fields">
          {certRows.map((cert, index) => (
            <div key={`cert-${index}`} className="login-field">
              <span className="sr-only">
                {certRows.length > 1
                  ? `Certification ${index + 1}`
                  : "Certification"}
              </span>
              <input
                className="login-field__input"
                value={cert.name}
                onChange={(e) =>
                  setCertifications(
                    certRows.map((row, i) =>
                      i === index
                        ? {
                            ...row,
                            name: e.target.value,
                            issuer: "",
                            year: row.year || new Date().getFullYear(),
                          }
                        : row
                    )
                  )
                }
                placeholder="e.g. NASM-CPT"
              />
              {certRows.length > 1 ? (
                <button
                  type="button"
                  className="wizard-cert-block__remove"
                  onClick={() =>
                    setCertifications(certRows.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="smoac-control wizard-add-row-btn"
            onClick={() =>
              setCertifications([...certRows, { ...EMPTY_CERTIFICATION }])
            }
          >
            Add another certification
          </button>
        </div>
      );

    case "bio":
      return (
        <div className="login-fields">
          <label className="login-field">
            <span className="sr-only">Short bio</span>
            <textarea
              className="login-field__input wizard-textarea"
              value={state.bio}
              onChange={(e) => onPatch({ bio: e.target.value })}
              rows={5}
              placeholder="Who you help, what you specialize in, and what clients can expect."
              aria-required="true"
            />
          </label>
          <p className="wizard-field-hint">
            About 40+ characters · {state.bio.trim().length} entered
          </p>
        </div>
      );

    case "training-options":
      return (
        <SpecialistTrainingOptionsFields
          value={state.trainingOptions}
          onChange={(trainingOptions) => onPatch({ trainingOptions })}
          hideLabel
        />
      );

    case "pricing":
      return (
        <div className="login-fields">
          <div className="session-price-range-fields">
            <p className="sr-only">1:1 session price</p>
            <label className="login-field">
              <span className="login-field__label">From</span>
              <input
                className="login-field__input"
                inputMode="decimal"
                value={state.pricing.oneOnOnePriceMin}
                onChange={(e) =>
                  onPatch({
                    pricing: applicationPricingFromRange(
                      e.target.value,
                      state.pricing.oneOnOnePriceMax,
                      state.pricing
                    ),
                  })
                }
                placeholder="$80"
                aria-required="true"
                aria-label="Session price from"
              />
            </label>
            <span className="session-price-range-fields__dash" aria-hidden="true">
              –
            </span>
            <label className="login-field">
              <span className="login-field__label">To</span>
              <input
                className="login-field__input"
                inputMode="decimal"
                value={state.pricing.oneOnOnePriceMax}
                onChange={(e) =>
                  onPatch({
                    pricing: applicationPricingFromRange(
                      state.pricing.oneOnOnePriceMin,
                      e.target.value,
                      state.pricing
                    ),
                  })
                }
                placeholder="$120"
                aria-required="true"
                aria-label="Session price to"
              />
            </label>
          </div>
          <p className="wizard-field-hint">
            Shown as a range on your Marketplace card after approval, e.g.
            $80–$120 / session.
          </p>
        </div>
      );

    case "instagram":
      return (
        <label className="login-field">
          <span className="sr-only">Instagram</span>
          <input
            className="login-field__input"
            value={state.social.instagram ?? ""}
            onChange={(e) =>
              onPatch({ social: { ...state.social, instagram: e.target.value } })
            }
            placeholder="@yourhandle"
          />
        </label>
      );

    case "website":
      return (
        <label className="login-field">
          <span className="sr-only">Website</span>
          <input
            className="login-field__input"
            value={state.social.website ?? ""}
            onChange={(e) =>
              onPatch({ social: { ...state.social, website: e.target.value } })
            }
            placeholder="https://"
          />
        </label>
      );

    case "preview":
      return (
        <div className="wizard-scroll-options wizard-preview-scroll">
          <SpecialistApplicationPreview
            state={state}
            onEditCrop={
              state.media.profilePhotoUrl.trim() ||
              state.media.profilePhotoOriginalUrl.trim()
                ? handleEditProfilePhotoCrop
                : undefined
            }
          />
          <div className="wizard-preview-actions">
            <button
              type="button"
              className="wizard-nav__back wizard-preview-actions__edit"
              onClick={() => onEditBeat("full-name")}
            >
              Edit account details
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
