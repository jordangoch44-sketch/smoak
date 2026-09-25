/**
 * Designed cold email for San Diego trainers.
 * Table layout follows the trainer launch mock: short headline, a phone
 * showing the map, founding note, and a real signup button.
 */
import { SMOAC_COLOR } from "@/lib/brand";
import {
  emailAbsoluteUrl,
  emailPublicAssetUrl,
  emailSiteOrigin,
  escapeEmailHtml,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const TITLE = "#f5f5f7";
const BODY = "#c7c7cc";
const MUTED = "#8e8e93";
const ACCENT = "#c4b5fd";
const PANEL = "#121216";

const SPECTRUM = `linear-gradient(105deg,${SMOAC_COLOR.warm} 0%,${SMOAC_COLOR.rose} 28%,${SMOAC_COLOR.violet} 52%,${SMOAC_COLOR.indigo} 78%,${SMOAC_COLOR.cool} 100%)`;

const HEADLINE = "Get Discovered by More Local Clients.";
const PREHEADER =
  "Free to list. No commissions. Be one of the first trainers on Smoac.";
const LEDE =
  "Smoac is a San Diego-based fitness platform that helps local trainers get discovered by people in their area.";
const LAUNCH_TITLE = "Join as a Founding Trainer";
const LAUNCH_BODY =
  "Be one of the first 100 trainers listed on Smoac before our official launch in December.";
const CTA_LABEL = "Create Your Free Profile";
const CLOSE =
  "If you have any questions at all, feel free to reach out. We'd love to have you be part of this from the beginning!";

const FEATURES = [
  ["👤", "Free Profile"],
  ["🎯", "Get Found Locally"],
  ["💜", "No Commissions"],
  ["📊", "Optional Paid Features"],
  ["📍", "Reach More Clients"],
  ["⭐", "Be One of the First 100"],
] as const;

const URL_RE = /https?:\/\/[^\s<>"']+/i;

/** Trainer pitch saved in cold outreach — subject or body is enough. */
export function isTrainerDiscoveryOutreach(
  subject: string,
  body: string
): boolean {
  const hay = `${subject}\n${body}`.toLowerCase();
  if (!hay.includes("trainer")) return false;
  return (
    hay.includes("san diego") ||
    hay.includes("create-account") ||
    hay.includes("founding")
  );
}

/** Signup button target. Uses the link in the saved message when there is one. */
export function trainerOutreachSignupUrl(body: string): string {
  const match = body.match(URL_RE);
  const raw = match?.[0]?.replace(/[).,]+$/g, "") ?? "/create-account";
  return emailAbsoluteUrl(raw);
}

function mapPhone(): string {
  const src = escapeEmailHtml(emailPublicAssetUrl("/email/trainer-map-phone.jpg"));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:0;">
      <img src="${src}" width="240" alt="An iPhone showing the SMOAC map with trainer pins around San Diego" style="display:block;width:240px;max-width:78%;height:auto;border:0;margin:0 auto;"/>
    </td>
  </tr>
  <tr>
    <td align="left" style="padding:12px 2px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${MUTED};">
      Clients find you on this map. Free profile, no commissions.
    </td>
  </tr>
</table>`;
}

function launchCard(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border-collapse:collapse;">
  <tr>
    <td style="padding:2px;border-radius:16px;background:${SPECTRUM};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:16px 16px;border-radius:14px;background:${PANEL};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td width="46" valign="top" style="width:46px;padding:2px 12px 0 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr>
                      <td align="center" valign="middle" width="40" height="40" style="width:40px;height:40px;border-radius:20px;background-color:#2a1848;font-family:${FONT};font-size:18px;line-height:40px;color:${ACCENT};">★</td>
                    </tr>
                  </table>
                </td>
                <td valign="top">
                  <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${ACCENT};">Be part of the launch</p>
                  <p style="margin:0 0 6px;font-family:${FONT};font-size:18px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${TITLE};">${escapeEmailHtml(LAUNCH_TITLE)}</p>
                  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.5;color:${BODY};">${escapeEmailHtml(LAUNCH_BODY)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function signupButton(href: string): string {
  const safeHref = escapeEmailHtml(href);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;border-collapse:collapse;">
  <tr>
    <td align="center" style="border-radius:14px;background-color:${SMOAC_COLOR.violet};background-image:${SPECTRUM};">
      <a href="${safeHref}" style="display:block;padding:16px 18px;font-family:${FONT};font-size:16px;font-weight:700;letter-spacing:-0.01em;color:#ffffff;text-decoration:none;text-align:center;">${escapeEmailHtml(CTA_LABEL)} &rarr;</a>
    </td>
  </tr>
</table>`;
}

export function renderTrainerDiscoveryOutreachHtml(options: {
  signupUrl: string;
  footerNote: string;
  greetingName?: string | null;
  unsubscribeHref?: string | null;
}): string {
  const signupUrl = emailAbsoluteUrl(options.signupUrl);
  const origin = emailSiteOrigin();
  const siteLabel = origin.replace(/^https?:\/\//, "");

  const titleHtml = `<h1 style="margin:0 0 14px;font-family:${FONT};font-size:32px;line-height:1.08;font-weight:700;letter-spacing:-0.035em;color:${TITLE};">Get Discovered<br/>by More Local<br/><span style="color:#9b8cff;">Clients.</span></h1>`;

  const greeting = options.greetingName?.trim();
  const hello = greeting
    ? `<p style="margin:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.6;color:${BODY};">Hi ${escapeEmailHtml(greeting)},</p>`
    : "";

  const bodyHtml = `${hello}<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${BODY};">${escapeEmailHtml(LEDE)}</p>
${mapPhone()}
${launchCard()}
${signupButton(signupUrl)}
<p style="margin:14px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;text-align:center;color:${MUTED};">Or check out the website: <a href="${escapeEmailHtml(origin)}" style="color:${ACCENT};text-decoration:underline;">${escapeEmailHtml(siteLabel)}</a></p>
<p style="margin:22px 0 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${BODY};">${escapeEmailHtml(CLOSE)}</p>
<p style="margin:16px 0 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${TITLE};">Best,<br/>The Smoac Team</p>`;

  return wrapTransactionalEmailHtml({
    preheader: PREHEADER,
    eyebrow: "For San Diego trainers",
    title: HEADLINE,
    titleHtml,
    bodyHtml,
    maxWidth: 600,
    footerNote: options.footerNote,
    unsubscribeHref: options.unsubscribeHref ?? undefined,
  });
}

export function renderTrainerDiscoveryOutreachText(
  signupUrl: string,
  greetingName?: string | null
): string {
  const href = emailAbsoluteUrl(signupUrl);
  const origin = emailSiteOrigin();
  const features = FEATURES.map(([, label]) => `- ${label}`).join("\n");
  const greeting = greetingName?.trim();
  return [
    greeting ? `Hi ${greeting},` : "",
    "FOR SAN DIEGO TRAINERS",
    HEADLINE,
    LEDE,
    features,
    LAUNCH_TITLE,
    LAUNCH_BODY,
    `${CTA_LABEL}: ${href}`,
    `Or check out the website: ${origin}`,
    CLOSE,
    "Best,\nThe Smoac Team",
  ]
    .filter(Boolean)
    .join("\n\n");
}
