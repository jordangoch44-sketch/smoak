import Image from "next/image";
import Link from "next/link";
import { isMarketplaceCity, MARKETPLACE_CITIES } from "@/data/locations";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import { JsonLd } from "@/components/seo/JsonLd";
import { SeoBrowseDialog } from "@/components/seo/SeoBrowseDialog";
import { TrainerList } from "@/components/trainers";
import type { ComponentType } from "react";
import {
  AppleFruitIcon,
  ChartIcon,
  ChevronRightIcon,
  DumbbellIcon,
  FoldedMapIcon,
  HeartIcon,
  LeafIcon,
  MedicalCrossIcon,
  MeditationIcon,
  MessageBubbleIcon,
  RunningFigureIcon,
  RunningShoeIcon,
  SpineIcon,
} from "@/components/ui/icons";
import {
  MARKETPLACE_PROFESSION_LANDINGS,
} from "@/lib/seo/marketplace-slugs";
import {
  buildExploreHrefForLanding,
  marketplaceCityHubPath,
  marketplaceProfessionLandingPath,
} from "@/lib/seo/marketplace-landing";
import { rankingHeroSkyline } from "@/lib/ranking-hero";
import type { MarketplaceProfessionLanding } from "@/lib/seo/marketplace-slugs";
import type { Trainer } from "@/types/trainer";

interface MarketplaceLandingShellProps {
  city: string;
  profession?: MarketplaceProfessionLanding;
  trainers: Trainer[];
  /** Based elsewhere; list this place as a travel area. */
  travelingTrainers: Trainer[];
  jsonLd: Record<string, unknown>[];
}

const PROFESSION_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "personal-training": DumbbellIcon,
  "physical-therapy": RunningFigureIcon,
  "massage-therapy": HeartIcon,
  bodywork: LeafIcon,
  chiropractic: SpineIcon,
  "nutrition-dietetics": AppleFruitIcon,
  yoga: MeditationIcon,
  pilates: MeditationIcon,
  "mental-health-therapy": MessageBubbleIcon,
  "medical-iv-wellness": MedicalCrossIcon,
  "sports-endurance-coaching": RunningShoeIcon,
};

function landingSubject(profession?: MarketplaceProfessionLanding): string {
  if (!profession) return "specialists";
  if (profession.slug === "personal-training") return "trainers";
  return profession.pluralLabel.toLowerCase();
}

export function MarketplaceLandingShell({
  city,
  profession,
  trainers,
  travelingTrainers,
  jsonLd,
}: MarketplaceLandingShellProps) {
  const professionLinks = isMarketplaceCity(city)
    ? MARKETPLACE_PROFESSION_LANDINGS
    : MARKETPLACE_PROFESSION_LANDINGS.filter((entry) =>
        trainers.some((trainer) =>
          trainerMatchesProfessionCategory(trainer, entry.profession)
        )
      );
  const exploreHref = buildExploreHrefForLanding(city, profession);
  const cityHubHref = marketplaceCityHubPath(city);
  const skyline = rankingHeroSkyline(city);
  const titleLead = profession
    ? profession.pluralLabel
    : "Health & fitness specialists";

  return (
    <div className="seo-landing">
      {jsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}

      <header className="seo-landing__hero">
        <div className="seo-landing__skyline" aria-hidden>
          <Image
            src={skyline.src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="seo-landing__skyline-img"
          />
        </div>
        <div className="seo-landing__hero-fade" aria-hidden />

        <div className="seo-landing__hero-copy">
          <nav className="seo-landing__breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden>/</span>
            {profession ? (
              <>
                <Link href={cityHubHref}>{city}</Link>
                <span aria-hidden>/</span>
                <span aria-current="page">{profession.pluralLabel}</span>
              </>
            ) : (
              <span aria-current="page">{city}</span>
            )}
          </nav>

          <p className="seo-landing__eyebrow">SMOAC · Health and fitness search</p>
          <h1 className="seo-landing__title">
            <span className="seo-landing__title-line">{titleLead}</span>
            <span className="seo-landing__title-line">
              in <span className="seo-landing__title-place">{city}</span>
            </span>
          </h1>
          <p className="seo-landing__lede">
            <span>Verified {landingSubject(profession)} in {city}.</span>
            <span>Specialties, reviews, and rates.</span>
          </p>

          <div className="seo-landing__actions">
            <Link href={exploreHref} className="seo-landing__cta">
              <FoldedMapIcon className="seo-landing__cta-icon" />
              Search on map
            </Link>
            <Link href="/rankings" className="seo-landing__cta">
              <ChartIcon className="seo-landing__cta-icon" />
              City rankings
            </Link>
          </div>
        </div>
      </header>

      <article className="seo-landing__article">

        {!profession ? (
          <section className="seo-landing__section" aria-label={`Browse by profession in ${city}`}>
            <SeoBrowseDialog
              triggerLabel={`Browse by profession in ${city}`}
              title={`Professions in ${city}`}
            >
              <ul className="seo-browse__list">
                {professionLinks.map((entry) => {
                  const Icon = PROFESSION_ICONS[entry.slug] ?? DumbbellIcon;
                  return (
                    <li key={entry.slug}>
                      <Link
                        href={marketplaceProfessionLandingPath(city, entry)}
                        className="seo-browse__link"
                      >
                        <span className="seo-browse__link-icon" aria-hidden>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="seo-browse__link-label">
                          {entry.pluralLabel} in {city}
                        </span>
                        <ChevronRightIcon className="seo-browse__link-chevron" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SeoBrowseDialog>
          </section>
        ) : null}

        <section className="seo-landing__section" aria-labelledby="seo-specialists">
          <h2 id="seo-specialists" className="seo-landing__section-title">
            {trainers.length > 0
              ? `${trainers.length} specialist${trainers.length === 1 ? "" : "s"} on SMOAC`
              : travelingTrainers.length > 0
                ? `No specialists based in ${city} yet`
                : "Specialists coming soon"}
          </h2>

          {trainers.length > 0 ? (
            <TrainerList
              trainers={trainers}
              variant="explore"
              impressionSurface="find"
              priorityCount={3}
            />
          ) : (
            <div className="seo-landing__empty">
              <p>
                We&apos;re adding verified {profession ? profession.pluralLabel.toLowerCase() : "specialists"} in{" "}
                {city}. Search the full marketplace or list your practice on SMOAC.
              </p>
              <div className="seo-landing__actions">
                <Link href={exploreHref} className="seo-landing__cta">
                  Explore all specialists
                </Link>
                <Link href="/create-account" className="seo-landing__cta">
                  Become a specialist
                </Link>
              </div>
            </div>
          )}
        </section>

        {travelingTrainers.length > 0 ? (
          <section className="seo-landing__section" aria-labelledby="seo-traveling">
            <h2 id="seo-traveling" className="seo-landing__section-title">
              Also travels to {city}
            </h2>
            <p className="seo-landing__section-note">
              Based nearby — these specialists come to clients in {city}.
            </p>
            <TrainerList
              trainers={travelingTrainers}
              variant="explore"
              impressionSurface="find"
              priorityCount={0}
            />
          </section>
        ) : null}

        {profession ? (
          <section className="seo-landing__section" aria-labelledby="seo-faq">
            <h2 id="seo-faq" className="seo-landing__section-title">
              Common questions
            </h2>
            <dl className="seo-landing__faq">
              <div>
                <dt>How do I find a {profession.singularLabel.toLowerCase()} in {city}?</dt>
                <dd>
                  Browse verified profiles on this page, then open a specialist to see
                  specialties, session rates, and client reviews. Use Search on map to filter
                  by neighborhood, price, and more.
                </dd>
              </div>
              <div>
                <dt>Are these {profession.pluralLabel.toLowerCase()} independent?</dt>
                <dd>
                  Yes. Specialists on SMOAC are independent professionals — not employees of
                  SMOAC. You contact them directly through their profile.
                </dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section className="seo-landing__section" aria-labelledby="seo-other-cities">
          <h2 id="seo-other-cities" className="seo-landing__section-title">
            {profession ? "Same profession, other cities" : "Other SMOAC markets"}
          </h2>
          <ul className="seo-landing__chip-list">
            {MARKETPLACE_CITIES.filter((entry) => entry !== city)
              .slice(0, 6)
              .map((otherCity) => (
                <li key={otherCity}>
                  <Link
                    href={
                      profession
                        ? marketplaceProfessionLandingPath(otherCity, profession)
                        : marketplaceCityHubPath(otherCity)
                    }
                    className="seo-landing__chip seo-landing__chip--muted"
                  >
                    {profession
                      ? `${profession.pluralLabel} in ${otherCity}`
                      : otherCity}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
