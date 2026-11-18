import Link from "next/link";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import {
  LEGAL_EFFECTIVE_DATE,
  PRICING_SECTIONS,
} from "@/lib/legal-content";
import { SITE_ROUTES } from "@/lib/navigation";

export const metadata = {
  title: "Pricing",
  description: "SMOAC is free for clients and specialists while the marketplace grows.",
};

export default function PricingPage() {
  return (
    <LegalDocumentPage
      title="Pricing"
      description="Clients and specialists use SMOAC for free. Specialists set their own session rates."
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
