import type { Metadata } from "next";
import { AdminDashboardPageClient } from "@/components/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "SMOAC platform administration.",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <AdminDashboardPageClient />;
}
