import type { Metadata } from "next";
import { formatProviderLocation } from "@/lib/provider-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { absoluteUrl } from "@/lib/seo/site-url";
import type { Trainer } from "@/types/trainer";

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function pickTrainerOgImage(trainer: Trainer): string | undefined {
  const candidates = [
    trainer.heroImage,
    trainer.image,
    trainer.galleryImages?.[0],
    trainer.pinnedPhotos?.[0],
  ];
  for (const raw of candidates) {
    const url = raw?.trim() ?? "";
    if (!url) continue;
    if (/^(https?:\/\/|\/)/i.test(url)) return url;
  }
  return undefined;
}

export function buildTrainerPageMetadata(trainer: Trainer): Metadata {
  const profession =
    resolveTrainerProfessionCategory(trainer) ||
    trainer.profession?.trim() ||
    "Wellness Specialist";
  const location =
    formatProviderLocation(trainer) ||
    trainer.city?.trim() ||
    trainer.location?.trim() ||
    "";
  const title = location
    ? `${trainer.name} · ${profession} · ${location}`
    : `${trainer.name} · ${profession}`;
  const bio = trainer.bio?.trim() ?? "";
  const headline = trainer.title?.trim() ?? "";
  const description = truncate(
    bio ||
      headline ||
      `${trainer.name} is a ${profession}${location ? ` in ${location}` : ""}. View session rates, reviews, and specialties on SMOAC.`,
    160
  );
  const canonical = absoluteUrl(`/trainers/${encodeURIComponent(trainer.id)}`);
  const image = pickTrainerOgImage(trainer);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: trainer.name,
      description,
      url: canonical,
      type: "website",
      siteName: "SMOAC",
      ...(image ? { images: [{ url: image, alt: trainer.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: trainer.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
