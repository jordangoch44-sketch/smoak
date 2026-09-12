import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  LEGAL_COUNSEL_NOTICE,
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_SECTIONS,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";
import { SUPPORT_EMAIL, accountDeletionMailto } from "@/lib/site-contact";

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
      notice={LEGAL_COUNSEL_NOTICE}
      sections={PRIVACY_SECTIONS}
      related={[
        { label: "Terms of Service", href: SITE_ROUTES.terms },
        { label: "Cookie Policy", href: SITE_ROUTES.cookies },
        { label: "Help Center", href: SITE_ROUTES.support },
      ]}
    >
      <a
        href={accountDeletionMailto()}
        className="legal-page__cta"
      >
        Email {SUPPORT_EMAIL} to delete your account
      </a>
    </LegalDocumentPage>
  );
}
