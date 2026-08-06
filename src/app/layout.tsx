import type { Metadata } from "next";
import { SiteIntroBoot } from "@/components/layout/SiteIntroBoot";

export const metadata: Metadata = {
  title: "SMOAC",
  applicationName: "SMOAC",
  description:
    "Discover trusted fitness and wellness specialists near you.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://smoac.com"
  ),
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "SMOAC",
    description:
      "Discover trusted fitness and wellness specialists near you.",
    siteName: "SMOAC",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "SMOAC" }],
  },
  twitter: {
    card: "summary",
    title: "SMOAC",
    description:
      "Discover trusted fitness and wellness specialists near you.",
    images: ["/icon-512.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020203",
};

/** Root shell — no global CSS, providers, or chrome (see (site)/layout and (diagnostics)/tap-test) */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body style={{ margin: 0, background: "#020203" }}>
        <SiteIntroBoot />
        {children}
      </body>
    </html>
  );
}
