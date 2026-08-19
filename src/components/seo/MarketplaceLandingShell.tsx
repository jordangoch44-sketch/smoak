import Image from "next/image";
import Link from "next/link";
import { MARKETPLACE_CITIES } from "@/data/locations";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  MARKETPLACE_PROFESSION_LANDINGS,
} from "@/lib/seo/marketplace-slugs";
import {
  buildExploreHrefForLanding,
  landingTrainerLocationLine,
  marketplaceCityHubPath,
  marketplaceProfessionLandingPath,
} from "@/lib/seo/marketplace-landing";
import type { MarketplaceCity } from "@/data/locations";
import type { MarketplaceProfessionLanding } from "@/lib/seo/marketplace-slugs";
import type { Trainer } from "@/types/trainer";

interface MarketplaceLandingShellProps {
  city: MarketplaceCity;
  profession?: MarketplaceProfessionLanding;
  trainers: Trainer[];
  jsonLd: Record<string, unknown>[];
  title: string;
  lede: string;
}

function safeImageSrc(url: string | undefined): string | null {
  const value = url?.trim() ?? "";
  if (!value) return null;
  if (/^(javascript|data|vbscript):/i.test(value)) return null;
  if (/^(https?:\/\/|\/)/i.test(value)) return value;
  return null;
}

export function MarketplaceLandingShell({
  city,
  profession,
  trainers,
  jsonLd,
  title,
  lede,
}: MarketplaceLandingShellProps) {
  const exploreHref = buildExploreHrefForLanding(city, profession);
  const cityHubHref = marketplaceCityHubPath(city);

  return (
    <div className="seo-landing">
      {jsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}

      <article className="seo-landing__article">
        <header className="seo-landing__header">
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
          <h1 className="seo-landing__title">{title}</h1>
          <p className="seo-landing__lede">{lede}</p>

          <div className="seo-landing__actions">
            <Link href={exploreHref} className="seo-landing__cta">
              Search on map
            </Link>
            <Link href="/rankings" className="seo-landing__cta seo-landing__cta--ghost">
              City rankings
            </Link>
          </div>
        </header>

        {!profession ? (
          <section className="seo-landing__section" aria-labelledby="seo-professions">
            <h2 id="seo-professions" className="seo-landing__section-title">
              Browse by profession in {city}
            </h2>
            <ul className="seo-landing__chip-list">
              {MARKETPLACE_PROFESSION_LANDINGS.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={marketplaceProfessionLandingPath(city, entry)}
                    className="seo-landing__chip"
                  >
                    {entry.pluralLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="seo-landing__section" aria-labelledby="seo-specialists">
          <h2 id="seo-specialists" className="seo-landing__section-title">
            {trainers.length > 0
              ? `${trainers.length} specialist${trainers.length === 1 ? "" : "s"} on SMOAC`
              : "Specialists coming soon"}
          </h2>

          {trainers.length > 0 ? (
            <ul className="seo-landing__cards">
              {trainers.map((trainer, index) => {
                const href = `/trainers/${encodeURIComponent(trainer.id)}`;
                const imageSrc = safeImageSrc(trainer.image);
                const location = landingTrainerLocationLine(trainer);
                return (
                  <li key={trainer.id}>
                    <article className="seo-landing-card">
                      <Link href={href} className="seo-landing-card__link">
                        <div className="seo-landing-card__media">
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt=""
                              width={120}
                              height={140}
                              className="seo-landing-card__photo"
                              priority={index < 3}
                            />
                          ) : (
                            <span className="seo-landing-card__photo seo-landing-card__photo--empty" />
                          )}
                        </div>
                        <div className="seo-landing-card__body">
                          <h3 className="seo-landing-card__name">{trainer.name}</h3>
                          <p className="seo-landing-card__profession">
                            {trainer.profession}
                          </p>
                          {location ? (
                            <p className="seo-landing-card__location">{location}</p>
                          ) : null}
                          {trainer.pricePerSession > 0 ? (
                            <p className="seo-landing-card__price">
                              From ${trainer.pricePerSession}/session
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
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
                <Link href="/create-account" className="seo-landing__cta seo-landing__cta--ghost">
                  Become a specialist
                </Link>
              </div>
            </div>
          )}
        </section>

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
