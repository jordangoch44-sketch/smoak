import { Hero, Categories, HomeEssenceSlideshow } from "@/components/home";
import { HomeDiscoveryClient } from "@/components/home/HomeDiscoveryClient";
import { HomeScrollReset } from "@/components/home/HomeScrollReset";

/**
 * Sync shell — no server catalog await. Soft nav reuses the client catalog
 * store so Marketplace matches Saved/Profile tab speed.
 */
export default function HomePage() {
  return (
    <div className="home-page home-page--discovery">
      <HomeScrollReset />
      <div className="home-page__sky" aria-hidden />
      <Hero />
      <Categories />
      <HomeDiscoveryClient />
      <HomeEssenceSlideshow />
    </div>
  );
}
