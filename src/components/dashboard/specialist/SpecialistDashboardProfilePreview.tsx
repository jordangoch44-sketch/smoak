"use client";

import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import { SpecialistIgStyleProfileEditor } from "@/components/dashboard/specialist/SpecialistIgStyleProfileEditor";
import { SpecialistProfileMediaEditor } from "@/components/dashboard/specialist/SpecialistProfileMediaEditor";
import { SpecialistTransformationsEditor } from "@/components/dashboard/specialist/SpecialistTransformationsEditor";
import { ProfileContactCta } from "@/components/profile/ProfileContactCta";
import { ProfileHero } from "@/components/profile/ProfileHero";
import {
  ProfileSheetTabs,
  type ProfileSheetTabId,
} from "@/components/profile/ProfileSheetTabs";
import { ProfileTrainerSpecs } from "@/components/profile/ProfileTrainerSpecs";
import { SmoacReviewsSection } from "@/components/profile/SmoacReviewsSection";
import { SpecialistPreciseLocationField } from "@/components/auth/specialist/SpecialistPreciseLocationField";
import { useToast } from "@/components/ui/toast";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useSpecialistReviews } from "@/hooks/useSpecialistReviews";
import { lookupZipPlace } from "@/lib/geo/zip-place-lookup";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import {
  getProfileAccentRgb,
  normalizeProfileStyle,
  PROFILE_ACCENT_OPTIONS,
  PROFILE_AVATAR_FRAME_OPTIONS,
  PROFILE_NAME_FONT_OPTIONS,
  type ProfileAccentId,
  type ProfileAvatarFrameId,
  type ProfileNameFontId,
} from "@/lib/specialist-profile-style";
import {
  EMPTY_CERTIFICATION,
  cloneSpecialistProfileEditForm,
} from "@/lib/specialist-profile-overrides";
import { cn } from "@/lib/utils";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { SpecialistServiceType } from "@/types/specialist-service-area";
import {
  parseTravelToClients,
  SPECIALIST_SERVICE_TYPE_OPTIONS,
  TRAVEL_TO_CLIENTS_OPTIONS,
} from "@/types/specialist-service-area";
import { GENDER_OPTIONS } from "@/constants/specialist-onboarding-options";
import { parseGender } from "@/lib/gender";
import type { Trainer } from "@/types/trainer";

const LOCK_CLASS = "specialist-live-edit-open";
const LIVE_PROFILE_ANCHOR_ID = "specialist-live-profile";

type SectionId =
  | "hero"
  | "name"
  | "headline"
  | "profession"
  | "transformations"
  | "specialties"
  | "bio"
  | "philosophy"
  | "ideal-clients"
  | "service-area"
  | "session-experience"
  | "credentials"
  | "social"
  | "pricing"
  | "contact"
  | "gender"
  | "experience"
  | "profile-style"
  | "featured-specialties";

const SECTION_TITLES: Record<SectionId, string> = {
  hero: "Photos",
  name: "Business name",
  headline: "Headline",
  profession: "Category",
  transformations: "Client transformations",
  specialties: "Specialties",
  bio: "Bio",
  philosophy: "Coaching style",
  "ideal-clients": "Best for",
  "service-area": "Service area & location",
  "session-experience": "Session experience",
  credentials: "Credentials",
  social: "Connect",
  pricing: "Pricing",
  contact: "Contact",
  gender: "Gender",
  experience: "Experience",
  "profile-style": "Profile style",
  "featured-specialties": "Featured specialties",
};

interface SpecialistDashboardProfilePreviewProps {
  trainer: Trainer;
  editable?: boolean;
  isPremium?: boolean;
  isProPlus?: boolean;
  isLivePublished?: boolean;
  planBadgeLabel?: string;
  focusSection?: string | null;
  onClearFocus?: () => void;
}

function mapTargetSectionToSectionId(target: string | null | undefined): SectionId | null {
  if (!target) return null;
  const lower = target.toLowerCase().trim();
  switch (lower) {
    case "photo":
    case "hero":
    case "avatar":
    case "picture":
      return "hero";
    case "name":
    case "business-name":
      return "name";
    case "headline":
    case "title":
      return "headline";
    case "profession":
    case "category":
      return "profession";
    case "price":
    case "pricing":
    case "rates":
      return "pricing";
    case "bio":
    case "about":
      return "bio";
    case "booking":
    case "session-experience":
    case "experience-booking":
      return "session-experience";
    case "specialties":
    case "specialty":
      return "specialties";
    case "location":
    case "service-area":
    case "city":
    case "zip":
      return "service-area";
    case "credentials":
    case "certifications":
      return "credentials";
    case "transformations":
      return "transformations";
    case "social":
    case "links":
      return "social";
    case "contact":
    case "phone":
    case "email":
      return "contact";
    case "gender":
      return "gender";
    case "experience":
    case "years-experience":
      return "experience";
    case "profile-style":
    case "style":
      return "profile-style";
    case "featured-specialties":
      return "featured-specialties";
    default:
      return null;
  }
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

function LiveEditSheet({
  title,
  saving,
  onClose,
  onSave,
  children,
  variant = "default",
}: {
  title: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
  variant?: "default" | "photos";
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
          {variant === "photos" ? (
            <p className="specialist-live-sheet__sub">
              Tap to replace · Save when done
            </p>
          ) : (
            <p className="specialist-live-sheet__sub">
              Changes publish to your live marketplace profile as soon as you
              save.
            </p>
          )}
        </div>
        <div className="specialist-live-sheet__body">{children}</div>
        <div className="specialist-live-sheet__actions">
          <button
            type="button"
            className="smoac-control specialist-live-sheet__save"
            disabled={saving}
            onClick={onSave}
          >
            {saving
              ? "Publishing…"
              : variant === "photos"
                ? "Save"
                : "Save changes — goes live"}
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

function LivePreviewModeToggle({
  value,
  onChange,
}: {
  value: "edit" | "live";
  onChange: (value: "edit" | "live") => void;
}) {
  return (
    <div className="specialist-live-mode" role="tablist" aria-label="Profile mode">
      <button
        type="button"
        role="tab"
        aria-selected={value === "edit"}
        className={cn(
          "smoac-control specialist-live-mode__btn",
          value === "edit" && "specialist-live-mode__btn--active"
        )}
        onClick={() => onChange("edit")}
      >
        Edit
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "live"}
        className={cn(
          "smoac-control specialist-live-mode__btn",
          value === "live" && "specialist-live-mode__btn--active"
        )}
        onClick={() => onChange("live")}
      >
        Live
      </button>
    </div>
  );
}

/**
 * Edit profile tab — Instagram-style list for owners; live preview for
 * read-only / pending views. Saves use the same managed profile path.
 */
export function SpecialistDashboardProfilePreview({
  trainer: trainerProp,
  editable = false,
  isPremium = false,
  isProPlus = false,
  isLivePublished = false,
  planBadgeLabel,
  focusSection = null,
  onClearFocus,
}: SpecialistDashboardProfilePreviewProps) {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const {
    formDefaults,
    saveForm,
    trainerId,
    application,
    trainer: managedTrainer,
  } = useManagedSpecialistProfile();

  const trainer = {
    ...(managedTrainer ?? trainerProp),
    isPremium: isPremium || Boolean((managedTrainer ?? trainerProp).isPremium),
    membershipPlan: isProPlus
      ? "platinum"
      : (managedTrainer ?? trainerProp).membershipPlan,
  } as Trainer;
  const isLiveListing = application?.profileStatus === "APPROVED";

  const [editing, setEditing] = useState<SectionId | null>(null);
  const [draft, setDraft] = useState<SpecialistProfileEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [sheetTab, setSheetTab] = useState<ProfileSheetTabId>("details");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "live">("edit");
  const {
    aggregate,
    reviews: smoacReviews,
    hasMore,
    loadingMore,
    loadMore,
    sort,
    setSort,
    applySubmittedReview,
  } = useSpecialistReviews(trainer.id);

  const canEdit = editable && Boolean(formDefaults && trainerId);

  useEffect(() => {
    const target =
      focusSection || searchParams.get("focus") || searchParams.get("section");
    const mapped = mapTargetSectionToSectionId(target);
    if (!mapped) return;

    setHighlightedRow(mapped);

    const scrollTimer = window.setTimeout(() => {
      const el =
        document.getElementById(`ig-edit-row-${mapped}`) ||
        document.querySelector(`[data-edit-section="${mapped}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);

    const clearTimer = window.setTimeout(() => {
      setHighlightedRow(null);
      onClearFocus?.();
    }, 3500);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [focusSection, searchParams, onClearFocus]);

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
      showToast({
        type: "success",
        message: isLiveListing
          ? "Saved — changes are live on Marketplace."
          : "Saved — still under review (not public yet).",
      });
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

  const editSheet =
    editing && form ? (
      <LiveEditSheet
        title={SECTION_TITLES[editing]}
        saving={saving}
        onClose={cancelEdit}
        onSave={() => void publish()}
        variant={editing === "hero" ? "photos" : "default"}
      >
        {editing === "hero" ? (
          <div className="specialist-dash-profile__fields">
            <SpecialistProfileMediaEditor
              profilePhotoUrl={form.profilePhotoUrl}
              coverImageUrl={form.coverImageUrl}
              photoNotes={form.photoNotes}
              slideshowFramesJson={form.slideshowFramesJson}
              videoNotes={form.videoNotes}
              pinnedPhotos={form.pinnedPhotos}
              transformationNotes={form.transformationNotes}
              isPremium={isPremium}
              isProPlus={isProPlus}
              specialistId={trainerId}
              onChange={(next) => {
                setDraft((prev) => (prev ? { ...prev, ...next } : prev));
              }}
            />
          </div>
        ) : null}

        {editing === "name" ? (
          <label className="login-field">
            <span className="login-field__label">Business name</span>
            <input
              className="login-field__input profile-edit-input"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
            />
          </label>
        ) : null}

        {editing === "headline" ? (
          <label className="login-field">
            <span className="login-field__label">Headline</span>
            <input
              className="login-field__input profile-edit-input"
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
            />
          </label>
        ) : null}

        {editing === "profession" ? (
          <label className="login-field">
            <span className="login-field__label">Category</span>
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
        ) : null}

        {editing === "transformations" ? (
          <SpecialistTransformationsEditor
            transformationNotes={form.transformationNotes}
            isProPlus={isProPlus}
            specialistId={trainerId}
            onChange={(transformationNotes) =>
              patch("transformationNotes", transformationNotes)
            }
          />
        ) : null}

        {editing === "bio" ? (
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
        ) : null}

        {editing === "specialties" ? (
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
            {form.serviceType === "in-person" || form.serviceType === "both" ? (
              <SpecialistPreciseLocationField
                workAddress={form.workAddress}
                locationPrecision={form.locationPrecision}
                onDraftChange={(workAddress) => patch("workAddress", workAddress)}
                onResolved={(value) => {
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          workAddress: value.workAddress,
                          locationPrecision: "address",
                          latitude: value.latitude,
                          longitude: value.longitude,
                          ...(value.zipCode ? { zipCode: value.zipCode } : {}),
                          ...(value.city ? { city: value.city } : {}),
                        }
                      : prev
                  );
                }}
                onCleared={() => {
                  void (async () => {
                    const zip = normalizeZipCode(form.zipCode);
                    const result = isValidZipCode(zip)
                      ? await lookupZipPlace(zip)
                      : null;
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            workAddress: "",
                            locationPrecision: "zip",
                            latitude: result?.latitude ?? null,
                            longitude: result?.longitude ?? null,
                            ...(result?.city ? { city: result.city } : {}),
                          }
                        : prev
                    );
                  })();
                }}
              />
            ) : (
              <p className="wizard-field-hint">
                Virtual coaches don’t need a street address. Switch session
                format below if you also train in person.
              </p>
            )}
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
                onChange={(e) => {
                  const next = e.target.value as SpecialistServiceType;
                  if (next === "virtual") {
                    patch("serviceType", next);
                    patch("workAddress", "");
                    patch("locationPrecision", "zip");
                    return;
                  }
                  patch("serviceType", next);
                }}
              >
                {SPECIALIST_SERVICE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="login-field">
              <span className="login-field__label">
                Are you willing to travel to clients?
              </span>
              <select
                className="login-field__input dashboard-edit-select profile-edit-input"
                value={form.travelToClients}
                onChange={(e) =>
                  patch("travelToClients", parseTravelToClients(e.target.value))
                }
              >
                <option value="">Select</option>
                {TRAVEL_TO_CLIENTS_OPTIONS.map((option) => (
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
            <p className="wizard-field-hint">
              Google Reviews connect lives on your Pro Reviews card — not here.
            </p>
          </div>
        ) : null}

        {editing === "pricing" ? (
          <label className="login-field">
            <span className="login-field__label">Price per session (USD)</span>
            <input
              className="login-field__input profile-edit-input"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={form.pricePerSession || ""}
              onChange={(e) =>
                patch("pricePerSession", Number(e.target.value) || 0)
              }
              placeholder="e.g. 120"
            />
          </label>
        ) : null}

        {editing === "contact" ? (
          <div className="specialist-dash-profile__fields">
            <label className="login-field">
              <span className="login-field__label">Phone</span>
              <input
                className="login-field__input profile-edit-input"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => patch("phone", e.target.value)}
              />
            </label>
            <label className="login-field">
              <span className="login-field__label">Email</span>
              <input
                className="login-field__input profile-edit-input"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => patch("email", e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {editing === "gender" ? (
          <label className="login-field">
            <span className="login-field__label">Gender</span>
            <select
              className="login-field__input dashboard-edit-select profile-edit-input"
              value={form.gender}
              required
              onChange={(e) => patch("gender", parseGender(e.target.value))}
            >
              <option value="">Select</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {editing === "experience" ? (
          <label className="login-field">
            <span className="login-field__label">Years of experience</span>
            <input
              className="login-field__input profile-edit-input"
              value={form.experienceYears}
              onChange={(e) => patch("experienceYears", e.target.value)}
              placeholder="e.g. 8"
            />
          </label>
        ) : null}

        {editing === "profile-style" ? (
          <div className="specialist-dash-profile__fields">
            <div>
              <p className="login-field__label">Accent color</p>
              <div
                className="profile-style-swatches"
                role="radiogroup"
                aria-label="Accent color"
              >
                {PROFILE_ACCENT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={form.profileAccent === option.id}
                    aria-label={option.label}
                    className={cn(
                      "smoac-control profile-style-swatch",
                      form.profileAccent === option.id &&
                        "profile-style-swatch--active"
                    )}
                    onClick={() =>
                      patch("profileAccent", option.id as ProfileAccentId)
                    }
                  >
                    <span
                      className="profile-style-swatch__dot"
                      style={{ background: option.swatch }}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="login-field__label">Avatar frame</p>
              <div
                className="profile-style-options"
                role="radiogroup"
                aria-label="Avatar frame"
              >
                {PROFILE_AVATAR_FRAME_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={form.profileAvatarFrame === option.id}
                    className={cn(
                      "smoac-control profile-style-option",
                      form.profileAvatarFrame === option.id &&
                        "profile-style-option--active"
                    )}
                    onClick={() =>
                      patch(
                        "profileAvatarFrame",
                        option.id as ProfileAvatarFrameId
                      )
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="login-field__label">Name font</p>
              <div
                className="profile-style-options"
                role="radiogroup"
                aria-label="Name font"
              >
                {PROFILE_NAME_FONT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={form.profileNameFont === option.id}
                    className={cn(
                      "smoac-control profile-style-option",
                      `profile-style-option--font-${option.id}`,
                      form.profileNameFont === option.id &&
                        "profile-style-option--active"
                    )}
                    onClick={() =>
                      patch("profileNameFont", option.id as ProfileNameFontId)
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {editing === "featured-specialties" ? (
          <div className="specialist-dash-profile__fields">
            <p className="wizard-field-hint">
              Pick up to two specialties for your homepage card. They must
              already be in your specialties list.
            </p>
            {form.specialty.length === 0 ? (
              <p className="wizard-field-hint">
                Add specialties first, then choose which ones to feature.
              </p>
            ) : (
              <div className="dashboard-edit-chip-grid">
                {form.specialty.map((specialty) => {
                  const active = form.homepageSpecialties.includes(specialty);
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
                        setDraft((prev) => {
                          if (!prev) return prev;
                          const has = prev.homepageSpecialties.includes(specialty);
                          if (has) {
                            return {
                              ...prev,
                              homepageSpecialties:
                                prev.homepageSpecialties.filter(
                                  (item) => item !== specialty
                                ),
                            };
                          }
                          if (prev.homepageSpecialties.length >= 2) return prev;
                          return {
                            ...prev,
                            homepageSpecialties: [
                              ...prev.homepageSpecialties,
                              specialty,
                            ],
                          };
                        });
                      }}
                      aria-pressed={active}
                    >
                      {specialty}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </LiveEditSheet>
    ) : null;

  /* Owner edit tab — Instagram-style list (does not change public profile layout). */
  if (canEdit && formDefaults && previewMode === "edit") {
    return (
      <div id={LIVE_PROFILE_ANCHOR_ID} className="ig-profile-edit-wrap">
        <LivePreviewModeToggle value={previewMode} onChange={setPreviewMode} />
        <SpecialistIgStyleProfileEditor
          trainer={trainer}
          formDefaults={formDefaults}
          onEditSection={(id) => startEdit(id)}
          highlightedSection={highlightedRow}
          planBadgeLabel={planBadgeLabel}
          isLivePublished={isLivePublished}
          footer={
            <p className="ig-profile-edit__hint">
              Changes go live on Marketplace when you save. Clients still see
              your normal SMOAC profile layout.
            </p>
          }
        />
        {editSheet}
      </div>
    );
  }

  return (
    <article
      id={LIVE_PROFILE_ANCHOR_ID}
      className="specialist-live-marketplace profile-page--styled"
      style={pageStyle}
      data-profile-accent={profileStyle.accent}
      aria-label="Live marketplace profile"
    >
      {canEdit ? (
        <LivePreviewModeToggle value={previewMode} onChange={setPreviewMode} />
      ) : null}
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
        <ProfileSheetTabs
          value={sheetTab}
          onChange={setSheetTab}
          details={<ProfileTrainerSpecs trainer={trainer} />}
          reviews={
            <SmoacReviewsSection
              specialistId={trainer.id}
              specialistName={trainer.name}
              aggregate={aggregate}
              reviews={smoacReviews}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={() => void loadMore()}
              sort={sort}
              onSortChange={setSort}
              reviewModalOpen={reviewModalOpen}
              onReviewModalOpenChange={setReviewModalOpen}
              onSubmitted={applySubmittedReview}
              canLeaveReview={false}
            />
          }
          inquire={
            <div className="specialist-live-contact-preview" data-live-edit-ignore>
              <ProfileContactCta
                specialistName={trainer.name}
                onContact={() => {
                  if (!canEdit) return;
                  showToast({
                    type: "info",
                    message:
                      "Clients use this button to inquire — it isn’t editable.",
                  });
                }}
              />
            </div>
          }
        />
      </div>

      {editSheet}
    </article>
  );
}
