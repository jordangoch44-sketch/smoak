"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import {
  ProfileEditInputField,
  ProfileEditSection,
  ProfileEditViewField,
} from "@/components/dashboard/specialist/ProfileEditSection";
import { ProfileMediaUploadField } from "@/components/dashboard/specialist/ProfileMediaUploadField";
import { SpecialistDashboardProfileHeader } from "@/components/dashboard/specialist/SpecialistDashboardProfileHeader";
import { SpecialistPendingApprovalNotice } from "@/components/dashboard/specialist/SpecialistPendingApprovalNotice";
import {
  DashboardPageShell,
  DashboardSignOutButton,
} from "@/components/dashboard/shared";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useProfileKeyboardChrome } from "@/hooks/useProfileKeyboardChrome";
import { useRequireAuth } from "@/hooks/useRequireAuth";
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
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import type { Certification, Gender } from "@/types/trainer";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import {
  SPECIALIST_SERVICE_TYPE_OPTIONS,
  SPECIALIST_TRAVEL_RADIUS_OPTIONS,
} from "@/types/specialist-service-area";
import type { SpecialistServiceType } from "@/types/specialist-service-area";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
];

type SectionId =
  | "basic-info"
  | "bio"
  | "experience"
  | "professional-role"
  | "specialties"
  | "service-area"
  | "credentials"
  | "photos-links";

function genderLabel(value: Gender): string {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function SpecialistEditProfilePageClient() {
  const router = useRouter();
  const { isReady, session } = useRequireAuth("specialist");
  const { signOut } = useAuthSession();
  const { showToast } = useToast();
  const { formDefaults, saveForm, application, trainerId } =
    useManagedSpecialistProfile();

  const [editingSection, setEditingSection] = useState<SectionId | null>(null);
  const [sectionDraft, setSectionDraft] = useState<SpecialistProfileEditForm | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  useProfileKeyboardChrome();

  const savedForm = formDefaults;
  const form = editingSection != null && sectionDraft ? sectionDraft : savedForm;

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const section = document.getElementById(hash);
    if (section) {
      window.requestAnimationFrame(() => {
        section.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
  }, [savedForm]);

  const dashboardMode = resolveSpecialistDashboardMode({
    sessionEmail: session?.email,
    trainerId,
    application,
    subscription: getSpecialistSubscriptionForSession(session),
  });

  const profileFirst = showsProfileFirstDashboard(dashboardMode);

  const handleSignOut = useCallback(() => {
    void signOut().then(() => {
      afterLogoutNavigation(() => router.push("/profile"));
    });
  }, [router, signOut]);

  function startEdit(sectionId: SectionId) {
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
    if (!sectionDraft || !trainerId) return;
    setSaving(true);
    const result = await saveForm(sectionDraft);
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

  if (!isReady || !session || !savedForm || !form) {
    return (
      <div className="dashboard-page dashboard-page--loading">
        <div className="dashboard-page__content">
          <p className="dashboard-page__subtitle">Loading profile editor…</p>
        </div>
      </div>
    );
  }

  const completion = computeProfileCompletion(savedForm);

  return (
    <DashboardPageShell
      variant="specialist"
      eyebrow="Specialist dashboard"
      title="Edit profile"
      subtitle={
        profileFirst
          ? "Update one section at a time — changes save to your profile draft."
          : "Shape how clients discover and book you on SMOAC."
      }
      roleLabel="Specialist"
      utilityBar={<DashboardSignOutButton onClick={handleSignOut} />}
      actions={
        <Link href="/specialist-dashboard" className="dashboard-back-link">
          ← Dashboard
        </Link>
      }
    >
      <div className="dashboard-edit dashboard-edit--profile dashboard-edit--sections">
        {dashboardMode === "pending" || dashboardMode === "rejected" ? (
          <SpecialistPendingApprovalNotice
            variant={dashboardMode === "rejected" ? "rejected" : "pending"}
          />
        ) : null}

        {dashboardMode === "approved-free" ? (
          <SpecialistDashboardProfileHeader variant="live-free" />
        ) : null}

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
                    onChange={(event) =>
                      updateField("gender", event.target.value as Gender)
                    }
                  >
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
            {...sectionProps("bio")}
            title="Bio / about"
            description="Your story and approach"
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
            viewContent={
              <>
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
                  label="Service radius"
                  value={
                    savedForm.travelRadius
                      ? `${savedForm.travelRadius} miles`
                      : ""
                  }
                  emptyLabel="Add travel radius"
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
                    onChange={(event) =>
                      updateField(
                        "serviceType",
                        event.target.value as SpecialistServiceType
                      )
                    }
                  >
                    {SPECIALIST_SERVICE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </ProfileEditInputField>
                <ProfileEditInputField label="Service radius">
                  <select
                    className="login-field__input profile-edit-input"
                    value={form.travelRadius}
                    onChange={(event) =>
                      updateField("travelRadius", event.target.value)
                    }
                  >
                    <option value="">Select radius</option>
                    {SPECIALIST_TRAVEL_RADIUS_OPTIONS.map((option) => (
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
            title="Photos & review links"
            description="Imagery, gallery, and social profiles"
            viewContent={
              <>
                <ProfileEditViewField
                  label="Profile photo"
                  value={savedForm.profilePhotoUrl ? "Uploaded" : ""}
                  emptyLabel="Add profile photo"
                />
                <ProfileEditViewField
                  label="Cover / banner"
                  value={savedForm.coverImageUrl ? "Uploaded" : ""}
                  emptyLabel="Add cover image"
                />
                <ProfileEditViewField label="Instagram" value={savedForm.instagram} />
                <ProfileEditViewField label="TikTok" value={savedForm.tiktok} />
                <ProfileEditViewField label="Website" value={savedForm.website} />
                <ProfileEditViewField
                  label="Gallery photos"
                  value={savedForm.photoNotes}
                  emptyLabel="Add gallery links"
                  multiline
                />
                <ProfileEditViewField
                  label="Transformation photos"
                  value={savedForm.transformationNotes}
                  emptyLabel="Add transformation photos"
                  multiline
                />
              </>
            }
            editContent={
              <>
                <div className="dashboard-edit-media-grid">
                  <ProfileMediaUploadField
                    label="Cover / banner"
                    hint="Wide banner for your profile header"
                    value={form.coverImageUrl}
                    onChange={(value) => updateField("coverImageUrl", value)}
                    aspect="cover"
                    specialistId={trainerId}
                    mediaKind="cover"
                    onClear={() => updateField("coverImageUrl", "")}
                  />
                  <ProfileMediaUploadField
                    label="Profile photo"
                    hint="Square headshot or brand portrait"
                    value={form.profilePhotoUrl}
                    onChange={(value) => updateField("profilePhotoUrl", value)}
                    aspect="square"
                    specialistId={trainerId}
                    mediaKind="profile"
                    onClear={() => updateField("profilePhotoUrl", "")}
                  />
                </div>
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
                  <ProfileEditInputField label="Gallery photos">
                    <textarea
                      className="login-field__input dashboard-edit-textarea profile-edit-input"
                      rows={4}
                      value={form.photoNotes}
                      onChange={(event) =>
                        updateField("photoNotes", event.target.value)
                      }
                    />
                  </ProfileEditInputField>
                  <ProfileEditInputField label="Transformation photos">
                    <textarea
                      className="login-field__input dashboard-edit-textarea profile-edit-input"
                      rows={4}
                      value={form.transformationNotes}
                      onChange={(event) =>
                        updateField("transformationNotes", event.target.value)
                      }
                    />
                  </ProfileEditInputField>
                </div>
              </>
            }
          />
        </div>
      </div>
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
