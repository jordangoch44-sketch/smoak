"use client";

import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import { SpecialistEditProfilePageClient } from "@/components/dashboard/SpecialistEditProfilePageClient";
import { SpecialistProfileMediaEditor } from "@/components/dashboard/specialist/SpecialistProfileMediaEditor";
import { Bio } from "@/components/profile/Bio";
import { Certifications } from "@/components/profile/Certifications";
import { ProfileContactCta } from "@/components/profile/ProfileContactCta";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfilePillGrid } from "@/components/profile/ProfilePillGrid";
import { ProfileResultsSnapshot } from "@/components/profile/ProfileResultsSnapshot";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { ProfileSectionHeader } from "@/components/profile/ProfileSectionHeader";
import { ProfileServiceArea } from "@/components/profile/ProfileServiceArea";
import { ProfileSessionExperience } from "@/components/profile/ProfileSessionExperience";
import { ProfileTransformationSlider } from "@/components/profile/ProfileTransformationSlider";
import { ProfileTrustGrid } from "@/components/profile/ProfileTrustGrid";
import { SocialLinks } from "@/components/profile/SocialLinks";
import { useToast } from "@/components/ui/toast";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { buildServiceAreaDisplay } from "@/lib/specialist-service-area";
import {
  getProfileAccentRgb,
  normalizeProfileStyle,
} from "@/lib/specialist-profile-style";
import {
  EMPTY_CERTIFICATION,
  cloneSpecialistProfileEditForm,
} from "@/lib/specialist-profile-overrides";
import { cn } from "@/lib/utils";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { SpecialistServiceType } from "@/types/specialist-service-area";
import {
  SPECIALIST_SERVICE_TYPE_OPTIONS,
  SPECIALIST_TRAVEL_RADIUS_OPTIONS,
} from "@/types/specialist-service-area";
import type { Trainer } from "@/types/trainer";

const LOCK_CLASS = "specialist-live-edit-open";
const LIVE_PROFILE_ANCHOR_ID = "specialist-live-profile";

type SectionId =
  | "hero"
  | "transformations"
  | "specialties"
  | "bio"
  | "philosophy"
  | "ideal-clients"
  | "service-area"
  | "session-experience"
  | "credentials"
  | "social";

const SECTION_TITLES: Record<SectionId, string> = {
  hero: "Photos & identity",
  transformations: "Client transformations",
  specialties: "Specialties",
  bio: "About",
  philosophy: "Coaching style",
  "ideal-clients": "Best for",
  "service-area": "Service area & location",
  "session-experience": "Session experience",
  credentials: "Credentials",
  social: "Connect",
};

interface SpecialistDashboardProfilePreviewProps {
  trainer: Trainer;
  editable?: boolean;
  isPremium?: boolean;
}

function nonEmptyStrings(items: string[] | null | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item) => typeof item === "string" && item.trim().length > 0
  );
}

function hasTransformationPhotos(trainer: Trainer): boolean {
  if (!Array.isArray(trainer.clientTransformations)) return false;
  return trainer.clientTransformations.some((photo) => {
    if (!photo || typeof photo !== "object") return false;
    return typeof photo.src === "string" && photo.src.trim().length > 0;
  });
}

function hasCertifications(trainer: Trainer): boolean {
  return (
    Array.isArray(trainer.certifications) &&
    trainer.certifications.some(
      (cert) => cert && typeof cert.name === "string" && cert.name.trim()
    )
  );
}

function hasSocialLinks(trainer: Trainer): boolean {
  if (!trainer.social) return false;
  return Object.values(trainer.social).some(
    (url) => typeof url === "string" && url.trim().length > 0
  );
}

function NeedsCompletionPanel({ title }: { title: string }) {
  return (
    <ProfileSection
      variant="panel"
      className="specialist-live-needs"
      aria-label={`${title} — needs completion`}
    >
      <ProfileSectionHeader title={title} />
      <div className="profile-section-body">
        <p className="specialist-live-needs__label">Needs completion</p>
        <p className="specialist-live-needs__hint">
          Clients won’t see this section until you add it. Tap Edit to fill it in.
        </p>
      </div>
    </ProfileSection>
  );
}

function LiveEditZone({
  label,
  canEdit,
  onEdit,
  children,
  className,
  incomplete = false,
}: {
  label: string;
  canEdit: boolean;
  onEdit: () => void;
  children: ReactNode;
  className?: string;
  incomplete?: boolean;
}) {
  if (!canEdit) {
    return <div className={className}>{children}</div>;
  }

  function handleZoneClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (
      target.closest(
        "a, button, input, textarea, select, [role='button'], [data-live-edit-ignore]"
      )
    ) {
      return;
    }
    onEdit();
  }

  return (
    <div
      className={cn(
        "specialist-live-zone",
        incomplete && "specialist-live-zone--incomplete",
        className
      )}
      onClick={handleZoneClick}
    >
      <button
        type="button"
        className="smoac-control specialist-live-zone__edit"
        aria-label={`Edit ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
      >
        Edit
      </button>
      <div className="specialist-live-zone__content">{children}</div>
    </div>
  );
}

/** Owner edit tab: always show section. Client-like: hide when empty. */
function OwnerOrClientSection({
  canEdit,
  complete,
  title,
  onEdit,
  children,
  className,
}: {
  canEdit: boolean;
  complete: boolean;
  title: string;
  onEdit: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (!canEdit) {
    if (!complete) return null;
    return <div className={className}>{children}</div>;
  }

  return (
    <LiveEditZone
      label={title}
      canEdit
      onEdit={onEdit}
      incomplete={!complete}
      className={className}
    >
      {complete ? children : <NeedsCompletionPanel title={title} />}
    </LiveEditZone>
  );
}

function LiveEditSheet({
  title,
  saving,
  onClose,
  onSave,
  children,
}: {
  title: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.classList.add(LOCK_CLASS);
    document.documentElement.classList.add(LOCK_CLASS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove(LOCK_CLASS);
      document.documentElement.classList.remove(LOCK_CLASS);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, saving]);

  if (!mounted) return null;

  return createPortal(
    <div className="specialist-live-sheet" role="presentation">
      <button
        type="button"
        className="specialist-live-sheet__backdrop"
        aria-label="Close editor"
        disabled={saving}
        onClick={onClose}
      />
      <div
        className="specialist-live-sheet__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="specialist-live-sheet__head">
          <h2 id={titleId} className="specialist-live-sheet__title">
            {title}
          </h2>
          <p className="specialist-live-sheet__sub">
            Changes publish to your live marketplace profile as soon as you save.
          </p>
        </div>
        <div className="specialist-live-sheet__body">{children}</div>
        <div className="specialist-live-sheet__actions">
          <button
            type="button"
            className="smoac-control specialist-live-sheet__save"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Publishing…" : "Save changes — goes live"}
          </button>
          <button
            type="button"
            className="smoac-control specialist-live-sheet__cancel"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Edit profile tab — same structure clients see, with Edit on each section.
 * Incomplete sections stay visible for the owner (“Needs completion”) and stay
 * hidden on the public client profile.
 */
export function SpecialistDashboardProfilePreview({
  trainer: trainerProp,
  editable = false,
  isPremium = false,
}: SpecialistDashboardProfilePreviewProps) {
  const { showToast } = useToast();
  const {
    formDefaults,
    saveForm,
    trainerId,
    trainer: managedTrainer,
  } = useManagedSpecialistProfile();

  const trainer = managedTrainer ?? trainerProp;

  const [editing, setEditing] = useState<SectionId | null>(null);
  const [draft, setDraft] = useState<SpecialistProfileEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [fullEditorOpen, setFullEditorOpen] = useState(false);

  const canEdit = editable && Boolean(formDefaults && trainerId);

  function closeFullEditor() {
    setFullEditorOpen(false);
    window.requestAnimationFrame(() => {
      const anchor = document.getElementById(LIVE_PROFILE_ANCHOR_ID);
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function startEdit(section: SectionId) {
    if (!canEdit || !formDefaults) return;
    setEditing(section);
    setDraft(cloneSpecialistProfileEditForm(formDefaults));
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
  }

  function patch<K extends keyof SpecialistProfileEditForm>(
    key: K,
    value: SpecialistProfileEditForm[K]
  ) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function publish() {
    if (!draft) return;
    setSaving(true);
    const result = await saveForm(draft);
    setSaving(false);
    if (result.ok) {
      showToast({ type: "success", message: "Saved — changes are live." });
      cancelEdit();
      return;
    }
    showToast({
      type: "info",
      message: result.ok === false ? result.error : "Unable to save changes",
    });
  }

  const form = draft;
  const profileStyle = normalizeProfileStyle(trainer.profileStyle);
  const pageStyle = {
    "--profile-accent-rgb": getProfileAccentRgb(profileStyle.accent),
  } as CSSProperties;

  const whyItems = nonEmptyStrings(trainer.whyClientsChoose);
  const bestForItems = nonEmptyStrings(trainer.bestFor);
  const coachingStyleItems = nonEmptyStrings(trainer.coachingStyle);
  const hasWhy = whyItems.length > 0;
  const hasTransformations = hasTransformationPhotos(trainer);
  const hasServiceArea = Boolean(buildServiceAreaDisplay(trainer));
  const hasBestFor = bestForItems.length > 0;
  const hasCoachingStyle = coachingStyleItems.length > 0;
  const hasSessionExperience =
    nonEmptyStrings(trainer.sessionExperience).length > 0;
  const hasResults = nonEmptyStrings(trainer.resultsSnapshot ?? []).length > 0;
  const hasBio =
    Boolean(trainer.bio?.trim()) || nonEmptyStrings(trainer.specialty).length > 0;
  const hasCreds = hasCertifications(trainer);
  const hasSocial = hasSocialLinks(trainer);

  return (
    <article
      id={LIVE_PROFILE_ANCHOR_ID}
      className="specialist-live-marketplace profile-page--styled"
      style={pageStyle}
      data-profile-accent={profileStyle.accent}
      aria-label="Live marketplace profile"
    >
      <LiveEditZone
        label="Photos & identity"
        canEdit={canEdit}
        onEdit={() => startEdit("hero")}
        className="specialist-live-zone--hero"
      >
        <div data-live-edit-ignore>
          <ProfileHero
            trainer={trainer}
            variant="specialist-live"
            onEditProfilePhoto={canEdit ? () => startEdit("hero") : undefined}
          />
        </div>
      </LiveEditZone>

      <div className="specialist-live-marketplace__stream profile-content profile-content--streamlined">
        <div className="specialist-live-contact-preview" data-live-edit-ignore>
          <ProfileContactCta
            specialistName={trainer.name}
            onContact={() => {
              if (!canEdit) return;
              showToast({
                type: "info",
                message: "Clients use this button to inquire — it isn’t editable.",
              });
            }}
          />
          {canEdit ? (
            <p className="specialist-live-contact-preview__note">
              Preview only — clients see this contact button on your live profile.
            </p>
          ) : null}
        </div>

        {/* Why clients choose me — public highlight; deeper edit in full editor */}
        {canEdit ? (
          <LiveEditZone
            label="Why clients choose me"
            canEdit
            incomplete={!hasWhy}
            onEdit={() => setFullEditorOpen(true)}
          >
            {hasWhy ? (
              <ProfileSection
                variant="panel"
                className="profile-section--featured"
                aria-label="Why clients choose me"
              >
                <ProfileSectionHeader title="Why clients choose me" />
                <div className="profile-section-body">
                  <ProfileTrustGrid items={whyItems} />
                </div>
              </ProfileSection>
            ) : (
              <NeedsCompletionPanel title="Why clients choose me" />
            )}
          </LiveEditZone>
        ) : hasWhy ? (
          <ProfileSection
            variant="panel"
            className="profile-section--featured"
            aria-label="Why clients choose me"
          >
            <ProfileSectionHeader title="Why clients choose me" />
            <div className="profile-section-body">
              <ProfileTrustGrid items={whyItems} />
            </div>
          </ProfileSection>
        ) : null}

        <OwnerOrClientSection
          canEdit={canEdit}
          complete={hasTransformations}
          title="Client transformations"
          onEdit={() => startEdit("transformations")}
        >
          <ProfileSection
            variant="panel"
            className="profile-section--media"
            aria-label="Client transformations"
          >
            <ProfileSectionHeader title="Client transformations" />
            <div className="profile-section-body">
              <ProfileTransformationSlider
                photos={trainer.clientTransformations}
              />
            </div>
          </ProfileSection>
        </OwnerOrClientSection>

        <div className="specialist-live-details" aria-label="Full specialist profile">
          {canEdit ? (
            <p className="specialist-live-details__eyebrow">Profile details</p>
          ) : null}

          <OwnerOrClientSection
            canEdit={canEdit}
            complete={hasServiceArea}
            title="Service area"
            onEdit={() => startEdit("service-area")}
          >
            <ProfileServiceArea trainer={trainer} />
          </OwnerOrClientSection>

          <OwnerOrClientSection
            canEdit={canEdit}
            complete={hasBestFor}
            title="Best for"
            onEdit={() => startEdit("ideal-clients")}
          >
            <ProfileSection variant="panel" aria-label="Best for">
              <ProfileSectionHeader title="Best for" />
              <div className="profile-section-body">
                <ProfilePillGrid items={bestForItems} />
              </div>
            </ProfileSection>
          </OwnerOrClientSection>

          <OwnerOrClientSection
            canEdit={canEdit}
            complete={hasCoachingStyle}
            title="Coaching style"
            onEdit={() => startEdit("philosophy")}
          >
            <ProfileSection variant="panel" aria-label="Coaching style">
              <ProfileSectionHeader title="Coaching style" />
              <div className="profile-section-body">
                <ProfilePillGrid items={coachingStyleItems} />
              </div>
            </ProfileSection>
          </OwnerOrClientSection>

          <OwnerOrClientSection
            canEdit={canEdit}
            complete={hasSessionExperience}
            title="Session experience"
            onEdit={() => startEdit("session-experience")}
          >
            <ProfileSessionExperience trainer={trainer} />
          </OwnerOrClientSection>

          {!canEdit && hasResults ? (
            <ProfileResultsSnapshot trainer={trainer} />
          ) : null}

          <OwnerOrClientSection
            canEdit={canEdit}
            complete={hasCreds}
            title="Credentials"
            onEdit={() => startEdit("credentials")}
          >
            <Certifications certifications={trainer.certifications} />
          </OwnerOrClientSection>

          <OwnerOrClientSection
            canEdit={canEdit}
            complete={hasBio}
            title="About"
            onEdit={() => startEdit("bio")}
          >
            <Bio trainer={trainer} />
          </OwnerOrClientSection>

          <OwnerOrClientSection
            canEdit={canEdit}
            complete={hasSocial}
            title="Connect"
            onEdit={() => startEdit("social")}
          >
            <SocialLinks social={trainer.social} />
          </OwnerOrClientSection>
        </div>
      </div>

      {canEdit ? (
        <div className="specialist-live-marketplace__footer">
          <button
            type="button"
            className="smoac-control specialist-dash-profile__full-editor-link"
            onClick={() => setFullEditorOpen(true)}
          >
            Open full editor (pricing, style & more)
          </button>
        </div>
      ) : null}

      {fullEditorOpen ? (
        <Suspense fallback={null}>
          <SpecialistEditProfilePageClient
            presentation="modal"
            onRequestClose={closeFullEditor}
          />
        </Suspense>
      ) : null}

      {editing && form ? (
        <LiveEditSheet
          title={SECTION_TITLES[editing]}
          saving={saving}
          onClose={cancelEdit}
          onSave={() => void publish()}
        >
          {editing === "hero" ? (
            <div className="specialist-dash-profile__fields">
              <SpecialistProfileMediaEditor
                profilePhotoUrl={form.profilePhotoUrl}
                coverImageUrl={form.coverImageUrl}
                photoNotes={form.photoNotes}
                videoNotes={form.videoNotes}
                pinnedPhotos={form.pinnedPhotos}
                isPremium={isPremium}
                specialistId={trainerId}
                onChange={(next) => {
                  setDraft((prev) => (prev ? { ...prev, ...next } : prev));
                }}
              />
              <label className="login-field">
                <span className="login-field__label">Name</span>
                <input
                  className="login-field__input profile-edit-input"
                  value={form.name}
                  onChange={(e) => patch("name", e.target.value)}
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Headline</span>
                <input
                  className="login-field__input profile-edit-input"
                  value={form.title}
                  onChange={(e) => patch("title", e.target.value)}
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Profession</span>
                <select
                  className="login-field__input dashboard-edit-select profile-edit-input"
                  value={form.profession}
                  onChange={(e) => patch("profession", e.target.value)}
                >
                  {MAIN_PROFESSION_CATEGORIES.map((profession) => (
                    <option key={profession} value={profession}>
                      {profession}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {editing === "transformations" ? (
            <label className="login-field">
              <span className="login-field__label">
                Transformation photo URLs (one per line)
              </span>
              <textarea
                className="login-field__input dashboard-edit-textarea profile-edit-input"
                rows={6}
                value={form.transformationNotes}
                onChange={(e) => patch("transformationNotes", e.target.value)}
                placeholder="https://…"
              />
            </label>
          ) : null}

          {editing === "bio" || editing === "specialties" ? (
            <div className="specialist-dash-profile__fields">
              <label className="login-field">
                <span className="login-field__label">Bio</span>
                <textarea
                  className="login-field__input dashboard-edit-textarea profile-edit-input"
                  rows={6}
                  value={form.bio}
                  onChange={(e) => patch("bio", e.target.value)}
                  placeholder="Your story and approach"
                />
              </label>
              <div>
                <p className="login-field__label">Specialties</p>
                <div className="dashboard-edit-chip-grid">
                  {marketplaceSpecialtyOptions.map((specialty) => {
                    const active = form.specialty.includes(specialty);
                    return (
                      <button
                        key={specialty}
                        type="button"
                        className={
                          active
                            ? "dashboard-edit-chip dashboard-edit-chip--active"
                            : "dashboard-edit-chip"
                        }
                        onClick={() => {
                          const next = active
                            ? form.specialty.filter((item) => item !== specialty)
                            : [...form.specialty, specialty];
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  specialty: next,
                                  homepageSpecialties:
                                    prev.homepageSpecialties.filter((item) =>
                                      next.includes(item)
                                    ),
                                }
                              : prev
                          );
                        }}
                        aria-pressed={active}
                      >
                        {specialty}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {editing === "philosophy" ? (
            <textarea
              className="login-field__input dashboard-edit-textarea profile-edit-input"
              rows={4}
              value={form.trainingStyle}
              onChange={(e) => patch("trainingStyle", e.target.value)}
              placeholder="How you coach and what drives results"
            />
          ) : null}

          {editing === "ideal-clients" ? (
            <textarea
              className="login-field__input dashboard-edit-textarea profile-edit-input"
              rows={4}
              value={form.servicesOffered}
              onChange={(e) => patch("servicesOffered", e.target.value)}
              placeholder="Who you help best and the services you offer"
            />
          ) : null}

          {editing === "service-area" ? (
            <div className="specialist-dash-profile__fields">
              <label className="login-field">
                <span className="login-field__label">City</span>
                <input
                  className="login-field__input profile-edit-input"
                  value={form.city}
                  onChange={(e) => patch("city", e.target.value)}
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Neighborhood</span>
                <input
                  className="login-field__input profile-edit-input"
                  value={form.neighborhood}
                  onChange={(e) => patch("neighborhood", e.target.value)}
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">ZIP code</span>
                <input
                  className="login-field__input profile-edit-input"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={form.zipCode}
                  onChange={(e) => patch("zipCode", e.target.value)}
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Session format</span>
                <select
                  className="login-field__input dashboard-edit-select profile-edit-input"
                  value={form.serviceType}
                  onChange={(e) =>
                    patch("serviceType", e.target.value as SpecialistServiceType)
                  }
                >
                  {SPECIALIST_SERVICE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="login-field">
                <span className="login-field__label">Travel radius</span>
                <select
                  className="login-field__input dashboard-edit-select profile-edit-input"
                  value={form.travelRadius}
                  onChange={(e) => patch("travelRadius", e.target.value)}
                >
                  <option value="">Select radius</option>
                  {SPECIALIST_TRAVEL_RADIUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="login-field">
                <span className="login-field__label">
                  Additional areas (comma-separated)
                </span>
                <input
                  className="login-field__input profile-edit-input"
                  value={form.serviceArea.join(", ")}
                  onChange={(e) =>
                    patch(
                      "serviceArea",
                      e.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </label>
            </div>
          ) : null}

          {editing === "session-experience" ? (
            <label className="login-field">
              <span className="login-field__label">
                Session experience (comma-separated)
              </span>
              <textarea
                className="login-field__input dashboard-edit-textarea profile-edit-input"
                rows={4}
                value={form.bookingAvailability}
                onChange={(e) => patch("bookingAvailability", e.target.value)}
                placeholder="In-home sessions, Online coaching, Free consultation"
              />
            </label>
          ) : null}

          {editing === "credentials" ? (
            <div className="specialist-dash-profile__fields">
              {form.certifications.map((cert, index) => (
                <div
                  key={`cert-${index}`}
                  className="specialist-dash-profile__cert-row"
                >
                  <input
                    className="login-field__input profile-edit-input"
                    placeholder="Credential"
                    value={cert.name}
                    onChange={(e) =>
                      patch(
                        "certifications",
                        form.certifications.map((c, i) =>
                          i === index ? { ...c, name: e.target.value } : c
                        )
                      )
                    }
                  />
                  <input
                    className="login-field__input profile-edit-input"
                    placeholder="Issuer"
                    value={cert.issuer}
                    onChange={(e) =>
                      patch(
                        "certifications",
                        form.certifications.map((c, i) =>
                          i === index ? { ...c, issuer: e.target.value } : c
                        )
                      )
                    }
                  />
                  {form.certifications.length > 1 ? (
                    <button
                      type="button"
                      className="dashboard-edit-remove"
                      onClick={() =>
                        patch(
                          "certifications",
                          form.certifications.filter((_, i) => i !== index)
                        )
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="dashboard-edit-add"
                onClick={() =>
                  patch("certifications", [
                    ...form.certifications,
                    { ...EMPTY_CERTIFICATION },
                  ])
                }
              >
                + Add credential
              </button>
            </div>
          ) : null}

          {editing === "social" ? (
            <div className="specialist-dash-profile__fields">
              <label className="login-field">
                <span className="login-field__label">Instagram</span>
                <input
                  className="login-field__input profile-edit-input"
                  value={form.instagram}
                  onChange={(e) => patch("instagram", e.target.value)}
                  placeholder="@yourhandle"
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">TikTok</span>
                <input
                  className="login-field__input profile-edit-input"
                  value={form.tiktok}
                  onChange={(e) => patch("tiktok", e.target.value)}
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Website</span>
                <input
                  className="login-field__input profile-edit-input"
                  value={form.website}
                  onChange={(e) => patch("website", e.target.value)}
                  placeholder="https://"
                />
              </label>
            </div>
          ) : null}
        </LiveEditSheet>
      ) : null}
    </article>
  );
}
