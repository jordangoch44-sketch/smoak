/**
 * Sunday "week in review" email. Table layout so the poster holds up
 * in mail clients. Metrics come from the client's own log.
 */
import { BRAND_NAME } from "@/lib/brand";
import {
  emailAbsoluteUrl,
  emailPublicAssetUrl,
  escapeEmailHtml,
} from "@/lib/email/email-html-shell";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";
import { formatBodyWeight } from "@/lib/workouts/client-workout";
import type { DueWorkoutEmail } from "@/lib/workouts/client-workout-email-rules";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/** Cardio minutes that fill the teal bar. The number itself is exact. */
const CARDIO_BAR_FULL_MINUTES = 50;
const STREAK_DOTS = 7;

type RecapEmail = Extract<DueWorkoutEmail, { kind: "weekly_recap" }>;

export interface WeeklyRecapEmailLinks {
  planUrl: string;
  logUrl: string;
  goalUrl: string;
  exploreUrl: string;
  trainersUrl: string;
  unsubscribeHref: string;
}

export interface RenderedWeeklyRecap {
  subject: string;
  text: string;
  html: string;
}

function asset(name: string): string {
  return escapeEmailHtml(emailPublicAssetUrl(`/email/${name}.png`));
}

function glyph(name: string, size: number): string {
  return `<img src="${asset(name)}" width="${size}" height="${size}" alt="" style="display:block;border:0;width:${size}px;height:${size}px;"/>`;
}

function iconWell(name: string, background: string, size = 40): string {
  const icon = Math.round(size * 0.48);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td align="center" valign="middle" width="${size}" height="${size}" bgcolor="${background}" style="width:${size}px;height:${size}px;border-radius:${Math.round(size / 2)}px;background-color:${background};font-size:0;line-height:0;">${glyph(name, icon)}</td></tr></table>`;
}

function countLabel(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString("en-US");
}

function pounds(value: number): string {
  return `${formatBodyWeight(value)} lb`;
}

function goalPct(done: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / goal) * 100)));
}

function cardioBarPct(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.max(14, Math.min(100, Math.round((minutes / CARDIO_BAR_FULL_MINUTES) * 100)));
}

function bar(pct: number, color: string, gradient: string): string {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const track = "#2a3148";
  const fill = `background-color:${color};background-image:${gradient};`;
  if (clamped <= 0) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td height="6" bgcolor="${track}" style="height:6px;border-radius:99px;background:${track};font-size:0;line-height:6px;">&nbsp;</td></tr></table>`;
  }
  if (clamped >= 100) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td height="6" bgcolor="${color}" style="height:6px;border-radius:99px;${fill}font-size:0;line-height:6px;">&nbsp;</td></tr></table>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td width="${clamped}%" height="6" bgcolor="${color}" style="width:${clamped}%;height:6px;border-radius:99px 0 0 99px;${fill}font-size:0;line-height:6px;">&nbsp;</td><td height="6" bgcolor="${track}" style="height:6px;border-radius:0 99px 99px 0;background:${track};font-size:0;line-height:6px;">&nbsp;</td></tr></table>`;
}

function streakDots(streak: number): string {
  const filled = Math.max(0, Math.min(STREAK_DOTS, streak));
  const dots = Array.from({ length: STREAK_DOTS }, (_, index) => {
    const on = index < filled;
    const color = on ? "#fdad34" : "#343b52";
    const gap = index === STREAK_DOTS - 1 ? "" : `<td style="width:4px;font-size:0;line-height:0;">&nbsp;</td>`;
    return `<td width="8" height="8" bgcolor="${color}" style="width:8px;height:8px;border-radius:8px;background:${color};font-size:0;line-height:0;">&nbsp;</td>${gap}`;
  }).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:10px auto 0;border-collapse:separate;"><tr>${dots}</tr></table>`;
}

function sparkline(values: number[]): string {
  const series = values.filter((value) => Number.isFinite(value)).slice(-7);
  if (series.length === 0) return "";
  const points = series.length === 1 ? [series[0], series[0], series[0], series[0]] : series;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const cells = points
    .map((value) => {
      const height = max === min ? 12 : 5 + Math.round(((value - min) / span) * 16);
      return `<td valign="bottom" style="padding:0 1px;font-size:0;line-height:0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="4" height="${height}" bgcolor="#38bdf8" style="width:4px;height:${height}px;border-radius:3px;background-color:#38bdf8;background-image:linear-gradient(180deg,#7dd3fc,#38bdf8);font-size:0;line-height:0;">&nbsp;</td></tr></table></td>`;
    })
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 0;border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

function tile(options: {
  icon: string;
  label: string;
  value: string;
  visual: string;
  edge: "start" | "mid" | "end";
}): string {
  const pad =
    options.edge === "start" ? "0 3px 0 0" : options.edge === "end" ? "0 0 0 3px" : "0 3px";
  return `<td width="25%" valign="top" style="padding:${pad};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
      <tr>
        <td align="center" valign="top" bgcolor="#161b28" style="background-color:#161b28;border:1px solid #2a3144;border-radius:16px;padding:12px 4px 12px;">
          ${glyph(options.icon, 20)}
          <p style="margin:8px 0 0;font-family:${FONT};font-size:7px;line-height:1.2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9aa3b8;">${escapeEmailHtml(options.label)}</p>
          <p style="margin:4px 0 0;font-family:${FONT};font-size:15px;line-height:1.15;font-weight:800;letter-spacing:-0.03em;color:#fafafa;white-space:nowrap;">${options.value}</p>
          ${options.visual}
        </td>
      </tr>
    </table>
  </td>`;
}

function glowCard(inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 14px;">
    <tr>
      <td style="padding:1.5px;border-radius:22px;background-color:#fb5ac4;background-image:linear-gradient(115deg,#fb5ac4 0%,#a855f7 46%,#38bdf8 100%);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
          <tr>
            <td bgcolor="#10141f" style="padding:14px 10px 12px;border-radius:20px;background-color:#10141f;background-image:linear-gradient(180deg,#181d2e 0%,#10141f 48%);">
              ${inner}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function exerciseTitle(name: string): string {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length <= 42) return clean;
  return `${clean.slice(0, 41).trimEnd()}…`;
}

function topSetBlock(email: RecapEmail): string {
  const lift = email.figures.topSet;
  const name = lift ? exerciseTitle(lift.name) : "No lift this week";
  const weight = lift ? pounds(lift.weightLb) : "—";
  const badge =
    lift && lift.prGainLb > 0
      ? `<td valign="middle" align="right" style="padding:0 0 0 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
            <tr>
              <td bgcolor="#241446" style="border-radius:14px;background-color:#241446;border:1px solid #7c3aed;padding:8px 12px 8px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle" style="padding:0 8px 0 0;">${glyph("recap-trophy", 18)}</td>
                    <td valign="middle">
                      <p style="margin:0;font-family:${FONT};font-size:9px;line-height:1.2;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#d8b4fe;white-space:nowrap;">New PR</p>
                      <p style="margin:2px 0 0;font-family:${FONT};font-size:15px;line-height:1.1;font-weight:800;color:#ffffff;white-space:nowrap;">+${escapeEmailHtml(pounds(lift.prGainLb))}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>`
      : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
    <tr>
      <td valign="middle" width="44" style="padding:0 10px 0 0;">${iconWell("recap-dumbbell", "#2a1848", 42)}</td>
      <td valign="middle">
        <p style="margin:0;font-family:${FONT};font-size:10px;line-height:1.2;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#c4b5fd;">Top set</p>
        <p style="margin:3px 0 0;font-family:${FONT};font-size:18px;line-height:1.15;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">${escapeEmailHtml(name)}</p>
        <p style="margin:2px 0 0;font-family:${FONT};font-size:14px;line-height:1.2;font-weight:600;color:#e5e7eb;">${escapeEmailHtml(weight)}</p>
      </td>
      ${badge}
    </tr>
  </table>`;
}

function metricTiles(email: RecapEmail): string {
  const workoutBar = bar(
    goalPct(email.workout.done, email.workout.goal),
    "#a855f7",
    "linear-gradient(90deg,#a855f7,#c4b5fd)"
  );
  const cardio = email.cardio;
  const cardioBar = bar(
    cardio ? goalPct(cardio.done, cardio.goal) : 0,
    "#fb7185",
    "linear-gradient(90deg,#fb7185,#f9a8d4)"
  );
  const weight = email.figures.weightLb;
  const streakUnit = email.streak === 1 ? "week" : "weeks";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
    <tr>
      ${tile({
        icon: "recap-dumbbell",
        label: "Workouts",
        value: escapeEmailHtml(`${email.workout.done} / ${email.workout.goal}`),
        visual: `<div style="margin-top:10px;">${workoutBar}</div>`,
        edge: "start",
      })}
      ${tile({
        icon: "recap-heart",
        label: "Cardio days",
        value: escapeEmailHtml(cardio ? `${cardio.done} / ${cardio.goal}` : "—"),
        visual: `<div style="margin-top:10px;">${cardioBar}</div>`,
        edge: "mid",
      })}
      ${tile({
        icon: "recap-flame",
        label: "Streak",
        value: escapeEmailHtml(`${email.streak} ${streakUnit}`),
        visual: streakDots(email.streak),
        edge: "mid",
      })}
      ${tile({
        icon: "recap-scale",
        label: "Weight",
        value: escapeEmailHtml(weight === null ? "—" : pounds(weight)),
        visual: sparkline(email.figures.weightSeries),
        edge: "end",
      })}
    </tr>
  </table>`;
}

function cardioTimeRow(minutes: number): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td valign="middle" width="44" style="padding:0 10px 0 0;">${iconWell("recap-shoe", "#102e2c", 42)}</td>
      <td valign="middle" width="118">
        <p style="margin:0;font-family:${FONT};font-size:10px;line-height:1.2;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9aa3b8;">Cardio time</p>
        <p style="margin:3px 0 0;font-family:${FONT};font-size:22px;line-height:1.1;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">${escapeEmailHtml(String(minutes))} <span style="font-size:15px;font-weight:700;color:#d1d5db;">min</span></p>
      </td>
      <td valign="middle" style="padding:0 0 0 8px;">
        ${bar(cardioBarPct(minutes), "#2dd4bf", "linear-gradient(90deg,#14b8a6,#5eead4)")}
      </td>
    </tr>
  </table>`;
}

function completedStat(icon: string, value: string, label: string): string {
  return `<td width="25%" align="center" valign="top" style="padding:0 2px;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
      <tr>
        <td valign="middle" style="padding:0 5px 0 0;">${glyph(icon, 16)}</td>
        <td valign="middle" style="font-family:${FONT};font-size:18px;line-height:1;font-weight:800;letter-spacing:-0.03em;color:#ffffff;white-space:nowrap;">${escapeEmailHtml(value)}</td>
      </tr>
    </table>
    <p style="margin:6px 0 0;font-family:${FONT};font-size:8px;line-height:1.25;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9aa3b8;">${escapeEmailHtml(label)}</p>
  </td>`;
}

function completedRow(email: RecapEmail): string {
  const inner = `<p style="margin:0 0 14px;font-family:${FONT};font-size:10px;line-height:1.2;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b7becc;">This week you completed</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${completedStat("recap-dumbbell", countLabel(email.figures.sets), "Total sets")}
        ${completedStat("recap-chart", countLabel(email.figures.reps), "Total reps")}
        ${completedStat("recap-flame", countLabel(email.figures.cardioMinutes), "Min cardio")}
        ${completedStat("recap-kettlebell", countLabel(email.figures.workouts), "Workouts")}
      </tr>
    </table>`;
  return glowCard(inner);
}

function ctaButton(href: string): string {
  const url = escapeEmailHtml(emailAbsoluteUrl(href));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;border-collapse:separate;">
    <tr>
      <td align="center" bgcolor="#8e3bfd" style="border-radius:999px;background-color:#8e3bfd;background-image:linear-gradient(90deg,#fa648a 0%,#8e3bfd 52%,#51adfa 100%);">
        <a href="${url}" style="display:block;padding:15px 18px;font-family:${FONT};font-size:17px;line-height:1.2;font-weight:700;letter-spacing:-0.01em;color:#ffffff;text-decoration:none;">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center">
            <tr>
              <td valign="middle" style="padding:0 8px 0 0;">${glyph("recap-calendar", 18)}</td>
              <td valign="middle" style="font-family:${FONT};font-size:17px;line-height:1;font-weight:700;color:#ffffff;">Plan this week &#8594;</td>
            </tr>
          </table>
        </a>
      </td>
    </tr>
  </table>`;
}

function actionLink(icon: string, label: string, href: string): string {
  const url = escapeEmailHtml(emailAbsoluteUrl(href));
  const [first, second] = label.split("\n");
  return `<td width="25%" align="center" valign="top" style="padding:0 4px;">
    <a href="${url}" style="text-decoration:none;">
      ${iconWell(icon, "#171c2b", 46)}
      <p style="margin:8px 0 0;font-family:${FONT};font-size:9px;line-height:1.35;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d5d8e2;">${escapeEmailHtml(first)}<br/>${escapeEmailHtml(second ?? "")}</p>
    </a>
  </td>`;
}

function recapText(name: string, email: RecapEmail, links: WeeklyRecapEmailLinks): string {
  const lines = [
    `Hi ${name}, here's a look at your progress from ${email.rangeLabel}.`,
  ];
  const lift = email.figures.topSet;
  if (lift) {
    lines.push(`Top set: ${lift.name} ${pounds(lift.weightLb)}`);
    if (lift.prGainLb > 0) lines.push(`New PR: +${pounds(lift.prGainLb)}`);
  }
  lines.push(`Workouts: ${email.workout.done} / ${email.workout.goal}`);
  if (email.cardio) {
    lines.push(`Cardio days: ${email.cardio.done} / ${email.cardio.goal}`);
  }
  lines.push(
    `Streak: ${email.streak} ${email.streak === 1 ? "week" : "weeks"}`,
    `Weight: ${email.figures.weightLb === null ? "—" : pounds(email.figures.weightLb)}`,
    `Cardio time: ${email.figures.cardioMinutes} min`,
    `Total sets: ${countLabel(email.figures.sets)}`,
    `Total reps: ${countLabel(email.figures.reps)}`,
    `Workouts logged: ${countLabel(email.figures.workouts)}`
  );
  if (email.highlight) lines.push(email.highlight);
  lines.push(
    "",
    `Plan this week: ${emailAbsoluteUrl(links.planUrl)}`,
    `Log a workout: ${emailAbsoluteUrl(links.logUrl)}`,
    `Set a goal: ${emailAbsoluteUrl(links.goalUrl)}`,
    `Explore workouts: ${emailAbsoluteUrl(links.exploreUrl)}`,
    `Find a trainer: ${emailAbsoluteUrl(links.trainersUrl)}`,
    "",
    `Stop workout emails: ${emailAbsoluteUrl(links.unsubscribeHref)}`,
    "— SMOAC"
  );
  return lines.join("\n");
}

export function renderWeeklyRecapEmail(
  name: string,
  email: RecapEmail,
  links: WeeklyRecapEmailLinks
): RenderedWeeklyRecap {
  const safeName = name.trim() || "there";
  const range = email.rangeLabel;
  const rangeUpper = range.toUpperCase();
  const home = escapeEmailHtml(emailAbsoluteUrl("/"));
  const mark = asset("smoac-mark");
  const wordmark = asset("smoac-wordmark");
  const preheader = escapeEmailHtml(
    email.highlight ??
      `Hi ${safeName}, here's a look at your progress from ${range}.`
  );
  const unsubscribe = escapeEmailHtml(emailAbsoluteUrl(links.unsubscribeHref));
  const support = escapeEmailHtml(supportMailto());
  const year = new Date().getFullYear();
  const greeting = `Hi ${escapeEmailHtml(safeName)}, here's a look at your progress<br/>from <span style="white-space:nowrap;">${escapeEmailHtml(range)}</span>.`;

  const mainCard = glowCard(
    `${topSetBlock(email)}${metricTiles(email)}${cardioTimeRow(email.figures.cardioMinutes)}`
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no"/>
  <title>Your week in review</title>
</head>
<body style="margin:0;padding:0;background:#070b16;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#070b16;background-image:radial-gradient(ellipse 80% 42% at 50% -8%, rgba(109,40,217,0.55), transparent 58%), radial-gradient(ellipse 55% 36% at 100% 100%, rgba(37,99,235,0.28), transparent 52%);">
    <tr>
      <td align="center" style="padding:24px 12px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:0 0 6px;">
              <a href="${home}" style="text-decoration:none;">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td valign="middle" style="padding:0 8px 0 0;"><img src="${mark}" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px;border-radius:8px;"/></td>
                    <td valign="middle"><img src="${wordmark}" width="118" height="21" alt="${BRAND_NAME}" style="display:block;border:0;width:118px;height:21px;"/></td>
                  </tr>
                </table>
              </a>
              <p style="margin:8px 0 0;font-family:${FONT};font-size:10px;line-height:1.3;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#9aa3b5;">Find fitness, anywhere.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="border-collapse:separate;">
                <tr>
                  <td bgcolor="#14182a" style="border-radius:999px;background-color:#14182a;border:1px solid rgba(255,255,255,0.16);padding:7px 14px;">
                    <p style="margin:0;font-family:${FONT};font-size:10px;line-height:1.2;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#e8eaf2;">Weekly recap <span style="color:#6d7590;">|</span> <span style="color:#c5cad8;">${escapeEmailHtml(rangeUpper)}</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 8px 0;">
              <h1 style="margin:0;font-family:${FONT};font-size:40px;line-height:0.98;font-weight:800;letter-spacing:-0.045em;color:#fafafa;">Your Week<br/>in <span style="color:#fb5ac4;background-image:linear-gradient(100deg,#fb5ac4 0%,#c084fc 46%,#60a5fa 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Review</span></h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 18px 18px;">
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.45;color:#b7becc;">${greeting}</p>
            </td>
          </tr>
          <tr>
            <td>
              ${mainCard}
              ${completedRow(email)}
              ${ctaButton(links.planUrl)}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                <tr>
                  ${actionLink("recap-calendar", "Log a\nworkout", links.logUrl)}
                  ${actionLink("recap-target", "Set a\ngoal", links.goalUrl)}
                  ${actionLink("recap-dumbbell", "Explore\nworkouts", links.exploreUrl)}
                  ${actionLink("recap-people", "Find a\ntrainer", links.trainersUrl)}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:4px 12px 0;">
              <p style="margin:0;font-family:${FONT};font-size:10px;line-height:1.5;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8b93a7;">Stay consistent. Build a stronger you.</p>
              <p style="margin:12px 0 0;font-family:${FONT};font-size:11px;line-height:1.5;color:#6d7590;">
                <a href="${unsubscribe}" style="color:#a5adc4;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${support}" style="color:#a5adc4;text-decoration:underline;">${escapeEmailHtml(SUPPORT_EMAIL)}</a>
              </p>
              <p style="margin:6px 0 0;font-family:${FONT};font-size:11px;line-height:1.5;color:#6d7590;">
                <a href="${home}" style="color:#a5adc4;text-decoration:none;">smoac.com</a>
                &nbsp;·&nbsp; © ${year} ${BRAND_NAME}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `Your week in review · ${range}`,
    text: recapText(safeName, email, links),
    html,
  };
}
