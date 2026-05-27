"use client";

import dynamic from "next/dynamic";

const MobileBottomNav = dynamic(
  () =>
    import("@/components/layout/MobileBottomNav").then(
      (mod) => mod.MobileBottomNav
    ),
  { ssr: false }
);

export function MobileBottomNavLazy() {
  return <MobileBottomNav />;
}
