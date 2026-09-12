"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import { SpecialistIgStyleProfileEditor } from "@/components/dashboard/specialist/SpecialistIgStyleProfileEditor";
import { SpecialistInquiriesInbox } from "@/components/dashboard/specialist/SpecialistInquiriesInbox";
import { SpecialistProfileMediaEditor } from "@/components/dashboard/specialist/SpecialistProfileMediaEditor";
import { SpecialistTransformationsEditor } from "@/components/dashboard/specialist/SpecialistTransformationsEditor";
import { TrainerProfileView } from "@/components/profile/TrainerProfileView";
import { SpecialistTrainingOptionsFields } from "@/components/auth/specialist/SpecialistTrainingOptionsFields";
import { MarketplaceSpecialtyPicker } from "@/components/auth/specialist/MarketplaceSpecialtyPicker";
import { SpecialistWorkSpotFields } from "@/components/dashboard/specialist/SpecialistWorkSpotFields";
import { SpecialistRightFitFields } from "@/components/dashboard/specialist/SpecialistRightFitFields";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  ChevronLeftIcon,
  MenuIcon,
  MessageBubbleIcon,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import {
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
  overlayProfileSectionDraft,
} from "@/lib/specialist-profile-overrides";
import {
  applyPrimaryWorkSpot,
  applySecondaryWorkSpot,
  clearSecondaryWorkSpot,
  hasWorkSpotContent,
  primaryWorkSpotFromForm,
  secondaryWorkSpotFromForm,
} from "@/lib/specialist-work-spots";
import { cn } from "@/lib/utils";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { SpecialistServiceType } from "@/types/specialist-service-area";
import {
  parseTravelToClients,
  SPECIALIST_SERVICE_TYPE_OPTIONS,
  TRAVEL_TO_CLIENTS_OPTIONS,
} from "@/types/specialist-service-area";
import {
  COACHING_STYLE_OPTIONS,
  formatCoachingStyleSelection,
  GENDER_OPTIONS,
  parseCoachingStyleSelection,
} from "@/constants/specialist-onboarding-options";
import { parseGender } from "@/lib/gender";
import { canonicalizeProfessionLabel } from "@/lib/profession-category";
import { ProfileEditChipGroup } from "@/components/dashboard/specialist/ProfileEditSection";
import { FREE_FIRST_SESSION_LABEL, isTrainerFreeFirstSessionEligible } from "@/lib/free-first-session";
import type { Trainer } from "@/types/trainer";
import type { TrainerCityRanking } from "@/data/city-rankings";
import type { SpecialistLead } from "@/types/specialist-dashboard";
import { SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { parseMembershipPlan } from "@/lib/specialist-premium";
import { getApprovedSpecialistProfileById } from "@/lib/approved-specialist-profiles-store";
import { overlayGoogleSocialIfMissing } from "@/lib/google-reviews-display";

type ProfilePreviewMode = "edit" | "live" | "inquiries";
const LOCK_CLASS = "specialist-live-edit-open";
const EDIT_PAGE_LOCK_CLASS = "specialist-edit-profile-open";
const LIVE_PROFILE_ANCHOR_ID = "specialist-live-profile";

function previewModeFromSearch(
  viewParam: string,
  conversationParam: string
): ProfilePreviewMode {
  if (conversationParam || viewParam === "inquiries") return "inquiries";
  if (viewParam === "edit") return "edit";
  return "live";
}

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
  | "free-first-session"
  | "contact"
  | "gender"
  | "experience"
  | "profile-style";

const SECTION_TITLES: Record<SectionId, string> = {
  hero: "Pictures / slideshow",
  name: "Business name",
  headline: "Headline",
  profession: "Category",
  transformations: "Client transformations",
  specialties: "Specialties",
  bio: "Bio",
  philosophy: "Coaching style",
  "ideal-clients": "Are we the right fit?",
  "service-area": "Service area & location",
  "session-experience": "Training options",
  credentials: "Credentials",
  social: "Connect",
  pricing: "Pricing",
  "free-first-session": FREE_FIRST_SESSION_LABEL,
  contact: "Contact",
  gender: "Gender",
  experience: "Experience",
  "profile-style": "Profile style",
};

interface SpecialistDashboardProfilePreviewProps {
  trainer: Trainer;
  editable?: boolean;
  isPremium?: boolean;
  isProPlus?: boolean;
  isLivePublished?: boolean;
  focusSection?: string | null;
  onClearFocus?: () => void;
  onUpgrade?: () => void;
  onSignOut?: () => void;
  cityRanking?: TrainerCityRanking | null;
  inquiryLeads?: SpecialistLead[];
  inquirySenderUserId?: string;
  inquiryUnreadCount?: number;
  initialConversationId?: string | null;
  onOpenInquiryLead?: (lead: SpecialistLead) => void;
  onCloseInquiryThread?: () => void;
  onHideInquiryLead?: (id: string) => void | Promise<void>;
  onMarkInquiryLeadsRead?: (ids: string[]) => void | Promise<void>;
  onMarkInquiryLeadsUnread?: (ids: string[]) => void | Promise<void>;
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
    case "free-first-session":
    case "free-first":
    case "first-session":
      return "free-first-session";
    case "bio":
    case "about":
      return "bio";
    case "booking":
    case "session-experience":
    case "experience-booking":
    case "training-options":
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
      return "specialties";
    default:
      return null;
  }
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
  const pickerGuardUntilRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.classList.add(LOCK_CLASS);
    document.documentElement.classList.add(LOCK_CLASS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving) return;
      if (document.querySelector(".profile-photo-cropper")) return;
      onClose();
    };
    const armPickerGuard = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === "file") {
        const isVideo =
          (target.accept || "").includes("video") ||
          (target.files?.[0]?.type || "").startsWith("video/");
        pickerGuardUntilRef.current = Date.now() + (isVideo ? 12000 : 1600);
      }
    };
    document.addEventListener("change", armPickerGuard, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove(LOCK_CLASS);
      document.documentElement.classList.remove(LOCK_CLASS);
      document.removeEventListener("change", armPickerGuard, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, saving]);

  function requestClose() {
    if (saving) return;
    if (document.querySelector(".profile-photo-cropper")) return;
    if (Date.now() < pickerGuardUntilRef.current) return;
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="specialist-live-sheet" role="presentation">
      <button
        type="button"
        className="specialist-live-sheet__backdrop"
        aria-label="Close editor"
        disabled={saving}
        onPointerDown={(event) => {
          event.currentTarget.dataset.sheetBackdropArmed = "true";
        }}
        onClick={(event) => {
          /* Ignore ghost clicks after the iOS photo picker closes. */
          if (event.currentTarget.dataset.sheetBackdropArmed !== "true") return;
          delete event.currentTarget.dataset.sheetBackdropArmed;
          requestClose();
        }}
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
            onClick={requestClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function LiveProfileChrome({
  showInquiries,
  inquiryUnreadCount,
  onOpenInquiries,
  onOpenEdit,
}: {
  showInquiries: boolean;
  inquiryUnreadCount: number;
  onOpenInquiries: () => void;
  onOpenEdit: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="specialist-live-chrome">
      {showInquiries ? (
        <FastActivateButton
          className="smoac-control specialist-live-chrome__btn specialist-live-chrome__btn--messages"
          aria-label={
            inquiryUnreadCount > 0
              ? `Inquiries, ${inquiryUnreadCount} unread`
              : "Inquiries"
          }
          onActivate={onOpenInquiries}
        >
          <MessageBubbleIcon className="specialist-live-chrome__icon" />
          {inquiryUnreadCount > 0 ? (
            <span className="specialist-live-chrome__badge">
              {inquiryUnreadCount > 9 ? "9+" : inquiryUnreadCount}
            </span>
          ) : null}
        </FastActivateButton>
      ) : (
        <span className="specialist-live-chrome__spacer" aria-hidden />
      )}
      <p className="specialist-live-chrome__live" role="status">
        <span className="specialist-live-chrome__live-dot" aria-hidden />
        Live view
      </p>
      <FastActivateButton
        className="smoac-control specialist-live-chrome__btn specialist-live-chrome__btn--edit"
        aria-label="Edit profile"
        onActivate={onOpenEdit}
      >
        <MenuIcon className="specialist-live-chrome__icon" />
      </FastActivateButton>
    </div>,
    document.body
  );
}

function EditProfilePageChrome({
  titleId,
  onBack,
}: {
  titleId: string;
  onBack: () => void;
}) {
  return (
    <header className="specialist-edit-profile-page__chrome">
      <FastActivateButton
        className="smoac-control specialist-edit-profile-page__back"
        aria-label="Back to live profile"
        onActivate={onBack}
      >
        <ChevronLeftIcon className="specialist-edit-profile-page__back-icon" />
      </FastActivateButton>
      <h1 id={titleId} className="specialist-edit-profile-page__title">
        Edit Profile
      </h1>
      <span className="specialist-edit-profile-page__spacer" aria-hidden />
    </header>
  );
}

/**
 * Specialist Profile tab — live marketplace view by default; edit and
 * inquiries open from the overlay buttons on that live screen.
 */
export function SpecialistDashboardProfilePreview({
  trainer: trainerProp,
  editable = false,
  isPremium = false,
  isProPlus = false,
  focusSection = null,
  onClearFocus,
  onUpgrade,
  onSignOut,
  cityRanking = null,
  inquiryLeads = [],
  inquirySenderUserId,
  inquiryUnreadCount = 0,
  initialConversationId = null,
  onOpenInquiryLead,
  onCloseInquiryThread,
  onHideInquiryLead,
  onMarkInquiryLeadsRead,
  onMarkInquiryLeadsUnread,
}: SpecialistDashboardProfilePreviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const editTitleId = useId();
  const {
    formDefaults,
    saveForm,
    trainerId,
    application,
    trainer: managedTrainer,
  } = useManagedSpecialistProfile();

  const listing = managedTrainer ?? trainerProp;
  const marketplaceTrainer = useTrainerWithOverrides(
    trainerId ?? listing.id
  );
  const listingPlan = parseMembershipPlan(listing.membershipPlan);
  const sessionPlan = isProPlus
    ? "platinum"
    : isPremium
      ? "premium"
      : "free";
  const membershipPlan =
    sessionPlan === "platinum" || listingPlan === "platinum"
      ? "platinum"
      : sessionPlan === "premium" || listingPlan === "premium"
        ? "premium"
        : "free";
  const approvedListing = getApprovedSpecialistProfileById(
    trainerId ?? listing.id
  );
  const isLiveListing = application?.profileStatus === "APPROVED";
  const trainer = {
    ...listing,
    isPremium: membershipPlan !== "free",
    membershipPlan,
    social: overlayGoogleSocialIfMissing(
      listing.social,
      approvedListing?.social
    ),
    rating: listing.rating || approvedListing?.rating || 0,
    reviewCount: listing.reviewCount || approvedListing?.reviewCount || 0,
    reviewSources: listing.reviewSources ?? approvedListing?.reviewSources,
  } as Trainer;
  /* Live === Marketplace: same public catalog row clients see. */
  const liveTrainer = (marketplaceTrainer ??
    (isLiveListing && approvedListing ? approvedListing : listing)) as Trainer;

  const [editing, setEditing] = useState<SectionId | null>(null);
  const [draft, setDraft] = useState<SpecialistProfileEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [secondLocationOpen, setSecondLocationOpen] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const conversationParam = searchParams.get("c")?.trim() || "";
  const viewParam = searchParams.get("view")?.trim() || "";
  const [previewMode, setPreviewMode] = useState<ProfilePreviewMode>(() =>
    previewModeFromSearch(viewParam, conversationParam)
  );
  const canEdit = editable && Boolean(formDefaults && trainerId);
  const showInquiries = canEdit && Boolean(inquirySenderUserId);

  useEffect(() => {
    setPreviewMode(previewModeFromSearch(viewParam, conversationParam));
  }, [conversationParam, viewParam]);

  useEffect(() => {
    if (previewMode !== "edit") return;
    document.body.classList.add(EDIT_PAGE_LOCK_CLASS);
    document.documentElement.classList.add(EDIT_PAGE_LOCK_CLASS);
    return () => {
      document.body.classList.remove(EDIT_PAGE_LOCK_CLASS);
      document.documentElement.classList.remove(EDIT_PAGE_LOCK_CLASS);
    };
  }, [previewMode]);

  function replacePreviewMode(next: ProfilePreviewMode) {
    setPreviewMode(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "profile");
    if (next === "inquiries") {
      params.set("view", "inquiries");
    } else if (next === "edit") {
      params.set("view", "edit");
      params.delete("c");
    } else {
      params.delete("view");
      params.delete("c");
    }
    const qs = params.toString();
    router.replace(
      qs ? `${SPECIALIST_DASHBOARD_PATH}?${qs}` : SPECIALIST_DASHBOARD_PATH,
      { scroll: false }
    );
  }

  useEffect(() => {
    const target =
      focusSection || searchParams.get("focus") || searchParams.get("section");
    const mapped = mapTargetSectionToSectionId(target);
    if (!mapped) return;

    setHighlightedRow(mapped);

    if (viewParam !== "edit") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "profile");
      params.set("view", "edit");
      router.replace(
        `${SPECIALIST_DASHBOARD_PATH}?${params.toString()}`,
        { scroll: false }
      );
    }

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
  }, [focusSection, searchParams, onClearFocus, viewParam, router]);

  function startEdit(section: SectionId) {
    if (!canEdit || !formDefaults) return;
    if (section === "free-first-session" && !isPremium) {
      onUpgrade?.();
      return;
    }
    if (section === "transformations" && !isProPlus) {
      onUpgrade?.();
      return;
    }
    const next = cloneSpecialistProfileEditForm(formDefaults);
    if (section === "philosophy") {
      next.trainingStyle = formatCoachingStyleSelection(
        parseCoachingStyleSelection(next.trainingStyle)
      );
    }
    if (section === "profession") {
      next.profession =
        canonicalizeProfessionLabel(next.profession) ?? next.profession;
    }
    setEditing(section);
    setDraft(next);
    setSecondLocationOpen(false);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
    setSecondLocationOpen(false);
  }

  function patch<K extends keyof SpecialistProfileEditForm>(
    key: K,
    value: SpecialistProfileEditForm[K]
  ) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function publish() {
    if (!draft || !formDefaults || !editing) return;
    setSaving(true);
    const payload = overlayProfileSectionDraft(formDefaults, draft, editing);
    const result = await saveForm(payload);
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
  const selectedProfession = form
    ? canonicalizeProfessionLabel(form.profession)
    : null;

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
              videoPostersJson={form.videoPostersJson}
              pinnedPhotos={form.pinnedPhotos}
              transformationNotes={form.transformationNotes}
              isPremium={isPremium}
              isProPlus={isProPlus}
              specialistId={trainerId ?? application?.id ?? trainer.id}
              onUpgrade={onUpgrade}
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
          <ProfileEditChipGroup
            label="Category"
            options={MAIN_PROFESSION_CATEGORIES}
            selected={selectedProfession ? [selectedProfession] : []}
            onChange={(next) => patch("profession", next[0] ?? "")}
            hint="Choose one of the eleven marketplace categories."
          />
        ) : null}

        {editing === "transformations" ? (
          <SpecialistTransformationsEditor
            transformationNotes={form.transformationNotes}
            isProPlus={isProPlus}
            specialistId={trainerId ?? application?.id ?? trainer.id}
            onUpgrade={onUpgrade}
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
            <MarketplaceSpecialtyPicker
              selected={form.specialty}
              homepageSpecialties={form.homepageSpecialties}
              onChange={({ specialty, homepageSpecialties }) =>
                setDraft((prev) =>
                  prev ? { ...prev, specialty, homepageSpecialties } : prev
                )
              }
            />
          </div>
        ) : null}

        {editing === "philosophy" ? (
          <ProfileEditChipGroup
            label="Coaching style"
            options={COACHING_STYLE_OPTIONS}
            selected={parseCoachingStyleSelection(form.trainingStyle)}
            onChange={(next) =>
              patch("trainingStyle", formatCoachingStyleSelection(next))
            }
            multiple
            hint="Select every style that fits how you coach."
          />
        ) : null}

        {editing === "ideal-clients" ? (
          <SpecialistRightFitFields
            value={form.servicesOffered}
            onChange={(next) => patch("servicesOffered", next)}
          />
        ) : null}

        {editing === "service-area" ? (
          <div className="specialist-dash-profile__fields specialist-dash-profile__fields--service-area">
            {(() => {
              const showAddress =
                form.serviceType === "in-person" || form.serviceType === "both";
              const secondary = secondaryWorkSpotFromForm(form);
              const showSecond =
                secondLocationOpen || hasWorkSpotContent(secondary);
              return (
                <>
                  <SpecialistWorkSpotFields
                    value={primaryWorkSpotFromForm(form)}
                    onChange={(spot) =>
                      setDraft((prev) =>
                        prev ? applyPrimaryWorkSpot(prev, spot) : prev
                      )
                    }
                    showAddress={showAddress}
                    heading={showSecond ? "Primary location" : undefined}
                    headingHint={
                      showSecond
                        ? "Maps and search use this pin only"
                        : undefined
                    }
                    addressLabel={
                      showSecond
                        ? "Exact work / studio address"
                        : undefined
                    }
                  />
                  {showSecond ? (
                    <SpecialistWorkSpotFields
                      className="specialist-work-spot--secondary"
                      value={secondary}
                      onChange={(spot) =>
                        setDraft((prev) =>
                          prev ? applySecondaryWorkSpot(prev, spot) : prev
                        )
                      }
                      showAddress={showAddress}
                      heading="Second location"
                      headingHint="Shows on your profile — not a second map pin"
                      addressLabel="Second work / studio address"
                      addressHint="Clients see this on your profile. Explore still uses your primary location."
                      virtualHint="Virtual coaches don’t need a second street address."
                      onRemove={() => {
                        setSecondLocationOpen(false);
                        setDraft((prev) =>
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
                        + Add a second location
                      </button>
                      <p className="specialist-service-area-add__hint">
                        Profile only — maps and search stay on your primary
                        location.
                      </p>
                    </div>
                  ) : null}
                  <div className="specialist-service-area-shared">
                    <label className="login-field">
                      <span className="login-field__label">Session format</span>
                      <select
                        className="login-field__input dashboard-edit-select profile-edit-input"
                        value={form.serviceType}
                        onChange={(e) => {
                          const next = e.target.value as SpecialistServiceType;
                          if (next === "virtual") {
                            setDraft((prev) =>
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
                        Travel to clients
                      </span>
                      <select
                        className="login-field__input dashboard-edit-select profile-edit-input"
                        value={form.travelToClients}
                        onChange={(e) =>
                          patch(
                            "travelToClients",
                            parseTravelToClients(e.target.value)
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
                    </label>
                    <label className="login-field specialist-service-area-shared__areas">
                      <span className="login-field__label">
                        Additional areas
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
                </>
              );
            })()}
          </div>
        ) : null}

        {editing === "session-experience" ? (
          <SpecialistTrainingOptionsFields
            value={form.trainingOptions}
            onChange={(trainingOptions) =>
              patch("trainingOptions", trainingOptions)
            }
            hideLabel
          />
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
          <div className="session-price-range-fields">
            <label className="login-field">
              <span className="login-field__label">From (USD)</span>
              <input
                className="login-field__input profile-edit-input"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={form.pricePerSessionMin || ""}
                onChange={(e) => {
                  const min = Number(e.target.value) || 0;
                  const max = form.pricePerSessionMax || form.pricePerSession;
                  patch("pricePerSessionMin", min);
                  patch("pricePerSessionMax", max);
                  patch("pricePerSession", max > 0 ? max : min);
                }}
                placeholder="80"
              />
            </label>
            <span className="session-price-range-fields__dash" aria-hidden="true">
              –
            </span>
            <label className="login-field">
              <span className="login-field__label">To (USD)</span>
              <input
                className="login-field__input profile-edit-input"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={form.pricePerSessionMax || form.pricePerSession || ""}
                onChange={(e) => {
                  const max = Number(e.target.value) || 0;
                  const min = form.pricePerSessionMin || max;
                  patch("pricePerSessionMin", min);
                  patch("pricePerSessionMax", max);
                  patch("pricePerSession", max);
                }}
                placeholder="120"
              />
            </label>
          </div>
        ) : null}

        {editing === "free-first-session" ? (
          <div className="specialist-dash-profile__fields">
            <p className="wizard-field-hint">
              Turn this on to appear in the marketplace {FREE_FIRST_SESSION_LABEL}{" "}
              slider. Pro and PRO+ only.
            </p>
            <div className="dashboard-edit-chip-grid" role="group" aria-label={FREE_FIRST_SESSION_LABEL}>
              <button
                type="button"
                className={
                  form.offersFreeFirstSession
                    ? "dashboard-edit-chip dashboard-edit-chip--active"
                    : "dashboard-edit-chip"
                }
                aria-pressed={form.offersFreeFirstSession}
                onClick={() => patch("offersFreeFirstSession", true)}
              >
                On
              </button>
              <button
                type="button"
                className={
                  !form.offersFreeFirstSession
                    ? "dashboard-edit-chip dashboard-edit-chip--active"
                    : "dashboard-edit-chip"
                }
                aria-pressed={!form.offersFreeFirstSession}
                onClick={() => patch("offersFreeFirstSession", false)}
              >
                Off
              </button>
            </div>
          </div>
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
          <ProfileEditChipGroup
            label="Gender"
            options={GENDER_OPTIONS}
            selected={form.gender ? [form.gender] : []}
            onChange={(next) => patch("gender", parseGender(next[0] ?? ""))}
          />
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
      </LiveEditSheet>
    ) : null;

  /* Owner edit — Instagram-style list (does not change public profile layout). */
  if (canEdit && formDefaults && previewMode === "edit") {
    return (
      <div
        id={LIVE_PROFILE_ANCHOR_ID}
        className="specialist-profile-mode specialist-profile-mode--edit"
      >
        <div
          className="specialist-edit-profile-page"
          role="dialog"
          aria-modal="true"
          aria-labelledby={editTitleId}
        >
          <EditProfilePageChrome
            titleId={editTitleId}
            onBack={() => replacePreviewMode("live")}
          />
          <div className="specialist-edit-profile-page__body">
            <div className="ig-profile-edit-wrap">
              <SpecialistIgStyleProfileEditor
                trainer={trainer}
                formDefaults={formDefaults}
                onEditSection={(id) => startEdit(id)}
                highlightedSection={highlightedRow}
                onUpgrade={onUpgrade}
                footer={
                  <p className="ig-profile-edit__hint">
                    Changes go live on Marketplace when you save. Clients still see
                    your normal SMOAC profile layout.
                  </p>
                }
              />
            </div>
          </div>
        </div>
        {editSheet}
      </div>
    );
  }

  if (canEdit && previewMode === "inquiries" && inquirySenderUserId) {
    return (
      <div
        id={LIVE_PROFILE_ANCHOR_ID}
        className="specialist-profile-mode specialist-profile-mode--inquiries"
      >
        <SpecialistInquiriesInbox
          leads={inquiryLeads}
          senderUserId={inquirySenderUserId}
          onOpenLead={onOpenInquiryLead}
          initialConversationId={initialConversationId}
          onCloseThread={onCloseInquiryThread}
          onHideLead={onHideInquiryLead}
          onMarkRead={onMarkInquiryLeadsRead}
          onMarkUnread={onMarkInquiryLeadsUnread}
          onBack={() => replacePreviewMode("live")}
        />
      </div>
    );
  }

  const selfPreviewNote = () => {
    showToast({
      type: "info",
      message: "Clients use this button to inquire — it isn’t editable.",
    });
  };

  return (
    <div
      id={LIVE_PROFILE_ANCHOR_ID}
      className="specialist-profile-mode specialist-profile-mode--live"
    >
      {canEdit ? (
        <LiveProfileChrome
          showInquiries={showInquiries}
          inquiryUnreadCount={inquiryUnreadCount}
          onOpenInquiries={() => replacePreviewMode("inquiries")}
          onOpenEdit={() => replacePreviewMode("edit")}
        />
      ) : null}
      <TrainerProfileView
        trainer={liveTrainer}
        cityRanking={cityRanking}
        variant="specialist-live"
        onClaimFreeSession={selfPreviewNote}
        onInquire={selfPreviewNote}
      />
      {canEdit && onSignOut ? (
        <div className="specialist-live-signout">
          <FastActivateButton
            className="smoac-control specialist-live-signout__btn"
            onActivate={onSignOut}
          >
            Sign out
          </FastActivateButton>
        </div>
      ) : null}
    </div>
  );
}
