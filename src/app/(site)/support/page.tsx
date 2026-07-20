import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { LEGAL_EFFECTIVE_DATE, SUPPORT_SECTIONS } from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";

export const metadata = {
  title: "Help Center",
  description: "Get help with your SMOAC account, inquiries, and listings.",
};

export default function SupportPage() {
  return (
    <LegalDocumentPage
      title="Help Center"
      description="Account help, inquiry questions, and how to reach the SMOAC team."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={SUPPORT_SECTIONS}
      related={[
        { label: "About SMOAC", href: SITE_ROUTES.about },
        { label: "Contact Us", href: SITE_ROUTES.contact },
        { label: "FAQ", href: SITE_ROUTES.faq },
      ]}
    />
  );
}
