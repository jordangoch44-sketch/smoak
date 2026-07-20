import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpecialistProfileRow } from "@/types/database";
import type { SpecialistProfileOverrides } from "@/types/specialist-profile-edit";
import type { Trainer } from "@/types/trainer";

export type SpecialistProfilesMutationResult =
  | { ok: true }
  | { ok: false; message: string };

export type SpecialistProfilesFetchResult =
  | { ok: true; profiles: Trainer[]; overridesById: Record<string, SpecialistProfileOverrides> }
  | { ok: false; message: string };

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function trainerFromProfileData(
  id: string,
  profileData: Record<string, unknown>
): Trainer {
  return {
    ...(profileData as unknown as Trainer),
    id,
  };
}

export function specialistProfileFromRow(row: SpecialistProfileRow): {
  trainer: Trainer;
  overrides: SpecialistProfileOverrides;
} {
  const trainer = trainerFromProfileData(
    row.id,
    (row.profile_data ?? {}) as Record<string, unknown>
  );
  return {
    trainer: {
      ...trainer,
      id: row.id,
      name: trainer.name || row.display_name || "",
      profession: trainer.profession || row.profession || "",
      city: trainer.city || row.city || "",
      state: trainer.state || row.state || "",
      neighborhood: trainer.neighborhood || row.neighborhood || "",
      zipCode: trainer.zipCode || row.zip_code || "",
      latitude: trainer.latitude ?? row.latitude ?? undefined,
      longitude: trainer.longitude ?? row.longitude ?? undefined,
      specialty: trainer.specialty?.length
        ? trainer.specialty
        : asStringArray(row.specialty),
      pricePerSession: trainer.pricePerSession || row.price_per_session || 0,
      featured: trainer.featured ?? row.featured,
      sponsored: trainer.sponsored ?? row.sponsored,
      verified: trainer.verified ?? row.verified,
      rating: trainer.rating || Number(row.rating) || 0,
      reviewCount: trainer.reviewCount || row.review_count || 0,
    },
    overrides: (row.overrides ?? {}) as SpecialistProfileOverrides,
  };
}

export function specialistProfileToRow(input: {
  trainer: Trainer;
  overrides?: SpecialistProfileOverrides | null;
  userId?: string | null;
  applicationId?: string | null;
  status?: SpecialistProfileRow["status"];
}): SpecialistProfileRow {
  const { trainer, overrides = {}, userId = null, applicationId = null } = input;
  const now = new Date().toISOString();
  return {
    id: trainer.id,
    user_id: userId,
    application_id: applicationId ?? null,
    status: input.status ?? "approved",
    display_name: trainer.name ?? "",
    profession: trainer.profession ?? "",
    city: trainer.city ?? "",
    state: trainer.state ?? "",
    neighborhood: trainer.neighborhood ?? "",
    zip_code: trainer.zipCode ?? "",
    latitude: trainer.latitude ?? null,
    longitude: trainer.longitude ?? null,
    specialty: trainer.specialty ?? [],
    price_per_session: trainer.pricePerSession ?? 0,
    service_type: trainer.serviceType ?? null,
    featured: Boolean(trainer.featured),
    sponsored: Boolean(trainer.sponsored),
    verified: Boolean(trainer.verified),
    rating: trainer.rating ?? 0,
    review_count: trainer.reviewCount ?? 0,
    profile_data: trainer as unknown as Record<string, unknown>,
    overrides: (overrides ?? {}) as Record<string, unknown>,
    created_at: now,
    updated_at: now,
  };
}

/** Public catalog rows (approved only) — works for anon + authenticated. */
export async function fetchApprovedSpecialistProfiles(
  supabase: SupabaseClient
): Promise<SpecialistProfilesFetchResult> {
  const { data, error } = await supabase
    .from("specialist_profiles")
    .select("*")
    .eq("status", "approved")
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const rows = (data ?? []) as SpecialistProfileRow[];
  const profiles: Trainer[] = [];
  const overridesById: Record<string, SpecialistProfileOverrides> = {};

  for (const row of rows) {
    const parsed = specialistProfileFromRow(row);
    profiles.push(parsed.trainer);
    if (parsed.overrides && Object.keys(parsed.overrides).length > 0) {
      overridesById[row.id] = parsed.overrides;
    }
  }

  return { ok: true, profiles, overridesById };
}

export async function upsertSpecialistProfile(
  supabase: SupabaseClient,
  input: {
    trainer: Trainer;
    overrides?: SpecialistProfileOverrides | null;
    userId?: string | null;
    applicationId?: string | null;
    status?: SpecialistProfileRow["status"];
  }
): Promise<SpecialistProfilesMutationResult> {
  const row = specialistProfileToRow(input);
  const { error } = await supabase.from("specialist_profiles").upsert(
    {
      id: row.id,
      user_id: row.user_id,
      application_id: row.application_id,
      status: row.status,
      display_name: row.display_name,
      profession: row.profession,
      city: row.city,
      state: row.state,
      neighborhood: row.neighborhood,
      zip_code: row.zip_code,
      latitude: row.latitude,
      longitude: row.longitude,
      specialty: row.specialty,
      price_per_session: row.price_per_session,
      service_type: row.service_type,
      featured: row.featured,
      sponsored: row.sponsored,
      verified: row.verified,
      rating: row.rating,
      review_count: row.review_count,
      profile_data: row.profile_data,
      overrides: row.overrides,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function setSpecialistProfileStatus(
  supabase: SupabaseClient,
  id: string,
  status: "approved" | "hidden" | "archived"
): Promise<SpecialistProfilesMutationResult> {
  const { error } = await supabase
    .from("specialist_profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** One-time import of local approved Trainers when remote is empty.
 *  Not used by the public catalog hydrate path (local must not write into prod).
 *  Kept for explicit/manual migration tooling only.
 */
export async function importLocalSpecialistProfiles(
  supabase: SupabaseClient,
  local: Record<string, Trainer>,
  overridesById: Record<string, SpecialistProfileOverrides> = {}
): Promise<SpecialistProfilesFetchResult> {
  const entries = Object.values(local);
  if (entries.length === 0) {
    return fetchApprovedSpecialistProfiles(supabase);
  }

  const remote = await fetchApprovedSpecialistProfiles(supabase);
  if (!remote.ok) return remote;
  if (remote.profiles.length > 0) return remote;

  for (const trainer of entries) {
    const result = await upsertSpecialistProfile(supabase, {
      trainer,
      overrides: overridesById[trainer.id] ?? {},
      applicationId: null,
      status: "approved",
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
  }

  return fetchApprovedSpecialistProfiles(supabase);
}
