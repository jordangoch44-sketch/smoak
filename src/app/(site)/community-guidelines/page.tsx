import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  COMMUNITY_GUIDELINES_SECTIONS,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

export const metadata = {
  title: "Community Guidelines",
  description: "Behavioral expectations for clients and specialists on SMOAC.",
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalDocumentPage
      title="Community Guidelines"
      description="Clear expectations that help keep SMOAC respectful and usable."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={COMMUNITY_GUIDELINES_SECTIONS}
      related={[
        { label: "Safety & Trust", href: SITE_ROUTES.safety },
        { label: "Report a Concern", href: SITE_ROUTES.report },
        { label: "Terms of Service", href: SITE_ROUTES.terms },
      ]}
    >
      <a href={supportMailto({ subject: "SMOAC guidelines" })} className="legal-page__cta">
        Email {SUPPORT_EMAIL}
      </a>
    </LegalDocumentPage>
  );
}
