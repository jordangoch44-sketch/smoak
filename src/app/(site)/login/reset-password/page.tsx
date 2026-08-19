import type { Metadata } from "next";
import { ResetPasswordPageClient } from "@/components/auth/ResetPasswordPageClient";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Reset Password",
  ...NOINDEX_FOLLOW_NONE,
};

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
