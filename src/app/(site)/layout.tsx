import { Suspense } from "react";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/site-shell.css";
import { AppMain } from "@/components/layout/AppMain";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteWelcomeIntroGateLazy } from "@/components/layout/SiteWelcomeIntroGateLazy";
import { AppProviders } from "@/components/providers/AppProviders";
import { ToastProvider } from "@/components/ui/toast";
import { DevServiceWorkerCleanup } from "@/components/dev/DevServiceWorkerCleanup";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${inter.variable} app-shell min-h-full flex flex-col bg-black text-white antialiased`}
      id="root"
    >
      {process.env.NODE_ENV === "development" ? (
        <DevServiceWorkerCleanup />
      ) : null}
      <ToastProvider>
        <AppProviders>
          <SiteWelcomeIntroGateLazy />
          <SiteHeader />
          <AppMain>{children}</AppMain>
          <Footer />
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
        </AppProviders>
      </ToastProvider>
    </div>
  );
}
