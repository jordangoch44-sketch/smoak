import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMOAC",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Root shell — no global CSS, providers, or chrome (see (site)/layout and (diagnostics)/tap-test) */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
