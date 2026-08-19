import Link from "next/link";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { formatProviderLocation } from "@/lib/provider-location";
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
    <nav className="home-seo-links" aria-label="Featured specialists">
      <h2 className="home-seo-links__title">Featured specialists</h2>
      <ul className="home-seo-links__list">
        {trainers.map((trainer) => {
          const profession =
            resolveTrainerProfessionCategory(trainer) ||
            trainer.profession ||
            "Specialist";
          const location = formatProviderLocation(trainer);
          return (
            <li key={trainer.id}>
              <Link href={`/trainers/${encodeURIComponent(trainer.id)}`}>
                {trainer.name}
              </Link>
              <span className="home-seo-links__meta">
                {[profession, location].filter(Boolean).join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
