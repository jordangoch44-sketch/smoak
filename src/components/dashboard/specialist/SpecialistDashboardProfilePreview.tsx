"use client";

import {
  useEffect,
  useId,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import { SpecialistProfileMediaEditor } from "@/components/dashboard/specialist/SpecialistProfileMediaEditor";
import { Bio } from "@/components/profile/Bio";
import { Certifications } from "@/components/profile/Certifications";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfilePillGrid } from "@/components/profile/ProfilePillGrid";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { ProfileSectionHeader } from "@/components/profile/ProfileSectionHeader";
import { ProfileServiceArea } from "@/components/profile/ProfileServiceArea";
import { SocialLinks } from "@/components/profile/SocialLinks";
import { useToast } from "@/components/ui/toast";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
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

const EDIT_PROFILE_PATH = "/specialist-dashboard/edit-profile";
const LOCK_CLASS = "specialist-live-edit-open";

type SectionId =
  | "hero"
  | "specialties"
  | "bio"
  | "philosophy"
  | "ideal-clients"
  | "service-area"
  | "location"
  | "credentials"
  | "social";

const SECTION_TITLES: Record<SectionId, string> = {
  hero: "Photos & identity",
  specialties: "Specialties",
  bio: "About",
  philosophy: "Coaching style",
  "ideal-clients": "Best for",
  "service-area": "Service area",
  location: "Location",
  credentials: "Credentials",
  social: "Connect",
};

interface SpecialistDashboardProfilePreviewProps {
  trainer: Trainer;
  editable?: boolean;
  isPremium?: boolean;
}

function LiveEditZone({
  label,
  canEdit,
  onEdit,
  children,
  className,
}: {
  label: string;
  canEdit: boolean;
  onEdit: () => void;
  children: ReactNode;
  className?: string;
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
      className={cn("specialist-live-zone", className)}
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
 * Live profile — marketplace-faithful preview; tap a section → edit sheet → save live.
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

  const canEdit = editable && Boolean(formDefaults && trainerId);

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
  const coachingStyleItems = trainer.coachingStyle.filter(Boolean);
  const bestForItems = trainer.bestFor.filter(Boolean);
  const locationLine = [
    trainer.neighborhood,
    trainer.city,
    trainer.state,
    trainer.zipCode?.trim() ? `ZIP ${trainer.zipCode.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className="specialist-live-marketplace"
      aria-label="Live marketplace profile"
    >
      <LiveEditZone
        label="Photos & identity"
        canEdit={canEdit}
        onEdit={() => startEdit("hero")}
        className="specialist-live-zone--hero"
      >
        <div data-live-edit-ignore>
          <ProfileHero trainer={trainer} variant="specialist-live" />
        </div>
      </LiveEditZone>

      <div className="specialist-live-marketplace__stream profile-content profile-content--streamlined">
        <LiveEditZone
          label="Service area"
          canEdit={canEdit}
          onEdit={() => startEdit("service-area")}
        >
          <ProfileServiceArea trainer={trainer} />
        </LiveEditZone>

        <LiveEditZone
          label="Location"
          canEdit={canEdit}
          onEdit={() => startEdit("location")}
        >
          <ProfileSection variant="panel" aria-label="Location">
            <ProfileSectionHeader title="Location" />
            <div className="profile-section-body">
              <p className="profile-body-text">
                {locationLine || "Add city, neighborhood, and ZIP"}
              </p>
            </div>
          </ProfileSection>
        </LiveEditZone>

        <LiveEditZone
          label="Best for"
          canEdit={canEdit}
          onEdit={() => startEdit("ideal-clients")}
        >
          <ProfileSection variant="panel" aria-label="Best for">
            <ProfileSectionHeader title="Best for" />
            <div className="profile-section-body">
              {bestForItems.length > 0 ? (
                <ProfilePillGrid items={bestForItems.slice(0, 8)} />
              ) : (
                <p className="profile-body-text profile-body-text--muted">
                  Add who you help best
                </p>
              )}
            </div>
          </ProfileSection>
        </LiveEditZone>

        <LiveEditZone
          label="Coaching style"
          canEdit={canEdit}
          onEdit={() => startEdit("philosophy")}
        >
          <ProfileSection variant="panel" aria-label="Coaching style">
            <ProfileSectionHeader title="Coaching style" />
            <div className="profile-section-body">
              {coachingStyleItems.length > 0 ? (
                <ProfilePillGrid items={coachingStyleItems.slice(0, 8)} />
              ) : (
                <p className="profile-body-text profile-body-text--muted">
                  Add how you coach
                </p>
              )}
            </div>
          </ProfileSection>
        </LiveEditZone>

        <LiveEditZone
          label="Credentials"
          canEdit={canEdit}
          onEdit={() => startEdit("credentials")}
        >
          {trainer.certifications.length > 0 ? (
            <Certifications certifications={trainer.certifications} />
          ) : (
            <ProfileSection variant="panel" aria-label="Credentials">
              <ProfileSectionHeader title="Credentials" />
              <div className="profile-section-body">
                <p className="profile-body-text profile-body-text--muted">
                  Add credentials
                </p>
              </div>
            </ProfileSection>
          )}
        </LiveEditZone>

        <LiveEditZone
          label="About"
          canEdit={canEdit}
          onEdit={() => startEdit("bio")}
        >
          {trainer.bio.trim() || trainer.specialty.length > 0 ? (
            <Bio trainer={trainer} />
          ) : (
            <ProfileSection variant="panel" aria-label="About">
              <ProfileSectionHeader title="About" />
              <div className="profile-section-body">
                <p className="profile-body-text profile-body-text--muted">
                  Add your bio and specialties
                </p>
              </div>
            </ProfileSection>
          )}
        </LiveEditZone>

        <LiveEditZone
          label="Connect"
          canEdit={canEdit}
          onEdit={() => startEdit("social")}
        >
          {trainer.social.instagram ||
          trainer.social.website ||
          trainer.social.tiktok ? (
            <SocialLinks social={trainer.social} />
          ) : (
            <ProfileSection variant="panel" aria-label="Connect">
              <ProfileSectionHeader title="Connect" />
              <div className="profile-section-body">
                <p className="profile-body-text profile-body-text--muted">
                  Add social links
                </p>
              </div>
            </ProfileSection>
          )}
        </LiveEditZone>
      </div>

      {canEdit ? (
        <div className="specialist-live-marketplace__footer">
          <Link
            href={EDIT_PROFILE_PATH}
            className="specialist-dash-profile__full-editor-link"
          >
            Open full editor (pricing, photos & more) →
          </Link>
        </div>
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

          {editing === "location" ? (
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
            </div>
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
