import type { SpecialistServiceType, TravelToClients } from "@/types/specialist-service-area";
import {
  parseTravelToClients,
  SPECIALIST_TRAVEL_RADIUS_OPTIONS,
} from "@/types/specialist-service-area";
import type { Trainer } from "@/types/trainer";

export function parseTravelRadiusMiles(travelRadius: string): number {
  if (!travelRadius.trim()) return 0;
  if (travelRadius === "50+") return 50;
  const parsed = Number.parseInt(travelRadius, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function travelToClientsFromLegacyRadius(
  travelRadius: string
): TravelToClients {
  return parseTravelRadiusMiles(travelRadius) > 0 ? "yes" : "";
}

export function resolveTravelToClients(trainer: Trainer): TravelToClients {
  const explicit = parseTravelToClients(trainer.travelToClients);
  if (explicit) return explicit;
  return travelToClientsFromLegacyRadius(trainer.travelRadius ?? "");
}

export function formatTravelToClientsLine(
  value: TravelToClients
): string | null {
  if (value === "yes") return "Travels to clients";
  if (value === "no") return "Clients travel to you";
  return null;
}

export function formatTravelToClientsEditorLabel(
  value: TravelToClients
): string {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "n/a") return "N/A";
  return "";
}

export function formatServiceTypeLabel(
  serviceType: SpecialistServiceType | ""
): string {
  switch (serviceType) {
    case "in-person":
      return "In Person";
    case "virtual":
      return "Virtual";
    case "both":
      return "Hybrid";
    default:
      return "";
  }
}

export function serviceTypeToDeliveryFlags(serviceType: SpecialistServiceType): {
  inHomeAvailable: boolean;
  onlineCoachingAvailable: boolean;
} {
  switch (serviceType) {
    case "in-person":
      return { inHomeAvailable: true, onlineCoachingAvailable: false };
    case "virtual":
      return { inHomeAvailable: false, onlineCoachingAvailable: true };
    case "both":
      return { inHomeAvailable: true, onlineCoachingAvailable: true };
    default:
      return { inHomeAvailable: false, onlineCoachingAvailable: false };
  }
}

export function inferServiceTypeFromFlags(
  inHome: boolean,
  online: boolean
): SpecialistServiceType | "" {
  if (inHome && online) return "both";
  if (inHome) return "in-person";
  if (online) return "virtual";
  return "";
}

export interface SpecialistServiceAreaDisplay {
  basedInLine: string;
  travelRadiusLine: string | null;
  serviceTypeLine: string;
  serviceTypeIcon: "in-person" | "virtual" | "hybrid";
  description: string | null;
  showZip: boolean;
}

export function buildServiceAreaDisplay(trainer: Trainer): SpecialistServiceAreaDisplay | null {
  const sessionExperience = Array.isArray(trainer.sessionExperience)
    ? trainer.sessionExperience
    : [];
  const serviceArea = Array.isArray(trainer.serviceArea)
    ? trainer.serviceArea
    : [];
  const serviceType =
    trainer.serviceType ??
    inferServiceTypeFromFlags(
      sessionExperience.some((s) => /in-home/i.test(s)),
      sessionExperience.some((s) => /online/i.test(s))
    );

  const city = (trainer.city ?? "").trim();
  const state = trainer.state?.trim() ?? "";
  const zip = trainer.zipCode?.trim() ?? "";

  if (!city && !zip) return null;

  const locationParts = [city, state].filter(Boolean);
  const basedInLine = locationParts.length
    ? locationParts.join(", ")
    : zip
      ? `ZIP ${zip}`
      : "";

  const travelToClients = resolveTravelToClients(trainer);
  const travelRadiusLine = formatTravelToClientsLine(travelToClients);

  const serviceTypeLine = formatServiceTypeLabel(serviceType);
  if (!serviceTypeLine && !basedInLine) return null;

  const serviceTypeIcon: SpecialistServiceAreaDisplay["serviceTypeIcon"] =
    serviceType === "virtual"
      ? "virtual"
      : serviceType === "both"
        ? "hybrid"
        : "in-person";

  const description =
    trainer.serviceAreaDescription?.trim() ||
    (serviceArea.length > 0 ? serviceArea.join(", ") : null);

  return {
    basedInLine,
    travelRadiusLine,
    serviceTypeLine: serviceTypeLine || "—",
    serviceTypeIcon,
    description,
    showZip: Boolean(zip && city),
  };
}

const TRAINING_LOCATION_PATTERN =
  /in-home|in home|at home|online|virtual|gym|studio|facility|training at|hybrid|outdoor|park|beach|in person|in-person/i;

function uniqueTrimmed(items: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of items) {
    const value = item.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(value);
  }
  return next;
}

function friendlyTrainingOption(raw: string): string {
  const value = raw.trim();
  if (/^in-home sessions$/i.test(value) || /^in home sessions$/i.test(value)) {
    return "At home";
  }
  if (/^online coaching$/i.test(value) || /^online$/i.test(value)) {
    return "Online";
  }
  if (/^training at\s+/i.test(value)) {
    return `At ${value.replace(/^training at\s+/i, "").trim()}`;
  }
  if (/^in person$/i.test(value) || /^in-person$/i.test(value)) {
    return "In person";
  }
  return value;
}

/** Where sessions happen — from onboarding session flags, gym, and service type. */
export function trainingOptionsFromTrainer(trainer: Trainer): string[] {
  const session = Array.isArray(trainer.sessionExperience)
    ? trainer.sessionExperience
    : [];
  const fromSession = session
    .filter((item) => TRAINING_LOCATION_PATTERN.test(item))
    .map(friendlyTrainingOption);

  if (fromSession.length > 0) return uniqueTrimmed(fromSession);

  const serviceType =
    trainer.serviceType ??
    inferServiceTypeFromFlags(
      session.some((s) => /in-home/i.test(s)),
      session.some((s) => /online/i.test(s))
    );

  const inferred: string[] = [];
  if (serviceType === "in-person" || serviceType === "both") {
    inferred.push("In person");
  }
  if (serviceType === "virtual" || serviceType === "both") {
    inferred.push("Online");
  }
  return uniqueTrimmed(inferred);
}

export function formatTravelRadiusLabel(travelRadius: string | undefined): string | null {
  const value = travelRadius?.trim() ?? "";
  if (!value) return null;
  const option = SPECIALIST_TRAVEL_RADIUS_OPTIONS.find((opt) => opt.value === value);
  if (option) return option.label;
  if (value === "50+") return "50+ miles";
  const miles = parseTravelRadiusMiles(value);
  return miles > 0 ? `${miles} miles` : null;
}

export interface LocationTravelFact {
  label: string;
  value: string;
  hint?: string;
  icon: "place" | "travel" | "radius";
}

export interface LocationTravelMap {
  latitude: number;
  longitude: number;
  miles: number | null;
}

export interface LocationTravelDisplay {
  facts: LocationTravelFact[];
  description: string | null;
  map: LocationTravelMap | null;
}

function formatCityZipLine(trainer: Trainer): string {
  const city = trainer.city?.trim() ?? "";
  const zip = trainer.zipCode?.trim() ?? "";
  if (city && zip) return `${city} · ${zip}`;
  if (city) return city;
  if (zip) return `ZIP ${zip}`;
  return "";
}

/** Public Details location: gym / area / anywhere, plus travel distance. */
export function buildLocationTravelDisplay(
  trainer: Trainer
): LocationTravelDisplay | null {
  const session = Array.isArray(trainer.sessionExperience)
    ? trainer.sessionExperience
    : [];
  const serviceType =
    trainer.serviceType ??
    inferServiceTypeFromFlags(
      session.some((s) => /in-home/i.test(s)),
      session.some((s) => /online/i.test(s))
    );
  const cityZip = formatCityZipLine(trainer);
  const workAddress = trainer.workAddress?.trim() ?? "";
  const showPreciseAddress =
    Boolean(workAddress) && trainer.locationPrecision === "address";
  const travelToClients = resolveTravelToClients(trainer);
  const radiusLabel = formatTravelRadiusLabel(trainer.travelRadius);
  const isVirtualOnly = serviceType === "virtual";
  const goesAnywhere =
    travelToClients === "yes" &&
    (trainer.travelRadius === "50+" || radiusLabel === "50+ Miles");

  let placeValue = "";
  let placeLabel = "Area";

  if (showPreciseAddress) {
    placeLabel = "Gym";
    placeValue = cityZip && !workAddress.includes(cityZip.split(" · ")[0] ?? "")
      ? `${workAddress}\n${cityZip}`
      : workAddress;
  } else if (isVirtualOnly && cityZip) {
    placeLabel = "Area";
    placeValue = goesAnywhere ? `Online · anywhere` : `Online from ${cityZip}`;
  } else if (goesAnywhere && !cityZip) {
    placeLabel = "Area";
    placeValue = "Anywhere";
  } else if (cityZip) {
    placeLabel = "Based in";
    placeValue = cityZip;
  } else if (goesAnywhere) {
    placeLabel = "Area";
    placeValue = "Anywhere";
  }

  const facts: LocationTravelFact[] = [];
  if (placeValue) {
    facts.push({
      label: placeLabel,
      value: placeValue,
      hint: placeLabel === "Gym"
        ? "Sessions at this facility."
        : isVirtualOnly
          ? "Online sessions from this area."
          : trainer.city.trim()
            ? `Serving ${trainer.city.trim()}.`
            : undefined,
      icon: "place",
    });
  }

  if (travelToClients === "yes") {
    facts.push({
      label: "Travel",
      value: "Travels to clients",
      hint: "Home, gym, or outdoors.",
      icon: "travel",
    });
    if (radiusLabel) {
      facts.push({
        label: "Service area",
        value: `Up to ${radiusLabel.toLowerCase()}`,
        hint: trainer.city.trim()
          ? `Around ${trainer.city.trim()}.`
          : undefined,
        icon: "radius",
      });
    }
  } else if (travelToClients === "no") {
    facts.push({
      label: "Travel",
      value: "Does not travel to clients",
      hint: "You come to them.",
      icon: "travel",
    });
  }

  const description =
    trainer.serviceAreaDescription?.trim() ||
    (Array.isArray(trainer.serviceArea) && trainer.serviceArea.length > 0
      ? trainer.serviceArea.filter(Boolean).join(", ")
      : null);

  const lat = trainer.latitude;
  const lng = trainer.longitude;
  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);
  const miles =
    travelToClients === "yes"
      ? parseTravelRadiusMiles(trainer.travelRadius ?? "") ||
        (typeof trainer.serviceRadiusMiles === "number"
          ? trainer.serviceRadiusMiles
          : 0) ||
        null
      : null;

  if (facts.length === 0 && !description) return null;
  return {
    facts,
    description,
    map: hasCoords
      ? {
          latitude: lat,
          longitude: lng,
          miles: miles && miles > 0 ? miles : null,
        }
      : null,
  };
}

