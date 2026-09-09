import { emptyEmailAnalytics } from "@/lib/admin-email-catalog";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  AdminEmailAnalyticsRange,
  AdminEmailAnalyticsSnapshot,
} from "@/types/admin-email";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function loadAdminEmailAnalytics(
  range: AdminEmailAnalyticsRange
): Promise<AdminEmailAnalyticsSnapshot> {
  const empty = emptyEmailAnalytics(range);
  const service = createSupabaseServiceClient();
  if (!service) return empty;

  const days = range === "7d" ? 7 : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const { data } = await service
    .from("admin_email_recipients")
    .select("sent_at, opened_at, clicked_at, unsubscribed_at, bounced_at, complained_at, status")
    .gte("created_at", since.toISOString());

  const rows = data ?? [];
  const sentRows = rows.filter((row) => row.sent_at);
  const opened = rows.filter((row) => row.opened_at || row.status === "clicked").length;
  const clicked = rows.filter((row) => row.clicked_at || row.status === "clicked").length;
  const unsubscribed = rows.filter((row) => row.unsubscribed_at).length;
  const bounced = rows.filter((row) => row.bounced_at || row.status === "bounced").length;
  const complained = rows.filter(
    (row) => row.complained_at || row.status === "complained"
  ).length;

  const labeled = empty.points.map((point, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return { ...point, key: dayKey(date.toISOString()) };
  });
  const byKey = new Map(labeled.map((point) => [point.key, point]));

  for (const row of rows) {
    const stamp = String(row.sent_at ?? row.opened_at ?? "");
    if (!stamp) continue;
    const bucket = byKey.get(dayKey(stamp));
    if (!bucket) continue;
    if (row.sent_at) bucket.sent += 1;
    if (row.opened_at || row.status === "clicked") bucket.opened += 1;
    if (row.clicked_at || row.status === "clicked") bucket.clicked += 1;
  }

  const sent = sentRows.length;
  return {
    range,
    emailsSent: sent,
    openRate: sent > 0 ? (opened / sent) * 100 : null,
    clickRate: sent > 0 ? (clicked / sent) * 100 : null,
    unsubscribeRate: sent > 0 ? (unsubscribed / sent) * 100 : null,
    bounceCount: bounced,
    complaintCount: complained,
    points: labeled.map(({ key: _key, ...point }) => point),
  };
}
