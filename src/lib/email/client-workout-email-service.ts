/**
 * Client workout emails — streak milestones, streak-at-risk nudges, and the Sunday recap.
 * Server only (signs unsubscribe links).
 */
import { sendOutboundEmail, type EmailSendResult } from "@/lib/email/email-transport";
import {
  emailAbsoluteUrl,
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { renderWeeklyRecapEmail } from "@/lib/email/weekly-recap-email";
import { unsubscribeUrlFor } from "@/lib/admin-email-unsubscribe";
import type { DueWorkoutEmail } from "@/lib/workouts/client-workout-email-rules";

/** Unsubscribe tokens carrying this prefix only turn off workout emails. */
export const WORKOUT_EMAIL_UNSUBSCRIBE_PREFIX = "workouts:";

const DASHBOARD_PATH = "/client-dashboard";

export interface WorkoutEmailRecipient {
  userId: string;
  email: string;
  firstName: string;
}

interface BuiltEmail {
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  cta: string;
}

function weeks(count: number): string {
  return `${count} ${count === 1 ? "week" : "weeks"}`;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function buildMilestone(
  email: Extract<DueWorkoutEmail, { kind: "streak_milestone" }>,
  name: string
): BuiltEmail {
  const span = weeks(email.streak);
  return {
    subject: `🔥 ${span} in a row, ${name}`,
    preheader: `You've hit your goal ${span} straight.`,
    eyebrow: "Streak milestone",
    title: `🔥 ${email.streak}-week streak`,
    paragraphs: [
      `Nice work, ${name}.`,
      `You've hit your workout goal ${span} in a row. That's the habit doing its job.`,
      "Keep it going next week.",
    ],
    cta: "See your week",
  };
}

function buildAtRisk(
  email: Extract<DueWorkoutEmail, { kind: "streak_at_risk" }>,
  name: string
): BuiltEmail {
  const needs = [
    email.workoutsLeft > 0 ? plural(email.workoutsLeft, "workout") : "",
    email.cardioLeft > 0 ? plural(email.cardioLeft, "cardio day") : "",
  ].filter(Boolean);
  const need = needs.join(" and ");
  const when = email.daysLeft === 1 ? "today" : "by Saturday";
  const streak = `${email.streak}-week streak`;
  return {
    subject: `${need} keeps your ${streak}`,
    preheader: `Your week ends Saturday. ${need} to go.`,
    eyebrow: "Streak at risk",
    title: `Keep your ${streak}`,
    paragraphs: [
      `Hi ${name},`,
      `You're ${need} away from this week's goal. Get it in ${when} and your ${streak} keeps going.`,
    ],
    cta: "Log a workout",
  };
}

function build(
  email: Exclude<DueWorkoutEmail, { kind: "weekly_recap" }>,
  name: string
): BuiltEmail {
  if (email.kind === "streak_milestone") return buildMilestone(email, name);
  return buildAtRisk(email, name);
}

export async function sendClientWorkoutEmail(
  recipient: WorkoutEmailRecipient,
  email: DueWorkoutEmail
): Promise<EmailSendResult> {
  const name = recipient.firstName.trim() || "there";
  const unsubscribeHref = unsubscribeUrlFor(
    recipient.email,
    `${WORKOUT_EMAIL_UNSUBSCRIBE_PREFIX}${recipient.userId}`
  );

  if (email.kind === "weekly_recap") {
    const recap = renderWeeklyRecapEmail(name, email, {
      planUrl: "/workouts",
      logUrl: "/workouts",
      goalUrl: "/client-dashboard?editProfile=1",
      exploreUrl: "/workouts",
      trainersUrl: "/explore",
      unsubscribeHref,
    });
    return sendOutboundEmail({
      to: recipient.email,
      subject: recap.subject,
      text: recap.text,
      html: recap.html,
      kind: `client_workout_${email.kind}`,
      tags: [{ name: "category", value: `client_workout_${email.kind}` }],
    });
  }

  const built = build(email, name);
  const dashboardUrl = emailAbsoluteUrl(DASHBOARD_PATH);

  const text = [
    ...built.paragraphs,
    `${built.cta}: ${dashboardUrl}`,
    `Stop workout emails: ${unsubscribeHref}`,
    "— SMOAC",
  ].join("\n\n");

  const html = wrapTransactionalEmailHtml({
    preheader: built.preheader,
    eyebrow: built.eyebrow,
    title: built.title,
    bodyHtml: renderEmailParagraphs(built.paragraphs),
    cta: { label: built.cta, href: dashboardUrl },
    footerNote: "You get these because workout emails are on in your SMOAC Workouts.",
    unsubscribeHref,
  });

  return sendOutboundEmail({
    to: recipient.email,
    subject: built.subject,
    text,
    html,
    kind: `client_workout_${email.kind}`,
    tags: [{ name: "category", value: `client_workout_${email.kind}` }],
  });
}
