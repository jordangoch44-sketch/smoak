/**
 * Designed cold email for San Diego trainers.
 * Copy and benefits stay on the left and the map phone stays on the
 * right, including on a phone. Footer links stay the same as the
 * shared transactional shell.
 */
import { BRAND_NAME, SMOAC_COLOR } from "@/lib/brand";
import {
  emailAbsoluteUrl,
  emailPublicAssetUrl,
  emailSiteOrigin,
  escapeEmailHtml,
} from "@/lib/email/email-html-shell";
import { FOUNDING_COUNTDOWN_ALT } from "@/lib/email/founding-countdown-gif";
import { FOUNDING_LAUNCH_LABEL } from "@/lib/founding-50-invite";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const PAGE = "#050506";
const CARD = "#0c0c0e";
const TITLE = "#ffffff";
const BODY = "#d4d4d8";
const MUTED = "#8e8e93";
const ACCENT = "#c4b5fd";
const CLIENTS = "#818cf8";
const PANEL = "#121216";

const SPECTRUM = `linear-gradient(100deg,${SMOAC_COLOR.warm} 0%,${SMOAC_COLOR.rose} 30%,${SMOAC_COLOR.violet} 58%,${SMOAC_COLOR.indigo} 82%,${SMOAC_COLOR.cool} 100%)`;
const CTA_SPECTRUM = `linear-gradient(90deg,${SMOAC_COLOR.rose} 0%,${SMOAC_COLOR.violet} 46%,${SMOAC_COLOR.indigo} 78%,${SMOAC_COLOR.cool} 100%)`;

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
  "Questions? Just reply to this email — we'd love to have you be part of the launch.";

const BENEFITS = [
  {
    icon: "outreach-icon-pin.png",
    title: "Show up on the map",
    body: "Clients find you in your area.",
  },
  {
    icon: "outreach-icon-people.png",
    title: "More local clients",
    body: "Get discovered by people looking to train.",
  },
  {
    icon: "outreach-icon-dollar.png",
    title: "Free profile. No commissions.",
    body: "Keep 100% of your earnings.",
  },
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

function logoLockup(origin: string): string {
  const mark = escapeEmailHtml(emailPublicAssetUrl("/smoac-mark.png"));
  const wordmark = escapeEmailHtml(emailPublicAssetUrl("/smoac-wordmark.png"));
  return `<a href="${escapeEmailHtml(origin)}" style="text-decoration:none;">
    <img src="${mark}" width="36" height="36" alt="" style="display:block;margin:0 auto 8px;border:0;width:36px;height:36px;"/>
    <img src="${wordmark}" width="168" height="30" alt="${BRAND_NAME}" style="display:block;margin:0 auto;border:0;width:168px;height:30px;"/>
  </a>`;
}

function mapPhone(): string {
  const src = escapeEmailHtml(emailPublicAssetUrl("/email/trainer-map-phone.png"));
  const alt = escapeEmailHtml(
    "An iPhone showing the SMOAC map with trainer pins around San Diego"
  );
  const img = `<img class="hero-phone-img" src="${src}" width="148" alt="${alt}" style="display:block;width:100%;max-width:100%;height:auto;border:0;"/>`;
  return `<!--[if mso]>
<img src="${src}" width="210" alt="${alt}" style="display:block;border:0;"/>
<![endif]-->
<!--[if !mso]><!-->${img}<!--<![endif]-->`;
}

function iconWell(filename: string): string {
  const src = escapeEmailHtml(emailPublicAssetUrl(`/email/${filename}`));
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr>
      <td align="center" valign="middle" width="36" height="36" bgcolor="#241433" style="width:36px;height:36px;border-radius:18px;border:1px solid #a78bfa;background-color:#241433;">
        <img src="${src}" width="24" height="24" alt="" style="display:block;border:0;width:24px;height:24px;"/>
      </td>
    </tr>
  </table>`;
}

function benefitRows(): string {
  const rows = BENEFITS.map((item, index) => {
    const padding = index === BENEFITS.length - 1 ? "0" : "0 0 14px";
    return `<tr>
      <td style="padding:${padding};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td width="48" valign="middle" style="width:48px;padding:0 12px 0 0;">
              ${iconWell(item.icon)}
            </td>
            <td valign="middle" style="font-family:${FONT};">
              <p style="margin:0 0 2px;font-family:${FONT};font-size:15px;line-height:1.3;font-weight:700;color:${TITLE};">${escapeEmailHtml(item.title)}</p>
              <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.35;color:${MUTED};">${escapeEmailHtml(item.body)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rows}</table>`;
}

/** Copy on the left, phone on the right. A table keeps that split on a phone. */
function heroSplit(hello: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr>
      <td class="hero-copy" valign="top" width="58%" style="width:58%;padding:0 12px 0 0;font-family:${FONT};font-size:15px;line-height:1.45;">
        ${hello}
        <p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.45;color:${BODY};">${escapeEmailHtml(LEDE)}</p>
        ${benefitRows()}
      </td>
      <td class="hero-phone" valign="top" width="42%" align="center" style="width:42%;font-size:15px;line-height:normal;">
        ${mapPhone()}
      </td>
    </tr>
  </table>`;
}

function launchCard(): string {
  const countdownSrc = escapeEmailHtml(
    emailAbsoluteUrl("/api/email/founding-countdown")
  );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr>
      <td bgcolor="${SMOAC_COLOR.violet}" style="padding:2px;border-radius:16px;background-color:${SMOAC_COLOR.violet};background-image:${SPECTRUM};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td bgcolor="${PANEL}" style="padding:14px 14px 16px;border-radius:14px;background-color:${PANEL};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td width="48" valign="top" style="width:48px;padding:2px 12px 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36" bgcolor="#2a1848" style="width:36px;height:36px;border-radius:18px;background-color:#2a1848;font-family:${FONT};font-size:16px;line-height:36px;color:${ACCENT};">★</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="top" style="font-family:${FONT};">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT};">BE PART OF THE LAUNCH</p>
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:18px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${TITLE};">${escapeEmailHtml(LAUNCH_TITLE)}</p>
                    <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.45;color:${BODY};">${escapeEmailHtml(LAUNCH_BODY)}</p>
                  </td>
                </tr>
              </table>
              <img src="${countdownSrc}" width="456" height="92" alt="${escapeEmailHtml(FOUNDING_COUNTDOWN_ALT)}" style="display:block;width:100%;max-width:456px;height:auto;border:0;margin:14px auto 0;"/>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function signupButton(href: string, origin: string): string {
  const safeHref = escapeEmailHtml(href);
  const label = `${escapeEmailHtml(CTA_LABEL)} &rarr;`;
  const siteHref = escapeEmailHtml(origin);
  const siteLabel = escapeEmailHtml("Check out smoac.com");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr>
      <td align="center" bgcolor="${SMOAC_COLOR.violet}" style="border-radius:14px;background-color:${SMOAC_COLOR.violet};background-image:${CTA_SPECTRUM};">
        <a href="${safeHref}" style="display:block;padding:17px 18px;font-family:${FONT};font-size:17px;line-height:1.2;font-weight:700;letter-spacing:-0.01em;color:#ffffff;text-decoration:none;text-align:center;border-radius:14px;">
          <span style="color:#ffffff;">${label}</span>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td align="center" bgcolor="#16161a" style="border-radius:10px;border:1px solid #3f3f46;background-color:#16161a;">
              <a href="${siteHref}" style="display:inline-block;padding:9px 16px;font-family:${FONT};font-size:13px;line-height:1.2;font-weight:600;color:#d4d4d8;text-decoration:none;border-radius:10px;">
                <span style="color:#d4d4d8;">${siteLabel}</span>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function complianceFooter(options: {
  footerNote: string;
  unsubscribeHref?: string | null;
  origin: string;
}): string {
  const footerNote = escapeEmailHtml(options.footerNote);
  const unsubscribeHtml = options.unsubscribeHref
    ? `<p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:${MUTED};"><a href="${escapeEmailHtml(emailAbsoluteUrl(options.unsubscribeHref))}" style="color:${ACCENT};text-decoration:underline;">Unsubscribe</a></p>`
    : "";
  const year = new Date().getFullYear();
  const siteLabel = options.origin.replace(/^https?:\/\//, "");

  return `<tr>
    <td align="center" style="padding:12px 12px 8px;font-family:${FONT};">
      <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${MUTED};">${footerNote}</p>
      ${unsubscribeHtml}
      <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:${MUTED};">
        Questions?
        <a href="${escapeEmailHtml(supportMailto())}" style="color:${ACCENT};text-decoration:underline;">${escapeEmailHtml(SUPPORT_EMAIL)}</a>
      </p>
      <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:${MUTED};">
        <a href="${escapeEmailHtml(options.origin)}" style="color:${ACCENT};text-decoration:none;">${escapeEmailHtml(siteLabel)}</a>
        · © ${year} ${BRAND_NAME}
      </p>
    </td>
  </tr>`;
}

export function renderTrainerDiscoveryOutreachHtml(options: {
  signupUrl: string;
  footerNote: string;
  greetingName?: string | null;
  unsubscribeHref?: string | null;
}): string {
  const signupUrl = emailAbsoluteUrl(options.signupUrl);
  const origin = emailSiteOrigin();
  const greeting = options.greetingName?.trim();
  const hello = greeting
    ? `<p style="margin:0 0 10px;font-family:${FONT};font-size:15px;line-height:1.45;color:${BODY};">Hi ${escapeEmailHtml(greeting)},</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>${escapeEmailHtml(HEADLINE)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>table, td, p, a, h1 { font-family: Arial, Helvetica, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:${PAGE};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeEmailHtml(PREHEADER)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE};border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:12px 10px;">
        <!--[if mso]>
        <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td>
        <![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;">
          <tr>
            <td bgcolor="${SMOAC_COLOR.violet}" style="padding:2px;border-radius:22px;background-color:${SMOAC_COLOR.violet};background-image:${SPECTRUM};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td bgcolor="${CARD}" style="padding:28px 22px 20px;border-radius:20px;background-color:${CARD};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                      <tr>
                        <td align="center" style="padding:0 0 28px;">
                          ${logoLockup(origin)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 12px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${ACCENT};">
                          FOR SAN DIEGO TRAINERS
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 24px;">
                          <h1 style="margin:0;font-family:${FONT};font-size:32px;line-height:1.12;font-weight:700;letter-spacing:-0.03em;color:${TITLE};">Get Discovered by<br/>More Local <span style="color:${CLIENTS};">Clients.</span></h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 22px;font-size:0;line-height:0;">
                          ${heroSplit(hello)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 20px;">
                          ${launchCard()}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 28px;">
                          ${signupButton(signupUrl, origin)}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family:${FONT};">
                          <p style="margin:0 0 12px;font-family:${FONT};font-size:14px;line-height:1.5;color:${MUTED};">${escapeEmailHtml(CLOSE)}</p>
                          <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.45;color:${TITLE};">Best,<br/>The Smoac Team</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${complianceFooter({
            footerNote: options.footerNote,
            unsubscribeHref: options.unsubscribeHref,
            origin,
          })}
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderTrainerDiscoveryOutreachText(
  signupUrl: string,
  greetingName?: string | null
): string {
  const href = emailAbsoluteUrl(signupUrl);
  const greeting = greetingName?.trim();
  const benefits = BENEFITS.map(
    (item) => `${item.title}\n${item.body}`
  ).join("\n\n");
  return [
    greeting ? `Hi ${greeting},` : "",
    "FOR SAN DIEGO TRAINERS",
    HEADLINE,
    LEDE,
    benefits,
    "BE PART OF THE LAUNCH",
    LAUNCH_TITLE,
    LAUNCH_BODY,
    `${CTA_LABEL}: ${href}`,
    `Launch countdown: ${FOUNDING_LAUNCH_LABEL}`,
    `Check out smoac.com: ${emailSiteOrigin()}`,
    CLOSE,
    "Best,\nThe Smoac Team",
  ]
    .filter(Boolean)
    .join("\n\n");
}
