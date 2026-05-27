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
            <span className="home-hero__title-line">Find your</span>
            <span className="home-hero__title-line home-hero__title-line--accent">
              perfect specialist.
            </span>
          </h1>
          <p className="home-hero__lede">
            Search vetted specialists by specialty, neighborhood, and coaching
            style — instantly.
          </p>
        </div>

        <div className="home-hero__search-stage">
          <SearchBar
            showFilterChips
            showTrustIndicators
            enableSuggestions
            variant="hero"
            composerBackdrop={
              <div className="home-hero__search-mesh" aria-hidden>
                <span className="home-hero__search-mesh-blob home-hero__search-mesh-blob--violet" />
                <span className="home-hero__search-mesh-blob home-hero__search-mesh-blob--magenta" />
                <span className="home-hero__search-mesh-blob home-hero__search-mesh-blob--indigo" />
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}
