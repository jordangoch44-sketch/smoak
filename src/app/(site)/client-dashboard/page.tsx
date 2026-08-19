import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

const ClientDashboardPageClient = dynamic(
  () =>
    import("@/components/dashboard/ClientDashboardPageClient").then(
      (mod) => mod.ClientDashboardPageClient
    ),
  { ssr: true }
);

export const metadata: Metadata = {
  title: "Client Dashboard",
  description: "Your saved specialists, searches, and inquiries on SMOAC.",
  ...NOINDEX_FOLLOW_NONE,
};

export default function ClientDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-page dashboard-page--loading">
          <div className="dashboard-page__content">
            <p className="dashboard-page__subtitle">Loading your dashboard…</p>
          </div>
        </div>
      }
    >
      <ClientDashboardPageClient />
    </Suspense>
  );
}
