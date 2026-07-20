import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  COOKIE_SECTIONS,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";

export const metadata = {
  title: "Cookie Policy",
  description: "How SMOAC uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalDocumentPage
      title="Cookie Policy"
      description="How cookies and similar technologies support sign-in, preferences, and product improvement."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={COOKIE_SECTIONS}
      related={[
        { label: "Privacy Policy", href: SITE_ROUTES.privacy },
        { label: "Terms of Service", href: SITE_ROUTES.terms },
        { label: "Contact Us", href: SITE_ROUTES.contact },
      ]}
    />
  );
}
