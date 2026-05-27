"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { computeProfileCompletion } from "@/lib/specialist-profile-overrides";
import type { Certification, Gender } from "@/types/trainer";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import {
  DashboardPageShell,
  DashboardSection,
  DashboardSignOutButton,
} from "@/components/dashboard/shared";
import { ProfileMediaUploadField } from "@/components/dashboard/specialist/ProfileMediaUploadField";
import { useToast } from "@/components/ui/toast";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
];

const EMPTY_CERT: Certification = {
  name: "",
  issuer: "",
  year: new Date().getFullYear(),
};

export function SpecialistEditProfilePageClient() {
  const router = useRouter();
  const { isReady, session } = useRequireAuth("specialist");
  const { signOut } = useAuthSession();
  const { showToast } = useToast();
  const { formDefaults, saveForm } = useManagedSpecialistProfile();

  const [draft, setDraft] = useState<SpecialistProfileEditForm | null>(null);
  const form = draft ?? formDefaults;

  const hasUnsavedChanges = useMemo(() => {
    if (!draft || !formDefaults) return false;
    return JSON.stringify(draft) !== JSON.stringify(formDefaults);
  }, [draft, formDefaults]);

  const handleSignOut = useCallback(() => {
    signOut();
    afterLogoutNavigation(() => router.push("/login"));
  }, [router, signOut]);

  if (!isReady || !session || !form) {
    return (
      <div className="dashboard-page dashboard-page--loading">
        <div className="dashboard-page__content">
          <p className="dashboard-page__subtitle">Loading profile editor…</p>
        </div>
      </div>
    );
  }

  const completion = computeProfileCompletion(form);

  function updateField<K extends keyof SpecialistProfileEditForm>(
    key: K,
    value: SpecialistProfileEditForm[K]
  ) {
    setDraft((prev) => {
      const current = prev ?? formDefaults;
      return current ? { ...current, [key]: value } : prev;
    });
  }

  function toggleSpecialty(specialty: string) {
    setDraft((prev) => {
      const current = prev ?? formDefaults;
      if (!current) return prev;
      const has = current.specialty.includes(specialty);
      return {
        ...current,
        specialty: has
          ? current.specialty.filter((item) => item !== specialty)
          : [...current.specialty, specialty],
      };
    });
  }

  function updateCert(index: number, patch: Partial<Certification>) {
    setDraft((prev) => {
      const current = prev ?? formDefaults;
      if (!current) return prev;
      const certifications = current.certifications.map((cert, i) =>
        i === index ? { ...cert, ...patch } : cert
      );
      return { ...current, certifications };
    });
  }

  function addCertification() {
    setDraft((prev) => {
      const current = prev ?? formDefaults;
      return current
        ? { ...current, certifications: [...current.certifications, { ...EMPTY_CERT }] }
        : prev;
    });
  }

  function removeCertification(index: number) {
    setDraft((prev) => {
      const current = prev ?? formDefaults;
      if (!current) return prev;
      const certifications = current.certifications.filter((_, i) => i !== index);
      return {
        ...current,
        certifications: certifications.length > 0 ? certifications : [{ ...EMPTY_CERT }],
      };
    });
  }

  function handleSave() {
    if (!form) return;
    saveForm(form);
    setDraft(null);
    showToast({ type: "success", message: "Changes saved" });
  }

  return (
    <DashboardPageShell
      variant="specialist"
      eyebrow="Specialist dashboard"
      title="Edit profile"
      subtitle="Shape how clients discover and book you on SMOAC."
      roleLabel="Specialist"
      utilityBar={<DashboardSignOutButton onClick={handleSignOut} />}
      actions={
        <Link href="/specialist-dashboard" className="dashboard-back-link">
          ← Dashboard
        </Link>
      }
    >
      <div className="dashboard-edit dashboard-edit--profile">
        <div className="dashboard-edit__summary">
          <p className="dashboard-edit__summary-label">Profile strength</p>
          <p className="dashboard-edit__summary-value">{completion}% complete</p>
          {hasUnsavedChanges ? (
            <p className="dashboard-edit__unsaved" role="status">
              Unsaved changes
            </p>
          ) : null}
        </div>

        <form
          className="dashboard-edit__sections"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <DashboardSection
            title="Profile & cover"
            description="Hero imagery clients see first"
          >
            <div className="dashboard-edit-media-grid">
              <ProfileMediaUploadField
                label="Cover / banner"
                hint="Wide banner for your profile header"
                value={form.coverImageUrl}
                onChange={(value) => updateField("coverImageUrl", value)}
                aspect="cover"
              />
              <ProfileMediaUploadField
                label="Profile photo"
                hint="Square headshot or brand portrait"
                value={form.profilePhotoUrl}
                onChange={(value) => updateField("profilePhotoUrl", value)}
                aspect="square"
              />
            </div>
          </DashboardSection>

          <DashboardSection title="Basic info" description="Name and headline">
            <div className="dashboard-edit-fields">
              <label className="login-field">
                <span className="login-field__label">Full name</span>
                <input
                  className="login-field__input"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Headline</span>
                <input
                  className="login-field__input"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  required
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Gender</span>
                <select
                  className="login-field__input dashboard-edit-select"
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
              </label>
            </div>
          </DashboardSection>

          <DashboardSection title="Bio / about" description="Your story and approach">
            <label className="login-field">
              <span className="login-field__label">Bio</span>
              <textarea
                className="login-field__input dashboard-edit-textarea"
                rows={6}
                value={form.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                required
              />
            </label>
          </DashboardSection>

          <DashboardSection
            title="Experience & training"
            description="Credentials clients trust"
          >
            <div className="dashboard-edit-fields">
              <label className="login-field">
                <span className="login-field__label">Years of experience</span>
                <input
                  className="login-field__input"
                  value={form.experienceYears}
                  onChange={(event) =>
                    updateField("experienceYears", event.target.value)
                  }
                  placeholder="8+ years coaching athletes"
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Training style</span>
                <input
                  className="login-field__input"
                  value={form.trainingStyle}
                  onChange={(event) =>
                    updateField("trainingStyle", event.target.value)
                  }
                  placeholder="High-accountability strength & conditioning"
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Services offered</span>
                <textarea
                  className="login-field__input dashboard-edit-textarea"
                  rows={3}
                  value={form.servicesOffered}
                  onChange={(event) =>
                    updateField("servicesOffered", event.target.value)
                  }
                  placeholder="1:1 coaching, small-group training, online programming"
                />
              </label>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Professional role"
            description="Your main profession category"
          >
            <label className="login-field">
              <span className="login-field__label">Profession</span>
              <select
                className="login-field__input dashboard-edit-select"
                value={form.profession}
                onChange={(event) => updateField("profession", event.target.value)}
              >
                {MAIN_PROFESSION_CATEGORIES.map((profession) => (
                  <option key={profession} value={profession}>
                    {profession}
                  </option>
                ))}
              </select>
            </label>
          </DashboardSection>

          <DashboardSection title="Specialties" description="Tags on cards and filters">
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
          </DashboardSection>

          <DashboardSection title="Certifications" description="Licenses and credentials">
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
          </DashboardSection>

          <DashboardSection
            title="Location"
            description="Where you train and neighborhoods you serve"
          >
            <div className="dashboard-edit-fields">
              <label className="login-field">
                <span className="login-field__label">City</span>
                <input
                  className="login-field__input"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  required
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Primary neighborhood</span>
                <input
                  className="login-field__input"
                  value={form.neighborhood}
                  onChange={(event) =>
                    updateField("neighborhood", event.target.value)
                  }
                  required
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Additional areas served</span>
                <input
                  className="login-field__input"
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
                  placeholder="North Park, Hillcrest, Mission Valley"
                />
              </label>
            </div>
          </DashboardSection>

          <DashboardSection title="Pricing" description="Session rate on your profile">
            <label className="login-field dashboard-edit-field--narrow">
              <span className="login-field__label">Price per session (USD)</span>
              <input
                className="login-field__input"
                type="number"
                min={1}
                step={1}
                value={form.pricePerSession}
                onChange={(event) =>
                  updateField("pricePerSession", Number(event.target.value) || 0)
                }
                required
              />
            </label>
          </DashboardSection>

          <DashboardSection
            title="Availability"
            description="Session types and booking windows"
          >
            <label className="login-field">
              <span className="login-field__label">Availability & session types</span>
              <input
                className="login-field__input"
                value={form.bookingAvailability}
                onChange={(event) =>
                  updateField("bookingAvailability", event.target.value)
                }
                placeholder="In-person coaching, Virtual check-ins, Weekend sessions"
              />
              <span className="dashboard-edit-hint">
                Separate items with commas — they appear in Session experience on your
                public profile.
              </span>
            </label>
          </DashboardSection>

          <DashboardSection
            title="Contact"
            description="How clients reach you"
          >
            <div className="dashboard-edit-fields">
              <label className="login-field">
                <span className="login-field__label">Phone</span>
                <input
                  className="login-field__input"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="(555) 123-4567"
                  autoComplete="tel"
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Email</span>
                <input
                  className="login-field__input"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
            </div>
          </DashboardSection>

          <DashboardSection title="Social links" description="Profiles and website">
            <div className="dashboard-edit-fields">
              <label className="login-field">
                <span className="login-field__label">Instagram</span>
                <input
                  className="login-field__input"
                  value={form.instagram}
                  onChange={(event) => updateField("instagram", event.target.value)}
                  placeholder="@yourhandle or full URL"
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">TikTok</span>
                <input
                  className="login-field__input"
                  value={form.tiktok}
                  onChange={(event) => updateField("tiktok", event.target.value)}
                  placeholder="@yourhandle or full URL"
                />
              </label>
              <label className="login-field">
                <span className="login-field__label">Website</span>
                <input
                  className="login-field__input"
                  value={form.website}
                  onChange={(event) => updateField("website", event.target.value)}
                  placeholder="https://yoursite.com"
                />
              </label>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Gallery & media"
            description="Portfolio image URLs (one per line)"
          >
            <label className="login-field">
              <span className="login-field__label">Gallery photos</span>
              <textarea
                className="login-field__input dashboard-edit-textarea"
                rows={4}
                value={form.photoNotes}
                onChange={(event) => updateField("photoNotes", event.target.value)}
                placeholder={"https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg"}
              />
            </label>
          </DashboardSection>

          <DashboardSection
            title="Transformations"
            description="Before/after image URLs (one per line)"
          >
            <label className="login-field">
              <span className="login-field__label">Transformation photos</span>
              <textarea
                className="login-field__input dashboard-edit-textarea"
                rows={4}
                value={form.transformationNotes}
                onChange={(event) =>
                  updateField("transformationNotes", event.target.value)
                }
                placeholder={"https://example.com/before-after-1.jpg"}
              />
            </label>
          </DashboardSection>

          <div className="dashboard-edit__actions dashboard-edit__actions--inline">
            <button type="submit" className="dashboard-primary-btn">
              Save profile
            </button>
            <Link href="/specialist-dashboard" className="dashboard-edit-cancel">
              Cancel
            </Link>
          </div>
        </form>

        <div className="dashboard-edit__sticky-save">
          <button
            type="button"
            className="dashboard-primary-btn dashboard-edit__sticky-btn"
            onClick={handleSave}
          >
            {hasUnsavedChanges ? "Save changes" : "Save profile"}
          </button>
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
      <label className="login-field">
        <span className="login-field__label">Credential</span>
        <input
          className="login-field__input"
          value={cert.name}
          onChange={(event) => updateCert(index, { name: event.target.value })}
        />
      </label>
      <label className="login-field">
        <span className="login-field__label">Issuer</span>
        <input
          className="login-field__input"
          value={cert.issuer}
          onChange={(event) => updateCert(index, { issuer: event.target.value })}
        />
      </label>
      <label className="login-field">
        <span className="login-field__label">Year</span>
        <input
          className="login-field__input"
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
      </label>
    </div>
  );
}
