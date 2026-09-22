import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  LEGAL_EFFECTIVE_DATE,
  SAFETY_SECTIONS,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

export const metadata = {
  title: "Safety & Trust",
  description: "How SMOAC approaches safety and trust on the marketplace.",
};

export default function SafetyPage() {
  return (
    <LegalDocumentPage
      title="Safety & Trust"
      description="What SMOAC’s marketplace role means for clients and specialists."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={SAFETY_SECTIONS}
      related={[
        { label: "Community Guidelines", href: SITE_ROUTES.communityGuidelines },
        { label: "Report a Concern", href: SITE_ROUTES.report },
        { label: "Terms of Service", href: SITE_ROUTES.terms },
      ]}
    >
      <a href={supportMailto({ subject: "SMOAC safety" })} className="legal-page__cta">
        Email {SUPPORT_EMAIL}
      </a>
    </LegalDocumentPage>
  );
}
