import type { SpecialistServiceType, TravelToClients } from "@/types/specialist-service-area";
import { parseTravelToClients } from "@/types/specialist-service-area";
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

