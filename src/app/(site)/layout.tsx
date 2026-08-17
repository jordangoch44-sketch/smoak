import { Suspense } from "react";
import { Cormorant_Garamond, Inter, Outfit, Syne } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/site-shell.css";
import { AppMain } from "@/components/layout/AppMain";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteVisitTracker } from "@/components/layout/SiteVisitTracker";
import { SiteWelcomeIntroGate } from "@/components/layout/SiteWelcomeIntroGate";
import { SiteLocationGate } from "@/components/layout/SiteLocationGate";
import { IpLocationHintBoot } from "@/components/layout/IpLocationHintBoot";
import { AppProviders } from "@/components/providers/AppProviders";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ToastProvider } from "@/components/ui/toast";
import { DevServiceWorkerCleanup } from "@/components/dev/DevServiceWorkerCleanup";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const outfit = Outfit({
  variable: "--font-profile-modern",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const cormorant = Cormorant_Garamond({
  variable: "--font-profile-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

const syne = Syne({
  variable: "--font-profile-display",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export default function SiteLayout({
  children,
  modal = null,
}: Readonly<{
  children: React.ReactNode;
  /** Soft-nav specialist profile intercept (`@modal/(.)trainers/[id]`) */
  modal?: React.ReactNode;
}>) {
  return (
    <div
      className={`${inter.variable} ${outfit.variable} ${cormorant.variable} ${syne.variable} app-shell min-h-full flex flex-col bg-black text-white antialiased`}
      id="root"
    >
      {process.env.NODE_ENV === "development" ? (
        <DevServiceWorkerCleanup />
      ) : null}
      <ToastProvider>
        <AppProviders supabaseConfigured={isSupabaseConfigured()}>
          <SiteVisitTracker />
          <SiteWelcomeIntroGate />
          <IpLocationHintBoot />
          <SiteLocationGate />
          <SiteHeader />
          <AppMain>{children}</AppMain>
          {/* Soft-nav profile intercept — previous page stays mounted in AppMain */}
          {modal}
          <Footer />
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
        </AppProviders>
      </ToastProvider>
    </div>
  );
}
