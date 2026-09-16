import { Suspense } from "react";
import type { Metadata } from "next";
import { Hero, Categories, HomeEssenceSlideshow } from "@/components/home";
import { HomeDiscoveryClient } from "@/components/home/HomeDiscoveryClient";
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

/**
 * Sync shell so toolbar tabs don't wait on catalog RSC.
 * Discovery rails read the session catalog; SEO links stream in separately.
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
      <HomeDiscoveryClient />
      <Suspense fallback={null}>
        <HomeSeoSpecialistIndex />
      </Suspense>
      <HomeEssenceSlideshow />
    </div>
  );
}
