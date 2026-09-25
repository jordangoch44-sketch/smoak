import {
  isOutreachStatus,
  type OutreachStatus,
} from "@/lib/outreach/catalog";
import { isOutreachEmail, normalizeOutreachEmail } from "@/lib/admin-outreach";
import {
  asText,
  outreachService,
  outreachStorageError,
  selectInChunks,
} from "@/lib/outreach/storage";

const NAME_MAX = 120;
const TEXT_MAX = 160;
const NOTES_MAX = 4000;
const IMPORT_MAX = 2000;
const PAGE_MAX = 100;

export interface OutreachProspect {
  id: string;
  name: string;
  email: string | null;
  instagram: string;
  business: string;
  category: string;
  website: string;
  notes: string;
  status: OutreachStatus;
  source: string;
  lastContactedAt: string | null;
  instagramTouches: number;
  instagramRepliedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachProspectEvent {
  id: string;
  eventType: string;
  detail: string;
  campaignId: string | null;
  createdAt: string;
}

export interface OutreachProspectInput {
  name?: unknown;
  email?: unknown;
  instagram?: unknown;
  business?: unknown;
  category?: unknown;
  website?: unknown;
  notes?: unknown;
  status?: unknown;
  source?: unknown;
}

export interface OutreachImportPreview {
  totalRows: number;
  validEmails: number;
  missingEmails: number;
  invalidEmails: number;
  duplicateProspects: number;
  instagramOnly: number;
  readyToImport: number;
}

const SORTS = new Set([
  "name",
  "email",
  "business",
  "category",
  "status",
  "source",
  "last_contacted_at",
  "created_at",
]);

function clip(value: unknown, max: number): string {
  return asText(value).trim().slice(0, max);
}

export function normalizeInstagram(value: string): string {
  return value.replace(/\s+/g, "").trim().replace(/^@+/, "").slice(0, 80);
}

/** Spreadsheet wraps often split an address. Notes in the email column stay notes. */
export function salvageImportedEmail(raw: string): { email: string | null; note: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { email: null, note: "" };
  const compact = normalizeOutreachEmail(trimmed.replace(/\s+/g, ""));
  if (isOutreachEmail(compact)) return { email: compact, note: "" };
  if (!trimmed.includes("@")) return { email: null, note: trimmed };
  return { email: null, note: "" };
}

function normalizeStatus(
  status: unknown,
  email: string | null,
  instagram: string
): OutreachStatus {
  const requested = asText(status).trim();
  if (!email && instagram) return "instagram_only";
  if (requested === "instagram_only" && email) return "not_contacted";
  if (isOutreachStatus(requested)) return requested;
  return email ? "not_contacted" : instagram ? "instagram_only" : "not_contacted";
}

export function normalizeProspectInput(input: OutreachProspectInput): {
  name: string;
  email: string | null;
  instagram: string;
  business: string;
  category: string;
  website: string;
  notes: string;
  status: OutreachStatus;
  source: string;
} | { error: string } {
  const emailRaw = clip(input.email, 320).replace(/\s+/g, "");
  const email = emailRaw ? normalizeOutreachEmail(emailRaw) : null;
  if (email && !isOutreachEmail(email)) {
    return { error: "Enter a valid email address, or leave it blank." };
  }
  const instagram = normalizeInstagram(asText(input.instagram));
  const name = clip(input.name, NAME_MAX);
  if (!name && !email && !instagram) {
    return { error: "Add a name, email, or Instagram handle." };
  }
  const source = clip(input.source, 40) || "manual";
  return {
    name,
    email,
    instagram,
    business: clip(input.business, TEXT_MAX),
    category: clip(input.category, 80),
    website: clip(input.website, 300),
    notes: clip(input.notes, NOTES_MAX),
    status: normalizeStatus(input.status, email, instagram),
    source,
  };
}

function mapProspect(row: Record<string, unknown>): OutreachProspect {
  const status = asText(row.status);
  return {
    id: asText(row.id),
    name: asText(row.name),
    email: asText(row.email) || null,
    instagram: asText(row.instagram),
    business: asText(row.business),
    category: asText(row.category),
    website: asText(row.website),
    notes: asText(row.notes),
    status: isOutreachStatus(status) ? status : "not_contacted",
    source: asText(row.source) || "manual",
    lastContactedAt: asText(row.last_contacted_at) || null,
    instagramTouches: 0,
    instagramRepliedAt: null,
    archivedAt: asText(row.archived_at) || null,
    createdAt: asText(row.created_at),
    updatedAt: asText(row.updated_at),
  };
}

const PROSPECT_COLUMNS =
  "id, name, email, instagram, business, category, website, notes, status, source, last_contacted_at, archived_at, created_at, updated_at";

export async function listOutreachProspects(query: {
  q?: string;
  status?: string;
  category?: string;
  source?: string;
  channel?: string;
  igProgress?: string;
  archived?: boolean;
  sort?: string;
  dir?: string;
  page?: number;
  pageSize?: number;
  ids?: string[];
}): Promise<
  | {
      ok: true;
      prospects: OutreachProspect[];
      total: number;
      page: number;
      pageSize: number;
      categories: string[];
    }
  | { ok: false; message: string }
> {
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const pageSize = Math.min(PAGE_MAX, Math.max(1, query.pageSize ?? 25));
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * pageSize;
  const sort = SORTS.has(query.sort ?? "") ? (query.sort as string) : "name";
  const ascending = query.dir === "desc" ? false : sort === "name";

  let request = service
    .from("outreach_prospects")
    .select(PROSPECT_COLUMNS, { count: "exact" });

  if (query.ids && query.ids.length > 0) {
    request = request.in("id", query.ids.slice(0, IMPORT_MAX));
  } else if (query.archived) {
    request = request.not("archived_at", "is", null);
  } else {
    request = request.is("archived_at", null);
  }

  if (query.status && isOutreachStatus(query.status)) {
    request = request.eq("status", query.status);
  }
  if (query.category?.trim()) {
    request = request.eq("category", query.category.trim());
  }
  if (query.source?.trim()) {
    request = request.eq("source", query.source.trim());
  }
  if (query.channel === "instagram" || query.igProgress) {
    // Empty-string neq is dropped by PostgREST. A one-character pattern keeps real handles.
    request = request.like("instagram", "%_%");
  } else if (query.channel === "email") {
    request = request.not("email", "is", null);
  }

  const q = (query.q ?? "").trim().replace(/[%(),]/g, "").slice(0, 80);
  if (q) {
    const pattern = `%${q}%`;
    request = request.or(
      `name.ilike.${pattern},email.ilike.${pattern},instagram.ilike.${pattern},business.ilike.${pattern},notes.ilike.${pattern}`
    );
  }

  const progress =
    query.igProgress === "open" ||
    query.igProgress === "messaged" ||
    query.igProgress === "responded"
      ? query.igProgress
      : "";

  let prospects: OutreachProspect[];
  let total: number;

  if (progress) {
    const listed = await request
      .order(sort, { ascending, nullsFirst: false })
      .limit(IMPORT_MAX);
    if (listed.error) {
      return {
        ok: false,
        message: outreachStorageError(listed.error.message, "Could not load prospects."),
      };
    }
    const withActivity = await attachInstagramActivity(
      (listed.data ?? []).map((row) => mapProspect(row))
    );
    const filtered = withActivity.filter((row) => matchesInstagramProgress(row, progress));
    prospects = filtered.slice(from, from + pageSize);
    total = filtered.length;
  } else {
    const listed = await request
      .order(sort, { ascending, nullsFirst: false })
      .range(from, from + pageSize - 1);
    if (listed.error) {
      return {
        ok: false,
        message: outreachStorageError(listed.error.message, "Could not load prospects."),
      };
    }
    prospects = await attachInstagramActivity(
      (listed.data ?? []).map((row) => mapProspect(row))
    );
    total = listed.count ?? 0;
  }

  const { data: categoryRows } = await service
    .from("outreach_prospects")
    .select("category")
    .is("archived_at", null)
    .neq("category", "")
    .limit(400);

  const categories = [
    ...new Set(
      (categoryRows ?? [])
        .map((row) => asText(row.category).trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  return {
    ok: true,
    prospects,
    total,
    page,
    pageSize,
    categories,
  };
}

function matchesInstagramProgress(
  row: OutreachProspect,
  progress: "open" | "messaged" | "responded"
): boolean {
  if (progress === "responded") return Boolean(row.instagramRepliedAt);
  if (progress === "messaged") return row.instagramTouches > 0 && !row.instagramRepliedAt;
  return row.instagramTouches === 0 && !row.instagramRepliedAt;
}

async function attachInstagramActivity(
  prospects: OutreachProspect[]
): Promise<OutreachProspect[]> {
  const ids = prospects.filter((row) => row.instagram).map((row) => row.id);
  if (ids.length === 0) return prospects;
  const service = outreachService();
  if (!service) return prospects;

  let rows: Array<Record<string, unknown>> = [];
  try {
    rows = await selectInChunks(ids, async (chunk) => {
      const { data, error } = await service
        .from("outreach_events")
        .select("prospect_id, event_type, created_at")
        .in("prospect_id", chunk)
        .in("event_type", ["instagram_messaged", "instagram_replied"]);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<Record<string, unknown>>;
    });
  } catch {
    return prospects;
  }

  const activity = new Map<string, { touches: number; repliedAt: string | null }>();
  for (const row of rows) {
    const id = asText(row.prospect_id);
    const current = activity.get(id) ?? { touches: 0, repliedAt: null };
    const kind = asText(row.event_type);
    if (kind === "instagram_messaged") current.touches += 1;
    if (kind === "instagram_replied") {
      const at = asText(row.created_at);
      if (at && (!current.repliedAt || at > current.repliedAt)) current.repliedAt = at;
    }
    activity.set(id, current);
  }

  return prospects.map((row) => {
    const logged = activity.get(row.id);
    if (!logged) return row;
    return {
      ...row,
      instagramTouches: logged.touches,
      instagramRepliedAt: logged.repliedAt,
    };
  });
}

export async function createOutreachProspect(
  input: OutreachProspectInput,
  userId: string
): Promise<
  { ok: true; prospect: OutreachProspect } | { ok: false; message: string }
> {
  const draft = normalizeProspectInput({ ...input, source: input.source ?? "manual" });
  if ("error" in draft) return { ok: false, message: draft.error };
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  if (draft.email) {
    const existing = await service
      .from("outreach_prospects")
      .select("id")
      .eq("email", draft.email)
      .is("archived_at", null)
      .limit(1);
    if (existing.data && existing.data.length > 0) {
      return { ok: false, message: "A prospect with that email already exists." };
    }
  }

  const { data, error } = await service
    .from("outreach_prospects")
    .insert({
      ...draft,
      created_by: userId,
    })
    .select(PROSPECT_COLUMNS)
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: outreachStorageError(
        error?.message ?? "",
        "Could not add that prospect."
      ),
    };
  }

  await service.from("outreach_events").insert({
    prospect_id: data.id,
    event_type: "created",
    detail: { source: draft.source },
  });

  return { ok: true, prospect: mapProspect(data) };
}

export async function updateOutreachProspect(
  id: string,
  input: OutreachProspectInput
): Promise<
  { ok: true; prospect: OutreachProspect } | { ok: false; message: string }
> {
  if (!id) return { ok: false, message: "Missing prospect." };
  const draft = normalizeProspectInput(input);
  if ("error" in draft) return { ok: false, message: draft.error };
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const current = await service
    .from("outreach_prospects")
    .select("id, status, email")
    .eq("id", id)
    .maybeSingle();
  if (current.error) {
    return {
      ok: false,
      message: outreachStorageError(current.error.message, "Could not update that prospect."),
    };
  }
  if (!current.data) return { ok: false, message: "That prospect is gone." };

  if (draft.email && draft.email !== asText(current.data.email)) {
    const clash = await service
      .from("outreach_prospects")
      .select("id")
      .eq("email", draft.email)
      .is("archived_at", null)
      .neq("id", id)
      .limit(1);
    if (clash.data && clash.data.length > 0) {
      return { ok: false, message: "Another prospect already uses that email." };
    }
  }

  const { data, error } = await service
    .from("outreach_prospects")
    .update({
      name: draft.name,
      email: draft.email,
      instagram: draft.instagram,
      business: draft.business,
      category: draft.category,
      website: draft.website,
      notes: draft.notes,
      status: draft.status,
    })
    .eq("id", id)
    .select(PROSPECT_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message: outreachStorageError(
        error?.message ?? "",
        "Could not update that prospect."
      ),
    };
  }

  const previous = asText(current.data.status);
  await service.from("outreach_events").insert({
    prospect_id: id,
    event_type: previous === draft.status ? "updated" : "status_changed",
    detail:
      previous === draft.status
        ? { source: "edit" }
        : { from: previous, to: draft.status },
  });

  return { ok: true, prospect: mapProspect(data) };
}

export async function setOutreachProspectsArchived(
  ids: string[],
  archived: boolean
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const clean = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
  if (clean.length === 0) return { ok: false, message: "Select at least one prospect." };
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const { error } = await service
    .from("outreach_prospects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .in("id", clean);

  if (error) {
    return {
      ok: false,
      message: outreachStorageError(error.message, "Could not update those prospects."),
    };
  }

  await service.from("outreach_events").insert(
    clean.map((id) => ({
      prospect_id: id,
      event_type: archived ? "archived" : "restored",
      detail: {},
    }))
  );

  return { ok: true, count: clean.length };
}

export async function deleteOutreachProspects(
  ids: string[]
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const clean = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
  if (clean.length === 0) return { ok: false, message: "Select at least one prospect." };
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const { error } = await service.from("outreach_prospects").delete().in("id", clean);
  if (error) {
    return {
      ok: false,
      message: outreachStorageError(error.message, "Could not delete those prospects."),
    };
  }
  return { ok: true, count: clean.length };
}

export async function setOutreachProspectStatus(
  ids: string[],
  status: OutreachStatus
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const clean = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
  if (clean.length === 0) return { ok: false, message: "Select at least one prospect." };
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const { error } = await service
    .from("outreach_prospects")
    .update({ status })
    .in("id", clean);
  if (error) {
    return {
      ok: false,
      message: outreachStorageError(error.message, "Could not update those statuses."),
    };
  }
  await service.from("outreach_events").insert(
    clean.map((id) => ({
      prospect_id: id,
      event_type: "status_changed",
      detail: { to: status, source: "bulk" },
    }))
  );
  return { ok: true, count: clean.length };
}

export interface ImportProspectRow {
  name?: unknown;
  email?: unknown;
  instagram?: unknown;
  business?: unknown;
  category?: unknown;
  website?: unknown;
  notes?: unknown;
  area?: unknown;
}

interface PreparedImport {
  preview: OutreachImportPreview;
  inserts: ReturnType<typeof normalizeProspectInput>[];
}

function emptyPreview(): OutreachImportPreview {
  return {
    totalRows: 0,
    validEmails: 0,
    missingEmails: 0,
    invalidEmails: 0,
    duplicateProspects: 0,
    instagramOnly: 0,
    readyToImport: 0,
  };
}

async function prepareImport(rows: ImportProspectRow[]): Promise<
  | { ok: true; prepared: PreparedImport }
  | { ok: false; message: string }
> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "No rows to import." };
  }
  if (rows.length > IMPORT_MAX) {
    return { ok: false, message: `Import up to ${IMPORT_MAX} rows at a time.` };
  }

  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const preview = emptyPreview();
  preview.totalRows = rows.length;

  const normalized: Array<Exclude<ReturnType<typeof normalizeProspectInput>, { error: string }>> = [];
  const seenEmails = new Set<string>();
  const seenInstagram = new Set<string>();

  for (const row of rows) {
    const salvaged = salvageImportedEmail(clip(row.email, 320));
    const instagram = normalizeInstagram(asText(row.instagram));
    const area = clip(row.area, 160);
    const notes = [clip(row.notes, NOTES_MAX), salvaged.note, area ? `Area: ${area}` : ""]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n")
      .slice(0, NOTES_MAX);
    if (clip(row.email, 320) && !salvaged.email && clip(row.email, 320).includes("@")) {
      preview.invalidEmails += 1;
    }
    const draft = normalizeProspectInput({
      ...row,
      email: salvaged.email ?? "",
      instagram,
      notes,
      source: "csv",
    });
    if ("error" in draft) {
      preview.invalidEmails += 1;
      continue;
    }
    if (draft.email) {
      if (seenEmails.has(draft.email)) {
        preview.duplicateProspects += 1;
        preview.validEmails += 1;
        continue;
      }
      seenEmails.add(draft.email);
      preview.validEmails += 1;
    } else if (draft.instagram) {
      preview.missingEmails += 1;
      preview.instagramOnly += 1;
      const key = draft.instagram.toLowerCase();
      if (seenInstagram.has(key)) {
        preview.duplicateProspects += 1;
        continue;
      }
      seenInstagram.add(key);
    } else {
      preview.missingEmails += 1;
      continue;
    }
    normalized.push(draft);
  }

  const emails = normalized.map((row) => row.email).filter((email): email is string => Boolean(email));
  const existingEmails = new Set<string>();
  if (emails.length > 0) {
    const found = await selectInChunks(emails, async (chunk) => {
      const { data, error } = await service
        .from("outreach_prospects")
        .select("email")
        .in("email", chunk)
        .is("archived_at", null);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => asText(row.email));
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      return { error: message } as const;
    });
    if (!Array.isArray(found)) {
      return {
        ok: false,
        message: outreachStorageError(found.error, "Could not check existing prospects."),
      };
    }
    for (const email of found) existingEmails.add(email);
  }

  const instagramKeys = normalized
    .filter((row) => !row.email && row.instagram)
    .map((row) => row.instagram.toLowerCase());
  const existingInstagram = new Set<string>();
  if (instagramKeys.length > 0) {
    const { data, error } = await service
      .from("outreach_prospects")
      .select("instagram")
      .is("email", null)
      .is("archived_at", null)
      .neq("instagram", "")
      .limit(2000);
    if (error) {
      return {
        ok: false,
        message: outreachStorageError(error.message, "Could not check existing prospects."),
      };
    }
    for (const row of data ?? []) {
      existingInstagram.add(asText(row.instagram).replace(/^@+/, "").toLowerCase());
    }
  }

  const inserts = normalized.filter((row) => {
    if (row.email && existingEmails.has(row.email)) {
      preview.duplicateProspects += 1;
      return false;
    }
    if (!row.email && existingInstagram.has(row.instagram.toLowerCase())) {
      preview.duplicateProspects += 1;
      return false;
    }
    return true;
  });

  preview.readyToImport = inserts.length;
  preview.instagramOnly = inserts.filter((row) => row.status === "instagram_only").length;

  return { ok: true, prepared: { preview, inserts } };
}

export async function importOutreachProspects(
  rows: ImportProspectRow[],
  commit: boolean,
  userId: string
): Promise<
  | { ok: true; preview: OutreachImportPreview; imported: number }
  | { ok: false; message: string }
> {
  let prepared: PreparedImport;
  try {
    const result = await prepareImport(rows);
    if (!result.ok) return result;
    prepared = result.prepared;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      message: outreachStorageError(message, "Could not review that file."),
    };
  }

  if (!commit) return { ok: true, preview: prepared.preview, imported: 0 };

  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };
  if (prepared.inserts.length === 0) {
    return { ok: true, preview: prepared.preview, imported: 0 };
  }

  let imported = 0;
  for (let index = 0; index < prepared.inserts.length; index += 100) {
    const chunk = prepared.inserts.slice(index, index + 100);
    const { data, error } = await service
      .from("outreach_prospects")
      .insert(chunk.map((row) => ({ ...row, created_by: userId })))
      .select("id");
    if (error) {
      return {
        ok: false,
        message: outreachStorageError(error.message, "Could not import those prospects."),
      };
    }
    imported += data?.length ?? 0;
    if (data && data.length > 0) {
      await service.from("outreach_events").insert(
        data.map((row) => ({
          prospect_id: row.id,
          event_type: "imported",
          detail: { source: "csv" },
        }))
      );
    }
  }

  return { ok: true, preview: prepared.preview, imported };
}

const INSTAGRAM_TOUCH_MAX = 20;

export async function logOutreachInstagram(
  ids: string[],
  action: "messaged" | "responded"
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const clean = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
  if (clean.length === 0) return { ok: false, message: "Select at least one contact." };
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const loaded = await service
    .from("outreach_prospects")
    .select("id, instagram")
    .in("id", clean);
  if (loaded.error) {
    return {
      ok: false,
      message: outreachStorageError(loaded.error.message, "Could not update those contacts."),
    };
  }

  const targets = (loaded.data ?? []).filter((row) => asText(row.instagram));
  if (targets.length === 0) {
    return { ok: false, message: "Those contacts do not have an Instagram handle." };
  }

  const targetIds = targets.map((row) => asText(row.id)).filter(Boolean);
  let existing: Array<Record<string, unknown>> = [];
  try {
    existing = await selectInChunks(targetIds, async (chunk) => {
      const { data, error } = await service
        .from("outreach_events")
        .select("prospect_id, event_type")
        .in("prospect_id", chunk)
        .in("event_type", ["instagram_messaged", "instagram_replied"]);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<Record<string, unknown>>;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      message: outreachStorageError(message, "Could not read the Instagram log."),
    };
  }

  const touches = new Map<string, number>();
  const replied = new Set<string>();
  for (const row of existing) {
    const id = asText(row.prospect_id);
    if (asText(row.event_type) === "instagram_messaged") {
      touches.set(id, (touches.get(id) ?? 0) + 1);
    }
    if (asText(row.event_type) === "instagram_replied") replied.add(id);
  }

  const now = new Date().toISOString();
  const inserts: Array<{
    prospect_id: string;
    event_type: string;
    detail: { touch?: number; after?: number };
  }> = [];
  const touchedIds: string[] = [];

  for (const id of targetIds) {
    const count = touches.get(id) ?? 0;
    if (action === "responded") {
      if (replied.has(id)) continue;
      inserts.push({
        prospect_id: id,
        event_type: "instagram_replied",
        detail: { after: count },
      });
      touchedIds.push(id);
      continue;
    }
    if (count >= INSTAGRAM_TOUCH_MAX) continue;
    inserts.push({
      prospect_id: id,
      event_type: "instagram_messaged",
      detail: { touch: count + 1 },
    });
    touchedIds.push(id);
  }

  if (inserts.length === 0) {
    return {
      ok: false,
      message:
        action === "responded"
          ? "Those Instagram contacts are already marked responded."
          : "Those Instagram contacts are already at 20 messages.",
    };
  }

  const saved = await service.from("outreach_events").insert(inserts);
  if (saved.error) {
    return {
      ok: false,
      message: outreachStorageError(saved.error.message, "Could not save that Instagram note."),
    };
  }

  await service
    .from("outreach_prospects")
    .update({ last_contacted_at: now })
    .in("id", touchedIds);

  return { ok: true, count: touchedIds.length };
}

export async function readOutreachProspectHistory(id: string): Promise<
  | { ok: true; prospect: OutreachProspect; events: OutreachProspectEvent[] }
  | { ok: false; message: string }
> {
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const { data, error } = await service
    .from("outreach_prospects")
    .select(PROSPECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      message: outreachStorageError(error.message, "Could not load that prospect."),
    };
  }
  if (!data) return { ok: false, message: "That prospect is gone." };

  const events = await service
    .from("outreach_events")
    .select("id, event_type, detail, campaign_id, created_at")
    .eq("prospect_id", id)
    .order("created_at", { ascending: false })
    .limit(40);

  return {
    ok: true,
    prospect: mapProspect(data),
    events: (events.data ?? []).map((row) => ({
      id: asText(row.id),
      eventType: asText(row.event_type),
      detail: summarizeEventDetail(row.detail),
      campaignId: asText(row.campaign_id) || null,
      createdAt: asText(row.created_at),
    })),
  };
}

function instagramTouchLabel(touch: number): string {
  if (touch === 1) return "1st message";
  if (touch === 2) return "2nd message";
  if (touch === 3) return "3rd message";
  return `${touch}th message`;
}

function summarizeEventDetail(detail: unknown): string {
  if (!detail || typeof detail !== "object") return "";
  const record = detail as Record<string, unknown>;
  if (typeof record.after === "number") {
    if (record.after <= 0) return "responded";
    return `after ${record.after} message${record.after === 1 ? "" : "s"}`;
  }
  if (typeof record.touch === "number" && record.touch > 0) {
    return instagramTouchLabel(record.touch);
  }
  if (typeof record.from === "string" && typeof record.to === "string") {
    return `${record.from} → ${record.to}`;
  }
  if (typeof record.to === "string") return String(record.to);
  if (typeof record.subject === "string") return String(record.subject);
  if (typeof record.error === "string") return String(record.error);
  if (typeof record.source === "string") return String(record.source);
  return "";
}

export async function loadProspectsByIds(
  ids: string[]
): Promise<OutreachProspect[] | { error: string }> {
  const clean = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, IMPORT_MAX);
  if (clean.length === 0) return [];
  const service = outreachService();
  if (!service) return { error: "Outreach storage is not connected." };
  try {
    return await selectInChunks(clean, async (chunk) => {
      const { data, error } = await service
        .from("outreach_prospects")
        .select(PROSPECT_COLUMNS)
        .in("id", chunk);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => mapProspect(row));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { error: outreachStorageError(message, "Could not load those prospects.") };
  }
}

/** Called from the public unsubscribe route. Never throws. */
export async function markOutreachUnsubscribed(email: string): Promise<void> {
  const normalized = normalizeOutreachEmail(email);
  if (!isOutreachEmail(normalized)) return;
  const service = outreachService();
  if (!service) return;

  const { data } = await service
    .from("outreach_prospects")
    .select("id")
    .eq("email", normalized)
    .is("archived_at", null);

  const ids = (data ?? []).map((row) => asText(row.id)).filter(Boolean);
  if (ids.length === 0) return;

  await service
    .from("outreach_prospects")
    .update({ status: "unsubscribed" })
    .in("id", ids);

  await service.from("outreach_events").insert(
    ids.map((id) => ({
      prospect_id: id,
      event_type: "unsubscribed",
      detail: { source: "unsubscribe_link" },
    }))
  );

  await service
    .from("outreach_messages")
    .update({ status: "skipped", error: "Unsubscribed before send." })
    .eq("to_email", normalized)
    .in("status", ["queued", "sending"]);
}
