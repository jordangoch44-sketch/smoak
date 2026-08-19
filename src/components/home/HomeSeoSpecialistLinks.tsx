import Link from "next/link";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { formatProviderLocation } from "@/lib/provider-location";
import {
  cityToSlug,
  findPathForProfession,
} from "@/lib/seo/marketplace-slugs";
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
              const location = formatProviderLocation(trainer);
              const professionLanding = findPathForProfession(profession);
              const citySlug = trainer.city ? cityToSlug(trainer.city) : "";
              const categoryHref =
                professionLanding && citySlug
                  ? `/find/${citySlug}/${professionLanding.slug}`
                  : null;
              return (
                <li key={trainer.id}>
                  <Link href={`/trainers/${encodeURIComponent(trainer.id)}`}>
                    {trainer.name}
                  </Link>
                  <span className="home-seo-links__meta">
                    {[profession, location].filter(Boolean).join(" · ")}
                  </span>
                  {categoryHref && professionLanding ? (
                    <>
                      {" · "}
                      <Link href={categoryHref} className="home-seo-links__category">
                        {professionLanding.pluralLabel} in {trainer.city}
                      </Link>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
    </nav>
  );
}
