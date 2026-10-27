import { parseSessionPrice } from "@/lib/session-price";
import { formatPrice } from "@/lib/utils";
import {
  SPECIALIST_PRICING_OFFERING_TYPES,
  type SpecialistPricingOffering,
  type SpecialistPricingOfferingType,
} from "@/types/specialist-pricing";

export const MAX_PRICING_OFFERINGS = 8;
export const PRICING_OFFERING_NAME_MAX = 60;

export const SPECIALIST_PRICING_OFFERING_OPTIONS: ReadonlyArray<{
  value: SpecialistPricingOfferingType;
  label: string;
  nameHint: string;
  priceHint: string;
  commitmentHint: string;
}> = [
  {
    value: "one-on-one",
    label: "One-on-one session",
    nameHint: "e.g. Private training",
    priceHint: "/ session",
    commitmentHint: "e.g. 8 weeks",
  },
  {
    value: "monthly-membership",
    label: "Monthly membership",
    nameHint: "e.g. Unlimited membership",
    priceHint: "/ month",
    commitmentHint: "e.g. month-to-month",
  },
  {
    value: "package",
    label: "Package or class pack",
    nameHint: "e.g. 10-session pack",
    priceHint: "",
    commitmentHint: "e.g. 10 sessions",
  },
  {
    value: "drop-in",
    label: "Drop-in",
    nameHint: "e.g. Saturday class",
    priceHint: "/ class",
    commitmentHint: "e.g. no commitment",
  },
  {
    value: "online-coaching",
    label: "Online coaching",
    nameHint: "e.g. Remote coaching",
    priceHint: "/ month",
    commitmentHint: "e.g. 12 weeks",
  },
  {
    value: "free-consult",
    label: "Free consult",
    nameHint: "e.g. Intro call",
    priceHint: "",
    commitmentHint: "e.g. 15 minutes",
  },
];

const OFFERING_TYPE_SET = new Set<string>(SPECIALIST_PRICING_OFFERING_TYPES);

export function isSpecialistPricingOfferingType(
  value: unknown
): value is SpecialistPricingOfferingType {
  return typeof value === "string" && OFFERING_TYPE_SET.has(value);
}

export function pricingOfferingOption(
  type: SpecialistPricingOfferingType
): (typeof SPECIALIST_PRICING_OFFERING_OPTIONS)[number] {
  return (
    SPECIALIST_PRICING_OFFERING_OPTIONS.find((option) => option.value === type) ??
    SPECIALIST_PRICING_OFFERING_OPTIONS[0]
  );
}

export function pricingOfferingLabel(
  type: SpecialistPricingOfferingType
): string {
  return pricingOfferingOption(type).label;
}

export function pricingOfferingDisplayName(
  offering: Pick<SpecialistPricingOffering, "type" | "name">
): string {
  const name = offering.name?.trim() ?? "";
  return name || pricingOfferingLabel(offering.type);
}

export function createPricingOfferingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `off-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPricingOffering(
  type: SpecialistPricingOfferingType
): SpecialistPricingOffering {
  return {
    id: createPricingOfferingId(),
    type,
    name: "",
    price: 0,
    included: "",
    commitment: "",
  };
}

function parseOffering(
  value: unknown,
  fallbackIndex: number
): SpecialistPricingOffering | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isSpecialistPricingOfferingType(row.type)) return null;
  const id =
    typeof row.id === "string" && row.id.trim()
      ? row.id.trim()
      : `off-${fallbackIndex}-${createPricingOfferingId()}`;
  const isFree = row.type === "free-consult";
  const rawName = typeof row.name === "string" ? row.name.trim() : "";
  return {
    id,
    type: row.type,
    name: rawName.slice(0, PRICING_OFFERING_NAME_MAX),
    price: isFree ? 0 : parseSessionPrice(row.price),
    included: typeof row.included === "string" ? row.included : "",
    commitment: typeof row.commitment === "string" ? row.commitment : "",
  };
}

export function parsePricingOfferings(
  value: unknown
): SpecialistPricingOffering[] {
  if (!Array.isArray(value)) return [];
  const parsed: SpecialistPricingOffering[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const offering = parseOffering(value[index], index);
    if (!offering) continue;
    let id = offering.id;
    if (seen.has(id)) id = createPricingOfferingId();
    seen.add(id);
    parsed.push({ ...offering, id });
    if (parsed.length >= MAX_PRICING_OFFERINGS) break;
  }
  return parsed;
}

export function clonePricingOfferings(
  offerings: SpecialistPricingOffering[]
): SpecialistPricingOffering[] {
  return offerings.map((offering) => ({ ...offering }));
}

export function isFreeConsultOffering(
  offering: Pick<SpecialistPricingOffering, "type">
): boolean {
  return offering.type === "free-consult";
}

/** Ready to show on the public profile. */
export function isPublishedPricingOffering(
  offering: SpecialistPricingOffering
): boolean {
  if (isFreeConsultOffering(offering)) return true;
  return offering.price > 0;
}

export function publishedPricingOfferings(
  offerings: SpecialistPricingOffering[] | null | undefined
): SpecialistPricingOffering[] {
  return parsePricingOfferings(offerings).filter(isPublishedPricingOffering);
}

export function hasPublishedPricingOfferings(
  offerings: SpecialistPricingOffering[] | null | undefined
): boolean {
  return publishedPricingOfferings(offerings).length > 0;
}

const INCLUDED_BULLET_PREFIX = /^(?:[-*•]\s+)/;

/** What’s-included lines, without a trailing blank or a typed bullet marker. */
export function pricingIncludedLines(value: string): string[] {
  const lines = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(INCLUDED_BULLET_PREFIX, ""));
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

export function pricingIncludedFromLines(lines: string[]): string {
  const next = lines.slice();
  while (next.length > 0 && next[next.length - 1] === "") next.pop();
  return next.join("\n");
}

export function formatOfferingPrice(
  offering: Pick<SpecialistPricingOffering, "type" | "price">
): string {
  if (isFreeConsultOffering(offering)) return "Free";
  if (offering.price <= 0) return "";
  const hint = pricingOfferingOption(offering.type).priceHint;
  return hint
    ? `${formatPrice(offering.price)} ${hint}`.replace(/\s+/g, " ").trim()
    : formatPrice(offering.price);
}

export const PRICING_PACKAGES_SECTION_TITLE = "Pricing & Packages";
export const INQUIRE_FOR_PRICING_DETAILS = "Inquire for pricing details";

export function formatOfferingsPreview(
  offerings: SpecialistPricingOffering[] | null | undefined
): string {
  const published = publishedPricingOfferings(offerings);
  if (published.length === 0) return "";
  if (published.length === 1) {
    const offering = published[0];
    const price = formatOfferingPrice(offering);
    const title = pricingOfferingDisplayName(offering);
    return price ? `${title} · ${price}` : title;
  }
  return `${published.length} offerings`;
}
