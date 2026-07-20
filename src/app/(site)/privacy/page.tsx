import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_SECTIONS,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";

export const metadata = {
  title: "Privacy Policy",
  description: "How SMOAC collects, uses, and shares information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      description="How SMOAC collects, uses, and shares information when you browse, create an account, or send an inquiry."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={PRIVACY_SECTIONS}
      related={[
        { label: "Terms of Service", href: SITE_ROUTES.terms },
        { label: "Help Center", href: SITE_ROUTES.support },
      ]}
    />
  );
}
