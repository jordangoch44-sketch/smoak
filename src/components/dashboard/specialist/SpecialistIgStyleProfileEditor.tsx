"use client";

import type { ReactNode } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { formatProviderLocation } from "@/lib/provider-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { formatProTrialBadgeLabel, isProPlusPlan, SMOAC_FREE_PLAN_LABEL } from "@/lib/specialist-premium";
import {
  profileStyleAccentLabel,
  profileStyleFontLabel,
  profileStyleFrameLabel,
} from "@/lib/specialist-profile-style";
import { GENDER_OPTIONS } from "@/constants/specialist-onboarding-options";
import { AlertTriangleIcon, CheckIcon } from "@/components/ui/icons";
import { SpecialistLinkInBioCard } from "./SpecialistLinkInBioCard";
import { cn } from "@/lib/utils";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { Gender, Trainer } from "@/types/trainer";

export type IgEditRowId =
  | "hero"
  | "name"
  | "headline"
  | "profession"
  | "bio"
  | "specialties"
  | "service-area"
  | "philosophy"
  | "ideal-clients"
  | "session-experience"
  | "credentials"
  | "transformations"
  | "social"
  | "pricing"
  | "contact"
  | "gender"
  | "experience"
  | "profile-style"
  | "featured-specialties";

function previewOrAdd(value: string, empty = "Add"): string {
  const trimmed = value.trim();
  if (!trimmed) return empty;
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

function genderLabel(value: Gender | ""): string {
  if (!value) return "Add";
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? "Add";
}

function IgEditRow({
  id,
  sectionKey,
  label,
  value,
  onClick,
  incomplete = false,
  highlighted = false,
}: {
  id?: string;
  sectionKey?: string;
  label: string;
  value: string;
  onClick: () => void;
  incomplete?: boolean;
  highlighted?: boolean;
}) {
  const isEmpty = value === "Add" || value.startsWith("Add ");
  return (
    <button
      id={id}
      type="button"
      data-edit-section={sectionKey}
      className={cn(
        "ig-profile-edit__row",
        incomplete && "ig-profile-edit__row--incomplete",
        highlighted && "ig-profile-edit__row--highlighted"
      )}
      onClick={onClick}
    >
      <div className="ig-profile-edit__row-left">
        <span className="ig-profile-edit__row-label">{label}</span>
        {incomplete ? (
          <span
            className="ig-profile-edit__badge ig-profile-edit__badge--incomplete"
            title="Needs attention"
            aria-label="Needs attention"
          >
            <AlertTriangleIcon className="ig-profile-edit__badge-icon" />
          </span>
        ) : (
          <span
            className="ig-profile-edit__badge ig-profile-edit__badge--complete"
            title="Complete"
            aria-label="Complete"
          >
            <CheckIcon className="ig-profile-edit__badge-icon" />
          </span>
        )}
      </div>
      <span
        className={cn(
          "ig-profile-edit__row-value",
          isEmpty && "ig-profile-edit__row-value--empty"
        )}
      >
        {value}
      </span>
      <span className="ig-profile-edit__row-chevron" aria-hidden>
        ›
      </span>
    </button>
  );
}

interface SpecialistIgStyleProfileEditorProps {
  trainer: Trainer;
  formDefaults: SpecialistProfileEditForm;
  onEditSection: (id: IgEditRowId) => void;
  highlightedSection?: string | null;
  planBadgeLabel?: string;
  isLivePublished?: boolean;
  footer?: ReactNode;
}

/** Instagram-style list editor — same fields/saves, familiar mobile layout. */
export function SpecialistIgStyleProfileEditor({
  trainer,
  formDefaults,
  onEditSection,
  highlightedSection,
  planBadgeLabel,
  isLivePublished = false,
  footer,
}: SpecialistIgStyleProfileEditorProps) {
  const { session } = useAuthSession();
  const onProTrial = Boolean(session?.premiumTrialActive);
  const isPremium = Boolean(session?.isPremium);
  const isProPlus = isProPlusPlan(session?.membershipPlan);
  const resolvedPlanLabel =
    planBadgeLabel !== undefined
      ? planBadgeLabel
      : onProTrial
        ? formatProTrialBadgeLabel(session?.premiumTrialDaysRemaining)
        : isProPlus
          ? "SMOAC Pro Plus"
          : isPremium
          ? "SMOAC Pro"
          : SMOAC_FREE_PLAN_LABEL;

  const hasPhoto = Boolean(formDefaults.profilePhotoUrl.trim());
  const photo = formDefaults.profilePhotoUrl.trim() || trainer.image;
  const profession =
    resolveTrainerProfessionCategory({
      profession: formDefaults.profession || trainer.profession,
      title: formDefaults.title || trainer.title,
      specialty: formDefaults.specialty.length
        ? formDefaults.specialty
        : trainer.specialty,
    }) || formDefaults.profession;
  const location = formatProviderLocation({
    ...trainer,
    city: formDefaults.city || trainer.city,
    neighborhood: formDefaults.neighborhood || trainer.neighborhood,
    zipCode: formDefaults.zipCode || trainer.zipCode,
  });
  const specialtyPreview =
    formDefaults.specialty.length > 0
      ? formDefaults.specialty.slice(0, 2).join(", ") +
        (formDefaults.specialty.length > 2
          ? ` +${formDefaults.specialty.length - 2}`
          : "")
      : "Add";
  const certPreview =
    formDefaults.certifications.find((c) => c.name.trim())?.name.trim() ||
    "Add";
  const socialBits = [
    formDefaults.instagram.trim() && "Instagram",
    formDefaults.tiktok.trim() && "TikTok",
    formDefaults.website.trim() && "Website",
  ].filter(Boolean);
  const price =
    formDefaults.pricePerSession > 0
      ? `From $${formDefaults.pricePerSession}`
      : "Add";
  const contactBits = [
    formDefaults.phone.trim() && "Phone",
    formDefaults.email.trim() && "Email",
  ].filter(Boolean);
  const featuredPreview =
    formDefaults.homepageSpecialties.length > 0
      ? formDefaults.homepageSpecialties.join(", ")
      : formDefaults.specialty.length > 0
        ? "Using first specialties"
        : "Add";
  const stylePreview = [
    profileStyleAccentLabel(formDefaults.profileAccent),
    profileStyleFrameLabel(formDefaults.profileAvatarFrame),
    profileStyleFontLabel(formDefaults.profileNameFont),
  ].join(" · ");

  const isHighlighted = (key: string) =>
    highlightedSection === key ||
    (key === "hero" && highlightedSection === "photo") ||
    (key === "pricing" && highlightedSection === "price") ||
    (key === "service-area" && highlightedSection === "location") ||
    (key === "session-experience" && highlightedSection === "booking");

  return (
    <div className="ig-profile-edit" aria-label="Edit profile">
      <div
        className={cn(
          "ig-profile-edit__media",
          isHighlighted("hero") && "ig-profile-edit__media--highlighted"
        )}
        data-edit-section="hero"
        id="ig-edit-row-hero"
      >
        <div className="ig-profile-edit__avatar-wrap">
          <button
            type="button"
            className="ig-profile-edit__avatar-btn smoac-control"
            onClick={() => onEditSection("hero")}
            aria-label="Edit profile picture"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="ig-profile-edit__avatar" />
            <span className="ig-profile-edit__avatar-ring" aria-hidden />
            {!hasPhoto ? (
              <span
                className="ig-profile-edit__avatar-badge ig-profile-edit__avatar-badge--incomplete"
                title="Photo missing — needs attention"
              >
                <AlertTriangleIcon className="ig-profile-edit__avatar-badge-icon" />
              </span>
            ) : (
              <span
                className="ig-profile-edit__avatar-badge ig-profile-edit__avatar-badge--complete"
                title="Photo added"
              >
                <CheckIcon className="ig-profile-edit__avatar-badge-icon" />
              </span>
            )}
          </button>
        </div>
        <div className="ig-profile-edit__media-actions">
          <button
            type="button"
            className="ig-profile-edit__media-link smoac-control"
            onClick={() => onEditSection("hero")}
          >
            Edit pictures/slideshow
          </button>
        </div>
      </div>

      <div className="ig-profile-edit__title-card">
        {resolvedPlanLabel ? (
          <div className="ig-profile-edit__badge-wrap">
            <span
              className={cn(
                "dashboard-role-badge",
                (onProTrial || isPremium) && "dashboard-role-badge--pro-trial"
              )}
            >
              {resolvedPlanLabel}
            </span>
          </div>
        ) : null}
        <h2 className="ig-profile-edit__title">
          Edit your profile
          {isLivePublished ? (
            <span
              className="dashboard-live-indicator"
              title="Live on Marketplace"
              aria-label="Live on Marketplace"
            >
              <span className="dashboard-live-indicator__dot" aria-hidden />
            </span>
          ) : null}
        </h2>
        <p className="ig-profile-edit__subtitle">
          Tap a row to update. Saves go live on Marketplace.
        </p>
      </div>

      <SpecialistLinkInBioCard
        trainerId={trainer.id}
        trainerName={formDefaults.name || trainer.name}
      />

      <div className="ig-profile-edit__list" role="list">
        <IgEditRow
          id="ig-edit-row-name"
          sectionKey="name"
          label="Business name"
          value={previewOrAdd(formDefaults.name)}
          incomplete={!formDefaults.name.trim()}
          highlighted={isHighlighted("name")}
          onClick={() => onEditSection("name")}
        />
        <IgEditRow
          id="ig-edit-row-headline"
          sectionKey="headline"
          label="Headline"
          value={previewOrAdd(formDefaults.title)}
          incomplete={!formDefaults.title.trim()}
          highlighted={isHighlighted("headline")}
          onClick={() => onEditSection("headline")}
        />
        <IgEditRow
          id="ig-edit-row-profession"
          sectionKey="profession"
          label="Category"
          value={previewOrAdd(profession)}
          incomplete={!profession.trim()}
          highlighted={isHighlighted("profession")}
          onClick={() => onEditSection("profession")}
        />
        <IgEditRow
          id="ig-edit-row-bio"
          sectionKey="bio"
          label="Bio"
          value={previewOrAdd(formDefaults.bio)}
          incomplete={!formDefaults.bio.trim() || formDefaults.bio.trim().length < 40}
          highlighted={isHighlighted("bio")}
          onClick={() => onEditSection("bio")}
        />
        <IgEditRow
          id="ig-edit-row-specialties"
          sectionKey="specialties"
          label="Specialties"
          value={specialtyPreview}
          incomplete={formDefaults.specialty.length === 0}
          highlighted={isHighlighted("specialties")}
          onClick={() => onEditSection("specialties")}
        />
        <IgEditRow
          id="ig-edit-row-service-area"
          sectionKey="service-area"
          label="Location"
          value={previewOrAdd(location)}
          incomplete={!location.trim() && !formDefaults.zipCode.trim() && !formDefaults.city.trim() && !formDefaults.workAddress.trim()}
          highlighted={isHighlighted("service-area")}
          onClick={() => onEditSection("service-area")}
        />
        <IgEditRow
          id="ig-edit-row-philosophy"
          sectionKey="philosophy"
          label="Coaching style"
          value={previewOrAdd(formDefaults.trainingStyle)}
          incomplete={!formDefaults.trainingStyle.trim()}
          highlighted={isHighlighted("philosophy")}
          onClick={() => onEditSection("philosophy")}
        />
        <IgEditRow
          id="ig-edit-row-ideal-clients"
          sectionKey="ideal-clients"
          label="Best for"
          value={previewOrAdd(formDefaults.servicesOffered)}
          incomplete={!formDefaults.servicesOffered.trim()}
          highlighted={isHighlighted("ideal-clients")}
          onClick={() => onEditSection("ideal-clients")}
        />
        <IgEditRow
          id="ig-edit-row-session-experience"
          sectionKey="session-experience"
          label="Session experience"
          value={previewOrAdd(formDefaults.bookingAvailability)}
          incomplete={!formDefaults.bookingAvailability.trim()}
          highlighted={isHighlighted("session-experience")}
          onClick={() => onEditSection("session-experience")}
        />
        <IgEditRow
          id="ig-edit-row-credentials"
          sectionKey="credentials"
          label="Credentials"
          value={previewOrAdd(certPreview === "Add" ? "" : certPreview)}
          incomplete={certPreview === "Add" || !formDefaults.certifications.some((c) => c && c.name.trim().length > 0)}
          highlighted={isHighlighted("credentials")}
          onClick={() => onEditSection("credentials")}
        />
        <IgEditRow
          id="ig-edit-row-transformations"
          sectionKey="transformations"
          label="Transformations"
          value={
            !isProPlus
              ? "Pro Plus"
              : formDefaults.transformationNotes.trim()
                ? "Photos added"
                : "Add"
          }
          incomplete={
            isProPlus ? !formDefaults.transformationNotes.trim() : false
          }
          highlighted={isHighlighted("transformations")}
          onClick={() => onEditSection("transformations")}
        />
        <IgEditRow
          id="ig-edit-row-social"
          sectionKey="social"
          label="Links"
          value={
            socialBits.length > 0 ? socialBits.join(" · ") : "Add links"
          }
          incomplete={socialBits.length === 0}
          highlighted={isHighlighted("social")}
          onClick={() => onEditSection("social")}
        />
      </div>

      <div className="ig-profile-edit__section-label">
        More details / settings
      </div>
      <div className="ig-profile-edit__list" role="list">
        <IgEditRow
          id="ig-edit-row-pricing"
          sectionKey="pricing"
          label="Pricing"
          value={price}
          incomplete={formDefaults.pricePerSession <= 0}
          highlighted={isHighlighted("pricing")}
          onClick={() => onEditSection("pricing")}
        />
        <IgEditRow
          id="ig-edit-row-contact"
          sectionKey="contact"
          label="Contact"
          value={
            contactBits.length > 0 ? contactBits.join(" · ") : "Add phone or email"
          }
          incomplete={contactBits.length === 0}
          highlighted={isHighlighted("contact")}
          onClick={() => onEditSection("contact")}
        />
        <IgEditRow
          id="ig-edit-row-gender"
          sectionKey="gender"
          label="Gender"
          value={genderLabel(formDefaults.gender)}
          incomplete={!formDefaults.gender}
          highlighted={isHighlighted("gender")}
          onClick={() => onEditSection("gender")}
        />
        <IgEditRow
          id="ig-edit-row-experience"
          sectionKey="experience"
          label="Experience"
          value={previewOrAdd(formDefaults.experienceYears)}
          incomplete={!formDefaults.experienceYears.trim()}
          highlighted={isHighlighted("experience")}
          onClick={() => onEditSection("experience")}
        />
        <IgEditRow
          id="ig-edit-row-profile-style"
          sectionKey="profile-style"
          label="Profile style"
          value={stylePreview}
          highlighted={isHighlighted("profile-style")}
          onClick={() => onEditSection("profile-style")}
        />
        <IgEditRow
          id="ig-edit-row-featured-specialties"
          sectionKey="featured-specialties"
          label="Featured specialties"
          value={featuredPreview}
          incomplete={
            formDefaults.specialty.length === 0 &&
            formDefaults.homepageSpecialties.length === 0
          }
          highlighted={isHighlighted("featured-specialties")}
          onClick={() => onEditSection("featured-specialties")}
        />
      </div>

      {footer ? <div className="ig-profile-edit__footer">{footer}</div> : null}
    </div>
  );
}
