import type { Certification } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface CertificationsProps {
  certifications?: Certification[] | null;
}

export function Certifications({ certifications }: CertificationsProps) {
  const items = Array.isArray(certifications)
    ? certifications.filter(
        (cert) => cert && typeof cert.name === "string" && cert.name.trim()
      )
    : [];

  if (items.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Certifications">
      <ProfileSectionHeader title="Certifications" />
      <ul className="profile-section-body profile-section-body--loose">
        {items.map((cert) => (
          <li key={`${cert.name}-${cert.year}`} className="profile-cert-row">
            <div>
              <p className="font-medium text-white">{cert.name}</p>
              {cert.issuer.trim() ? (
                <p className="mt-0.5 text-sm text-silver-400">{cert.issuer}</p>
              ) : null}
            </div>
            {cert.year ? (
              <span className="shrink-0 text-sm tabular-nums text-silver-400">
                {cert.year}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}
