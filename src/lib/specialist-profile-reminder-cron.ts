import type { SupabaseClient } from "@supabase/supabase-js";
import { specialistApplicationFromRow } from "@/lib/applications/specialist-applications-db";
import { sendSpecialistProfileReminderEmail } from "@/lib/email/specialist-profile-reminder-email";
import { sendUserPush } from "@/lib/push/send-user-push";
import {
  dueProfileReminder,
  scoreProfileStrength,
  strengthSourceFromApplication,
  type ProfileReminderKind,
} from "@/lib/specialist-profile-strength";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { SpecialistApplicationRow } from "@/types/database";

const PAGE_SIZE = 200;
const UNIQUE_VIOLATION = "23505";

export interface ProfileReminderCounts {
  incomplete_48h: number;
  incomplete_week: number;
  skipped: number;
}

async function loadCandidates(service: SupabaseClient): Promise<SpecialistApplicationRow[]> {
  const rows: SpecialistApplicationRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await service
      .from("specialist_applications")
      .select("id, user_id, profile_status, email, application_data, submitted_at, updated_at")
      .in("profile_status", ["PENDING_APPROVAL", "APPROVED"])
      .not("submitted_at", "is", null)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn("[profile-reminders] application query failed:", error.message);
      break;
    }
    rows.push(...((data ?? []) as SpecialistApplicationRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function sentKinds(
  service: SupabaseClient,
  applicationIds: string[]
): Promise<Map<string, Set<ProfileReminderKind>>> {
  const sent = new Map<string, Set<ProfileReminderKind>>();
  for (let index = 0; index < applicationIds.length; index += 200) {
    const batch = applicationIds.slice(index, index + 200);
    const { data, error } = await service
      .from("specialist_profile_reminder_sends")
      .select("application_id, kind")
      .in("application_id", batch);
    if (error) {
      console.warn("[profile-reminders] ledger query failed:", error.message);
      continue;
    }
    for (const row of data ?? []) {
      const id = String(row.application_id ?? "");
      const kind = row.kind === "incomplete_week" ? "incomplete_week" : "incomplete_48h";
      const set = sent.get(id) ?? new Set<ProfileReminderKind>();
      set.add(kind);
      sent.set(id, set);
    }
  }
  return sent;
}

async function unsubscribedEmails(service: SupabaseClient): Promise<Set<string> | null> {
  const { data, error } = await service.from("admin_email_unsubscribes").select("email");
  if (error) {
    console.warn("[profile-reminders] unsubscribe query failed:", error.message);
    return null;
  }
  return new Set(
    (data ?? []).map((row) => String(row.email ?? "").trim().toLowerCase()).filter(Boolean)
  );
}

async function claim(
  service: SupabaseClient,
  applicationId: string,
  kind: ProfileReminderKind
): Promise<boolean> {
  const { error } = await service.from("specialist_profile_reminder_sends").insert({
    application_id: applicationId,
    kind,
  });
  if (!error) return true;
  if (error.code !== UNIQUE_VIOLATION) {
    console.warn("[profile-reminders] claim failed:", error.message);
  }
  return false;
}

async function release(
  service: SupabaseClient,
  applicationId: string,
  kind: ProfileReminderKind
) {
  await service
    .from("specialist_profile_reminder_sends")
    .delete()
    .eq("application_id", applicationId)
    .eq("kind", kind);
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}

/** Daily: one 48-hour note and one day-5 follow-up while a profile is still below Excellent. */
export async function sendDueSpecialistProfileReminders(
  now: Date = new Date()
): Promise<ProfileReminderCounts> {
  const counts: ProfileReminderCounts = {
    incomplete_48h: 0,
    incomplete_week: 0,
    skipped: 0,
  };
  const service = createSupabaseServiceClient();
  if (!service) return counts;

  const rows = await loadCandidates(service);
  if (rows.length === 0) return counts;

  const [ledger, blocked] = await Promise.all([
    sentKinds(
      service,
      rows.map((row) => row.id)
    ),
    unsubscribedEmails(service),
  ]);
  if (!blocked) return counts;

  for (const row of rows) {
    const application = specialistApplicationFromRow(row);
    const strength = scoreProfileStrength(strengthSourceFromApplication(application));
    const sent = ledger.get(row.id);
    const kind = dueProfileReminder({
      profileStatus: application.profileStatus,
      submittedAt: application.submittedAt,
      now,
      score: strength.score,
      sent48h: sent?.has("incomplete_48h") ?? false,
      sentWeek: sent?.has("incomplete_week") ?? false,
    });
    const next = strength.recommendation;
    const email = application.email.trim().toLowerCase();
    if (!kind || !next || !email.includes("@") || blocked.has(email)) {
      counts.skipped += 1;
      continue;
    }
    if (!(await claim(service, application.id, kind))) continue;

    const sentMail = await sendSpecialistProfileReminderEmail({
      to: email,
      firstName: firstName(application.fullName || application.displayName),
      kind,
      message: next.message,
      action: next.action,
      path: next.href,
    });
    if (!sentMail) {
      await release(service, application.id, kind);
      continue;
    }

    counts[kind] += 1;
    const userId = application.userId?.trim();
    if (userId) {
      await sendUserPush({
        userId,
        title: "Finish your SMOAC profile",
        body: next.message,
        path: next.href,
        collapseId: `profile-${kind}`,
      });
    }
  }

  return counts;
}
