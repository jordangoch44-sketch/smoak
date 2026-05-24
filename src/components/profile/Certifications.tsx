import type { Certification } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface CertificationsProps {
  certifications: Certification[];
}

export function Certifications({ certifications }: CertificationsProps) {
  return (
    <ProfileSection variant="panel" aria-label="Certifications">
      <ProfileSectionHeader title="Certifications" />
      <ul className="profile-section-body profile-section-body--loose">
        {certifications.map((cert) => (
          <li key={`${cert.name}-${cert.year}`} className="profile-cert-row">
            <div>
              <p className="font-medium text-white">{cert.name}</p>
              <p className="mt-0.5 text-sm text-silver-400">{cert.issuer}</p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-silver-400">
              {cert.year}
            </span>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}
