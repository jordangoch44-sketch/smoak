import Link from "next/link";
import { SITE_ROUTES } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export const AGE_CONFIRMATION_ERROR = "Confirm you are 18 or older.";

interface LegalAgreementNoticeProps {
  className?: string;
  ofAge: boolean;
  onOfAgeChange: (value: boolean) => void;
}

/** Shown on signup (not sign-in). An account cannot be created until the age box is checked. */
export function LegalAgreementNotice({
  className,
  ofAge,
  onOfAgeChange,
}: LegalAgreementNoticeProps) {
  return (
    <div className={cn("auth-legal-notice", className)}>
      <label className="auth-age">
        <input
          type="checkbox"
          checked={ofAge}
          onChange={(event) => onOfAgeChange(event.target.checked)}
        />
        <span>I am 18 or older.</span>
      </label>
      <p className="auth-legal-notice__agree">
        By continuing, you agree to SMOAC’s{" "}
        <Link href={SITE_ROUTES.terms}>Terms of Service</Link> and{" "}
        <Link href={SITE_ROUTES.privacy}>Privacy Policy</Link>.
      </p>
    </div>
  );
}
