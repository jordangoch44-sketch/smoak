import Link from "next/link";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  LEGAL_EFFECTIVE_DATE,
  PRICING_SECTIONS,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";

export const metadata = {
  title: "Pricing",
  description: "How pricing works for clients and specialists on SMOAC.",
};

export default function PricingPage() {
  return (
    <LegalDocumentPage
      title="Pricing"
      description="How discovery, inquiries, and specialist listing work during early access."
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={PRICING_SECTIONS}
      related={[
        { label: "Become a Specialist", href: SITE_ROUTES.join },
        { label: "Explore Specialists", href: SITE_ROUTES.explore },
        { label: "Contact Us", href: SITE_ROUTES.contact },
      ]}
    >
      <Link href={SITE_ROUTES.explore} className="legal-page__cta">
        Explore specialists
      </Link>
    </LegalDocumentPage>
  );
}
