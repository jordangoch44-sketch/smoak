/**
 * Specialist approval welcome — visual "finish your profile" layout.
 * Pictures live in `public/email/welcome-*.jpg` (cropped from the design mock).
 * Colors are solid, not gradient text: Gmail drops background-clip.
 */
import { SMOAC_COLOR } from "@/lib/brand";
import {
  emailAbsoluteUrl,
  emailPublicAssetUrl,
  escapeEmailHtml,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { FOUNDING_PREMIUM_TRIAL_DAYS } from "@/lib/founding-50-invite";
import { PREMIUM_TRIAL_DAYS } from "@/lib/premium-trial-days";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const TITLE = "#ffffff";
const BODY = "#d4d4d8";
const CYAN = "#22d3ee";
const VIOLET = "#c084fc";

const SPECTRUM = `linear-gradient(100deg,${SMOAC_COLOR.warm} 0%,${SMOAC_COLOR.rose} 30%,${SMOAC_COLOR.violet} 58%,${SMOAC_COLOR.indigo} 82%,${SMOAC_COLOR.cool} 100%)`;
const CTA_SPECTRUM = `linear-gradient(90deg,#8b5cf6 0%,#a855f7 50%,#6366f1 100%)`;

export const SPECIALIST_APPROVAL_SUBJECT =
  "You’re approved — go finish your SMOAC profile";
const PREHEADER =
  "You’re live. Complete profiles are 4x more likely to get messages.";
const CTA_LABEL = "Log In & Edit Profile";
const STAT_LINE =
  "more likely to get messages when your profile is fully filled out.";

const STEPS = [
  {
    key: "photos",
    color: CYAN,
    border: "#155e75",
    bg: "#071a20",
    title: "Add more photos",
    body: "Show your style and results.",
  },
  {
    key: "profile",
    color: "#4ade80",
    border: "#166534",
    bg: "#07190e",
    title: "Complete your profile",
    body: "Services, pricing, hours.",
  },
  {
    key: "search",
    color: "#fbbf24",
    border: "#92400e",
    bg: "#1f1606",
    title: "Stand out on search",
    body: "Get seen by more clients.",
  },
] as const;

export interface SpecialistApprovalEmailInput {
  firstName: string;
  profileUrl: string;
  editProfileUrl: string;
  trialLine?: string;
}

/** Every approval grants a Pro trial; Founding 100 get the longer one. */
export function specialistApprovalTrialLine(isFounding: boolean): string {
  return isFounding
    ? `Founding 100: ${FOUNDING_PREMIUM_TRIAL_DAYS} days of SMOAC Pro, free — no card required.`
    : `Your first ${PREMIUM_TRIAL_DAYS} days of SMOAC Pro are free — no card required.`;
}

function asset(name: string): string {
  return escapeEmailHtml(emailPublicAssetUrl(`/email/${name}`));
}

function paragraph(text: string, style = ""): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.55;color:${BODY};${style}">${escapeEmailHtml(text)}</p>`;
}

function headingHtml(): string {
  return `<h1 style="margin:0 0 14px;font-family:${FONT};font-size:36px;line-height:1.08;font-weight:800;letter-spacing:-0.03em;color:${TITLE};">Go finish<br/><span style="color:${CYAN};">your</span> <span style="color:${VIOLET};">account</span></h1>`;
}

function trialPill(line: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:separate;">
  <tr>
    <td bgcolor="#1e1433" style="padding:8px 14px;border-radius:999px;background-color:#1e1433;border:1px solid #6d28d9;font-family:${FONT};font-size:13px;line-height:1.4;font-weight:600;color:#e9d5ff;">★ ${escapeEmailHtml(line)}</td>
  </tr>
</table>`;
}

function statCard(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border-collapse:collapse;">
  <tr>
    <td bgcolor="${SMOAC_COLOR.violet}" style="padding:2px;border-radius:18px;background-color:${SMOAC_COLOR.violet};background-image:${SPECTRUM};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td bgcolor="#101014" style="padding:18px 20px;border-radius:16px;background-color:#101014;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td width="1%" valign="middle" style="width:1%;padding:0 14px 0 0;white-space:nowrap;font-family:${FONT};font-size:52px;line-height:1;font-weight:800;letter-spacing:-0.04em;color:${CYAN};">4x</td>
                <td valign="middle" style="font-family:${FONT};font-size:17px;line-height:1.4;font-weight:600;color:${TITLE};">${escapeEmailHtml(STAT_LINE)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function ctaButton(href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border-collapse:collapse;">
  <tr>
    <td align="center" bgcolor="#8b5cf6" style="border-radius:16px;background-color:#8b5cf6;background-image:${CTA_SPECTRUM};box-shadow:0 10px 28px rgba(139,92,246,0.45);">
      <a href="${escapeEmailHtml(href)}" style="display:block;padding:18px 20px;font-family:${FONT};font-size:18px;line-height:1.2;font-weight:700;letter-spacing:-0.01em;color:#ffffff;text-decoration:none;text-align:center;border-radius:16px;"><span style="color:#ffffff;">${escapeEmailHtml(CTA_LABEL)} &rarr;</span></a>
    </td>
  </tr>
</table>`;
}

/**
 * Fixed sizes so the three cards line up with the phone top to bottom:
 * 3 × CARD_HEIGHT + 2 × CARD_GAP === PHONE_HEIGHT (image is 310×664).
 */
const PHONE_WIDTH = 124;
const PHONE_HEIGHT = 266;
const CARD_GAP = 10;
const CARD_HEIGHT = (PHONE_HEIGHT - CARD_GAP * 2) / 3;

function phone(href: string): string {
  const alt = escapeEmailHtml(
    "SMOAC profile on iPhone — tap the menu icon to edit your profile"
  );
  return `<a href="${escapeEmailHtml(href)}" style="text-decoration:none;">
  <img src="${asset("welcome-phone.jpg")}" width="${PHONE_WIDTH}" height="${PHONE_HEIGHT}" alt="${alt}" style="display:block;width:${PHONE_WIDTH}px;height:${PHONE_HEIGHT}px;border:0;border-radius:20px;"/>
</a>`;
}

function stepCard(step: (typeof STEPS)[number], isLast: boolean): string {
  return `<tr>
  <td style="padding:0 0 ${isLast ? 0 : CARD_GAP}px;">
    <table role="presentation" width="100%" height="${CARD_HEIGHT}" cellpadding="0" cellspacing="0" border="0" bgcolor="${step.bg}" style="height:${CARD_HEIGHT}px;border-collapse:separate;background-color:${step.bg};border:1px solid ${step.border};border-radius:14px;">
      <tr>
        <td width="36" valign="middle" style="width:36px;padding:0 0 0 8px;">
          <img src="${asset(`welcome-icon-${step.key}.jpg`)}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;border-radius:14px;"/>
        </td>
        <td valign="middle" style="padding:0 8px;font-family:${FONT};">
          <p style="margin:0 0 2px;font-family:${FONT};font-size:14px;line-height:1.25;font-weight:700;color:${step.color};">${escapeEmailHtml(step.title)}</p>
          <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.3;color:${BODY};">${escapeEmailHtml(step.body)}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

/** Steps on the left, phone on the right — a table keeps the split on phones. */
function stepsWithPhone(href: string): string {
  const cards = STEPS.map((step, index) =>
    stepCard(step, index === STEPS.length - 1)
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border-collapse:collapse;">
  <tr>
    <td valign="top" style="padding:0 10px 0 0;">
      <a href="${escapeEmailHtml(href)}" style="text-decoration:none;display:block;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${cards}</table>
      </a>
    </td>
    <td valign="top" width="${PHONE_WIDTH}" style="width:${PHONE_WIDTH}px;">
      ${phone(href)}
    </td>
  </tr>
</table>`;
}

function photoStrip(): string {
  const alt = escapeEmailHtml(
    "Example profile photos: portrait, coaching a client, gym space, before and after, outdoor run"
  );
  return `<img src="${asset("welcome-strip.jpg")}" width="544" alt="${alt}" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:12px;margin:0 0 18px;"/>`;
}

function reachLine(): string {
  return `<p style="margin:0 0 18px;font-family:${FONT};font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;text-align:center;color:${TITLE};">The more you fill out, the more <span style="color:${CYAN};">clients</span> <span style="color:${VIOLET};">find you.</span></p>`;
}

function shareLine(profileUrl: string): string {
  const href = escapeEmailHtml(emailAbsoluteUrl(profileUrl));
  const display = escapeEmailHtml(
    emailAbsoluteUrl(profileUrl).replace(/^https?:\/\//i, "")
  );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
  <tr>
    <td bgcolor="#121216" style="padding:12px 14px;border-radius:12px;background-color:#121216;border:1px solid #2d2d38;font-family:${FONT};">
      <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#c4b5fd;">Share your page · Instagram, TikTok, website</p>
      <a href="${href}" style="font-family:${FONT};font-size:14px;font-weight:600;line-height:1.4;color:${TITLE};text-decoration:underline;word-break:break-all;">${display}</a>
    </td>
  </tr>
</table>`;
}

export function renderSpecialistApprovalEmailHtml(
  input: SpecialistApprovalEmailInput
): string {
  const editHref = emailAbsoluteUrl(input.editProfileUrl);
  const bodyHtml = [
    paragraph(
      `Hi ${input.firstName}, you’re approved and live on SMOAC. Log in and finish your profile to start getting in front of clients.`
    ),
    input.trialLine ? trialPill(input.trialLine) : "",
    statCard(),
    ctaButton(editHref),
    stepsWithPhone(editHref),
    photoStrip(),
    reachLine(),
    shareLine(input.profileUrl),
  ].join("");

  return wrapTransactionalEmailHtml({
    preheader: PREHEADER,
    eyebrow: "You’re approved 🔥🔥🔥",
    title: "Go finish your account",
    titleHtml: headingHtml(),
    bodyHtml,
    maxWidth: 600,
    footerNote: "You’re receiving this because your SMOAC specialist account was approved.",
  });
}

export function renderSpecialistApprovalEmailText(
  input: SpecialistApprovalEmailInput
): string {
  const editHref = emailAbsoluteUrl(input.editProfileUrl);
  return [
    `Hi ${input.firstName},`,
    "You’re approved and live on SMOAC. Now go finish your account.",
    input.trialLine ?? "",
    `Fully filled-out profiles are 4x ${STAT_LINE}`,
    `${CTA_LABEL}: ${editHref}`,
    STEPS.map((step) => `• ${step.title} — ${step.body}`).join("\n"),
    `Your live page (add it to your bio): ${input.profileUrl}`,
    "Finish your profile for the best chance of client reach.",
    "— The SMOAC team",
  ]
    .filter(Boolean)
    .join("\n\n");
}
