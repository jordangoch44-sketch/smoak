import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { FAQ_SECTIONS, LEGAL_EFFECTIVE_DATE } from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

export const metadata = {
  title: "FAQ",
  description: "Frequently asked questions about the SMOAC marketplace.",
};

export default function FaqPage() {
  return (
    <LegalDocumentPage
      title="FAQ"
      description="Quick answers about discovering specialists, inquiries, and how SMOAC works."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={FAQ_SECTIONS}
      related={[
        { label: "Help Center", href: SITE_ROUTES.support },
        { label: "Contact Us", href: SITE_ROUTES.contact },
        { label: "Explore Specialists", href: SITE_ROUTES.explore },
      ]}
    >
      <a href={supportMailto({ subject: "SMOAC question" })} className="legal-page__cta">
        Email {SUPPORT_EMAIL}
      </a>
    </LegalDocumentPage>
  );
}
