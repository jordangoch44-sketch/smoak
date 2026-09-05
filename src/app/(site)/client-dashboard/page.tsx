import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientDashboardPageClient } from "@/components/dashboard/ClientDashboardPageClient";
import { DashboardLoadingState } from "@/components/dashboard/shared";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Client Dashboard",
  description: "Your saved specialists, searches, and inquiries on SMOAC.",
  ...NOINDEX_FOLLOW_NONE,
};

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <ClientDashboardPageClient />
    </Suspense>
  );
}
