import type { Metadata } from "next";
import { ForgotPasswordPageClient } from "@/components/auth/ForgotPasswordPageClient";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Forgot Password",
  ...NOINDEX_FOLLOW_NONE,
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
