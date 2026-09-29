import Link from "next/link";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  cityToSlug,
  findPathForProfession,
} from "@/lib/seo/marketplace-slugs";
import {
  formatIndexableProviderLocation,
  primaryBasedSearchPlaces,
} from "@/lib/seo/specialist-search-places";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import type { Trainer } from "@/types/trainer";

interface HomeSeoSpecialistLinksProps {
  trainers: Trainer[];
}

/**
 * SSR crawl path to public specialist profiles — complements client discovery rails.
 */
export function HomeSeoSpecialistLinks({ trainers }: HomeSeoSpecialistLinksProps) {
  if (trainers.length === 0) return null;

  return (
    <nav
      className="home-seo-links sr-only"
      aria-label="Specialist profiles index"
    >
      <h2 className="home-seo-links__title">Specialist profiles</h2>
          <ul className="home-seo-links__list">
            {trainers.map((trainer) => {
              const profession =
                resolveTrainerProfessionCategory(trainer) ||
                trainer.profession ||
                "Specialist";
              const location = formatIndexableProviderLocation(trainer);
              const professionLanding = findPathForProfession(profession);
              const places = primaryBasedSearchPlaces(trainer, 3);
              return (
                <li key={trainer.id}>
                  <Link href={trainerProfilePath(trainer)}>
                    {trainer.name}
                  </Link>
                  <span className="home-seo-links__meta">
                    {[profession, location].filter(Boolean).join(" · ")}
                  </span>
                  {professionLanding
                    ? places.map((place) => (
                        <span key={place}>
                          {" · "}
                          <Link
                            href={`/find/${cityToSlug(place)}/${professionLanding.slug}`}
                            className="home-seo-links__category"
                          >
                            {professionLanding.pluralLabel} in {place}
                          </Link>
                        </span>
                      ))
                    : null}
                </li>
              );
            })}
          </ul>
    </nav>
  );
}
