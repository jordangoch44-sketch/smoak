import Link from "next/link";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { ABOUT_SECTIONS, LEGAL_EFFECTIVE_DATE } from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";

export const metadata = {
  title: "About SMOAC",
  description: "Mission and overview of the SMOAC marketplace.",
};

export default function AboutPage() {
  return (
    <LegalDocumentPage
      title="About SMOAC"
      description="A curated marketplace for health, fitness, and wellness specialists."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={ABOUT_SECTIONS}
      related={[
        { label: "Explore specialists", href: SITE_ROUTES.explore },
        { label: "Privacy Policy", href: SITE_ROUTES.privacy },
        { label: "Terms of Service", href: SITE_ROUTES.terms },
      ]}
    >
      <Link href={SITE_ROUTES.explore} className="legal-page__cta">
        Explore specialists
      </Link>
    </LegalDocumentPage>
  );
}
