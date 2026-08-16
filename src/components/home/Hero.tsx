import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { HomeEssenceSlideshow } from "./HomeEssenceSlideshow";
import { RotatingSpecialistHeadline } from "./RotatingSpecialistHeadline";

export function Hero() {
  return (
    <section className="home-hero home-hero--discovery relative px-4 sm:px-6">
      <div className="home-hero__canvas" aria-hidden>
        <div className="atmosphere-mesh">
          <div className="atmosphere-blob atmosphere-blob--indigo" />
          <div className="atmosphere-blob atmosphere-blob--blue" />
          <div className="atmosphere-blob atmosphere-blob--violet" />
          <div className="atmosphere-blob atmosphere-blob--magenta" />
          <div className="atmosphere-blob atmosphere-blob--pink" />
          <div className="atmosphere-blob atmosphere-blob--core" />
        </div>
        <AuroraAtmosphere
          intensity="soft"
          starDensity="none"
          glowPosition="hero"
          glowColor="purple"
          enableMotion
          className="home-hero__cosmic"
        />
        <div className="atmosphere-vignette atmosphere-vignette--hero" />
        <div className="atmosphere-grain" />
      </div>

      <div className="home-hero__content home-hero__content--discovery">
        <div className="home-hero__headline">
          <RotatingSpecialistHeadline />
          <p className="home-hero__lede">
            Discover the highest-rated health &amp; wellness professionals in
            your area.
          </p>
        </div>
      </div>

      <HomeEssenceSlideshow />
    </section>
  );
}
