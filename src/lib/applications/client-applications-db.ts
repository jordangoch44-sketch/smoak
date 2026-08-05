import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientApplication } from "@/types/client-application";
import type { ClientApplicationRow } from "@/types/database";

export type ApplicationsMutationResult =
  | { ok: true }
  | { ok: false; message: string };

export type ClientApplicationsFetchResult =
  | { ok: true; applications: ClientApplication[] }
  | { ok: false; message: string };

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function clientApplicationFromRow(
  row: ClientApplicationRow
): ClientApplication {
  return {
    id: row.id,
    status: row.status as ClientApplication["status"],
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    preferredCity: row.preferred_city,
    preferredNeighborhood: row.preferred_neighborhood,
    preferredZipCode: row.preferred_zip_code,
    fitnessGoals: asStringArray(row.fitness_goals),
    preferredSpecialistCategories: asStringArray(
      row.preferred_specialist_categories
    ),
    budget: row.budget,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function clientApplicationToRow(
  application: ClientApplication
): Omit<ClientApplicationRow, "submitted_at" | "updated_at"> & {
  submitted_at: string;
  updated_at: string;
} {
  return {
    id: application.id,
    user_id: application.userId ?? null,
    status: application.status,
    email: application.email.trim().toLowerCase(),
    full_name: application.fullName,
    phone: application.phone,
    preferred_city: application.preferredCity,
    preferred_neighborhood: application.preferredNeighborhood,
    preferred_zip_code: application.preferredZipCode,
    fitness_goals: application.fitnessGoals,
    preferred_specialist_categories: application.preferredSpecialistCategories,
    budget: application.budget,
    submitted_at: application.submittedAt,
    updated_at: application.updatedAt,
  };
}

export async function fetchClientApplications(
  supabase: SupabaseClient
): Promise<ClientApplicationsFetchResult> {
  const { data, error } = await supabase
    .from("client_applications")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const rows = (data ?? []) as ClientApplicationRow[];
  return {
    ok: true,
    applications: rows.map(clientApplicationFromRow),
  };
}

export async function upsertClientApplication(
  supabase: SupabaseClient,
  application: ClientApplication
): Promise<ApplicationsMutationResult> {
  const row = clientApplicationToRow(application);
  const { error } = await supabase.from("client_applications").upsert(row, {
    onConflict: "id",
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
