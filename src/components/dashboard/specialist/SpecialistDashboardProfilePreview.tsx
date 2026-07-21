"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import { ProfileMediaUploadField } from "@/components/dashboard/specialist/ProfileMediaUploadField";
import { useToast } from "@/components/ui/toast";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import {
  EMPTY_CERTIFICATION,
  cloneSpecialistProfileEditForm,
} from "@/lib/specialist-profile-overrides";
import { buildServiceAreaDisplay } from "@/lib/specialist-service-area";
import { cn } from "@/lib/utils";
import type { SpecialistApplication } from "@/types/specialist-application";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { SpecialistServiceType } from "@/types/specialist-service-area";
import {
  SPECIALIST_SERVICE_TYPE_OPTIONS,
  SPECIALIST_TRAVEL_RADIUS_OPTIONS,
} from "@/types/specialist-service-area";
import type { Trainer } from "@/types/trainer";

const EDIT_PROFILE_PATH = "/specialist-dashboard/edit-profile";

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

interface SpecialistDashboardProfilePreviewProps {
  application: SpecialistApplication;
  trainer: Trainer;
  editable?: boolean;
}

function Placeholder({ children }: { children: ReactNode }) {
  return <p className="specialist-dash-profile__placeholder">{children}</p>;
}

interface SectionProps {
  id: SectionId;
  label: string;
  display: ReactNode;
  editor: ReactNode;
  className?: string;
  canEdit: boolean;
  editingSection: SectionId | null;
  saving: boolean;
  onStart: (id: SectionId) => void;
  onCancel: () => void;
  onSave: () => void;
}

/** Module-level so React keeps inputs mounted (and focused) across renders. */
function Section({
  id,
  label,
  display,
  editor,
  className,
  canEdit,
  editingSection,
  saving,
  onStart,
  onCancel,
  onSave,
}: SectionProps) {
  const isEditing = editingSection === id;

  if (!canEdit) {
    return (
      <div className={cn("specialist-dash-profile__section", className)}>
        <p className="specialist-dash-profile__label">{label}</p>
        {display}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "specialist-dash-profile__section",
        "specialist-dash-profile__section--inline",
        isEditing && "specialist-dash-profile__section--editing",
        className
      )}
    >
      <div className="specialist-dash-profile__section-head">
        <p className="specialist-dash-profile__label">{label}</p>
        {!isEditing ? (
          <button
            type="button"
            className="smoac-control specialist-dash-profile__edit-pill"
            onClick={() => onStart(id)}
          >
            Edit
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="specialist-dash-profile__editor">
          {editor}
          <div className="specialist-dash-profile__editor-actions">
            <button
              type="button"
              className="smoac-control specialist-dash-profile__editor-cancel"
              disabled={saving}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="smoac-control specialist-dash-profile__editor-save"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? "Publishing…" : "Save — goes live"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="specialist-dash-profile__section-tap"
          onClick={() => onStart(id)}
        >
          {display}
        </button>
      )}
    </div>
  );
}

/**
 * Live profile snapshot — looks like what clients see; every section edits
 * in place and saves straight to the live profile.
 */
export function SpecialistDashboardProfilePreview({
  application,
  trainer,
  editable = false,
}: SpecialistDashboardProfilePreviewProps) {
  const { showToast } = useToast();
  const { formDefaults, saveForm, trainerId } = useManagedSpecialistProfile();

  const [editing, setEditing] = useState<SectionId | null>(null);
  const [draft, setDraft] = useState<SpecialistProfileEditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = editable && Boolean(formDefaults && trainerId);

  function startEdit(section: SectionId) {
    if (!canEdit || !formDefaults) return;
    if (editing != null && editing !== section) {
      showToast({
        type: "info",
        message: "Save or cancel the section you're editing first.",
      });
      return;
    }
    if (editing === section) return;
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

  const sectionShared = {
    canEdit,
    editingSection: editing,
    saving,
    onStart: startEdit,
    onCancel: cancelEdit,
    onSave: () => void publish(),
  };

  const form = draft;
  const serviceArea = buildServiceAreaDisplay(trainer);
  const photo =
    application.media.profilePhotoUrl.trim() ||
    trainer.image?.trim() ||
    trainer.heroImage?.trim() ||
    "";
  const coachingPhilosophy = application.coachingPhilosophy.trim();
  const idealClients = application.bestClientTypes.trim();
  const locationLine = [application.neighborhood, application.city, application.state]
    .filter(Boolean)
    .join(", ");
  const zipLine = application.zipCode.trim();
  const socialLinks = [
    application.social.instagram,
    application.social.website,
    application.social.googleReviewsUrl,
  ].filter(Boolean);

  return (
    <article className="specialist-dash-profile" aria-label="Profile preview">
      <Section
        {...sectionShared}
        id="hero"
        label="Profile photo & headline"
        className="specialist-dash-profile__section--hero"
        display={
          <div className="specialist-dash-profile__hero">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="specialist-dash-profile__photo" />
            ) : (
              <div className="specialist-dash-profile__photo specialist-dash-profile__photo--placeholder" />
            )}
            <div className="specialist-dash-profile__hero-copy">
              <p className="specialist-dash-profile__name">
                {trainer.name || "Add name"}
              </p>
              <p className="specialist-dash-profile__headline">
                {trainer.title || "Add headline"}
              </p>
              <p className="specialist-dash-profile__meta">
                {trainer.profession || "Add profession"}
                {locationLine ? ` · ${locationLine}` : ""}
              </p>
            </div>
          </div>
        }
        editor={
          form ? (
            <div className="specialist-dash-profile__fields">
              <ProfileMediaUploadField
                label="Profile photo"
                hint="Square headshot or brand portrait"
                value={form.profilePhotoUrl}
                onChange={(value) => patch("profilePhotoUrl", value)}
                aspect="square"
                specialistId={trainerId}
                mediaKind="profile"
                onClear={() => patch("profilePhotoUrl", "")}
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
          ) : null
        }
      />

      <Section
        {...sectionShared}
        id="specialties"
        label="Specialties"
        display={
          trainer.specialty.length > 0 ? (
            <div className="specialist-dash-profile__pills">
              {trainer.specialty.slice(0, 8).map((item) => (
                <span key={item} className="specialist-dash-profile__pill">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <Placeholder>Add specialties</Placeholder>
          )
        }
        editor={
          form ? (
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
          ) : null
        }
      />

      <Section
        {...sectionShared}
        id="bio"
        label="Bio"
        display={
          trainer.bio.trim() ? (
            <p className="specialist-dash-profile__bio">{trainer.bio}</p>
          ) : (
            <Placeholder>Add bio</Placeholder>
          )
        }
        editor={
          form ? (
            <textarea
              className="login-field__input dashboard-edit-textarea profile-edit-input"
              rows={6}
              value={form.bio}
              onChange={(e) => patch("bio", e.target.value)}
              placeholder="Your story and approach"
            />
          ) : null
        }
      />

      <Section
        {...sectionShared}
        id="philosophy"
        label="Coaching philosophy"
        display={
          coachingPhilosophy ? (
            <p className="specialist-dash-profile__bio">{coachingPhilosophy}</p>
          ) : (
            <Placeholder>Add coaching philosophy</Placeholder>
          )
        }
        editor={
          form ? (
            <textarea
              className="login-field__input dashboard-edit-textarea profile-edit-input"
              rows={4}
              value={form.trainingStyle}
              onChange={(e) => patch("trainingStyle", e.target.value)}
              placeholder="How you coach and what drives results"
            />
          ) : null
        }
      />

      <Section
        {...sectionShared}
        id="ideal-clients"
        label="Ideal clients"
        display={
          idealClients ? (
            <p className="specialist-dash-profile__bio">{idealClients}</p>
          ) : (
            <Placeholder>Add ideal clients</Placeholder>
          )
        }
        editor={
          form ? (
            <textarea
              className="login-field__input dashboard-edit-textarea profile-edit-input"
              rows={4}
              value={form.servicesOffered}
              onChange={(e) => patch("servicesOffered", e.target.value)}
              placeholder="Who you help best and the services you offer"
            />
          ) : null
        }
      />

      <Section
        {...sectionShared}
        id="service-area"
        label="Service area"
        display={
          serviceArea ? (
            <p className="specialist-dash-profile__meta">
              Based in {serviceArea.basedInLine}
              {serviceArea.travelRadiusLine
                ? ` · ${serviceArea.travelRadiusLine} travel`
                : ""}
              {" · "}
              {serviceArea.serviceTypeLine}
            </p>
          ) : (
            <Placeholder>Add service area</Placeholder>
          )
        }
        editor={
          form ? (
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
          ) : null
        }
      />

      <Section
        {...sectionShared}
        id="location"
        label="Location"
        display={
          locationLine || zipLine ? (
            <p className="specialist-dash-profile__meta">
              {[locationLine, zipLine ? `ZIP ${zipLine}` : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : (
            <Placeholder>Add city, neighborhood, and ZIP code</Placeholder>
          )
        }
        editor={
          form ? (
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
          ) : null
        }
      />

      <Section
        {...sectionShared}
        id="credentials"
        label="Credentials"
        display={
          trainer.certifications.length > 0 ? (
            <ul className="specialist-dash-profile__list">
              {trainer.certifications.slice(0, 4).map((cert) => (
                <li key={`${cert.name}-${cert.year}`}>
                  {cert.name}
                  {cert.issuer ? ` · ${cert.issuer}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <Placeholder>Add credentials</Placeholder>
          )
        }
        editor={
          form ? (
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
          ) : null
        }
      />

      <Section
        {...sectionShared}
        id="social"
        label="Social & review links"
        display={
          socialLinks.length > 0 ? (
            <p className="specialist-dash-profile__meta specialist-dash-profile__meta--links">
              {socialLinks.join(" · ")}
            </p>
          ) : (
            <Placeholder>Add social or review links</Placeholder>
          )
        }
        editor={
          form ? (
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
          ) : null
        }
      />

      {canEdit ? (
        <div className="specialist-dash-profile__footer">
          <Link
            href={EDIT_PROFILE_PATH}
            className="specialist-dash-profile__full-editor-link"
          >
            Open full editor (pricing, photos & more) →
          </Link>
        </div>
      ) : null}
    </article>
  );
}
