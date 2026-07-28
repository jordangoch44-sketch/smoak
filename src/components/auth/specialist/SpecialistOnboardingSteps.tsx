"use client";

import { useMemo } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  AGE_RANGE_OPTIONS,
  DAY_OPTIONS,
  GENDER_OPTIONS,
  MOTIVATION_STYLE_OPTIONS,
  PROFESSIONAL_TYPE_OPTIONS,
  SESSION_DURATION_OPTIONS,
  SPECIALIST_SPECIALTY_OPTIONS,
  TIME_BLOCK_OPTIONS,
} from "@/constants/specialist-onboarding-options";
import { MARKETPLACE_CITIES, getNeighborhoodsForCity, isMarketplaceCity } from "@/data/locations";
import type { Certification } from "@/types/trainer";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import { cn } from "@/lib/utils";
import { validateGoogleReviewsUrl } from "@/lib/google-reviews-url";
import { SpecialistApplicationPreview } from "@/components/auth/specialist/SpecialistApplicationPreview";
import { SpecialistServiceAreaFields } from "@/components/auth/specialist/SpecialistServiceAreaFields";
import type { ProfilePhotoCropSavePayload } from "@/hooks/useProfilePhotoCropSession";
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

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <fieldset className="login-field wizard-toggle-field">
      <legend className="login-field__label">{label}</legend>
      <div className="wizard-toggle-row" role="group">
        {[
          { label: "Yes", active: value },
          { label: "No", active: !value },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={option.active}
            onClick={() => onChange(option.label === "Yes")}
            className={cn(
              "wizard-pill wizard-toggle-row__btn",
              option.active && "wizard-pill--active"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function readFileAsDataUrl(file: File, onLoad: (url: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result ?? ""));
  reader.readAsDataURL(file);
}

function appendUrlLines(existing: string, urls: string[]): string {
  const lines = existing
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return [...lines, ...urls].join("\n");
}

export interface SpecialistOnboardingStepsProps {
  step: number;
  state: SpecialistOnboardingState;
  onPatch: (partial: Partial<SpecialistOnboardingState>) => void;
  onEditStep: (step: number) => void;
  profilePhotoCrop: ReturnType<typeof useProfilePhotoCropSession>;
}

export function SpecialistOnboardingSteps({
  step,
  state,
  onPatch,
  onEditStep,
  profilePhotoCrop,
}: SpecialistOnboardingStepsProps) {
  const neighborhoods = useMemo(
    () =>
      isMarketplaceCity(state.city)
        ? getNeighborhoodsForCity(state.city)
        : [],
    [state.city]
  );

  const googleReviewsCheck = useMemo(
    () => validateGoogleReviewsUrl(state.social.googleReviewsUrl ?? ""),
    [state.social.googleReviewsUrl]
  );

  function patchPricing(
    partial: Partial<SpecialistOnboardingState["pricing"]>
  ) {
    onPatch({ pricing: { ...state.pricing, ...partial } });
  }

  function patchAvailability(
    partial: Partial<SpecialistOnboardingState["availability"]>
  ) {
    onPatch({ availability: { ...state.availability, ...partial } });
  }

  function patchSocial(partial: Partial<SpecialistOnboardingState["social"]>) {
    onPatch({ social: { ...state.social, ...partial } });
  }

  function patchMedia(partial: Partial<SpecialistOnboardingState["media"]>) {
    onPatch({ media: { ...state.media, ...partial } });
  }

  function applyProfilePhotoCrop(payload: ProfilePhotoCropSavePayload) {
    patchMedia({
      profilePhotoUrl: payload.croppedImageData,
      profilePhotoOriginalUrl: payload.originalImageData,
      profilePhotoCrop: payload.cropSettings,
    });
  }

  function handleProfilePhotoFile(file: File) {
    profilePhotoCrop.openCropFromFile(
      file,
      applyProfilePhotoCrop,
      state.media.profilePhotoCrop
    );
  }

  function handleEditProfilePhotoCrop() {
    const original =
      state.media.profilePhotoOriginalUrl.trim() ||
      state.media.profilePhotoUrl.trim();
    if (!original) return;
    profilePhotoCrop.openCropFromOriginal(
      original,
      applyProfilePhotoCrop,
      state.media.profilePhotoCrop
    );
  }

  function patchCertification(index: number, partial: Partial<Certification>) {
    const next = state.certifications.map((cert, i) =>
      i === index ? { ...cert, ...partial } : cert
    );
    onPatch({ certifications: next });
  }

  function addCertification() {
    onPatch({
      certifications: [
        ...state.certifications,
        { name: "", issuer: "", year: new Date().getFullYear() },
      ],
    });
  }

  function removeCertification(index: number) {
    if (state.certifications.length <= 1) return;
    onPatch({
      certifications: state.certifications.filter((_, i) => i !== index),
    });
  }

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
            title="Tell us about yourself"
            subtitle="This becomes the foundation of your public profile."
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
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Password</span>
              <PasswordInput
                value={state.password}
                onChange={(e) => onPatch({ password: e.target.value })}
                autoComplete="new-password"
              />
            </label>
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
            <fieldset className="login-field">
              <legend className="login-field__label">Gender</legend>
              <div className="wizard-pill-grid" role="group">
                {GENDER_OPTIONS.map((option) => {
                  const active = state.gender === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onPatch({ gender: option.value })}
                      className={cn(
                        "wizard-pill",
                        active && "wizard-pill--active"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="login-field">
              <span className="login-field__label">Years of experience</span>
              <input
                className="login-field__input"
                value={state.yearsExperience}
                onChange={(e) => onPatch({ yearsExperience: e.target.value })}
                placeholder="e.g. 8 years"
              />
            </label>
            <fieldset className="login-field">
              <legend className="login-field__label">
                Age ranges you work with
              </legend>
              <div className="wizard-pill-grid" role="group">
                {AGE_RANGE_OPTIONS.map((range) => {
                  const active = state.ageRangesWorkedWith.includes(range);
                  return (
                    <button
                      key={range}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        onPatch({
                          ageRangesWorkedWith: toggleInList(
                            state.ageRangesWorkedWith,
                            range
                          ),
                        })
                      }
                      className={cn(
                        "wizard-pill",
                        active && "wizard-pill--active"
                      )}
                    >
                      {range}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="login-field">
              <span className="login-field__label">Profile photo</span>
              <input
                type="file"
                accept="image/*"
                className="login-field__input wizard-file-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleProfilePhotoFile(file);
                  }
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
                  <p className="wizard-field-hint">Cropped preview — looks great.</p>
                </div>
              ) : (
                <p className="wizard-field-hint">
                  Upload a professional headshot or training photo.
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
            title="Your service area"
            subtitle="Help SMOAC match you with clients near you — we never show your full address publicly."
          />
          <SpecialistServiceAreaFields state={state} onPatch={onPatch} />
          <div className="login-fields specialist-service-area-fields__training">
            <p className="wizard-step-subsection-title">Training locations</p>
            <label className="login-field">
              <span className="login-field__label">Marketplace city</span>
              <select
                className="login-field__input login-field__select"
                value={state.city}
                onChange={(e) =>
                  onPatch({ city: e.target.value, neighborhood: "" })
                }
              >
                <option value="">Select city</option>
                {MARKETPLACE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            {neighborhoods.length > 0 ? (
              <label className="login-field">
                <span className="login-field__label">Neighborhood</span>
                <select
                  className="login-field__input login-field__select"
                  value={state.neighborhood}
                  onChange={(e) => onPatch({ neighborhood: e.target.value })}
                >
                  <option value="">Select neighborhood</option>
                  {neighborhoods.map((hood) => (
                    <option key={hood} value={hood}>
                      {hood}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="login-field">
                <span className="login-field__label">Neighborhood</span>
                <input
                  className="login-field__input"
                  value={state.neighborhood}
                  onChange={(e) => onPatch({ neighborhood: e.target.value })}
                />
              </label>
            )}
            <label className="login-field">
              <span className="login-field__label">Gym / facility name</span>
              <input
                className="login-field__input"
                value={state.gymName}
                onChange={(e) => onPatch({ gymName: e.target.value })}
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Facility address</span>
              <input
                className="login-field__input"
                value={state.facilityAddress}
                onChange={(e) => onPatch({ facilityAddress: e.target.value })}
                placeholder="Optional — not shown on your public profile"
              />
            </label>
          </div>
        </WizardStepPanel>
      );

    case 4:
      return (
        <WizardStepPanel stepKey="sp-4">
          <WizardStepHeading
            title="Your specialties"
            subtitle="Select all areas you coach clients in."
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
        </WizardStepPanel>
      );

    case 5:
      return (
        <WizardStepPanel stepKey="sp-5">
          <WizardStepHeading
            title="Credentials & education"
            subtitle="Build trust with verified certifications."
          />
          <div className="wizard-cert-list">
            {state.certifications.map((cert, index) => (
              <div key={`cert-${index}`} className="wizard-cert-block">
                <div className="wizard-cert-block__header">
                  <p className="wizard-cert-block__title">
                    Certification {index + 1}
                  </p>
                  {state.certifications.length > 1 ? (
                    <button
                      type="button"
                      className="wizard-cert-block__remove"
                      onClick={() => removeCertification(index)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <label className="login-field">
                  <span className="login-field__label">Certification name</span>
                  <input
                    className="login-field__input"
                    value={cert.name}
                    onChange={(e) =>
                      patchCertification(index, { name: e.target.value })
                    }
                    placeholder="NASM CPT"
                  />
                </label>
                <label className="login-field">
                  <span className="login-field__label">Organization</span>
                  <input
                    className="login-field__input"
                    value={cert.issuer}
                    onChange={(e) =>
                      patchCertification(index, { issuer: e.target.value })
                    }
                    placeholder="NASM"
                  />
                </label>
                <label className="login-field">
                  <span className="login-field__label">Year earned</span>
                  <input
                    className="login-field__input"
                    type="number"
                    min={1970}
                    max={new Date().getFullYear()}
                    value={cert.year}
                    onChange={(e) =>
                      patchCertification(index, {
                        year: Number.parseInt(e.target.value, 10) || cert.year,
                      })
                    }
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              className="wizard-add-row-btn"
              onClick={addCertification}
            >
              + Add certification
            </button>
          </div>
          <div className="login-fields wizard-cert-education">
            <label className="login-field">
              <span className="login-field__label">College attended</span>
              <input
                className="login-field__input"
                value={state.collegeAttended}
                onChange={(e) => onPatch({ collegeAttended: e.target.value })}
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Degree</span>
              <input
                className="login-field__input"
                value={state.degree}
                onChange={(e) => onPatch({ degree: e.target.value })}
              />
            </label>
            <YesNoToggle
              label="CPR certified?"
              value={state.cprCertified}
              onChange={(cprCertified) => onPatch({ cprCertified })}
            />
            <YesNoToggle
              label="Insurance verified?"
              value={state.insuranceVerified}
              onChange={(insuranceVerified) => onPatch({ insuranceVerified })}
            />
          </div>
        </WizardStepPanel>
      );

    case 6:
      return (
        <WizardStepPanel stepKey="sp-6">
          <WizardStepHeading
            title="Your coaching style"
            subtitle="Help clients understand your approach."
          />
          <div className="login-fields">
            <label className="login-field">
              <span className="login-field__label">Coaching philosophy</span>
              <textarea
                className="login-field__input wizard-textarea"
                value={state.coachingPhilosophy}
                onChange={(e) =>
                  onPatch({ coachingPhilosophy: e.target.value })
                }
                rows={4}
                placeholder="Example: I build simple, sustainable programs around your real schedule — clear form cues, weekly check-ins, and progress you can feel in 30 days."
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">
                What type of clients do you work best with?
              </span>
              <textarea
                className="login-field__input wizard-textarea"
                value={state.bestClientTypes}
                onChange={(e) => onPatch({ bestClientTypes: e.target.value })}
                rows={3}
                placeholder="Example: Busy professionals returning to fitness, new parents rebuilding strength, or athletes recovering from a plateau."
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">
                What makes your coaching different?
              </span>
              <textarea
                className="login-field__input wizard-textarea"
                value={state.coachingDifferentiator}
                onChange={(e) =>
                  onPatch({ coachingDifferentiator: e.target.value })
                }
                rows={3}
                placeholder="Example: I film form reviews between sessions and adjust programming weekly so you’re never stuck repeating a plan that stopped working."
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">
                Preferred communication style
              </span>
              <input
                className="login-field__input"
                value={state.communicationStyle}
                onChange={(e) =>
                  onPatch({ communicationStyle: e.target.value })
                }
                placeholder="Example: Direct and encouraging — short texts, honest feedback, no fluff"
              />
            </label>
            <fieldset className="login-field">
              <legend className="login-field__label">Motivation style</legend>
              <div className="wizard-pill-grid" role="group">
                {MOTIVATION_STYLE_OPTIONS.map((style) => {
                  const active = state.motivationStyle === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onPatch({ motivationStyle: style })}
                      className={cn(
                        "wizard-pill",
                        active && "wizard-pill--active"
                      )}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </WizardStepPanel>
      );

    case 7:
      return (
        <WizardStepPanel stepKey="sp-7">
          <WizardStepHeading
            title="Pricing & services"
            subtitle="Share approximate starting rates — deals, packages, and specials can vary."
          />
          <div className="login-fields">
            <label className="login-field">
              <span className="login-field__label">
                Approx. 1-on-1 training price
              </span>
              <input
                className="login-field__input"
                value={state.pricing.oneOnOnePrice}
                onChange={(e) =>
                  patchPricing({ oneOnOnePrice: e.target.value })
                }
                placeholder="Example: ~$90–$120 / session (before packages)"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">
                Approx. online coaching price
              </span>
              <input
                className="login-field__input"
                value={state.pricing.onlineCoachingPrice}
                onChange={(e) =>
                  patchPricing({ onlineCoachingPrice: e.target.value })
                }
                placeholder="Example: ~$149–$199 / month"
              />
            </label>
            <YesNoToggle
              label="Group training available?"
              value={state.pricing.groupTrainingAvailable}
              onChange={(groupTrainingAvailable) =>
                patchPricing({ groupTrainingAvailable })
              }
            />
            <YesNoToggle
              label="Free consultation available?"
              value={state.pricing.freeConsultationAvailable}
              onChange={(freeConsultationAvailable) =>
                patchPricing({ freeConsultationAvailable })
              }
            />
            <label className="login-field">
              <span className="login-field__label">
                Packages, deals & specials
              </span>
              <textarea
                className="login-field__input wizard-textarea"
                value={state.pricing.packageOptions}
                onChange={(e) =>
                  patchPricing({ packageOptions: e.target.value })
                }
                rows={2}
                placeholder="Example: 8-session bundle · 12-week transform · seasonal promos"
              />
            </label>
            <fieldset className="login-field">
              <legend className="login-field__label">Session duration</legend>
              <div className="wizard-pill-grid" role="group">
                {SESSION_DURATION_OPTIONS.map((duration) => {
                  const active = state.pricing.sessionDuration === duration;
                  return (
                    <button
                      key={duration}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        patchPricing({ sessionDuration: duration })
                      }
                      className={cn(
                        "wizard-pill",
                        active && "wizard-pill--active"
                      )}
                    >
                      {duration}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="login-field">
              <span className="login-field__label">Subscription options</span>
              <input
                className="login-field__input"
                value={state.pricing.subscriptionOptions}
                onChange={(e) =>
                  patchPricing({ subscriptionOptions: e.target.value })
                }
                placeholder="Example: Monthly coaching · cancel anytime"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Intro offer</span>
              <input
                className="login-field__input"
                value={state.pricing.introOffer}
                onChange={(e) => patchPricing({ introOffer: e.target.value })}
                placeholder="Example: First session complimentary for new clients"
              />
            </label>
          </div>
        </WizardStepPanel>
      );

    case 8:
      return (
        <WizardStepPanel stepKey="sp-8">
          <WizardStepHeading
            title="Availability"
            subtitle="Let clients know when you can take new work."
          />
          <div className="login-fields">
            <fieldset className="login-field">
              <legend className="login-field__label">Days available</legend>
              <div className="wizard-pill-grid" role="group">
                {DAY_OPTIONS.map((day) => {
                  const active = state.availability.daysAvailable.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        patchAvailability({
                          daysAvailable: toggleInList(
                            state.availability.daysAvailable,
                            day
                          ),
                        })
                      }
                      className={cn(
                        "wizard-pill",
                        active && "wizard-pill--active"
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="login-field">
              <legend className="login-field__label">Time blocks</legend>
              <div className="wizard-pill-grid" role="group">
                {TIME_BLOCK_OPTIONS.map((block) => {
                  const active = state.availability.timeBlocks.includes(block);
                  return (
                    <button
                      key={block}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        patchAvailability({
                          timeBlocks: toggleInList(
                            state.availability.timeBlocks,
                            block
                          ),
                        })
                      }
                      className={cn(
                        "wizard-pill",
                        active && "wizard-pill--active"
                      )}
                    >
                      {block}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="login-field">
              <span className="login-field__label">Current client capacity</span>
              <input
                className="login-field__input"
                value={state.availability.clientCapacity}
                onChange={(e) =>
                  patchAvailability({ clientCapacity: e.target.value })
                }
                placeholder="e.g. 8 active clients"
              />
            </label>
            <YesNoToggle
              label="Accepting new clients?"
              value={state.availability.acceptingNewClients}
              onChange={(acceptingNewClients) =>
                patchAvailability({ acceptingNewClients })
              }
            />
          </div>
        </WizardStepPanel>
      );

    case 9:
      return (
        <WizardStepPanel stepKey="sp-9">
          <WizardStepHeading
            title="Social proof & media"
            subtitle="Share links and visuals that build credibility."
          />
          <div className="login-fields">
            <label className="login-field">
              <span className="login-field__label">Instagram</span>
              <input
                className="login-field__input"
                value={state.social.instagram ?? ""}
                onChange={(e) => patchSocial({ instagram: e.target.value })}
                placeholder="@yourhandle"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">TikTok</span>
              <input
                className="login-field__input"
                value={state.social.tiktok ?? ""}
                onChange={(e) => patchSocial({ tiktok: e.target.value })}
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Website</span>
              <input
                className="login-field__input"
                value={state.social.website ?? ""}
                onChange={(e) => patchSocial({ website: e.target.value })}
                placeholder="https://"
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Google Reviews link</span>
              <input
                className={cn(
                  "login-field__input",
                  !googleReviewsCheck.ok && "login-field__input--error"
                )}
                value={state.social.googleReviewsUrl ?? ""}
                onChange={(e) =>
                  patchSocial({ googleReviewsUrl: e.target.value })
                }
                onBlur={() => {
                  if (
                    googleReviewsCheck.ok &&
                    googleReviewsCheck.normalized &&
                    googleReviewsCheck.normalized !==
                      (state.social.googleReviewsUrl ?? "").trim()
                  ) {
                    patchSocial({
                      googleReviewsUrl: googleReviewsCheck.normalized,
                    });
                  }
                }}
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!googleReviewsCheck.ok}
                aria-describedby="google-reviews-hint"
                placeholder="https://maps.google.com/… or g.page/…"
              />
              <span
                id="google-reviews-hint"
                className={cn(
                  "login-field__hint",
                  googleReviewsCheck.ok
                    ? "login-field__hint--muted"
                    : "login-field__hint--warn"
                )}
              >
                {googleReviewsCheck.ok
                  ? "Paste your Google Maps or Google reviews link — not your website."
                  : googleReviewsCheck.message}
              </span>
            </label>
            <label className="login-field">
              <span className="login-field__label">Transformation photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="login-field__input wizard-file-input"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  Promise.all(
                    files.map(
                      (file) =>
                        new Promise<string>((resolve) =>
                          readFileAsDataUrl(file, resolve)
                        )
                    )
                  ).then((urls) =>
                    patchMedia({
                      transformationPhotoUrls: appendUrlLines(
                        state.media.transformationPhotoUrls,
                        urls
                      ),
                    })
                  );
                }}
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Certification uploads</span>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                className="login-field__input wizard-file-input"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  Promise.all(
                    files.map(
                      (file) =>
                        new Promise<string>((resolve) =>
                          readFileAsDataUrl(file, resolve)
                        )
                    )
                  ).then((urls) =>
                    patchMedia({
                      certificationUploadUrls: appendUrlLines(
                        state.media.certificationUploadUrls,
                        urls
                      ),
                    })
                  );
                }}
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Training video URLs</span>
              <textarea
                className="login-field__input wizard-textarea"
                value={state.media.trainingVideoUrls}
                onChange={(e) =>
                  patchMedia({ trainingVideoUrls: e.target.value })
                }
                rows={3}
                placeholder="One URL per line"
              />
            </label>
          </div>
        </WizardStepPanel>
      );

    case 10:
      return (
        <WizardStepPanel stepKey="sp-10">
          <WizardStepHeading
            title="Your profile bio"
            subtitle="Tell clients about your background, personality, and ideal client."
          />
          <div className="login-fields">
            <label className="login-field">
              <span className="login-field__label">About you</span>
              <textarea
                className="login-field__input wizard-textarea wizard-textarea--tall"
                value={state.bio}
                onChange={(e) => onPatch({ bio: e.target.value })}
                rows={8}
                placeholder="Background, experience, coaching philosophy, personality, ideal client, and goals you help solve."
              />
            </label>
            <p className="wizard-field-hint">
              Minimum 80 characters · {state.bio.trim().length} entered
            </p>
          </div>
        </WizardStepPanel>
      );

    case 11:
      return (
        <WizardStepPanel stepKey="sp-11">
          <WizardStepHeading
            title="Preview your profile"
            subtitle="This is how clients will discover you after approval."
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
          <div className="wizard-preview-actions">
            <button
              type="button"
              className="wizard-nav__back wizard-preview-actions__edit"
              onClick={() => onEditStep(2)}
            >
              Edit profile
            </button>
          </div>
        </WizardStepPanel>
      );

    case 12:
      return (
        <WizardStepPanel stepKey="sp-12" className="wizard-step--success">
          <div className="wizard-success-screen">
            <div className="wizard-success-screen__icon" aria-hidden>
              ✓
            </div>
            <h2 className="wizard-success-screen__title">Application Submitted</h2>
            <p className="wizard-success-screen__lead">
              Your profile is now under review by the SMOAC team.
            </p>
            <p className="wizard-success-screen__sub">
              Taking you to your pending application portal…
            </p>
          </div>
        </WizardStepPanel>
      );

    default:
      return null;
  }
}
