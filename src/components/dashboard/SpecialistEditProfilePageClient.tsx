"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import {
  DashboardPageShell,
  DashboardLoadingState,
  SmoacProUpgradeModal,
  DashboardSignOutConfirmModal,
} from "@/components/dashboard/shared";
import { SpecialistDashboardAccountMenu } from "@/components/dashboard/specialist/SpecialistDashboardAccountMenu";
import {
  ProfileEditChipGroup,
  ProfileEditInputField,
  ProfileEditSection,
  ProfileEditViewField,
} from "@/components/dashboard/specialist/ProfileEditSection";
import { SpecialistProfileMediaEditor } from "@/components/dashboard/specialist/SpecialistProfileMediaEditor";
import { SpecialistTransformationsEditor } from "@/components/dashboard/specialist/SpecialistTransformationsEditor";
import { SpecialistVideosEditor } from "@/components/dashboard/specialist/SpecialistVideosEditor";
import { ProfileMediaUploadField } from "@/components/dashboard/specialist/ProfileMediaUploadField";
import { SpecialistPendingApprovalNotice } from "@/components/dashboard/specialist/SpecialistPendingApprovalNotice";
import { SpecialistWorkSpotFields } from "@/components/dashboard/specialist/SpecialistWorkSpotFields";
import { PageWaitState } from "@/components/brand/PageWaitState";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useProfileKeyboardChrome } from "@/hooks/useProfileKeyboardChrome";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { SPECIALIST_ONBOARDING_RESUME_HREF } from "@/lib/join-flow";
import { resubmitSpecialistApplicationForReviewAsync } from "@/lib/admin-applications-service";
import {
  EMPTY_CERTIFICATION,
  cloneSpecialistProfileEditForm,
  computeProfileCompletion,
  overlayProfileSectionDraft,
} from "@/lib/specialist-profile-overrides";
import {
  resolveSpecialistDashboardMode,
  showsProfileFirstDashboard,
} from "@/lib/specialist-dashboard-mode";
import { getSpecialistSubscriptionForSession } from "@/lib/specialist-dashboard-subscription";
import {
  formatProTrialBadgeLabel,
  isProPlusPlan,
  isTrainerProPlus,
  membershipBadgeToneForSession,
  membershipRoleBadgeClassName,
  SMOAC_FREE_PLAN_LABEL,
} from "@/lib/specialist-premium";
import { membershipPlanLabel } from "@/lib/stripe/products";
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
import { SpecialistPricingFields } from "@/components/dashboard/specialist/SpecialistPricingOfferingsFields";
import { MarketplaceSpecialtyPicker } from "@/components/auth/specialist/MarketplaceSpecialtyPicker";
import { SpecialistRightFitFields } from "@/components/dashboard/specialist/SpecialistRightFitFields";
import { formatTravelToClientsEditorLabel } from "@/lib/specialist-service-area";
import {
  applyPrimaryWorkSpot,
  applySecondaryWorkSpot,
  clearSecondaryWorkSpot,
  formatWorkSpotPlaceLine,
  hasWorkSpotContent,
  primaryWorkSpotFromForm,
  secondaryWorkSpotFromForm,
} from "@/lib/specialist-work-spots";
import { sanitizeHomepageSpecialties } from "@/lib/specialty-display";
import {
  PROFILE_ACCENT_OPTIONS,
  profileStyleAccentLabel,
  type ProfileAccentId,
} from "@/lib/specialist-profile-style";
import { cn, getInitials } from "@/lib/utils";
import {
  formatSessionPriceRange,
  hasSessionPrice,
  resolveTrainerSessionPriceRange,
} from "@/lib/session-price";
import {
  formatOfferingsPreview,
  INQUIRE_FOR_PRICING_DETAILS,
} from "@/lib/specialist-pricing";
import {
  COACHING_STYLE_OPTIONS,
  formatCoachingStyleSelection,
  GENDER_OPTIONS,
  parseCoachingStyleSelection,
} from "@/constants/specialist-onboarding-options";
import { parseGender } from "@/lib/gender";
import { canonicalizeProfessionLabel } from "@/lib/profession-category";
import { FREE_FIRST_SESSION_LABEL, trainerOffersFreeFirstSession } from "@/lib/free-first-session";
import { RIGHT_FIT_SECTION_TITLE } from "@/lib/specialist-right-fit";

type SectionId =
  | "basic-info"
  | "profile-style"
  | "bio"
  | "ideal-clients"
  | "philosophy"
  | "professional-role"
  | "specialties"
  | "service-area"
  | "session-experience"
  | "pricing"
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady, session } = useRequireAuth("specialist");
  const { signOut } = useAuthSession();
  const { showToast } = useToast();
  const { formDefaults, saveForm, application, trainer, trainerId, isHydrated } =
    useManagedSpecialistProfile();

  const [editingSection, setEditingSection] = useState<SectionId | null>(null);
  const [sectionDraft, setSectionDraft] = useState<SpecialistProfileEditForm | null>(
    null
  );
  const [secondLocationOpen, setSecondLocationOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);
  const [requestReviewBusy, setRequestReviewBusy] = useState(false);
  const [requestReviewError, setRequestReviewError] = useState<string | null>(
    null
  );
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
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
  const selectedProfession = form
    ? canonicalizeProfessionLabel(form.profession)
    : null;

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

  useEffect(() => {
    if (!isReady || !session || !isHydrated) return;
    if (dashboardMode !== "onboarding") return;
    router.replace(SPECIALIST_ONBOARDING_RESUME_HREF);
  }, [isReady, session, isHydrated, dashboardMode, router]);

  const isPremium = Boolean(session?.isPremium);
  const isProPlus =
    isProPlusPlan(session?.membershipPlan) || isTrainerProPlus(trainer ?? {});
  const onProTrial = Boolean(session?.premiumTrialActive);
  const profileFirst = showsProfileFirstDashboard(dashboardMode);
  const profilePlanLabel = onProTrial
    ? formatProTrialBadgeLabel(session?.premiumTrialDaysRemaining)
    : isProPlus
      ? membershipPlanLabel("platinum")
      : isPremium
        ? membershipPlanLabel("premium")
        : SMOAC_FREE_PLAN_LABEL;
  const planBadgeTone = membershipBadgeToneForSession(session);

  const handleSignOut = useCallback(() => {
    void signOut().then(() => {
      afterLogoutNavigation("/profile");
    });
  }, [signOut]);

  function startEdit(sectionId: SectionId) {
    if (dashboardMode === "pending" || dashboardMode === "onboarding") return;
    if (!savedForm) return;
    if (editingSection != null && editingSection !== sectionId) {
      showToast({
        type: "info",
        message: "Save or cancel the current section before editing another.",
      });
      return;
    }
    setEditingSection(sectionId);
    setSecondLocationOpen(false);
    const next = cloneSpecialistProfileEditForm(savedForm);
    if (sectionId === "philosophy") {
      next.trainingStyle = formatCoachingStyleSelection(
        parseCoachingStyleSelection(next.trainingStyle)
      );
    }
    if (sectionId === "professional-role") {
      next.profession =
        canonicalizeProfessionLabel(next.profession) ?? next.profession;
    }
    setSectionDraft(next);
  }

  function cancelEdit() {
    setEditingSection(null);
    setSectionDraft(null);
    setSecondLocationOpen(false);
  }

  function updateField<K extends keyof SpecialistProfileEditForm>(
    key: K,
    value: SpecialistProfileEditForm[K]
  ) {
    setSectionDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
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
    if (!draft || !trainerId || !savedForm || !editingSection) return;
    if (application?.profileStatus === "PENDING_APPROVAL") return;
    setSaving(true);
    const payload = overlayProfileSectionDraft(savedForm, draft, editingSection);
    const result = await saveForm(payload);
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
            <div className="specialist-full-editor__loading">
              <PageWaitState
                label="Loading profile editor"
                compact
                className="page-wait-state--embedded"
              />
            </div>
          </div>
        </div>,
        document.body
      );
    }
    return <DashboardLoadingState message="Loading profile editor" />;
  }

  if (dashboardMode === "onboarding") {
    if (isModal) {
      if (!modalMounted || typeof document === "undefined") return null;
      return createPortal(
        <div className="specialist-full-editor" role="presentation">
          <div className="specialist-full-editor__panel">
            <div className="specialist-full-editor__loading">
              <PageWaitState
                label="Opening your application"
                compact
                className="page-wait-state--embedded"
              />
            </div>
          </div>
        </div>,
        document.body
      );
    }
    return <DashboardLoadingState message="Opening your application" />;
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
              <span className={membershipRoleBadgeClassName(planBadgeTone)}>
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
                <ProfileEditChipGroup
                  label="Gender"
                  options={GENDER_OPTIONS}
                  selected={form.gender ? [form.gender] : []}
                  onChange={(next) =>
                    updateField("gender", parseGender(next[0] ?? ""))
                  }
                />
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
            title="Ambience glow"
            description="Color that tints your public profile"
            incomplete={false}
            viewContent={
              <ProfileEditViewField
                label="Ambience glow"
                value={profileStyleAccentLabel(savedForm.profileAccent)}
              />
            }
            editContent={
              <div className="dashboard-edit-fields">
                <ProfileEditInputField label="Ambience glow">
                  <div
                    className="profile-style-swatches"
                    role="radiogroup"
                    aria-label="Ambience glow"
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
            {...sectionProps("ideal-clients")}
            title={RIGHT_FIT_SECTION_TITLE}
            description="Help clients see if you are a good match"
            incomplete={!savedForm.servicesOffered.trim()}
            viewContent={
              <ProfileEditViewField
                label={RIGHT_FIT_SECTION_TITLE}
                value={savedForm.servicesOffered}
                emptyLabel="Add who you work best with"
                multiline
              />
            }
            editContent={
              <SpecialistRightFitFields
                value={form.servicesOffered}
                onChange={(next) => updateField("servicesOffered", next)}
              />
            }
          />

          <ProfileEditSection
            {...sectionProps("philosophy")}
            title="Coaching style"
            description="How you work with clients"
            incomplete={
              parseCoachingStyleSelection(savedForm.trainingStyle).length === 0
            }
            viewContent={
              <ProfileEditViewField
                label="Coaching style"
                value={formatCoachingStyleSelection(
                  parseCoachingStyleSelection(savedForm.trainingStyle)
                )}
                emptyLabel="Add coaching style"
              />
            }
            editContent={
              <ProfileEditChipGroup
                label="Coaching style"
                options={COACHING_STYLE_OPTIONS}
                selected={parseCoachingStyleSelection(form.trainingStyle)}
                onChange={(next) =>
                  updateField(
                    "trainingStyle",
                    formatCoachingStyleSelection(next)
                  )
                }
                multiple
                hint="Select every style that fits how you coach."
              />
            }
          />

          <ProfileEditSection
            {...sectionProps("professional-role")}
            title="Professional role"
            description="Your main profession category"
            incomplete={!canonicalizeProfessionLabel(savedForm.profession)}
            viewContent={
              <ProfileEditViewField
                label="Category"
                value={
                  canonicalizeProfessionLabel(savedForm.profession) ??
                  savedForm.profession
                }
                emptyLabel="Add category"
              />
            }
            editContent={
              <ProfileEditChipGroup
                label="Category"
                options={MAIN_PROFESSION_CATEGORIES}
                selected={selectedProfession ? [selectedProfession] : []}
                onChange={(next) => updateField("profession", next[0] ?? "")}
                hint="Choose one of the eleven marketplace categories."
              />
            }
          />

          <ProfileEditSection
            {...sectionProps("specialties")}
            title="Specialties"
            description="Tags on cards and filters"
            incomplete={savedForm.specialty.length === 0}
            viewContent={
              savedForm.specialty.length > 0 ? (
                <div className="dashboard-edit-chip-grid profile-edit-chip-grid--view">
                  {savedForm.specialty.map((specialty) => {
                    const onCard = sanitizeHomepageSpecialties(
                      savedForm.specialty,
                      savedForm.homepageSpecialties
                    ).includes(specialty);
                    return (
                      <span
                        key={specialty}
                        className={
                          onCard
                            ? "dashboard-edit-chip dashboard-edit-chip--active dashboard-edit-chip--card-featured"
                            : "dashboard-edit-chip dashboard-edit-chip--active"
                        }
                      >
                        {specialty}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <ProfileEditViewField
                  label="Specialties"
                  value=""
                  emptyLabel="Add specialties"
                />
              )
            }
            editContent={
              <MarketplaceSpecialtyPicker
                selected={form.specialty}
                homepageSpecialties={form.homepageSpecialties}
                onChange={({ specialty, homepageSpecialties }) =>
                  setSectionDraft((prev) =>
                    prev ? { ...prev, specialty, homepageSpecialties } : prev
                  )
                }
              />
            }
          />

          <ProfileEditSection
            {...sectionProps("service-area")}
            title="Service area"
            description="Where you work and neighborhoods you serve"
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
                {hasWorkSpotContent(secondaryWorkSpotFromForm(savedForm)) ? (
                  <ProfileEditViewField
                    label="Second facility (profile only)"
                    value={
                      formatWorkSpotPlaceLine(
                        secondaryWorkSpotFromForm(savedForm)
                      ) ||
                      (savedForm.locationPrecision2 === "address" &&
                      savedForm.workAddress2.trim()
                        ? savedForm.workAddress2
                        : "")
                    }
                    emptyLabel="Add"
                  />
                ) : null}
                <ProfileEditViewField
                  label="Session format"
                  value={
                    SPECIALIST_SERVICE_TYPE_OPTIONS.find(
                      (option) => option.value === savedForm.serviceType
                    )?.label ?? savedForm.serviceType
                  }
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
                  label={FREE_FIRST_SESSION_LABEL}
                  value={
                    trainerOffersFreeFirstSession(savedForm) ? "On" : "Off"
                  }
                />
                <ProfileEditViewField
                  label="Availability"
                  value={savedForm.bookingAvailability}
                  emptyLabel="Add booking link or availability"
                />
              </>
            }
            editContent={
              <div className="dashboard-edit-fields specialist-dash-profile__fields--service-area">
                {(() => {
                  const showAddress =
                    form.serviceType === "in-person" ||
                    form.serviceType === "both";
                  const secondary = secondaryWorkSpotFromForm(form);
                  const showSecond =
                    secondLocationOpen || hasWorkSpotContent(secondary);
                  return (
                    <>
                      <SpecialistWorkSpotFields
                        value={primaryWorkSpotFromForm(form)}
                        onChange={(spot) =>
                          setSectionDraft((prev) =>
                            prev ? applyPrimaryWorkSpot(prev, spot) : prev
                          )
                        }
                        showAddress={showAddress}
                        heading={showSecond ? "Primary facility" : undefined}
                        headingHint={
                          showSecond
                            ? "Maps and search use this pin only"
                            : undefined
                        }
                        virtualHint="Virtual coaches use specialty matching — no street address needed. Existing profiles keep ZIP-based distance until updated."
                      />
                      {showSecond ? (
                        <SpecialistWorkSpotFields
                          className="specialist-work-spot--secondary"
                          value={secondary}
                          onChange={(spot) =>
                            setSectionDraft((prev) =>
                              prev ? applySecondaryWorkSpot(prev, spot) : prev
                            )
                          }
                          showAddress={showAddress}
                          heading="Second facility"
                          headingHint="Shows on your profile — not a second map pin"
                          addressLabel="Second facility address"
                          addressHint="Clients see this on your profile. Explore still uses your primary location."
                          virtualHint="Virtual coaches don’t need a second street address."
                          onRemove={() => {
                            setSecondLocationOpen(false);
                            setSectionDraft((prev) =>
                              prev ? clearSecondaryWorkSpot(prev) : prev
                            );
                          }}
                        />
                      ) : showAddress ? (
                        <div className="specialist-service-area-add-wrap">
                          <button
                            type="button"
                            className="smoac-control specialist-service-area-add"
                            onClick={() => setSecondLocationOpen(true)}
                          >
                            + Add a second facility
                          </button>
                          <p className="specialist-service-area-add__hint">
                            Profile only — maps and search stay on your primary
                            location.
                          </p>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
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
                                workAddress2: "",
                                locationPrecision2: "zip",
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
                {isPremium ? (
                  <ProfileEditInputField
                    label={FREE_FIRST_SESSION_LABEL}
                    hint="Appear in the marketplace Try a Trainer for Free slider. Pro and PRO+ only."
                  >
                    <div
                      className="dashboard-edit-chip-grid"
                      role="group"
                      aria-label={FREE_FIRST_SESSION_LABEL}
                    >
                      <button
                        type="button"
                        className={
                          trainerOffersFreeFirstSession(form)
                            ? "dashboard-edit-chip dashboard-edit-chip--active"
                            : "dashboard-edit-chip"
                        }
                        aria-pressed={trainerOffersFreeFirstSession(form)}
                        onClick={() =>
                          updateField("offersFreeFirstSession", true)
                        }
                      >
                        On
                      </button>
                      <button
                        type="button"
                        className={
                          !trainerOffersFreeFirstSession(form)
                            ? "dashboard-edit-chip dashboard-edit-chip--active"
                            : "dashboard-edit-chip"
                        }
                        aria-pressed={!trainerOffersFreeFirstSession(form)}
                        onClick={() =>
                          updateField("offersFreeFirstSession", false)
                        }
                      >
                        Off
                      </button>
                    </div>
                  </ProfileEditInputField>
                ) : (
                  <p className="wizard-field-hint">
                    {FREE_FIRST_SESSION_LABEL} is a Pro perk.{" "}
                    <button
                      type="button"
                      className="smoac-control"
                      onClick={() => setUpgradeOpen(true)}
                    >
                      Upgrade to Pro
                    </button>{" "}
                    to appear on the marketplace slider.
                  </p>
                )}
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
            {...sectionProps("session-experience")}
            title="Training options"
            description="How you run sessions — same choices as onboarding"
            incomplete={savedForm.trainingOptions.length === 0}
            viewContent={
              <ProfileEditViewField
                label="Training options"
                value={formatTrainingOptionsLabel(savedForm.trainingOptions)}
                emptyLabel="Add training options"
              />
            }
            editContent={
              <SpecialistTrainingOptionsFields
                value={form.trainingOptions}
                onChange={(trainingOptions) =>
                  updateField("trainingOptions", trainingOptions)
                }
              />
            }
          />

          <ProfileEditSection
            {...sectionProps("pricing")}
            title="Pricing"
            description="Marketplace card range, plus Pricing & Packages on your Details tab"
            incomplete={
              !hasSessionPrice(
                resolveTrainerSessionPriceRange({
                  pricePerSession: savedForm.pricePerSession,
                  pricePerSessionMin: savedForm.pricePerSessionMin,
                  pricePerSessionMax: savedForm.pricePerSessionMax,
                })
              )
            }
            viewContent={
              <>
                <ProfileEditViewField
                  label="General pricing"
                  value={formatSessionPriceRange(
                    resolveTrainerSessionPriceRange({
                      pricePerSession: savedForm.pricePerSession,
                      pricePerSessionMin: savedForm.pricePerSessionMin,
                      pricePerSessionMax: savedForm.pricePerSessionMax,
                    })
                  )}
                  emptyLabel="Add card price"
                />
                <ProfileEditViewField
                  label="Pricing & Packages"
                  value={formatOfferingsPreview(savedForm.pricingOfferings)}
                  emptyLabel={INQUIRE_FOR_PRICING_DETAILS}
                />
              </>
            }
            editContent={
              <SpecialistPricingFields
                priceMin={
                  resolveTrainerSessionPriceRange({
                    pricePerSession: form.pricePerSession,
                    pricePerSessionMin: form.pricePerSessionMin,
                    pricePerSessionMax: form.pricePerSessionMax,
                  }).min
                }
                priceMax={
                  resolveTrainerSessionPriceRange({
                    pricePerSession: form.pricePerSession,
                    pricePerSessionMin: form.pricePerSessionMin,
                    pricePerSessionMax: form.pricePerSessionMax,
                  }).max
                }
                onRangeChange={(min, max) => {
                  setSectionDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          pricePerSessionMin: min,
                          pricePerSessionMax: max,
                          pricePerSession: max,
                        }
                      : prev
                  );
                }}
                offerings={form.pricingOfferings ?? []}
                onOfferingsChange={(pricingOfferings) =>
                  updateField("pricingOfferings", pricingOfferings)
                }
              />
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
                  emptyLabel="Pin from header photos"
                />
                <ProfileEditViewField
                  label="Videos"
                  value={
                    savedForm.videoNotes.trim()
                      ? `${savedForm.videoNotes
                          .split("\n")
                          .filter(Boolean).length} video(s)`
                      : ""
                  }
                  emptyLabel="Add profile videos"
                />
                <ProfileEditViewField
                  label="Client Results"
                  value={
                    savedForm.transformationNotes.trim()
                      ? `${savedForm.transformationNotes
                          .split("\n")
                          .filter(Boolean).length} photo(s)`
                      : ""
                  }
                  emptyLabel="Add under Specialties"
                />
                <ProfileEditViewField label="Instagram" value={savedForm.instagram} />
                <ProfileEditViewField label="TikTok" value={savedForm.tiktok} />
                <ProfileEditViewField label="Website" value={savedForm.website} />
              </>
            }
            editContent={
              <>
                <ProfileMediaUploadField
                  label="Profile photo"
                  value={form.profilePhotoUrl}
                  specialistId={trainerId}
                  onChange={(value) => updateField("profilePhotoUrl", value)}
                  onClear={() => updateField("profilePhotoUrl", "")}
                />
                <SpecialistProfileMediaEditor
                  coverImageUrl={form.coverImageUrl}
                  photoNotes={form.photoNotes}
                  slideshowFramesJson={form.slideshowFramesJson}
                  videoNotes={form.videoNotes}
                  videoPostersJson={form.videoPostersJson}
                  pinnedPhotos={form.pinnedPhotos}
                  isPremium={isPremium}
                  isProPlus={isProPlus}
                  specialistId={trainerId}
                  onUpgrade={() => setUpgradeOpen(true)}
                  onChange={(next) => {
                    setSectionDraft((prev) =>
                      prev ? { ...prev, ...next } : prev
                    );
                  }}
                />
                <SpecialistVideosEditor
                  videoNotes={form.videoNotes}
                  videoPostersJson={form.videoPostersJson}
                  pinnedPhotos={form.pinnedPhotos}
                  isPremium={isPremium}
                  isProPlus={isProPlus}
                  specialistId={trainerId}
                  onUpgrade={() => setUpgradeOpen(true)}
                  onChange={(next) => {
                    setSectionDraft((prev) =>
                      prev ? { ...prev, ...next } : prev
                    );
                  }}
                />
                <SpecialistTransformationsEditor
                  transformationNotes={form.transformationNotes}
                  isProPlus={isProPlus}
                  specialistId={trainerId}
                  onUpgrade={() => setUpgradeOpen(true)}
                  onChange={(transformationNotes) =>
                    updateField("transformationNotes", transformationNotes)
                  }
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
        <SmoacProUpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
        />
      </div>,
      document.body
    );
  }

  return (
    <>
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
            <SpecialistDashboardAccountMenu
              onSignOut={() => setSignOutConfirmOpen(true)}
            />
          </div>
        </div>
      }
    >
      {editorBody}
    </DashboardPageShell>
    <SmoacProUpgradeModal
      open={upgradeOpen}
      onClose={() => setUpgradeOpen(false)}
    />
    <DashboardSignOutConfirmModal
      open={signOutConfirmOpen}
      onClose={() => setSignOutConfirmOpen(false)}
      onConfirm={() => {
        setSignOutConfirmOpen(false);
        handleSignOut();
      }}
    />
    </>
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
