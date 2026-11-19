import { Suspense } from "react";
import type { Metadata } from "next";
import { Hero, Categories, HomeEssenceSlideshow } from "@/components/home";
import { HomeDiscoveryClient } from "@/components/home/HomeDiscoveryClient";
import { HomeRailsLoading } from "@/components/home/HomeRouteLoading";
import { HomeScrollReset } from "@/components/home/HomeScrollReset";
import { HomeSeoSpecialistLinks } from "@/components/home/HomeSeoSpecialistLinks";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";
import "@/styles/home-marketplace-theme.css";

export const metadata: Metadata = {
  title: {
    absolute: "SMOAC | Health and fitness Search",
  },
  description:
    "SMOAC is a health and fitness search marketplace. Browse personal trainers, strength coaches, nutritionists, and wellness professionals in your area.",
  openGraph: {
    title: "SMOAC | Health and fitness Search",
    description:
      "Search and compare health and fitness specialists — trainers, coaches, and wellness professionals near you.",
  },
};

async function HomeSeoSpecialistIndex() {
  const { trainers } = await loadPublicCatalogForServer();
  return <HomeSeoSpecialistLinks trainers={trainers} />;
}

/** Cards come from the approved catalog on the server. The hero stays sync. */
async function HomeDiscoveryRails() {
  const { trainers, mode } = await loadPublicCatalogForServer();
  return (
    <HomeDiscoveryClient initialCatalog={trainers} catalogMode={mode} />
  );
}

/**
 * Hero and categories paint immediately. Specialist cards stream from the
 * server catalog so the first response includes the rails, not empty shells.
 */
export default function HomePage() {
  return (
    <div className="home-page home-page--discovery">
      <HomeScrollReset />
      <AuroraAtmosphere
        intensity="subtle"
        starDensity="none"
        glowPosition="header"
        glowColor="mixed"
        enableMotion
        className="home-page__cosmic"
      />
      <div className="home-page__sky" aria-hidden />
      <Hero />
      <Categories />
      <Suspense fallback={<HomeRailsLoading />}>
        <HomeDiscoveryRails />
      </Suspense>
      <Suspense fallback={null}>
        <HomeSeoSpecialistIndex />
      </Suspense>
      <HomeEssenceSlideshow />
    </div>
  );
}
