import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailUnsubscribeClient } from "@/components/email/EmailUnsubscribeClient";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default function EmailUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="legal-page">
          <div className="legal-page__inner">
            <h1 className="legal-page__title">Unsubscribe</h1>
            <p>Updating your preferences…</p>
          </div>
        </main>
      }
    >
      <EmailUnsubscribeClient />
    </Suspense>
  );
}
