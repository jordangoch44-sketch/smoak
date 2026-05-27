"use client";

import dynamic from "next/dynamic";

const SiteWelcomeIntroGate = dynamic(
  () =>
    import("@/components/layout/SiteWelcomeIntroGate").then(
      (mod) => mod.SiteWelcomeIntroGate
    ),
  { ssr: false }
);

export function SiteWelcomeIntroGateLazy() {
  return <SiteWelcomeIntroGate />;
}
