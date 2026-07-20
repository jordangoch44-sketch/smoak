import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  CONTACT_SECTIONS,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

export const metadata = {
  title: "Contact Us",
  description: "Contact the SMOAC team for account help and product questions.",
};

export default function ContactPage() {
  return (
    <LegalDocumentPage
      title="Contact Us"
      description="Reach the SMOAC team for account help, feedback, and marketplace questions."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={CONTACT_SECTIONS}
      related={[
        { label: "Help Center", href: SITE_ROUTES.support },
        { label: "Report a Concern", href: SITE_ROUTES.report },
        { label: "FAQ", href: SITE_ROUTES.faq },
      ]}
    >
      <a
        href={supportMailto({ subject: "SMOAC contact" })}
        className="legal-page__cta"
      >
        Email {SUPPORT_EMAIL}
      </a>
    </LegalDocumentPage>
  );
}
