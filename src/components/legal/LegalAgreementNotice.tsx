import Link from "next/link";
import { SITE_ROUTES } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface LegalAgreementNoticeProps {
  className?: string;
}

/** Shown on signup (not sign-in). Counsel should confirm final wording. */
export function LegalAgreementNotice({ className }: LegalAgreementNoticeProps) {
  return (
    <p className={cn("auth-legal-notice", className)}>
      By continuing, you agree to SMOAC’s{" "}
      <Link href={SITE_ROUTES.terms}>Terms of Service</Link> and{" "}
      <Link href={SITE_ROUTES.privacy}>Privacy Policy</Link>.
    </p>
  );
}
