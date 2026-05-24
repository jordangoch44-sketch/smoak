import type { Trainer } from "@/types";

/** Card / profile line: “Mira Mesa, San Diego” */
export function formatProviderLocation(provider: Pick<Trainer, "city" | "neighborhood">): string {
  if (provider.neighborhood) {
    return `${provider.neighborhood}, ${provider.city}`;
  }
  return provider.city;
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
