import type { Certification } from "@/types";
import { credentialInitials } from "@/lib/profile-details-visual";
import { CheckIcon } from "@/components/ui/icons";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface CertificationsProps {
  certifications?: Certification[] | null;
  accolades?: string[] | null;
}

export function Certifications({
  certifications,
  accolades,
}: CertificationsProps) {
  const certs = Array.isArray(certifications)
    ? certifications.filter(
        (cert) => cert && typeof cert.name === "string" && cert.name.trim()
      )
    : [];
  const extra = Array.isArray(accolades)
    ? accolades.filter(
        (item) => typeof item === "string" && item.trim().length > 0
      )
    : [];

  if (certs.length === 0 && extra.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Credentials">
      <ProfileSectionHeader title="Credentials" />
      <div className="profile-section-body profile-credentials">
        {certs.length > 0 ? (
          <ul className="profile-credentials__certs">
            {certs.map((cert) => (
              <li key={`${cert.name}-${cert.year}`} className="profile-cert-row profile-cert-row--visual">
                <span className="profile-credentials__mark" aria-hidden>
                  {credentialInitials(cert.name, cert.issuer)}
                </span>
                <div className="profile-credentials__copy">
                  <p className="profile-credentials__name">
                    {cert.name}
                    {cert.issuer.trim() ? ` (${cert.issuer.trim()})` : ""}
                  </p>
                  {cert.year ? (
                    <p className="profile-credentials__issuer">
                      Active through {cert.year}
                    </p>
                  ) : cert.issuer.trim() ? (
                    <p className="profile-credentials__issuer">{cert.issuer}</p>
                  ) : null}
                </div>
                <span className="profile-credentials__verified" title="Listed on SMOAC">
                  <CheckIcon className="profile-credentials__check" />
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {extra.length > 0 ? (
          <ul className="profile-details-pills">
            {extra.map((item) => (
              <li key={item}>
                <span className="profile-tag-pill profile-tag-pill--fit">{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </ProfileSection>
  );
}
