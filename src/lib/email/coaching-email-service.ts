/**
 * Coaching emails: roster invite, accepted (both sides), and a workout sent by a specialist.
 */
import { sendOutboundEmail, type EmailSendResult } from "@/lib/email/email-transport";
import {
  emailAbsoluteUrl,
  renderEmailParagraphs,
  renderEmailQuote,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { formatWorkoutDayHeading } from "@/lib/workouts/client-workout";

const DASHBOARD_PATH = "/client-dashboard";
const SPECIALIST_CLIENTS_PATH = "/specialist-dashboard?tab=clients";

function greeting(firstName: string): string {
  return `Hi ${firstName.trim() || "there"},`;
}

export async function sendRosterInviteEmail(input: {
  to: string;
  clientFirstName: string;
  specialistName: string;
}): Promise<EmailSendResult> {
  const coach = input.specialistName.trim() || "Your specialist";
  const url = emailAbsoluteUrl(DASHBOARD_PATH);
  const paragraphs = [
    greeting(input.clientFirstName),
    `${coach} wants to add you to their client roster on SMOAC.`,
    "If you accept, they can send workouts straight to your calendar. They only see the workouts they send you, not the rest of your log.",
  ];
  return sendOutboundEmail({
    to: input.to,
    subject: `${coach} invited you to their roster`,
    text: [...paragraphs, `Review the invite: ${url}`, "— SMOAC"].join("\n\n"),
    html: wrapTransactionalEmailHtml({
      preheader: `${coach} wants to coach you on SMOAC`,
      eyebrow: "Coaching invite",
      title: `${coach} invited you`,
      bodyHtml: renderEmailParagraphs(paragraphs),
      cta: { label: "Review invite", href: url },
    }),
    kind: "coaching_roster_invite",
  });
}

/** To the specialist once a client accepts an invite or joins through their link. */
export async function sendRosterJoinedEmail(input: {
  to: string;
  clientFirstName: string;
  specialistName: string;
}): Promise<EmailSendResult> {
  const client = input.clientFirstName.trim() || "A new client";
  const url = emailAbsoluteUrl(SPECIALIST_CLIENTS_PATH);
  const paragraphs = [
    greeting(input.specialistName.trim().split(/\s+/)[0] ?? ""),
    `${client} accepted your invite and is now on your client roster.`,
    "Send their first workout from the Clients tab — it lands right on their calendar.",
  ];
  return sendOutboundEmail({
    to: input.to,
    subject: `${client} joined your roster`,
    text: [...paragraphs, `Open Clients: ${url}`, "— SMOAC"].join("\n\n"),
    html: wrapTransactionalEmailHtml({
      preheader: `${client} is now one of your clients`,
      eyebrow: "New client",
      title: `${client} joined your roster`,
      bodyHtml: renderEmailParagraphs(paragraphs),
      cta: { label: "Open Clients", href: url },
    }),
    kind: "coaching_roster_joined",
  });
}

/** To the client once they're on a specialist's roster. */
export async function sendRosterWelcomeEmail(input: {
  to: string;
  clientFirstName: string;
  specialistName: string;
}): Promise<EmailSendResult> {
  const coach = input.specialistName.trim() || "your specialist";
  const url = emailAbsoluteUrl(DASHBOARD_PATH);
  const paragraphs = [
    greeting(input.clientFirstName),
    `You’re now training with ${coach} on SMOAC.`,
    "Workouts they send you show up on your Workouts calendar, and we’ll email you when a new one arrives. They only see the workouts they send you, not the rest of your log.",
  ];
  return sendOutboundEmail({
    to: input.to,
    subject: `You’re training with ${coach}`,
    text: [...paragraphs, `Open your dashboard: ${url}`, "— SMOAC"].join("\n\n"),
    html: wrapTransactionalEmailHtml({
      preheader: `${coach} can now send you workouts`,
      eyebrow: "Coaching",
      title: `You’re training with ${coach}`,
      bodyHtml: renderEmailParagraphs(paragraphs),
      cta: { label: "Open dashboard", href: url },
    }),
    kind: "coaching_roster_welcome",
  });
}

export async function sendCoachWorkoutEmail(input: {
  to: string;
  clientFirstName: string;
  specialistName: string;
  dateKey: string;
  title: string;
  note: string;
  exerciseCount: number;
}): Promise<EmailSendResult> {
  const coach = input.specialistName.trim() || "Your coach";
  const url = emailAbsoluteUrl(DASHBOARD_PATH);
  const day = formatWorkoutDayHeading(input.dateKey);
  const name = input.title.trim() || "a workout";
  const paragraphs = [
    greeting(input.clientFirstName),
    `${coach} sent you ${name} for ${day} — ${input.exerciseCount} exercise${input.exerciseCount === 1 ? "" : "s"}.`,
    "It’s on your Workouts calendar. Open that day and check off each set as you go.",
  ];
  return sendOutboundEmail({
    to: input.to,
    subject: `New workout from ${coach}: ${name}`,
    text: [
      ...paragraphs,
      ...(input.note.trim() ? [`Note from ${coach}: ${input.note.trim()}`] : []),
      `Open Workouts: ${url}`,
      "— SMOAC",
    ].join("\n\n"),
    html: wrapTransactionalEmailHtml({
      preheader: `${name} for ${day}`,
      eyebrow: "From your coach",
      title: `New workout from ${coach}`,
      bodyHtml:
        renderEmailParagraphs(paragraphs) +
        renderEmailQuote(`Note from ${coach}`, input.note),
      cta: { label: "Open Workouts", href: url },
    }),
    kind: "coaching_workout_sent",
  });
}
