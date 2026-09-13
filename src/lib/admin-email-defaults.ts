import { listAdminEmailsFromDb, upsertAdminEmailInDb } from "@/lib/admin-email-db";
import type { AdminManagedEmail } from "@/types/admin-email";

const DASHBOARD = "/specialist-dashboard";
const EDIT_PROFILE = "/specialist-dashboard/edit-profile";

function template(
  partial: Pick<
    AdminManagedEmail,
    | "id"
    | "name"
    | "subject"
    | "triggerKind"
    | "triggerLabel"
    | "preheader"
    | "title"
    | "body"
    | "ctaLabel"
    | "ctaHref"
  >
): AdminManagedEmail {
  const now = new Date().toISOString();
  return {
    kind: "automated",
    audienceIds: ["specialists_all"],
    status: "active",
    eyebrow: "SMOAC",
    imageUrl: "",
    includeUnsubscribe: true,
    scheduledAt: null,
    lastSentAt: null,
    queuedForSend: false,
    sentCount: 0,
    openRate: null,
    clickRate: null,
    unsubscribeRate: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export const DEFAULT_ADMIN_EMAILS: AdminManagedEmail[] = [
  template({
    id: "8e1a0c10-4b2e-4d3a-9f01-000000000001",
    name: "Your SMOAC week",
    subject: "Your SMOAC week, {{first_name}}",
    triggerKind: "weekly",
    triggerLabel: "Weekly (Mon)",
    preheader: "How you're doing, and one thing that helps this week.",
    title: "Your SMOAC week",
    body: `Hi {{first_name}},

Here's your SMOAC week.

Open your dashboard for views, saves, and inquiries. That's the live picture of how clients are finding you.

This week's move: add a few gallery photos, keep pricing current, and make sure your bio sounds like you. Complete, current profiles get found.

If you're on Free, a Boost or Pro can put you in front of more people in your city.

See you on SMOAC.`,
    ctaLabel: "Open dashboard",
    ctaHref: DASHBOARD,
  }),
  template({
    id: "8e1a0c10-4b2e-4d3a-9f01-000000000002",
    name: "Finish your SMOAC profile",
    subject: "{{first_name}}, finish your SMOAC profile",
    triggerKind: "profile_incomplete",
    triggerLabel: "Profile Incomplete",
    preheader: "Photo, pricing, and bio — then clients can find you.",
    title: "Finish your profile",
    body: `Hi {{first_name}},

Your SMOAC profile isn't ready yet.

Add your name, profession, and city, then a photo, gallery, pricing, and a short bio. One complete listing is easier for the right clients to trust.

Takes a few minutes. Then you're findable.`,
    ctaLabel: "Finish profile",
    ctaHref: EDIT_PROFILE,
  }),
  template({
    id: "8e1a0c10-4b2e-4d3a-9f01-000000000003",
    name: "Welcome to the Founding 100",
    subject: "Welcome to SMOAC, {{first_name}} — you're in the Founding 100",
    triggerKind: "after_approval",
    triggerLabel: "After Approval",
    preheader: "You're in. This is the Founding 100.",
    title: "Welcome to the Founding 100",
    body: `Hi {{first_name}},

You're approved — welcome to SMOAC's Founding 100.

This is the early community. Finish anything still open on your profile, share your listing, and tell us what you need. You help shape what specialists see next.

We're glad you're here.`,
    ctaLabel: "Open dashboard",
    ctaHref: DASHBOARD,
  }),
  template({
    id: "8e1a0c10-4b2e-4d3a-9f01-000000000004",
    name: "We haven't seen you on SMOAC",
    subject: "{{first_name}}, come back to SMOAC",
    triggerKind: "inactive",
    triggerLabel: "Inactive (30 days)",
    preheader: "Clients are still browsing. A quick login keeps you in the mix.",
    title: "We haven't seen you lately",
    body: `Hi {{first_name}},

It's been about a month since you were on SMOAC.

Clients are still browsing. A quick login to refresh photos or check pricing keeps your listing current.

We'll be here when you are.`,
    ctaLabel: "Come back to SMOAC",
    ctaHref: DASHBOARD,
  }),
];

export async function ensureDefaultAdminEmails(): Promise<void> {
  const existing = await listAdminEmailsFromDb();
  if (!existing) return;
  const have = new Set(existing.map((row) => row.id));
  for (const email of DEFAULT_ADMIN_EMAILS) {
    if (have.has(email.id)) continue;
    await upsertAdminEmailInDb(email);
  }
}
