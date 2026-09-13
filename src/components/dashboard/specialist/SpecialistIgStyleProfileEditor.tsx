"use client";

import type { ReactNode } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { formatDualLocationPreview } from "@/lib/specialist-work-spots";
import { formatMembershipShortLabel, isProPlusPlan, isTrainerProPlus, membershipBadgeToneForSession, membershipRoleBadgeClassName } from "@/lib/specialist-premium";
import { FREE_FIRST_SESSION_LABEL, trainerOffersFreeFirstSession } from "@/lib/free-first-session";
import { profileStyleAccentLabel } from "@/lib/specialist-profile-style";
import {
  formatCoachingStyleSelection,
  GENDER_OPTIONS,
  parseCoachingStyleSelection,
} from "@/constants/specialist-onboarding-options";
import { AlertTriangleIcon, CheckIcon, LockIcon } from "@/components/ui/icons";
import { SpecialistLinkInBioCard } from "./SpecialistLinkInBioCard";
import { cn } from "@/lib/utils";
import { parseMediaUrlList } from "@/lib/specialist-media-limits";
import {
  formatSessionPriceRange,
  hasSessionPrice,
  resolveTrainerSessionPriceRange,
} from "@/lib/session-price";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { Gender, Trainer } from "@/types/trainer";
import { formatTrainingOptionsLabel } from "@/types/specialist-training-options";

export type IgEditRowId =
  | "hero"
  | "videos"
  | "avatar"
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
  | "free-first-session"
  | "contact"
  | "gender"
  | "profile-style";

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
  locked = false,
  lockPlan,
  action = false,
}: {
  id?: string;
  sectionKey?: string;
  label: string;
  value?: string;
  onClick: () => void;
  incomplete?: boolean;
  highlighted?: boolean;
  locked?: boolean;
  lockPlan?: "Pro" | "PRO+";
  action?: boolean;
}) {
  const isEmpty = Boolean(
    value && (value === "Add" || value.startsWith("Add "))
  );
  const lockTitle = lockPlan ? `Unlocks with ${lockPlan}` : "Unlocks with a higher plan";
  return (
    <button
      id={id}
      type="button"
      data-edit-section={sectionKey}
      className={cn(
        "smoac-control ig-profile-edit__row",
        action && "ig-profile-edit__row--action",
        incomplete && !locked && "ig-profile-edit__row--incomplete",
        locked && "ig-profile-edit__row--locked",
        highlighted && "ig-profile-edit__row--highlighted"
      )}
      aria-label={locked ? `${label}. ${lockTitle}` : undefined}
      onClick={onClick}
    >
      <div className="ig-profile-edit__row-left">
        <span className="ig-profile-edit__row-label">
          {label}
          {locked ? (
            <LockIcon className="ig-profile-edit__text-lock" />
          ) : null}
        </span>
        {action || locked ? null : incomplete ? (
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
      {action || value == null ? null : (
        <span
          className={cn(
            "ig-profile-edit__row-value",
            isEmpty && !locked && "ig-profile-edit__row-value--empty"
          )}
        >
          {value}
        </span>
      )}
      {locked ? (
        <span className="ig-profile-edit__row-lock" title={lockTitle} aria-hidden>
          <LockIcon className="ig-profile-edit__row-lock-icon" />
        </span>
      ) : (
        <span className="ig-profile-edit__row-chevron" aria-hidden>
          ›
        </span>
      )}
    </button>
  );
}

interface SpecialistIgStyleProfileEditorProps {
  trainer: Trainer;
  formDefaults: SpecialistProfileEditForm;
  onEditSection: (id: IgEditRowId) => void;
  highlightedSection?: string | null;
  footer?: ReactNode;
  onUpgrade?: () => void;
  onSignOut?: () => void;
}

/** Instagram-style list editor — same fields/saves, familiar mobile layout. */
export function SpecialistIgStyleProfileEditor({
  trainer,
  formDefaults,
  onEditSection,
  highlightedSection,
  footer,
  onUpgrade,
  onSignOut,
}: SpecialistIgStyleProfileEditorProps) {
  const { session } = useAuthSession();
  const isPremium = Boolean(session?.isPremium);
  const isProPlus =
    isProPlusPlan(session?.membershipPlan) || isTrainerProPlus(trainer);
  const resolvedPlanLabel = formatMembershipShortLabel(session);
  const planBadgeTone = membershipBadgeToneForSession(session);

  const hasPhoto = Boolean(formDefaults.profilePhotoUrl.trim());
  const slideshowCount = parseMediaUrlList(formDefaults.photoNotes).length;
  const hasSlideshow = slideshowCount > 0;
  const picturesPreview = hasSlideshow
    ? slideshowCount === 1
      ? "1 photo"
      : `${slideshowCount} photos`
    : "Add";
  const videoCount = parseMediaUrlList(formDefaults.videoNotes).length;
  const videosPreview =
    videoCount === 0
      ? "Add"
      : videoCount === 1
        ? "1 video"
        : `${videoCount} videos`;
  const photo = formDefaults.profilePhotoUrl.trim() || trainer.image;
  const profession =
    resolveTrainerProfessionCategory({
      profession: formDefaults.profession || trainer.profession,
      title: formDefaults.title || trainer.title,
      specialty: formDefaults.specialty.length
        ? formDefaults.specialty
        : trainer.specialty,
    }) || formDefaults.profession;
  const location = formatDualLocationPreview(
    {
      workAddress: formDefaults.workAddress,
      locationPrecision: formDefaults.locationPrecision,
      city: formDefaults.city || trainer.city,
      neighborhood: formDefaults.neighborhood || trainer.neighborhood,
      zipCode: formDefaults.zipCode || trainer.zipCode,
      latitude: formDefaults.latitude,
      longitude: formDefaults.longitude,
    },
    {
      workAddress: formDefaults.workAddress2,
      locationPrecision: formDefaults.locationPrecision2,
      city: formDefaults.city2,
      neighborhood: formDefaults.neighborhood2,
      zipCode: formDefaults.zipCode2,
      latitude: formDefaults.latitude2,
      longitude: formDefaults.longitude2,
    }
  );
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
  const sessionPrice = resolveTrainerSessionPriceRange({
    pricePerSession: formDefaults.pricePerSession,
    pricePerSessionMin: formDefaults.pricePerSessionMin,
    pricePerSessionMax: formDefaults.pricePerSessionMax,
  });
  const pricePreview = hasSessionPrice(sessionPrice)
    ? formatSessionPriceRange(sessionPrice)
    : "Add";
  const contactBits = [
    formDefaults.phone.trim() && "Phone",
    formDefaults.email.trim() && "Email",
  ].filter(Boolean);
  const stylePreview = profileStyleAccentLabel(formDefaults.profileAccent);

  const isHighlighted = (key: string) =>
    highlightedSection === key ||
    (key === "avatar" &&
      (highlightedSection === "photo" || highlightedSection === "picture")) ||
    (key === "videos" && highlightedSection === "video") ||
    (key === "pricing" && highlightedSection === "price") ||
    (key === "service-area" && highlightedSection === "location") ||
    (key === "session-experience" && highlightedSection === "booking");

  return (
    <div className="ig-profile-edit" aria-label="Edit profile">
      <div
        className={cn(
          "ig-profile-edit__media",
          isHighlighted("avatar") && "ig-profile-edit__media--highlighted"
        )}
      >
        <div className="ig-profile-edit__avatar-wrap">
          <button
            type="button"
            className="ig-profile-edit__avatar-btn smoac-control"
            onClick={() => onEditSection("avatar")}
            aria-label={hasPhoto ? "Edit profile photo" : "Add profile photo"}
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
            id="ig-edit-row-avatar"
            type="button"
            data-edit-section="avatar"
            className={cn(
              "smoac-control ig-profile-edit__photo-chip",
              isHighlighted("avatar") && "ig-profile-edit__photo-chip--highlighted"
            )}
            onClick={() => onEditSection("avatar")}
          >
            {hasPhoto ? "Edit photo" : "Add photo"}
          </button>
          <span
            className={cn(
              "ig-profile-edit__plan-badge",
              membershipRoleBadgeClassName(planBadgeTone)
            )}
            aria-label={`Current plan: ${resolvedPlanLabel}`}
          >
            {resolvedPlanLabel}
          </span>
        </div>
      </div>

      <SpecialistLinkInBioCard
        trainerId={trainer.id}
        slug={trainer.slug}
        trainerName={formDefaults.name || trainer.name}
      />

      <div className="ig-profile-edit__list" role="list">
        <IgEditRow
          id="ig-edit-row-hero"
          sectionKey="hero"
          label="Pictures / slideshow"
          value={picturesPreview}
          incomplete={!hasSlideshow}
          highlighted={isHighlighted("hero")}
          onClick={() => onEditSection("hero")}
        />
        <IgEditRow
          id="ig-edit-row-videos"
          sectionKey="videos"
          label="Videos"
          value={videosPreview}
          incomplete={isProPlus && videoCount === 0}
          highlighted={isHighlighted("videos")}
          locked={!isProPlus}
          lockPlan="PRO+"
          onClick={() => {
            if (!isProPlus) {
              if (onUpgrade) {
                onUpgrade();
                return;
              }
            }
            onEditSection("videos");
          }}
        />
        <IgEditRow
          id="ig-edit-row-transformations"
          sectionKey="transformations"
          label="Client Results"
          value={
            formDefaults.transformationNotes.trim()
              ? "Photos added"
              : "Add"
          }
          incomplete={isProPlus && !formDefaults.transformationNotes.trim()}
          highlighted={isHighlighted("transformations")}
          locked={!isProPlus}
          lockPlan="PRO+"
          onClick={() => {
            if (!isProPlus) {
              if (onUpgrade) {
                onUpgrade();
                return;
              }
            }
            onEditSection("transformations");
          }}
        />
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
          id="ig-edit-row-profession"
          sectionKey="profession"
          label="Category"
          value={previewOrAdd(profession)}
          incomplete={!profession.trim()}
          highlighted={isHighlighted("profession")}
          onClick={() => onEditSection("profession")}
        />
        <IgEditRow
          id="ig-edit-row-service-area"
          sectionKey="service-area"
          label="Location"
          value={previewOrAdd(location)}
          incomplete={!location.trim() && !formDefaults.zipCode.trim() && !formDefaults.city.trim() && !formDefaults.workAddress.trim() && !formDefaults.workAddress2.trim() && !formDefaults.zipCode2.trim()}
          highlighted={isHighlighted("service-area")}
          onClick={() => onEditSection("service-area")}
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
          id="ig-edit-row-free-first-session"
          sectionKey="free-first-session"
          label={FREE_FIRST_SESSION_LABEL}
          value={trainerOffersFreeFirstSession(formDefaults) ? "On" : "Off"}
          highlighted={isHighlighted("free-first-session")}
          locked={!isPremium}
          lockPlan="Pro"
          onClick={() => {
            if (!isPremium) {
              if (onUpgrade) {
                onUpgrade();
                return;
              }
            }
            onEditSection("free-first-session");
          }}
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
          id="ig-edit-row-ideal-clients"
          sectionKey="ideal-clients"
          label="Are we the right fit?"
          value={previewOrAdd(formDefaults.servicesOffered)}
          incomplete={!formDefaults.servicesOffered.trim()}
          highlighted={isHighlighted("ideal-clients")}
          onClick={() => onEditSection("ideal-clients")}
        />
        <IgEditRow
          id="ig-edit-row-session-experience"
          sectionKey="session-experience"
          label="Training options"
          value={previewOrAdd(
            formatTrainingOptionsLabel(formDefaults.trainingOptions)
          )}
          incomplete={formDefaults.trainingOptions.length === 0}
          highlighted={isHighlighted("session-experience")}
          onClick={() => onEditSection("session-experience")}
        />
        <IgEditRow
          id="ig-edit-row-pricing"
          sectionKey="pricing"
          label="Pricing"
          value={pricePreview}
          incomplete={!hasSessionPrice(sessionPrice)}
          highlighted={isHighlighted("pricing")}
          onClick={() => onEditSection("pricing")}
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
          id="ig-edit-row-philosophy"
          sectionKey="philosophy"
          label="Coaching style"
          value={previewOrAdd(
            formatCoachingStyleSelection(
              parseCoachingStyleSelection(formDefaults.trainingStyle)
            )
          )}
          incomplete={
            parseCoachingStyleSelection(formDefaults.trainingStyle).length === 0
          }
          highlighted={isHighlighted("philosophy")}
          onClick={() => onEditSection("philosophy")}
        />
      </div>

      <div className="ig-profile-edit__section-label">
        More details / settings
      </div>
      <div className="ig-profile-edit__list" role="list">
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
          id="ig-edit-row-gender"
          sectionKey="gender"
          label="Gender"
          value={genderLabel(formDefaults.gender)}
          incomplete={!formDefaults.gender}
          highlighted={isHighlighted("gender")}
          onClick={() => onEditSection("gender")}
        />
        <IgEditRow
          id="ig-edit-row-profile-style"
          sectionKey="profile-style"
          label="Ambience glow"
          value={stylePreview}
          highlighted={isHighlighted("profile-style")}
          onClick={() => onEditSection("profile-style")}
        />
      </div>

      <div className="ig-profile-edit__section-label">Account</div>
      <div className="ig-profile-edit__list" role="list">
        <IgEditRow
          id="ig-edit-row-contact"
          sectionKey="contact"
          label="Account details"
          value={
            contactBits.length > 0 ? contactBits.join(" · ") : "Add phone or email"
          }
          incomplete={contactBits.length === 0}
          highlighted={isHighlighted("contact")}
          onClick={() => onEditSection("contact")}
        />
        {onSignOut ? (
          <IgEditRow
            id="ig-edit-row-sign-out"
            label="Sign out"
            action
            onClick={onSignOut}
          />
        ) : null}
      </div>

      {footer ? <div className="ig-profile-edit__footer">{footer}</div> : null}
    </div>
  );
}
