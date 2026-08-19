import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPageClient } from "@/components/auth";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to SMOAC as a client or wellness specialist.",
  ...NOINDEX_FOLLOW_NONE,
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
