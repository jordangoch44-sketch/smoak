import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { LEGAL_EFFECTIVE_DATE, TERMS_SECTIONS } from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";

export const metadata = {
  title: "Terms of Service",
  description: "Terms for using the SMOAC wellness marketplace.",
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      description="The rules for using SMOAC as a client or specialist on our marketplace."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={TERMS_SECTIONS}
      related={[
        { label: "Privacy Policy", href: SITE_ROUTES.privacy },
        { label: "Help Center", href: SITE_ROUTES.support },
      ]}
    />
  );
}
