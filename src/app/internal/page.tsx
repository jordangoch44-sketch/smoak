import type { Metadata } from "next";
import { AdminDashboardPageClient } from "@/components/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMOAC Control",
  description: "SMOAC internal operations.",
  robots: { index: false, follow: false, nocache: true },
};

export default function InternalDashboardPage() {
  return (
    <div className="internal-console">
      <AdminDashboardPageClient />
    </div>
  );
}
