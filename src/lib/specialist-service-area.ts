import type { SpecialistServiceType } from "@/types/specialist-service-area";
import {
  isSpecialistTravelRadius,
  SPECIALIST_TRAVEL_RADIUS_OPTIONS,
} from "@/types/specialist-service-area";
import type { Trainer } from "@/types/trainer";

export function parseTravelRadiusMiles(travelRadius: string): number {
  if (!travelRadius.trim()) return 0;
  if (travelRadius === "50+") return 50;
  const parsed = Number.parseInt(travelRadius, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function formatTravelRadiusLabel(travelRadius: string): string {
  const miles = parseTravelRadiusMiles(travelRadius);
  if (travelRadius === "50+") return "50+ Miles";
  if (miles > 0) return `${miles} Miles`;
  const match = SPECIALIST_TRAVEL_RADIUS_OPTIONS.find(
    (opt) => opt.value === travelRadius
  );
  return match?.label ?? travelRadius;
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
  const serviceType =
    trainer.serviceType ??
    inferServiceTypeFromFlags(
      trainer.sessionExperience.some((s) => /in-home/i.test(s)),
      trainer.sessionExperience.some((s) => /online/i.test(s))
    );

  const city = trainer.city.trim();
  const state = trainer.state?.trim() ?? "";
  const zip = trainer.zipCode?.trim() ?? "";

  if (!city && !zip) return null;

  const locationParts = [city, state].filter(Boolean);
  const basedInLine = locationParts.length
    ? locationParts.join(", ")
    : zip
      ? `ZIP ${zip}`
      : "";

  const radiusMiles =
    trainer.serviceRadiusMiles ??
    parseTravelRadiusMiles(trainer.travelRadius ?? "");
  const travelRadiusLine =
    serviceType === "virtual"
      ? null
      : radiusMiles > 0
        ? radiusMiles >= 50
          ? "50+ Miles"
          : `${radiusMiles} Miles`
        : trainer.travelRadius
          ? formatTravelRadiusLabel(trainer.travelRadius)
          : null;

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
    (trainer.serviceArea.length > 0
      ? trainer.serviceArea.join(", ")
      : null);

  return {
    basedInLine,
    travelRadiusLine,
    serviceTypeLine: serviceTypeLine || "—",
    serviceTypeIcon,
    description,
    showZip: Boolean(zip && city),
  };
}

