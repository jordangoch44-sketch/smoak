import type { Trainer } from "@/types";

/**
 * Card / profile line: “Neighborhood, City”.
 * Omits blanks and trailing commas when either part is missing.
 */
export function formatProviderLocation(
  provider: Pick<Trainer, "city" | "neighborhood">
): string {
  const neighborhood = provider.neighborhood?.trim() ?? "";
  const city = provider.city?.trim() ?? "";
  if (neighborhood && city) return `${neighborhood}, ${city}`;
  return neighborhood || city;
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
