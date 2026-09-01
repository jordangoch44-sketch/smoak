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
  const rest = { ...safe } as Record<string, unknown>;
  delete rest.password;
  delete rest.id;
  delete rest.profileStatus;
  delete rest.email;
  delete rest.submittedAt;
  delete rest.updatedAt;
  delete rest.userId;

  return {
    id: safe.id,
    user_id: safe.userId ?? null,
    profile_status: safe.profileStatus,
    email: safe.email.trim().toLowerCase(),
    application_data: rest,
    submitted_at: safe.submittedAt,
    updated_at: safe.updatedAt,
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

function statusPreference(status: string): number {
  if (status === "APPROVED") return 0;
  if (status === "PENDING_APPROVAL") return 1;
  if (status === "REJECTED") return 2;
  return 3;
}

/** Prefer live/pending rows when an email or user has duplicate applications. */
export function pickPreferredSpecialistApplication(
  apps: readonly SpecialistApplication[]
): SpecialistApplication | null {
  if (apps.length === 0) return null;
  return [...apps].sort((a, b) => {
    const byStatus =
      statusPreference(a.profileStatus) - statusPreference(b.profileStatus);
    if (byStatus !== 0) return byStatus;
    return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
  })[0];
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
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const apps = ((data ?? []) as SpecialistApplicationRow[]).map(
    specialistApplicationFromRow
  );
  return {
    ok: true,
    application: pickPreferredSpecialistApplication(apps),
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
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const apps = ((data ?? []) as SpecialistApplicationRow[]).map(
    specialistApplicationFromRow
  );
  return {
    ok: true,
    application: pickPreferredSpecialistApplication(apps),
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

export async function deleteSpecialistApplicationById(
  supabase: SupabaseClient,
  id: string
): Promise<ApplicationsMutationResult> {
  const trimmed = id.trim();
  if (!trimmed) return { ok: false, message: "Application id is required." };

  const { error } = await supabase
    .from("specialist_applications")
    .delete()
    .eq("id", trimmed);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Delete other application rows for the same email/user after one is approved. */
export async function deleteSiblingSpecialistApplications(
  supabase: SupabaseClient,
  keeper: Pick<SpecialistApplication, "id" | "email" | "userId">
): Promise<ApplicationsMutationResult & { deletedIds?: string[] }> {
  const keeperId = keeper.id.trim();
  if (!keeperId) return { ok: false, message: "Keeper application id required." };

  const email = keeper.email.trim().toLowerCase();
  const userId = keeper.userId?.trim() || "";

  const ids = new Set<string>();

  if (email) {
    const { data, error } = await supabase
      .from("specialist_applications")
      .select("id")
      .eq("email", email);
    if (error) return { ok: false, message: error.message };
    for (const row of data ?? []) {
      if (row.id !== keeperId) ids.add(String(row.id));
    }
  }

  if (userId) {
    const { data, error } = await supabase
      .from("specialist_applications")
      .select("id")
      .eq("user_id", userId);
    if (error) return { ok: false, message: error.message };
    for (const row of data ?? []) {
      if (row.id !== keeperId) ids.add(String(row.id));
    }
  }

  const deletedIds = [...ids];
  if (deletedIds.length === 0) return { ok: true, deletedIds };

  const { error: deleteError } = await supabase
    .from("specialist_applications")
    .delete()
    .in("id", deletedIds);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }
  return { ok: true, deletedIds };
}
