import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enrichSpecialistApplicationFields,
  normalizeSpecialistApplicationShape,
} from "@/lib/specialist-application-fields";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistApplication,
} from "@/types/specialist-application";
import type { SpecialistApplicationRow } from "@/types/database";
import type { ApplicationsMutationResult } from "@/lib/applications/client-applications-db";

export type SpecialistApplicationsFetchResult =
  | { ok: true; applications: SpecialistApplication[] }
  | { ok: false; message: string };

function normalizeApplication(
  app: SpecialistApplication
): SpecialistApplication {
  const shaped = normalizeSpecialistApplicationShape(app);
  const enriched = enrichSpecialistApplicationFields(
    shaped
  ) as SpecialistApplication;
  return {
    ...enriched,
    password: "",
  };
}

/** Strip secrets before persisting to Supabase. */
export function specialistApplicationForStorage(
  application: SpecialistApplication
): SpecialistApplication {
  return normalizeApplication({
    ...application,
    password: "",
  });
}

export function specialistApplicationFromRow(
  row: SpecialistApplicationRow
): SpecialistApplication {
  const data = (row.application_data ?? {}) as Partial<SpecialistApplication>;
  return normalizeApplication({
    ...INITIAL_SPECIALIST_ONBOARDING_STATE,
    ...data,
    id: row.id,
    profileStatus: row.profile_status as SpecialistApplication["profileStatus"],
    email: row.email,
    password: "",
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  } as SpecialistApplication);
}

export function specialistApplicationToRow(
  application: SpecialistApplication
): SpecialistApplicationRow {
  const safe = specialistApplicationForStorage(application);
  const {
    id,
    profileStatus,
    email,
    submittedAt,
    updatedAt,
    userId,
    password: _password,
    ...rest
  } = safe;

  return {
    id,
    user_id: userId ?? null,
    profile_status: profileStatus,
    email: email.trim().toLowerCase(),
    application_data: rest as unknown as Record<string, unknown>,
    submitted_at: submittedAt,
    updated_at: updatedAt,
  };
}

export async function fetchSpecialistApplications(
  supabase: SupabaseClient
): Promise<SpecialistApplicationsFetchResult> {
  const { data, error } = await supabase
    .from("specialist_applications")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const rows = (data ?? []) as SpecialistApplicationRow[];
  return {
    ok: true,
    applications: rows.map(specialistApplicationFromRow),
  };
}

export async function fetchSpecialistApplicationByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | { ok: true; application: SpecialistApplication | null }
  | { ok: false; message: string }
> {
  const trimmed = userId.trim();
  if (!trimmed) return { ok: true, application: null };

  const { data, error } = await supabase
    .from("specialist_applications")
    .select("*")
    .eq("user_id", trimmed)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!data) return { ok: true, application: null };
  return {
    ok: true,
    application: specialistApplicationFromRow(data as SpecialistApplicationRow),
  };
}

export async function fetchSpecialistApplicationByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<
  | { ok: true; application: SpecialistApplication | null }
  | { ok: false; message: string }
> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: true, application: null };

  const { data, error } = await supabase
    .from("specialist_applications")
    .select("*")
    .eq("email", trimmed)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!data) return { ok: true, application: null };
  return {
    ok: true,
    application: specialistApplicationFromRow(data as SpecialistApplicationRow),
  };
}

export async function upsertSpecialistApplication(
  supabase: SupabaseClient,
  application: SpecialistApplication
): Promise<ApplicationsMutationResult> {
  const row = specialistApplicationToRow(application);
  const { error } = await supabase.from("specialist_applications").upsert(row, {
    onConflict: "id",
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
