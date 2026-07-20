import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  ACCESSIBILITY_SECTIONS,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

export const metadata = {
  title: "Accessibility",
  description: "SMOAC’s accessibility commitment and how to report barriers.",
};

export default function AccessibilityPage() {
  return (
    <LegalDocumentPage
      title="Accessibility"
      description="Our commitment to a more usable marketplace experience for everyone."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={ACCESSIBILITY_SECTIONS}
      related={[
        { label: "Contact Us", href: SITE_ROUTES.contact },
        { label: "Help Center", href: SITE_ROUTES.support },
        { label: "Privacy Policy", href: SITE_ROUTES.privacy },
      ]}
    >
      <a
        href={supportMailto({ subject: "Accessibility feedback" })}
        className="legal-page__cta"
      >
        Email {SUPPORT_EMAIL}
      </a>
    </LegalDocumentPage>
  );
}
