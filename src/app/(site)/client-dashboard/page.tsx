import dynamic from "next/dynamic";
import type { Metadata } from "next";

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
};

export default function ClientDashboardPage() {
  return <ClientDashboardPageClient />;
}
