import type { Metadata } from "next";
import { AppBootSplash } from "@/components/brand/AppBootSplash";

export const metadata: Metadata = {
  title: {
    default: "SMOAC | Health and fitness Search",
    template: "%s | SMOAC",
  },
  applicationName: "SMOAC",
  description:
    "SMOAC is a health and fitness search marketplace — discover personal trainers, coaches, nutritionists, and wellness specialists near you.",
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
    title: "SMOAC | Health and fitness Search",
    description:
      "SMOAC is a health and fitness search marketplace — discover personal trainers, coaches, and wellness specialists near you.",
    siteName: "SMOAC",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "SMOAC" }],
  },
  twitter: {
    card: "summary",
    title: "SMOAC | Health and fitness Search",
    description:
      "SMOAC is a health and fitness search marketplace — discover personal trainers, coaches, and wellness specialists near you.",
    images: ["/icon-512.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#020203",
  /* Keep pinch-zoom. Do not set maximumScale / userScalable — iOS ignores
   * locks for a11y, and locking causes worse focus/layout bugs. */
};


/**
 * Parser-blocking on purpose. `next/script` beforeInteractive only queues
 * onto `__next_s` and runs after the first paint, which let Marketplace
 * flash before the S. This runs while the head is parsed, before the body.
 */
const NATIVE_APP_BOOT_SCRIPT = `try{var c=window.Capacitor;if(c&&typeof c.isNativePlatform==="function"&&c.isNativePlatform()){var h=document.documentElement;h.classList.add("native-app");h.dataset.smoacBoot=String(performance.now())}}catch(e){}`;

/** Cover the viewport before smoac-loader.css arrives. Animation stays in that file. */
const NATIVE_APP_BOOT_CSS = `#app-boot-splash{display:none}html.native-app #app-boot-splash{display:flex;position:fixed;inset:0;z-index:2000000;align-items:center;justify-content:center;background:#020203;pointer-events:auto}html.native-app #app-boot-splash .app-boot-splash__mark,html.native-app #app-boot-splash svg{width:148px;height:124px;display:block}`;

/** Root shell — no global CSS, providers, or chrome (see (site)/layout and (diagnostics)/tap-test) */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NATIVE_APP_BOOT_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: NATIVE_APP_BOOT_CSS }} />
      </head>
      <body style={{ margin: 0, background: "#020203" }}>
        <AppBootSplash />
        {children}
      </body>
    </html>
  );
}
