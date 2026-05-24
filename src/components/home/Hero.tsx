import Link from "next/link";
import { SearchBar } from "./SearchBar";

export function Hero() {
  return (
    <section className="home-hero relative overflow-hidden px-4 sm:px-6">
      <div className="home-hero__canvas" aria-hidden>
        <div className="atmosphere-mesh">
          <div className="atmosphere-blob atmosphere-blob--indigo" />
          <div className="atmosphere-blob atmosphere-blob--blue" />
          <div className="atmosphere-blob atmosphere-blob--violet" />
          <div className="atmosphere-blob atmosphere-blob--magenta" />
          <div className="atmosphere-blob atmosphere-blob--pink" />
          <div className="atmosphere-blob atmosphere-blob--core" />
        </div>
        <div className="home-hero__search-light" />
        <div className="atmosphere-vignette atmosphere-vignette--hero" />
        <div className="atmosphere-grain" />
      </div>

      <div className="home-hero__content">
        <div className="home-hero__headline">
          <h1 className="home-hero__title">
            Find the right health &amp; wellness specialist.
          </h1>
          <p className="home-hero__lede">
            Search vetted specialists by specialty, location, price, and coaching
            style.
          </p>
        </div>

        <div className="home-hero__search-stage">
          <div className="home-hero__search-mesh" aria-hidden>
            <span className="home-hero__search-mesh-blob home-hero__search-mesh-blob--violet" />
            <span className="home-hero__search-mesh-blob home-hero__search-mesh-blob--magenta" />
            <span className="home-hero__search-mesh-blob home-hero__search-mesh-blob--indigo" />
          </div>
          <SearchBar showFilterChips variant="hero" />
        </div>

        <p className="home-hero__cta-mobile md:hidden">
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-black transition-opacity active:opacity-90"
          >
            Find Your Specialist
          </Link>
        </p>
      </div>
    </section>
  );
}
