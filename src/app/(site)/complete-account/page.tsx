import type { Metadata } from "next";
import { Suspense } from "react";
import { CompleteAccountPageClient } from "@/components/auth/CompleteAccountPageClient";

export const metadata: Metadata = {
  title: "Finish setting up your account | SMOAC",
  robots: { index: false },
};

export default function CompleteAccountPage() {
  return (
    <Suspense fallback={null}>
      <CompleteAccountPageClient />
    </Suspense>
  );
}
