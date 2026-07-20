import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  LEGAL_EFFECTIVE_DATE,
  REPORT_SECTIONS,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

export const metadata = {
  title: "Report a Concern",
  description: "Report abuse, safety issues, or guideline violations on SMOAC.",
};

export default function ReportPage() {
  return (
    <LegalDocumentPage
      title="Report a Concern"
      description="Tell us about abuse, unsafe behavior, or content that may violate our guidelines."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={REPORT_SECTIONS}
      related={[
        { label: "Safety & Trust", href: SITE_ROUTES.safety },
        { label: "Community Guidelines", href: SITE_ROUTES.communityGuidelines },
        { label: "Contact Us", href: SITE_ROUTES.contact },
      ]}
    >
      <a
        href={supportMailto({
          subject: "Urgent: SMOAC concern report",
        })}
        className="legal-page__cta"
      >
        Email {SUPPORT_EMAIL}
      </a>
    </LegalDocumentPage>
  );
}
