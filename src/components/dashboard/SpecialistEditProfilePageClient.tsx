"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import {
  DashboardPageShell,
} from "@/components/dashboard/shared";
import { SpecialistDashboardAccountMenu } from "@/components/dashboard/specialist/SpecialistDashboardAccountMenu";
import {
  ProfileEditInputField,
  ProfileEditSection,
  ProfileEditViewField,
} from "@/components/dashboard/specialist/ProfileEditSection";
import { SpecialistProfileMediaEditor } from "@/components/dashboard/specialist/SpecialistProfileMediaEditor";
import { SpecialistPendingApprovalNotice } from "@/components/dashboard/specialist/SpecialistPendingApprovalNotice";
import { SpecialistPreciseLocationField } from "@/components/auth/specialist/SpecialistPreciseLocationField";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useProfileKeyboardChrome } from "@/hooks/useProfileKeyboardChrome";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { resubmitSpecialistApplicationForReviewAsync } from "@/lib/admin-applications-service";
import { lookupZipPlace } from "@/lib/geo/zip-place-lookup";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import {
  EMPTY_CERTIFICATION,
  cloneSpecialistProfileEditForm,
  computeProfileCompletion,
} from "@/lib/specialist-profile-overrides";
import {
  resolveSpecialistDashboardMode,
  showsProfileFirstDashboard,
} from "@/lib/specialist-dashboard-mode";
import { getSpecialistSubscriptionForSession } from "@/lib/specialist-dashboard-subscription";
import {
  formatProTrialBadgeLabel,
  isProPlusPlan,
  SMOAC_FREE_PLAN_LABEL,
} from "@/lib/specialist-premium";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import type { Certification, Gender } from "@/types/trainer";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import {
  parseTravelToClients,
  SPECIALIST_SERVICE_TYPE_OPTIONS,
  TRAVEL_TO_CLIENTS_OPTIONS,
} from "@/types/specialist-service-area";
import type { SpecialistServiceType } from "@/types/specialist-service-area";
import { formatTrainingOptionsLabel } from "@/types/specialist-training-options";
import { SpecialistTrainingOptionsFields } from "@/components/auth/specialist/SpecialistTrainingOptionsFields";
import { formatTravelToClientsEditorLabel } from "@/lib/specialist-service-area";
import {
  PROFILE_ACCENT_OPTIONS,
  PROFILE_AVATAR_FRAME_OPTIONS,
  PROFILE_NAME_FONT_OPTIONS,
  profileStyleAccentLabel,
  profileStyleFontLabel,
  profileStyleFrameLabel,
  type ProfileAccentId,
  type ProfileAvatarFrameId,
  type ProfileNameFontId,
} from "@/lib/specialist-profile-style";
import { cn, getInitials } from "@/lib/utils";
import { GENDER_OPTIONS } from "@/constants/specialist-onboarding-options";
import { parseGender } from "@/lib/gender";

type SectionId =
  | "basic-info"
  | "profile-style"
  | "bio"
  | "experience"
  | "professional-role"
  | "specialties"
  | "service-area"
  | "credentials"
  | "photos-links";

function genderLabel(value: Gender | ""): string {
  if (!value) return "Add";
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function SpecialistEditProfilePageClient({
  presentation = "page",
  onRequestClose,
}: {
  presentation?: "page" | "modal";
  onRequestClose?: () => void;
} = {}) {
  const searchParams = useSearchParams();
  const { isReady, session } = useRequireAuth("specialist");
  const { signOut } = useAuthSession();
  const { showToast } = useToast();
  const { formDefaults, saveForm, application, trainerId, isHydrated } =
    useManagedSpecialistProfile();

  const [editingSection, setEditingSection] = useState<SectionId | null>(null);
  const [sectionDraft, setSectionDraft] = useState<SpecialistProfileEditForm | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);
  const [requestReviewBusy, setRequestReviewBusy] = useState(false);
  const [requestReviewError, setRequestReviewError] = useState<string | null>(
    null
  );
  const focusPhoto = searchParams.get("focus") === "photo";
  const photoFocusOpenedRef = useRef(false);
  const isModal = presentation === "modal";

  useProfileKeyboardChrome();

  useEffect(() => {
    if (!isModal) return;
    setModalMounted(true);
  }, [isModal]);

  useEffect(() => {
    if (!isModal) return;
    document.body.classList.add("specialist-full-editor-open");
    document.documentElement.classList.add("specialist-full-editor-open");
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onRequestClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("specialist-full-editor-open");
      document.documentElement.classList.remove("specialist-full-editor-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [isModal, onRequestClose, saving]);

  const savedForm = formDefaults;
  const form = editingSection != null && sectionDraft ? sectionDraft : savedForm;

  useEffect(() => {
    if (!savedForm) return;
    if (application?.profileStatus === "PENDING_APPROVAL") return;
    const hash =
      window.location.hash.replace("#", "") ||
      (focusPhoto ? "photos-links" : "");
    if (!hash) return;
    const section = document.getElementById(hash);
    if (section) {
      window.requestAnimationFrame(() => {
        section.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
    if (focusPhoto && !photoFocusOpenedRef.current) {
      photoFocusOpenedRef.current = true;
      setEditingSection("photos-links");
      setSectionDraft(cloneSpecialistProfileEditForm(savedForm));
    }
  }, [savedForm, focusPhoto, application?.profileStatus]);

  const dashboardMode = resolveSpecialistDashboardMode({
    sessionEmail: session?.email,
    trainerId,
    application,
    subscription: getSpecialistSubscriptionForSession(session),
  });

  const isPremium = Boolean(session?.isPremium);
  const isProPlus = isProPlusPlan(session?.membershipPlan);
  const onProTrial = Boolean(session?.premiumTrialActive);
  const profileFirst = showsProfileFirstDashboard(dashboardMode);
  const profilePlanLabel = onProTrial
    ? formatProTrialBadgeLabel(session?.premiumTrialDaysRemaining)
    : isProPlus
      ? "SMOAC Pro Plus"
      : isPremium
        ? "SMOAC Pro"
        : SMOAC_FREE_PLAN_LABEL;

  const handleSignOut = useCallback(() => {
    void signOut().then(() => {
      afterLogoutNavigation("/profile");
    });
  }, [signOut]);

  function startEdit(sectionId: SectionId) {
    if (dashboardMode === "pending") return;
    if (!savedForm) return;
    if (editingSection != null && editingSection !== sectionId) {
      showToast({
        type: "info",
        message: "Save or cancel the current section before editing another.",
      });
      return;
    }
    setEditingSection(sectionId);
    setSectionDraft(cloneSpecialistProfileEditForm(savedForm));
  }

  function cancelEdit() {
    setEditingSection(null);
    setSectionDraft(null);
  }

  function updateField<K extends keyof SpecialistProfileEditForm>(
    key: K,
    value: SpecialistProfileEditForm[K]
  ) {
    setSectionDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleSpecialty(specialty: string) {
    setSectionDraft((prev) => {
      if (!prev) return prev;
      const has = prev.specialty.includes(specialty);
      const specialtyNext = has
        ? prev.specialty.filter((item) => item !== specialty)
        : [...prev.specialty, specialty];
      return {
        ...prev,
        specialty: specialtyNext,
        homepageSpecialties: prev.homepageSpecialties.filter((item) =>
          specialtyNext.includes(item)
        ),
      };
    });
  }

  function toggleHomepageSpecialty(specialty: string) {
    setSectionDraft((prev) => {
      if (!prev) return prev;
      if (!prev.specialty.includes(specialty)) return prev;
      const has = prev.homepageSpecialties.includes(specialty);
      if (has) {
        return {
          ...prev,
          homepageSpecialties: prev.homepageSpecialties.filter(
            (item) => item !== specialty
          ),
        };
      }
      if (prev.homepageSpecialties.length >= 2) return prev;
      return {
        ...prev,
        homepageSpecialties: [...prev.homepageSpecialties, specialty],
      };
    });
  }

  function updateCert(index: number, patch: Partial<Certification>) {
    setSectionDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        certifications: prev.certifications.map((cert, i) =>
          i === index ? { ...cert, ...patch } : cert
        ),
      };
    });
  }

  function addCertification() {
    setSectionDraft((prev) =>
      prev
        ? {
            ...prev,
            certifications: [...prev.certifications, { ...EMPTY_CERTIFICATION }],
          }
        : prev
    );
  }

  function removeCertification(index: number) {
    setSectionDraft((prev) => {
      if (!prev) return prev;
      const certifications = prev.certifications.filter((_, i) => i !== index);
      return {
        ...prev,
        certifications:
          certifications.length > 0
            ? certifications
            : [{ ...EMPTY_CERTIFICATION }],
      };
    });
  }

  async function saveSection() {
    const draft = sectionDraft;
    if (!draft || !trainerId) return;
    if (application?.profileStatus === "PENDING_APPROVAL") return;
    setSaving(true);
    const result = await saveForm(draft);
    setSaving(false);

    if (result.ok) {
      showToast({ type: "success", message: "Profile updated" });
      cancelEdit();
      return;
    }

    showToast({
      type: "info",
      message: result.ok === false ? result.error : "Unable to save changes",
    });
  }

  function sectionProps(sectionId: SectionId) {
    return {
      id: sectionId,
      isEditing: editingSection === sectionId,
      onEdit: () => startEdit(sectionId),
      onCancel: cancelEdit,
      onSave: saveSection,
      saving,
    };
  }

  if (!isReady || !session || !isHydrated) {
    if (isModal) {
      if (!modalMounted || typeof document === "undefined") return null;
      return createPortal(
        <div className="specialist-full-editor" role="presentation">
          <div className="specialist-full-editor__panel">
            <p className="specialist-full-editor__loading">
              Loading profile editor…
            </p>
          </div>
        </div>,
        document.body
      );
    }
    return (
      <div className="dashboard-page dashboard-page--loading">
        <div className="dashboard-page__content">
          <p className="dashboard-page__subtitle">Loading profile editor…</p>
        </div>
      </div>
    );
  }

  if (!savedForm || !form) {
    const emptyBody = (
      <div className="dashboard-page__content" style={{ padding: "2rem 1.25rem" }}>
        <p className="dashboard-page__subtitle" style={{ marginBottom: "0.75rem" }}>
          Profile editor unavailable
        </p>
        <p style={{ opacity: 0.75, marginBottom: "1.25rem", maxWidth: 420 }}>
          We couldn’t load your specialist profile yet. Refresh, or return to
          your dashboard and try again.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="dashboard-edit__btn dashboard-edit__btn--secondary"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
          {isModal && onRequestClose ? (
            <button
              type="button"
              className="dashboard-edit__btn dashboard-edit__btn--secondary"
              onClick={onRequestClose}
            >
              Close
            </button>
          ) : (
            <Link
              href={SPECIALIST_DASHBOARD_PATH}
              className="dashboard-edit__btn dashboard-edit__btn--secondary"
            >
              Back to dashboard
            </Link>
          )}
        </div>
      </div>
    );

    if (isModal) {
      if (!modalMounted || typeof document === "undefined") return null;
      return createPortal(
        <div className="specialist-full-editor" role="presentation">
          <div className="specialist-full-editor__panel">{emptyBody}</div>
        </div>,
        document.body
      );
    }

    return (
      <div className="dashboard-page">
        {emptyBody}
      </div>
    );
  }

  const completion = computeProfileCompletion(savedForm);
  const photoUrl =
    (editingSection === "photos-links" && sectionDraft
      ? sectionDraft.profilePhotoUrl
      : savedForm?.profilePhotoUrl) ||
    session?.avatarUrl ||
    "";
  const initials =
    (savedForm?.name ? getInitials(savedForm.name) : "") ||
    (session?.firstName ? getInitials(session.firstName) : "") ||
    "SM";

  const editorBody = (
    <div
      className={cn(
        "dashboard-edit dashboard-edit--profile dashboard-edit--sections",
        isModal && "dashboard-edit--full-editor-modal"
      )}
    >
      <div className="specialist-edit-profile__header">
        <div className="specialist-edit-profile__avatar-wrap">
          <button
            type="button"
            className="specialist-edit-profile__avatar-btn smoac-control"
            onClick={() => {
              startEdit("photos-links");
              const el = document.getElementById("photos-links");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            aria-label="Edit profile picture"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="specialist-edit-profile__avatar-img"
              />
            ) : (
              <span className="specialist-edit-profile__avatar-initials">
                {initials}
              </span>
            )}
            <span
              className="specialist-edit-profile__avatar-ring"
              aria-hidden
            />
          </button>
          <button
            type="button"
            className="specialist-edit-profile__photo-trigger smoac-control"
            onClick={() => {
              startEdit("photos-links");
              const el = document.getElementById("photos-links");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Edit pictures/slideshow
          </button>
        </div>

        <div className="specialist-edit-profile__title-bubble">
          {profilePlanLabel ? (
            <div className="ig-profile-edit__badge-wrap">
              <span
                className={cn(
                  "dashboard-role-badge",
                  (onProTrial || isPremium) && "dashboard-role-badge--pro-trial"
                )}
              >
                {profilePlanLabel}
              </span>
            </div>
          ) : (
            <div className="specialist-edit-profile__title-badge">
              <span className="specialist-edit-profile__title-dot" aria-hidden />
              <span>Profile</span>
            </div>
          )}
          <h1 className="specialist-edit-profile__title">Edit profile</h1>
          <p className="specialist-edit-profile__subtitle">
            {profileFirst
              ? "Update one section at a time — changes save to your profile draft."
              : "Tap a section to update. Saves go live on Marketplace instantly."}
          </p>
        </div>
      </div>

      {dashboardMode === "pending" || dashboardMode === "rejected" ? (
        <SpecialistPendingApprovalNotice
          variant={dashboardMode === "rejected" ? "rejected" : "pending"}
          rejectionReason={application?.rejectionReason}
          onRequestReview={
            dashboardMode === "rejected"
              ? async () => {
                  if (!application?.id) return;
                  setRequestReviewBusy(true);
                  setRequestReviewError(null);
                  try {
                    const result =
                      await resubmitSpecialistApplicationForReviewAsync(
                        application.id
                      );
                    if (!result.ok) {
                      setRequestReviewError(result.message);
                      return;
                    }
                    showToast({
                      type: "success",
                      message: "Back in review — we’ll look at your updates shortly.",
                    });
                  } finally {
                    setRequestReviewBusy(false);
                  }
                }
              : undefined
          }
          requestReviewBusy={requestReviewBusy}
          requestReviewError={requestReviewError}
        />
      ) : null}

      {dashboardMode === "pending" ? (
        <p className="specialist-dash-notice__text">
          If some information was entered incorrectly, it can be fixed once
          your application is approved.
        </p>
      ) : (
        <>
      <div className="dashboard-edit__summary">
        <p className="dashboard-edit__summary-label">Profile strength</p>
        <p className="dashboard-edit__summary-value">{completion}% complete</p>
        <p className="dashboard-edit__unsaved">
          Tap Edit on a section to make changes.
        </p>
      </div>

      <div className="dashboard-edit__sections">
          <ProfileEditSection
            {...sectionProps("basic-info")}
            title="Basic info"
            description="Name, headline, and contact details"
            incomplete={
              !savedForm.name.trim() ||
              !savedForm.title.trim() ||
              (!savedForm.phone.trim() && !savedForm.email.trim())
            }
            viewContent={
              <>
                <ProfileEditViewField label="Full name" value={savedForm.name} />
                <ProfileEditViewField label="Headline" value={savedForm.title} />
                <ProfileEditViewField
                  label="Gender"
                  value={genderLabel(savedForm.gender)}
                />
                <ProfileEditViewField label="Phone" value={savedForm.phone} />
                <ProfileEditViewField label="Email" value={savedForm.email} />
              </>
            }
            editContent={
              <div className="dashboard-edit-fields">
                <ProfileEditInputField label="Full name">
                  <input
                    className="login-field__input profile-edit-input"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    required
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Headline">
                  <input
                    className="login-field__input profile-edit-input"
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    required
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Gender">
                  <select
                    className="login-field__input dashboard-edit-select profile-edit-input"
                    value={form.gender}
                    required
                    onChange={(event) =>
                      updateField("gender", parseGender(event.target.value))
                    }
                  >
                    <option value="">Select</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </ProfileEditInputField>
                <ProfileEditInputField label="Phone">
                  <input
                    className="login-field__input profile-edit-input"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    autoComplete="tel"
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Email">
                  <input
                    className="login-field__input profile-edit-input"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    autoComplete="email"
                  />
                </ProfileEditInputField>
              </div>
            }
          />

          <ProfileEditSection
            {...sectionProps("profile-style")}
            title="Profile style"
            description="Accent color, avatar frame, and name font"
            incomplete={false}
            viewContent={
              <>
                <ProfileEditViewField
                  label="Accent"
                  value={profileStyleAccentLabel(savedForm.profileAccent)}
                />
                <ProfileEditViewField
                  label="Avatar frame"
                  value={profileStyleFrameLabel(savedForm.profileAvatarFrame)}
                />
                <ProfileEditViewField
                  label="Name font"
                  value={profileStyleFontLabel(savedForm.profileNameFont)}
                />
              </>
            }
            editContent={
              <div className="dashboard-edit-fields">
                <ProfileEditInputField label="Accent color">
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
                          updateField(
                            "profileAccent",
                            option.id as ProfileAccentId
                          )
                        }
                      >
                        <span
                          className="profile-style-swatch__dot"
                          style={{ background: option.swatch }}
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
                </ProfileEditInputField>
                <ProfileEditInputField label="Avatar frame">
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
                          updateField(
                            "profileAvatarFrame",
                            option.id as ProfileAvatarFrameId
                          )
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </ProfileEditInputField>
                <ProfileEditInputField label="Name font">
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
                          updateField(
                            "profileNameFont",
                            option.id as ProfileNameFontId
                          )
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </ProfileEditInputField>
              </div>
            }
          />

          <ProfileEditSection
            {...sectionProps("bio")}
            title="Bio / about"
            description="Your story and approach"
            incomplete={!savedForm.bio.trim() || savedForm.bio.trim().length < 40}
            viewContent={
              <ProfileEditViewField
                label="Bio"
                value={savedForm.bio}
                emptyLabel="Add bio"
                multiline
              />
            }
            editContent={
              <ProfileEditInputField label="Bio">
                <textarea
                  className="login-field__input dashboard-edit-textarea profile-edit-input"
                  rows={6}
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                />
              </ProfileEditInputField>
            }
          />

          <ProfileEditSection
            {...sectionProps("experience")}
            title="Experience & training"
            description="Credentials clients trust"
            incomplete={
              savedForm.pricePerSession <= 0 ||
              !savedForm.bookingAvailability.trim() ||
              !savedForm.experienceYears.trim()
            }
            viewContent={
              <>
                <ProfileEditViewField
                  label="Years of experience"
                  value={savedForm.experienceYears}
                  emptyLabel="Add experience"
                />
                <ProfileEditViewField
                  label="Training style"
                  value={savedForm.trainingStyle}
                  emptyLabel="Add coaching philosophy"
                  multiline
                />
                <ProfileEditViewField
                  label="Services offered"
                  value={savedForm.servicesOffered}
                  emptyLabel="Add ideal clients or services"
                  multiline
                />
              </>
            }
            editContent={
              <div className="dashboard-edit-fields">
                <ProfileEditInputField label="Years of experience">
                  <input
                    className="login-field__input profile-edit-input"
                    value={form.experienceYears}
                    onChange={(event) =>
                      updateField("experienceYears", event.target.value)
                    }
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Training style">
                  <textarea
                    className="login-field__input dashboard-edit-textarea profile-edit-input"
                    rows={4}
                    value={form.trainingStyle}
                    onChange={(event) =>
                      updateField("trainingStyle", event.target.value)
                    }
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Services offered">
                  <textarea
                    className="login-field__input dashboard-edit-textarea profile-edit-input"
                    rows={4}
                    value={form.servicesOffered}
                    onChange={(event) =>
                      updateField("servicesOffered", event.target.value)
                    }
                  />
                </ProfileEditInputField>
              </div>
            }
          />

          <ProfileEditSection
            {...sectionProps("professional-role")}
            title="Professional role"
            description="Your main profession category"
            incomplete={
              !savedForm.profession.trim() ||
              !savedForm.trainingStyle.trim() ||
              !savedForm.servicesOffered.trim()
            }
            viewContent={
              <ProfileEditViewField
                label="Profession"
                value={savedForm.profession}
                emptyLabel="Add profession"
              />
            }
            editContent={
              <ProfileEditInputField label="Profession">
                <select
                  className="login-field__input dashboard-edit-select profile-edit-input"
                  value={form.profession}
                  onChange={(event) => updateField("profession", event.target.value)}
                >
                  {MAIN_PROFESSION_CATEGORIES.map((profession) => (
                    <option key={profession} value={profession}>
                      {profession}
                    </option>
                  ))}
                </select>
              </ProfileEditInputField>
            }
          />

          <ProfileEditSection
            {...sectionProps("specialties")}
            title="Specialties"
            description="Tags on cards and filters"
            incomplete={savedForm.specialty.length === 0}
            viewContent={
              <>
                {savedForm.specialty.length > 0 ? (
                  <div className="dashboard-edit-chip-grid profile-edit-chip-grid--view">
                    {savedForm.specialty.map((specialty) => (
                      <span
                        key={specialty}
                        className="dashboard-edit-chip dashboard-edit-chip--active"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                ) : (
                  <ProfileEditViewField
                    label="Specialties"
                    value=""
                    emptyLabel="Add specialties"
                  />
                )}
                <div className="profile-edit-homepage-specialties">
                  <p className="profile-edit-field__label">
                    Homepage Featured Specialties
                  </p>
                  <p className="profile-edit-homepage-specialties__help">
                    These two specialties will appear on your homepage card.
                    Your full list of specialties will still be displayed on
                    your detailed profile.
                  </p>
                  {savedForm.homepageSpecialties.length > 0 ? (
                    <div className="dashboard-edit-chip-grid profile-edit-chip-grid--view">
                      {savedForm.homepageSpecialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="dashboard-edit-chip dashboard-edit-chip--active"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-edit-field__value profile-edit-field__value--empty">
                      Using first two specialties by default
                    </p>
                  )}
                </div>
              </>
            }
            editContent={
              <>
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
                        onClick={() => toggleSpecialty(specialty)}
                        aria-pressed={active}
                      >
                        {specialty}
                      </button>
                    );
                  })}
                </div>
                <div className="profile-edit-homepage-specialties">
                  <p className="profile-edit-field__label">
                    Homepage Featured Specialties
                  </p>
                  <p className="profile-edit-homepage-specialties__help">
                    These two specialties will appear on your homepage card.
                    Your full list of specialties will still be displayed on
                    your detailed profile.
                  </p>
                  {form.specialty.length > 0 ? (
                    <div className="dashboard-edit-chip-grid">
                      {form.specialty.map((specialty) => {
                        const featured =
                          form.homepageSpecialties.includes(specialty);
                        const atLimit =
                          form.homepageSpecialties.length >= 2 && !featured;
                        return (
                          <button
                            key={`home-${specialty}`}
                            type="button"
                            className={
                              featured
                                ? "dashboard-edit-chip dashboard-edit-chip--active"
                                : "dashboard-edit-chip"
                            }
                            onClick={() => toggleHomepageSpecialty(specialty)}
                            aria-pressed={featured}
                            disabled={atLimit}
                            title={
                              atLimit
                                ? "Remove one featured specialty to choose another"
                                : undefined
                            }
                          >
                            {specialty}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="profile-edit-field__value profile-edit-field__value--empty">
                      Select specialties above first
                    </p>
                  )}
                </div>
              </>
            }
          />

          <ProfileEditSection
            {...sectionProps("service-area")}
            title="Service area"
            description="Where you train and neighborhoods you serve"
            incomplete={
              !savedForm.city.trim() &&
              !savedForm.zipCode.trim() &&
              !savedForm.workAddress.trim()
            }
            viewContent={
              <>
                <ProfileEditViewField
                  label="Exact location"
                  value={
                    savedForm.locationPrecision === "address" &&
                    savedForm.workAddress.trim()
                      ? "Pinned for precise distance"
                      : "Using ZIP only"
                  }
                />
                <ProfileEditViewField label="City" value={savedForm.city} />
                <ProfileEditViewField
                  label="Primary neighborhood"
                  value={savedForm.neighborhood}
                />
                <ProfileEditViewField
                  label="ZIP code"
                  value={savedForm.zipCode}
                  emptyLabel="Add ZIP code"
                />
                <ProfileEditViewField
                  label="Session format"
                  value={
                    SPECIALIST_SERVICE_TYPE_OPTIONS.find(
                      (option) => option.value === savedForm.serviceType
                    )?.label ?? savedForm.serviceType
                  }
                />
                <ProfileEditViewField
                  label="Training options"
                  value={formatTrainingOptionsLabel(savedForm.trainingOptions)}
                  emptyLabel="Add training options"
                />
                <ProfileEditViewField
                  label="Willing to travel to clients"
                  value={formatTravelToClientsEditorLabel(
                    savedForm.travelToClients
                  )}
                  emptyLabel="Add"
                />
                <ProfileEditViewField
                  label="Additional areas served"
                  value={savedForm.serviceArea.join(", ")}
                  emptyLabel="Add neighborhoods"
                />
                <ProfileEditViewField
                  label="Price per session"
                  value={
                    savedForm.pricePerSession > 0
                      ? `$${savedForm.pricePerSession}`
                      : ""
                  }
                  emptyLabel="Add pricing"
                />
                <ProfileEditViewField
                  label="Availability"
                  value={savedForm.bookingAvailability}
                  emptyLabel="Add booking link or availability"
                />
              </>
            }
            editContent={
              <div className="dashboard-edit-fields">
                {form.serviceType === "in-person" ||
                form.serviceType === "both" ? (
                  <SpecialistPreciseLocationField
                    workAddress={form.workAddress}
                    locationPrecision={form.locationPrecision}
                    onDraftChange={(workAddress) =>
                      setSectionDraft((prev) =>
                        prev ? { ...prev, workAddress } : prev
                      )
                    }
                    onResolved={(value) =>
                      setSectionDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              workAddress: value.workAddress,
                              locationPrecision: "address",
                              latitude: value.latitude,
                              longitude: value.longitude,
                              ...(value.zipCode
                                ? { zipCode: value.zipCode }
                                : {}),
                              ...(value.city ? { city: value.city } : {}),
                            }
                          : prev
                      )
                    }
                    onCleared={() => {
                      void (async () => {
                        const zip = normalizeZipCode(form.zipCode);
                        const result = isValidZipCode(zip)
                          ? await lookupZipPlace(zip)
                          : null;
                        setSectionDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                workAddress: "",
                                locationPrecision: "zip",
                                latitude: result?.latitude ?? null,
                                longitude: result?.longitude ?? null,
                                ...(result?.city
                                  ? { city: result.city }
                                  : {}),
                              }
                            : prev
                        );
                      })();
                    }}
                  />
                ) : (
                  <p className="wizard-field-hint">
                    Virtual coaches use specialty matching — no street address
                    needed. Existing profiles keep ZIP-based distance until
                    updated.
                  </p>
                )}
                <ProfileEditInputField label="City">
                  <input
                    className="login-field__input profile-edit-input"
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Primary neighborhood">
                  <input
                    className="login-field__input profile-edit-input"
                    value={form.neighborhood}
                    onChange={(event) =>
                      updateField("neighborhood", event.target.value)
                    }
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="ZIP code">
                  <input
                    className="login-field__input profile-edit-input"
                    value={form.zipCode}
                    onChange={(event) =>
                      updateField("zipCode", event.target.value)
                    }
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Session format">
                  <select
                    className="login-field__input profile-edit-input"
                    value={form.serviceType}
                    onChange={(event) => {
                      const next = event.target
                        .value as SpecialistServiceType;
                      if (next === "virtual") {
                        setSectionDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                serviceType: next,
                                workAddress: "",
                                locationPrecision: "zip",
                              }
                            : prev
                        );
                        return;
                      }
                      updateField("serviceType", next);
                    }}
                  >
                    {SPECIALIST_SERVICE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </ProfileEditInputField>
                <SpecialistTrainingOptionsFields
                  value={form.trainingOptions}
                  onChange={(trainingOptions) =>
                    updateField("trainingOptions", trainingOptions)
                  }
                />
                <ProfileEditInputField label="Are you willing to travel to clients?">
                  <select
                    className="login-field__input profile-edit-input"
                    value={form.travelToClients}
                    onChange={(event) =>
                      updateField(
                        "travelToClients",
                        parseTravelToClients(event.target.value)
                      )
                    }
                  >
                    <option value="">Select</option>
                    {TRAVEL_TO_CLIENTS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </ProfileEditInputField>
                <ProfileEditInputField
                  label="Additional areas served"
                  hint="Separate neighborhoods with commas."
                >
                  <input
                    className="login-field__input profile-edit-input"
                    value={form.serviceArea.join(", ")}
                    onChange={(event) =>
                      updateField(
                        "serviceArea",
                        event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Price per session (USD)">
                  <input
                    className="login-field__input profile-edit-input"
                    type="number"
                    min={1}
                    step={1}
                    value={form.pricePerSession}
                    onChange={(event) =>
                      updateField("pricePerSession", Number(event.target.value) || 0)
                    }
                  />
                </ProfileEditInputField>
                <ProfileEditInputField label="Availability & session types">
                  <input
                    className="login-field__input profile-edit-input"
                    value={form.bookingAvailability}
                    onChange={(event) =>
                      updateField("bookingAvailability", event.target.value)
                    }
                  />
                </ProfileEditInputField>
              </div>
            }
          />

          <ProfileEditSection
            {...sectionProps("credentials")}
            title="Credentials"
            description="Licenses and certifications"
            incomplete={
              !savedForm.certifications.some(
                (cert) => cert && cert.name.trim().length > 0
              )
            }
            viewContent={
              savedForm.certifications.some((cert) => cert.name.trim()) ? (
                <ul className="profile-edit-credential-list">
                  {savedForm.certifications
                    .filter((cert) => cert.name.trim())
                    .map((cert) => (
                      <li key={`${cert.name}-${cert.issuer}-${cert.year}`}>
                        <span className="profile-edit-credential-list__name">
                          {cert.name}
                        </span>
                        <span className="profile-edit-credential-list__meta">
                          {[cert.issuer, cert.year].filter(Boolean).join(" · ")}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <ProfileEditViewField
                  label="Credentials"
                  value=""
                  emptyLabel="Add credentials"
                />
              )
            }
            editContent={
              <div className="dashboard-edit-stack">
                {form.certifications.map((cert, index) => (
                  <div key={`cert-${index}`} className="dashboard-edit-cert">
                    <CertFields cert={cert} index={index} updateCert={updateCert} />
                    {form.certifications.length > 1 ? (
                      <button
                        type="button"
                        className="dashboard-edit-remove"
                        onClick={() => removeCertification(index)}
                      >
                        Remove credential
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  className="dashboard-edit-add"
                  onClick={addCertification}
                >
                  + Add credential
                </button>
              </div>
            }
          />

          <ProfileEditSection
            {...sectionProps("photos-links")}
            title="Photos & links"
            description="Profile photo, header slideshow, pins, and social"
            incomplete={!savedForm.profilePhotoUrl.trim()}
            viewContent={
              <>
                <ProfileEditViewField
                  label="Profile photo"
                  value={savedForm.profilePhotoUrl ? "Uploaded" : ""}
                  emptyLabel="Add profile photo"
                />
                <ProfileEditViewField
                  label="Header photos"
                  value={
                    savedForm.photoNotes.trim()
                      ? `${savedForm.photoNotes
                          .split("\n")
                          .filter(Boolean).length} photo(s)`
                      : ""
                  }
                  emptyLabel="Add header photos"
                />
                <ProfileEditViewField
                  label="Pinned"
                  value={
                    savedForm.pinnedPhotos.length
                      ? `${savedForm.pinnedPhotos.length} pinned`
                      : ""
                  }
                  emptyLabel={isPremium ? "Pin from header photos" : "Pro"}
                />
                <ProfileEditViewField
                  label="Transformations"
                  value={
                    savedForm.transformationNotes.trim()
                      ? `${savedForm.transformationNotes
                          .split("\n")
                          .filter(Boolean).length} photo(s)`
                      : ""
                  }
                  emptyLabel={isProPlus ? "Add under pinned photos" : "Pro Plus"}
                />
                <ProfileEditViewField label="Instagram" value={savedForm.instagram} />
                <ProfileEditViewField label="TikTok" value={savedForm.tiktok} />
                <ProfileEditViewField label="Website" value={savedForm.website} />
              </>
            }
            editContent={
              <>
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
                    setSectionDraft((prev) =>
                      prev ? { ...prev, ...next } : prev
                    );
                  }}
                />
                <div className="dashboard-edit-fields">
                  <ProfileEditInputField label="Instagram">
                    <input
                      className="login-field__input profile-edit-input"
                      value={form.instagram}
                      onChange={(event) =>
                        updateField("instagram", event.target.value)
                      }
                    />
                  </ProfileEditInputField>
                  <ProfileEditInputField label="TikTok">
                    <input
                      className="login-field__input profile-edit-input"
                      value={form.tiktok}
                      onChange={(event) => updateField("tiktok", event.target.value)}
                    />
                  </ProfileEditInputField>
                  <ProfileEditInputField label="Website">
                    <input
                      className="login-field__input profile-edit-input"
                      value={form.website}
                      onChange={(event) => updateField("website", event.target.value)}
                    />
                  </ProfileEditInputField>
                </div>
              </>
            }
          />
        </div>
        </>
      )}
    </div>
  );

  if (isModal) {
    if (!modalMounted || typeof document === "undefined") return null;
    return createPortal(
      <div
        className="specialist-full-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="specialist-full-editor-title"
      >
        <button
          type="button"
          className="specialist-full-editor__backdrop"
          aria-label="Close full editor"
          disabled={saving}
          onClick={onRequestClose}
        />
        <div className="specialist-full-editor__panel">
          <header className="specialist-full-editor__head">
            <div className="specialist-full-editor__head-row">
              <button
                type="button"
                className="specialist-full-editor__exit"
                onClick={onRequestClose}
                disabled={saving}
              >
                ← Exit full editor
              </button>
              <button
                type="button"
                className="specialist-full-editor__close"
                onClick={onRequestClose}
                aria-label="Close full editor"
                disabled={saving}
              >
                <span className="specialist-full-editor__close-x" aria-hidden>
                  ×
                </span>
              </button>
            </div>
            <h2
              id="specialist-full-editor-title"
              className="specialist-full-editor__title"
            >
              Full profile editor
            </h2>
            <p className="specialist-full-editor__sub">
              Pricing, photos, credentials, and more. Exit anytime to return to
              your live profile.
            </p>
          </header>
          <div className="specialist-full-editor__body">{editorBody}</div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <DashboardPageShell
      variant="specialist"
      hideHeader
      utilityBar={
        <div className="specialist-edit-profile__utility-bar">
          <Link
            href="/specialist-dashboard"
            className="specialist-edit-profile__back-link smoac-control"
          >
            <span className="specialist-edit-profile__back-arrow" aria-hidden>
              ←
            </span>
            <span>Dashboard</span>
          </Link>
          <div className="specialist-edit-profile__utility-end">
            <SpecialistDashboardAccountMenu onSignOut={handleSignOut} />
          </div>
        </div>
      }
    >
      {editorBody}
    </DashboardPageShell>
  );
}

function CertFields({
  cert,
  index,
  updateCert,
}: {
  cert: Certification;
  index: number;
  updateCert: (index: number, patch: Partial<Certification>) => void;
}) {
  return (
    <div className="dashboard-edit-fields dashboard-edit-fields--3">
      <ProfileEditInputField label="Credential">
        <input
          className="login-field__input profile-edit-input"
          value={cert.name}
          onChange={(event) => updateCert(index, { name: event.target.value })}
        />
      </ProfileEditInputField>
      <ProfileEditInputField label="Issuer">
        <input
          className="login-field__input profile-edit-input"
          value={cert.issuer}
          onChange={(event) => updateCert(index, { issuer: event.target.value })}
        />
      </ProfileEditInputField>
      <ProfileEditInputField label="Year">
        <input
          className="login-field__input profile-edit-input"
          type="number"
          min={1970}
          max={2100}
          value={cert.year}
          onChange={(event) =>
            updateCert(index, {
              year: Number(event.target.value) || new Date().getFullYear(),
            })
          }
        />
      </ProfileEditInputField>
    </div>
  );
}
