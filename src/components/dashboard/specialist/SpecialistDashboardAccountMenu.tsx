"use client";

import Link from "next/link";
import { useState } from "react";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getInitials, cn } from "@/lib/utils";

interface SpecialistDashboardAccountMenuProps {
  onSignOut: () => void;
  className?: string;
}

function resolvePhotoUrl(
  sessionAvatar: string | undefined,
  applicationPhoto: string | undefined,
  trainerImage: string | undefined
): string {
  const candidates = [
    applicationPhoto?.trim(),
    trainerImage?.trim(),
    sessionAvatar?.trim(),
  ];
  for (const url of candidates) {
    if (url && !url.includes("placeholder")) return url;
  }
  return "";
}

const EDIT_PHOTO_HREF = "/specialist-dashboard/edit-profile?focus=photo#photos-links";

/**
 * Top-right specialist account control — photo, edit photo, then Sign out.
 */
export function SpecialistDashboardAccountMenu({
  onSignOut,
  className,
}: SpecialistDashboardAccountMenuProps) {
  const { session } = useAuthSession();
  const { trainer, application } = useManagedSpecialistProfile();
  const [imageFailed, setImageFailed] = useState(false);

  const photoUrl = resolvePhotoUrl(
    session?.avatarUrl,
    application?.media.profilePhotoUrl,
    trainer?.image
  );
  const showPhoto = Boolean(photoUrl) && !imageFailed;
  const initials =
    getInitials(
      session?.firstName?.trim() ||
        application?.fullName.trim() ||
        trainer?.name.trim() ||
        session?.email ||
        "S"
    ) || "S";

  return (
    <div className={cn("specialist-dash-account", className)}>
      <Link
        href={EDIT_PHOTO_HREF}
        className="specialist-dash-account__avatar-link"
        aria-label={showPhoto ? "Edit profile photo" : "Add profile photo"}
      >
        <div className="specialist-dash-account__avatar" aria-hidden>
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- session / storage URLs vary
            <img
              src={photoUrl}
              alt=""
              className="specialist-dash-account__photo"
              draggable={false}
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="specialist-dash-account__initials">{initials}</span>
          )}
        </div>
      </Link>
      <Link
        href={EDIT_PHOTO_HREF}
        className="smoac-control specialist-dash-account__edit-photo"
      >
        Edit profile photo
      </Link>
      <button
        type="button"
        className="smoac-control dashboard-signout dashboard-signout--utility specialist-dash-account__signout"
        onClick={onSignOut}
      >
        Sign out
      </button>
    </div>
  );
}
