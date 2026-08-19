import type { Metadata } from "next";
import { Hero, Categories, HomeEssenceSlideshow } from "@/components/home";
import { HomeDiscoveryClient } from "@/components/home/HomeDiscoveryClient";
import { HomeScrollReset } from "@/components/home/HomeScrollReset";
import { HomeSeoSpecialistLinks } from "@/components/home/HomeSeoSpecialistLinks";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";

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

/**
 * Sync shell — discovery rails hydrate client-side; SSR specialist links aid crawl.
 */
export default async function HomePage() {
  const { trainers } = await loadPublicCatalogForServer();

  return (
    <div className="home-page home-page--discovery">
      <HomeScrollReset />
      <div className="home-page__sky" aria-hidden />
      <Hero />
      <Categories />
      <HomeDiscoveryClient />
      <HomeSeoSpecialistLinks trainers={trainers} />
      <HomeEssenceSlideshow />
    </div>
  );
}
