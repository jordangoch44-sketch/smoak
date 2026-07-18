import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { LEGAL_EFFECTIVE_DATE, SUPPORT_SECTIONS } from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";

export const metadata = {
  title: "Help & Support",
  description: "Get help with your SMOAC account, inquiries, and listings.",
};

export default function SupportPage() {
  return (
    <LegalDocumentPage
      title="Help & Support"
      description="Account help, inquiry questions, and how to reach the SMOAC team."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={SUPPORT_SECTIONS}
      related={[
        { label: "About SMOAC", href: SITE_ROUTES.about },
        { label: "Privacy Policy", href: SITE_ROUTES.privacy },
        { label: "Terms of Service", href: SITE_ROUTES.terms },
      ]}
    />
  );
}
