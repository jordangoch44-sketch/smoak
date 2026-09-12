import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageWait } from "@/components/auth/AuthPageWait";
import { CompleteAccountPageClient } from "@/components/auth/CompleteAccountPageClient";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Finish setting up your account",
  ...NOINDEX_FOLLOW_NONE,
};

export default function CompleteAccountPage() {
  return (
    <Suspense fallback={<AuthPageWait label="Securing your account" />}>
      <CompleteAccountPageClient />
    </Suspense>
  );
}
