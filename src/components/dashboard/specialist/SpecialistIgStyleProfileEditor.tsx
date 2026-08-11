"use client";

import type { ReactNode } from "react";
import { formatProviderLocation } from "@/lib/provider-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  profileStyleAccentLabel,
  profileStyleFontLabel,
  profileStyleFrameLabel,
} from "@/lib/specialist-profile-style";
import { cn } from "@/lib/utils";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { Gender, Trainer } from "@/types/trainer";

export type IgEditRowId =
  | "hero"
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
  | "contact"
  | "gender"
  | "experience"
  | "profile-style"
  | "featured-specialties";

function previewOrAdd(value: string, empty = "Add"): string {
  const trimmed = value.trim();
  if (!trimmed) return empty;
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

function genderLabel(value: Gender): string {
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  if (value === "non-binary") return "Non-binary";
  return value;
}

function IgEditRow({
  label,
  value,
  onClick,
  incomplete = false,
}: {
  label: string;
  value: string;
  onClick: () => void;
  incomplete?: boolean;
}) {
  const isEmpty = value === "Add" || value.startsWith("Add ");
  return (
    <button
      type="button"
      className={cn(
        "ig-profile-edit__row",
        incomplete && "ig-profile-edit__row--incomplete"
      )}
      onClick={onClick}
    >
      <span className="ig-profile-edit__row-label">{label}</span>
      <span
        className={cn(
          "ig-profile-edit__row-value",
          isEmpty && "ig-profile-edit__row-value--empty"
        )}
      >
        {value}
      </span>
      <span className="ig-profile-edit__row-chevron" aria-hidden>
        ›
      </span>
    </button>
  );
}

interface SpecialistIgStyleProfileEditorProps {
  trainer: Trainer;
  formDefaults: SpecialistProfileEditForm;
  onEditSection: (id: IgEditRowId) => void;
  footer?: ReactNode;
}

/** Instagram-style list editor — same fields/saves, familiar mobile layout. */
export function SpecialistIgStyleProfileEditor({
  trainer,
  formDefaults,
  onEditSection,
  footer,
}: SpecialistIgStyleProfileEditorProps) {
  const photo = formDefaults.profilePhotoUrl.trim() || trainer.image;
  const profession =
    resolveTrainerProfessionCategory({
      profession: formDefaults.profession || trainer.profession,
      title: formDefaults.title || trainer.title,
      specialty: formDefaults.specialty.length
        ? formDefaults.specialty
        : trainer.specialty,
    }) || formDefaults.profession;
  const location = formatProviderLocation({
    ...trainer,
    city: formDefaults.city || trainer.city,
    neighborhood: formDefaults.neighborhood || trainer.neighborhood,
    zipCode: formDefaults.zipCode || trainer.zipCode,
  });
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
  const price =
    formDefaults.pricePerSession > 0
      ? `From $${formDefaults.pricePerSession}`
      : "Add";
  const contactBits = [
    formDefaults.phone.trim() && "Phone",
    formDefaults.email.trim() && "Email",
  ].filter(Boolean);
  const featuredPreview =
    formDefaults.homepageSpecialties.length > 0
      ? formDefaults.homepageSpecialties.join(", ")
      : formDefaults.specialty.length > 0
        ? "Using first specialties"
        : "Add";
  const stylePreview = [
    profileStyleAccentLabel(formDefaults.profileAccent),
    profileStyleFrameLabel(formDefaults.profileAvatarFrame),
    profileStyleFontLabel(formDefaults.profileNameFont),
  ].join(" · ");

  return (
    <div className="ig-profile-edit" aria-label="Edit profile">
      <div className="ig-profile-edit__media">
        <button
          type="button"
          className="ig-profile-edit__avatar-btn"
          onClick={() => onEditSection("hero")}
          aria-label="Edit profile picture"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="ig-profile-edit__avatar" />
        </button>
        <button
          type="button"
          className="ig-profile-edit__media-link"
          onClick={() => onEditSection("hero")}
        >
          Edit picture
        </button>
      </div>

      <div className="ig-profile-edit__list" role="list">
        <IgEditRow
          label="Business name"
          value={previewOrAdd(formDefaults.name)}
          incomplete={!formDefaults.name.trim()}
          onClick={() => onEditSection("name")}
        />
        <IgEditRow
          label="Headline"
          value={previewOrAdd(formDefaults.title)}
          incomplete={!formDefaults.title.trim()}
          onClick={() => onEditSection("headline")}
        />
        <IgEditRow
          label="Category"
          value={previewOrAdd(profession)}
          incomplete={!profession.trim()}
          onClick={() => onEditSection("profession")}
        />
        <IgEditRow
          label="Bio"
          value={previewOrAdd(formDefaults.bio)}
          incomplete={!formDefaults.bio.trim()}
          onClick={() => onEditSection("bio")}
        />
        <IgEditRow
          label="Specialties"
          value={specialtyPreview}
          incomplete={formDefaults.specialty.length === 0}
          onClick={() => onEditSection("specialties")}
        />
        <IgEditRow
          label="Location"
          value={previewOrAdd(location)}
          incomplete={!location.trim()}
          onClick={() => onEditSection("service-area")}
        />
        <IgEditRow
          label="Coaching style"
          value={previewOrAdd(formDefaults.trainingStyle)}
          incomplete={!formDefaults.trainingStyle.trim()}
          onClick={() => onEditSection("philosophy")}
        />
        <IgEditRow
          label="Best for"
          value={previewOrAdd(formDefaults.servicesOffered)}
          incomplete={!formDefaults.servicesOffered.trim()}
          onClick={() => onEditSection("ideal-clients")}
        />
        <IgEditRow
          label="Session experience"
          value={previewOrAdd(formDefaults.bookingAvailability)}
          incomplete={!formDefaults.bookingAvailability.trim()}
          onClick={() => onEditSection("session-experience")}
        />
        <IgEditRow
          label="Credentials"
          value={previewOrAdd(certPreview === "Add" ? "" : certPreview)}
          incomplete={certPreview === "Add"}
          onClick={() => onEditSection("credentials")}
        />
        <IgEditRow
          label="Transformations"
          value={
            formDefaults.transformationNotes.trim() ? "Photos added" : "Add"
          }
          incomplete={!formDefaults.transformationNotes.trim()}
          onClick={() => onEditSection("transformations")}
        />
        <IgEditRow
          label="Links"
          value={
            socialBits.length > 0 ? socialBits.join(" · ") : "Add links"
          }
          incomplete={socialBits.length === 0}
          onClick={() => onEditSection("social")}
        />
      </div>

      <div className="ig-profile-edit__section-label">
        More details / settings
      </div>
      <div className="ig-profile-edit__list" role="list">
        <IgEditRow
          label="Pricing"
          value={price}
          incomplete={formDefaults.pricePerSession <= 0}
          onClick={() => onEditSection("pricing")}
        />
        <IgEditRow
          label="Contact"
          value={
            contactBits.length > 0 ? contactBits.join(" · ") : "Add phone or email"
          }
          incomplete={contactBits.length === 0}
          onClick={() => onEditSection("contact")}
        />
        <IgEditRow
          label="Gender"
          value={genderLabel(formDefaults.gender)}
          onClick={() => onEditSection("gender")}
        />
        <IgEditRow
          label="Experience"
          value={previewOrAdd(formDefaults.experienceYears)}
          incomplete={!formDefaults.experienceYears.trim()}
          onClick={() => onEditSection("experience")}
        />
        <IgEditRow
          label="Profile style"
          value={stylePreview}
          onClick={() => onEditSection("profile-style")}
        />
        <IgEditRow
          label="Featured specialties"
          value={featuredPreview}
          incomplete={
            formDefaults.specialty.length === 0 &&
            formDefaults.homepageSpecialties.length === 0
          }
          onClick={() => onEditSection("featured-specialties")}
        />
      </div>

      {footer ? <div className="ig-profile-edit__footer">{footer}</div> : null}
    </div>
  );
}
