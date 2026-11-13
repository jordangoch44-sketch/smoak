"use client";

import { useRef } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  GENDER_OPTIONS,
  PROFESSIONAL_TYPE_OPTIONS,
} from "@/constants/specialist-onboarding-options";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import { cn } from "@/lib/utils";
import { applicationPricingFromRange } from "@/lib/session-price";
import { SpecialistApplicationPreview } from "@/components/auth/specialist/SpecialistApplicationPreview";
import { MarketplaceSpecialtyPicker } from "@/components/auth/specialist/MarketplaceSpecialtyPicker";
import { SpecialistServiceAreaFields } from "@/components/auth/specialist/SpecialistServiceAreaFields";
import { SpecialistTrainingOptionsFields } from "@/components/auth/specialist/SpecialistTrainingOptionsFields";
import type { SpecialistInterviewBeatId } from "@/lib/specialist-onboarding-interview";
import type { useProfilePhotoCropSession } from "@/hooks/useProfilePhotoCropSession";

const COVER_PHOTO_LIMIT = 3;

const PROFILE_CROP = {
  cropShape: "round" as const,
  title: "Profile photo",
  lead: "Drag to reposition. This is the round photo on your card.",
};

const COVER_CROP = {
  aspect: 1,
  cropShape: "rect" as const,
  title: "Cover photo",
  lead: "Drag to reposition. Cover photos show across your profile.",
};

function readCoverPhotos(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, COVER_PHOTO_LIMIT);
}

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
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverIndexRef = useRef(0);
  const coverPhotos = readCoverPhotos(state.media.trainingVideoUrls);

  function handleProfilePhotoFile(file: File) {
    profilePhotoCrop.openCropFromFile(
      file,
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
      state.media.profilePhotoCrop,
      PROFILE_CROP
    );
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
      state.media.profilePhotoCrop,
      PROFILE_CROP
    );
  }

  function openCoverPicker(index: number) {
    coverIndexRef.current = index;
    coverInputRef.current?.click();
  }

  function handleCoverPhotoFile(file: File) {
    const index = coverIndexRef.current;
    profilePhotoCrop.openCropFromFile(
      file,
      (payload) => {
        const next = readCoverPhotos(state.media.trainingVideoUrls);
        next[index] = payload.croppedImageData;
        onPatch({
          media: {
            ...state.media,
            trainingVideoUrls: next.filter(Boolean).slice(0, COVER_PHOTO_LIMIT).join("\n"),
          },
        });
      },
      null,
      COVER_CROP
    );
  }

  function removeCoverPhoto(index: number) {
    const next = coverPhotos.filter((_, itemIndex) => itemIndex !== index);
    onPatch({
      media: {
        ...state.media,
        trainingVideoUrls: next.join("\n"),
      },
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
              <FastActivateButton
                key={type}
                type="button"
                onActivate={() => onPatch({ professionalType: type })}
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
              </FastActivateButton>
            );
          })}
        </div>
      );

    case "full-name":
    case "gender":
      return (
        <div className="login-fields interview-combined-fields">
          <label className="login-field">
            <span className="login-field__label">Full name</span>
            <input
              className="login-field__input"
              value={state.fullName}
              onChange={(e) => onPatch({ fullName: e.target.value })}
              autoComplete="name"
              placeholder="Jane Doe"
              aria-required="true"
            />
          </label>
          <div
            className="wizard-gender-options"
            role="radiogroup"
            aria-label="Gender"
            aria-required="true"
          >
            {GENDER_OPTIONS.map((option) => {
              const active = state.gender === option.value;
              return (
                <FastActivateButton
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onActivate={() => onPatch({ gender: option.value })}
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
                </FastActivateButton>
              );
            })}
          </div>
        </div>
      );

    case "business-name":
    case "professional-title":
      return (
        <div className="login-fields interview-combined-fields">
          <label className="login-field">
            <span className="login-field__label">Business name</span>
            <input
              className="login-field__input"
              value={state.displayName}
              onChange={(e) => onPatch({ displayName: e.target.value })}
              placeholder="How clients will see you"
              aria-required="true"
            />
          </label>
          <label className="login-field">
            <span className="login-field__label">Professional title</span>
            <input
              className="login-field__input"
              value={state.headline}
              onChange={(e) => onPatch({ headline: e.target.value })}
              placeholder="e.g. Strength coach, Mobility and recovery"
              aria-required="true"
            />
          </label>
        </div>
      );

    case "email":
    case "password": {
      const passwordsMatch =
        state.password.length > 0 &&
        confirmPassword.length > 0 &&
        state.password === confirmPassword;
      return (
        <div className="login-fields interview-combined-fields">
          <label className="login-field">
            <span className="login-field__label">Email</span>
            <input
              type="email"
              name="email"
              className="login-field__input"
              value={state.email}
              onChange={(e) => onPatch({ email: e.target.value })}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              placeholder="you@studio.com"
              readOnly={emailLocked}
              aria-readonly={emailLocked}
            />
          </label>
          {hidePasswordFields ? null : (
            <div
              className={cn(
                "wizard-password-fields",
                passwordFieldsError && "login-fields--error",
                shakePasswordFields && "login-fields--shake"
              )}
              onAnimationEnd={onPasswordShakeEnd}
            >
              <label className="login-field">
                <span className="login-field__label">Create password</span>
                <PasswordInput
                  value={state.password}
                  onChange={(e) => onPatch({ password: e.target.value })}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-required="true"
                  aria-invalid={passwordFieldsError}
                  matched={passwordsMatch}
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Confirm password</span>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  aria-required="true"
                  aria-invalid={passwordFieldsError}
                  matched={passwordsMatch}
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
          )}
        </div>
      );
    }

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
        <div className="interview-photo-setup">
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            className="interview-cover-photos__input"
            aria-label="Profile photo"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleProfilePhotoFile(file);
              event.target.value = "";
            }}
          />
          <div className="interview-profile-row">
            <span className="interview-profile-ring">
              {state.media.profilePhotoUrl ? (
                <button
                  type="button"
                  className="interview-profile-photo"
                  onClick={() => profileInputRef.current?.click()}
                  aria-label="Replace profile photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.media.profilePhotoUrl}
                    alt=""
                    className="wizard-profile-photo-preview__img"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  className="interview-profile-slot"
                  onClick={() => profileInputRef.current?.click()}
                  aria-label="Add profile photo"
                >
                  <span aria-hidden>+</span>
                </button>
              )}
            </span>
            <div className="interview-profile-copy">
              <p className="interview-profile-copy__name">
                {state.displayName.trim() || "Your business"}
              </p>
              <p className="interview-profile-copy__type">
                {state.professionalType.trim() || "Specialist"}
              </p>
              {state.media.profilePhotoUrl ? (
                <button
                  type="button"
                  className="wizard-edit-crop-link"
                  onClick={handleEditProfilePhotoCrop}
                >
                  Edit crop
                </button>
              ) : null}
            </div>
          </div>

          <div className="interview-cover-photos">
            <p className="interview-cover-photos__title">Cover photos</p>
            <p className="interview-cover-photos__hint">
              Optional. Add up to 3 to start strong — you can add more later.
            </p>
            <div className="interview-cover-photos__row">
              {Array.from({ length: COVER_PHOTO_LIMIT }, (_, index) => {
                const photo = coverPhotos[index];
                if (!photo) {
                  return (
                    <button
                      key={index}
                      type="button"
                      className="interview-cover-slot"
                      onClick={() => openCoverPicker(coverPhotos.length)}
                      aria-label={`Add cover photo ${coverPhotos.length + 1} of ${COVER_PHOTO_LIMIT}`}
                    >
                      <span aria-hidden>+</span>
                    </button>
                  );
                }
                return (
                  <div key={index} className="interview-cover-slot interview-cover-slot--filled">
                    <button
                      type="button"
                      className="interview-cover-slot__photo"
                      onClick={() => openCoverPicker(index)}
                      aria-label={`Replace cover photo ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt="" />
                    </button>
                    <button
                      type="button"
                      className="interview-cover-slot__remove"
                      onClick={() => removeCoverPhoto(index)}
                      aria-label={`Remove cover photo ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="interview-cover-photos__input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleCoverPhotoFile(file);
                event.target.value = "";
              }}
            />
          </div>
        </div>
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

    case "preview":
      return (
        <div className="wizard-preview-scroll">
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
