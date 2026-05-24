import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AppProviders } from "@/components/providers/AppProviders";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SMOAC — Luxury Personal Training",
    template: "%s | SMOAC",
  },
  description:
    "Discover vetted health, fitness, and wellness specialists. A curated marketplace for those who demand excellence.",
  openGraph: {
    type: "website",
    siteName: "SMOAC",
    title: "SMOAC — Luxury Personal Training",
    description:
      "Discover vetted health, fitness, and wellness specialists. A curated marketplace for those who demand excellence.",
    images: [
      {
        url: "/smoac-wordmark.png",
        width: 881,
        height: 78,
        alt: "SMOAC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SMOAC — Luxury Personal Training",
    description:
      "Discover vetted health, fitness, and wellness specialists. A curated marketplace for those who demand excellence.",
    images: ["/smoac-wordmark.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/smoac-mark.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-black text-white antialiased">
        <ToastProvider>
          <AppProviders>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </AppProviders>
        </ToastProvider>
      </body>
    </html>
  );
}
