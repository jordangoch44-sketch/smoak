/** Homepage hero trust indicators — marketplace scale (display copy) */

export const HOME_HERO_TRUST_VERIFIED = "327 Verified Specialists";
export const HOME_HERO_TRUST_SEARCHES = "1,200+ Monthly Searches";

export function getHomeHeroTrustCityLabel(
  personalizationCity: string | null
): string {
  const city = personalizationCity?.trim() || "San Diego";
  return `${city}-Based`;
}

/** Single-row hero stat segments (horizontal layout with separators). */
export function getHomeHeroTrustSegments(
  personalizationCity: string | null
): readonly [string, string, string] {
  return [
    HOME_HERO_TRUST_VERIFIED,
    getHomeHeroTrustCityLabel(personalizationCity),
    HOME_HERO_TRUST_SEARCHES,
  ];
}
