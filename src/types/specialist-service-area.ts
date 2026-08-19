/** How a specialist delivers sessions — collected on join application */
export type SpecialistServiceType = "in-person" | "virtual" | "both";

export const SPECIALIST_SERVICE_TYPE_OPTIONS: readonly {
  value: SpecialistServiceType;
  label: string;
}[] = [
  { value: "in-person", label: "In-Person" },
  { value: "virtual", label: "Virtual" },
  { value: "both", label: "Both" },
] as const;

export const SPECIALIST_TRAVEL_RADIUS_OPTIONS: readonly {
  value: string;
  label: string;
}[] = [
  { value: "5", label: "5 Miles" },
  { value: "10", label: "10 Miles" },
  { value: "15", label: "15 Miles" },
  { value: "20", label: "20 Miles" },
  { value: "25", label: "25 Miles" },
  { value: "50+", label: "50+ Miles" },
] as const;

export type SpecialistTravelRadiusValue =
  (typeof SPECIALIST_TRAVEL_RADIUS_OPTIONS)[number]["value"];

export function isSpecialistTravelRadius(
  value: string
): value is SpecialistTravelRadiusValue {
  return SPECIALIST_TRAVEL_RADIUS_OPTIONS.some((opt) => opt.value === value);
}

/** Whether the specialist travels to the client — not a mile radius. */
export type TravelToClients = "yes" | "no" | "n/a" | "";

export const TRAVEL_TO_CLIENTS_OPTIONS: readonly {
  value: Exclude<TravelToClients, "">;
  label: string;
}[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "n/a", label: "N/A" },
] as const;

export function parseTravelToClients(value: unknown): TravelToClients {
  if (typeof value !== "string") return "";
  const raw = value.trim().toLowerCase();
  if (raw === "yes") return "yes";
  if (raw === "no") return "no";
  if (raw === "n/a" || raw === "na" || raw === "n-a") return "n/a";
  return "";
}
