import type { Trainer } from "@/types";

/**
 * Card / profile line: “Neighborhood, City · ZIP”.
 * Omits blanks; never trailing commas or lone separators.
 */
export function formatProviderLocation(
  provider: Pick<Trainer, "city" | "neighborhood" | "zipCode">
): string {
  const neighborhood = provider.neighborhood?.trim() ?? "";
  const city = provider.city?.trim() ?? "";
  const zip = provider.zipCode?.trim() ?? "";

  let place = "";
  if (neighborhood && city) place = `${neighborhood}, ${city}`;
  else place = neighborhood || city;

  if (place && zip) return `${place} · ${zip}`;
  return place || zip;
}

/**
 * Whether a provider matches neighborhood filter (primary neighborhood or service area).
 */
export function providerMatchesNeighborhood(
  provider: Pick<Trainer, "neighborhood" | "serviceArea">,
  neighborhood: string
): boolean {
  if (!neighborhood) return true;
  if (provider.neighborhood === neighborhood) return true;
  return provider.serviceArea?.includes(neighborhood) ?? false;
}
