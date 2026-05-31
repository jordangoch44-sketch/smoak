import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/dashboard.css";
import "@/styles/admin-dashboard.css";
import "@/styles/internal-portal.css";
import { InternalAuthSessionProvider } from "@/contexts/InternalAuthSessionContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SMOAC Internal",
  robots: { index: false, follow: false, nocache: true },
};

export default function InternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${inter.variable} internal-shell antialiased`}>
      <InternalAuthSessionProvider>{children}</InternalAuthSessionProvider>
    </div>
  );
}
