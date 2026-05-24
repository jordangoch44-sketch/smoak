import type { Metadata } from "next";
import { ClientDashboardPageClient } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Client Dashboard",
  description: "Your saved specialists, searches, and inquiries on SMOAC.",
};

export default function ClientDashboardPage() {
  return <ClientDashboardPageClient />;
}
