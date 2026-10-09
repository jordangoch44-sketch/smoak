/**
 * Workout-assigned email. The button opens client login, then Workouts.
 */
import { BRAND_NAME, SMOAC_COLOR } from "@/lib/brand";
import { buildLoginHref } from "@/lib/auth-return";
import { WORKOUTS_PATH } from "@/lib/auth-routes";
import {
  emailAbsoluteUrl,
  emailPublicAssetUrl,
  emailSiteOrigin,
  escapeEmailHtml,
} from "@/lib/email/email-html-shell";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";
import { parseLocalDateKey } from "@/lib/workouts/client-workout";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const SPECTRUM = `linear-gradient(90deg,${SMOAC_COLOR.rose} 0%,${SMOAC_COLOR.violet} 52%,${SMOAC_COLOR.cool} 100%)`;

export function coachWorkoutLoginUrl(): string {
  return emailAbsoluteUrl(buildLoginHref({ role: "client", next: WORKOUTS_PATH }));
}

function icon(file: string, alt: string, size = 22): string {
  const src = escapeEmailHtml(emailPublicAssetUrl(`/email/${file}`));
  return `<img src="${src}" width="${size}" height="${size}" alt="${escapeEmailHtml(alt)}" style="display:block;margin:0 auto;border:0;width:${size}px;height:${size}px;"/>`;
}

function coachMark(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || /^your coach$/i.test(trimmed)) return "C";
  const words = trimmed.split(/\s+/).filter((word) => !/^(&|and)$/i.test(word));
  const first = words[0] ?? "";
  if (words.length === 1) {
    return first.length <= 4 ? first.toUpperCase() : first.slice(0, 2).toUpperCase();
  }
  if (first.length <= 4 && first === first.toUpperCase()) return first;
  if (first.length <= 3) return first.toUpperCase();
  return `${first.charAt(0)}${words[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function dateLabel(dateKey: string): string {
  return parseLocalDateKey(dateKey)
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

export function renderCoachWorkoutEmailHtml(input: {
  clientFirstName: string;
  specialistName: string;
  dateKey: string;
  title: string;
  note: string;
  exerciseCount: number;
  href: string;
}): string {
  const origin = emailSiteOrigin();
  const first = input.clientFirstName.trim() || "there";
  const coach = input.specialistName.trim() || "Your coach";
  const workout = input.title.trim() || "Workout";
  const count = Math.max(0, input.exerciseCount);
  const exercises = count === 1 ? "1 exercise" : `${count} exercises`;
  const note = input.note.trim();
  const href = escapeEmailHtml(input.href);
  const year = new Date().getFullYear();
  const logo = escapeEmailHtml(emailPublicAssetUrl("/smoac-mark.png"));
  const wordmark = escapeEmailHtml(emailPublicAssetUrl("/smoac-wordmark.png"));

  const noteHtml = note
    ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:1.45;color:#a1a1aa;">${escapeEmailHtml(note)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
  <title>Your workout is ready</title>
</head>
<body style="margin:0;padding:0;background:#050506;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(workout)} is on your Workouts calendar.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050506;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:28px 16px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:0 0 28px;">
              <a href="${escapeEmailHtml(origin)}" style="text-decoration:none;">
                <img src="${logo}" width="44" height="44" alt="" style="display:block;margin:0 auto 10px;border:0;width:44px;height:44px;"/>
                <img src="${wordmark}" width="168" height="30" alt="${BRAND_NAME}" style="display:block;margin:0 auto;border:0;height:30px;width:auto;max-width:180px;"/>
              </a>
              <p style="margin:10px 0 0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#a1a1aa;">Find fitness, anywhere.</p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0 0 10px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${SMOAC_COLOR.rose};">New workout assigned</p>
              <h1 style="margin:0 0 16px;font-family:${FONT};font-size:40px;line-height:1.02;font-weight:700;letter-spacing:-0.035em;color:#ffffff;">Your workout<br/><span style="color:${SMOAC_COLOR.rose};">is </span><span style="color:${SMOAC_COLOR.indigo};">ready.</span></h1>
              <p style="margin:0 0 8px;font-family:${FONT};font-size:18px;line-height:1.4;font-weight:600;color:#f4f4f5;">Hey ${escapeEmailHtml(first)},</p>
              <p style="margin:0 0 22px;font-family:${FONT};font-size:16px;line-height:1.5;color:#d4d4d8;">Your coach just sent you a new workout. It’s on your Workouts calendar and ready to go.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 18px 16px;border:1px solid #2a2a32;border-radius:18px;background:#121218;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td width="52" valign="top" style="width:52px;padding:0 12px 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;border-radius:12px;background:#1c1c24;border:1px solid #2e2e38;">
                          ${icon("recap-calendar.png", "Date", 20)}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle">
                    <p style="margin:0 0 2px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;">${escapeEmailHtml(dateLabel(input.dateKey))}</p>
                    <p style="margin:0;font-family:${FONT};font-size:22px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">${escapeEmailHtml(workout)}</p>
                    <p style="margin:2px 0 0;font-family:${FONT};font-size:14px;line-height:1.4;color:#a1a1aa;">New workout from your coach</p>
                    ${noteHtml}
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse;border-top:1px solid #2a2a32;">
                <tr>
                  <td align="center" width="33%" style="padding:14px 6px 4px;border-right:1px solid #2a2a32;">
                    ${icon("recap-dumbbell.png", "", 26)}
                    <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.3;color:#d4d4d8;">${escapeEmailHtml(exercises)}</p>
                  </td>
                  <td align="center" width="34%" style="padding:14px 6px 4px;border-right:1px solid #2a2a32;">
                    ${icon("recap-calendar.png", "", 22)}
                    <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.3;color:#d4d4d8;">On your calendar</p>
                  </td>
                  <td align="center" width="33%" style="padding:14px 6px 4px;">
                    ${icon("recap-people.png", "", 22)}
                    <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.3;color:#d4d4d8;">From your coach</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 0 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="border-radius:14px;background-color:${SMOAC_COLOR.violet};background-image:${SPECTRUM};">
                    <a href="${href}" style="display:block;padding:16px 18px;font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:0.08em;color:#ffffff;text-decoration:none;text-align:center;">VIEW MY WORKOUT &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 12px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="middle" width="28%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td height="1" bgcolor="#3f3f46" style="font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>
                  </td>
                  <td align="center" style="padding:0 12px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.14em;color:#71717a;white-space:nowrap;">PROGRAMMED BY</td>
                  <td valign="middle" width="28%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td height="1" bgcolor="#3f3f46" style="font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>
                  </td>
                </tr>
              </table>
              <div style="width:72px;height:72px;margin:14px auto 0;border-radius:999px;background:#0c0c10;border:1px solid #3f3f46;font-family:${FONT};font-size:14px;font-weight:700;letter-spacing:0.06em;line-height:72px;color:#ffffff;text-align:center;">${escapeEmailHtml(coachMark(coach))}</div>
              <p style="margin:8px 0 0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#d4d4d8;">${escapeEmailHtml(coach)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0 0;border-top:1px solid #27272a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" width="33%" style="padding:14px 4px;border-right:1px solid #27272a;">
                    ${icon("recap-chart.png", "", 20)}
                    <p style="margin:6px 0 0;font-family:${FONT};font-size:12px;color:#d4d4d8;">Track Progress</p>
                  </td>
                  <td align="center" width="34%" style="padding:14px 4px;border-right:1px solid #27272a;">
                    ${icon("recap-calendar.png", "", 20)}
                    <p style="margin:6px 0 0;font-family:${FONT};font-size:12px;color:#d4d4d8;">Stay Consistent</p>
                  </td>
                  <td align="center" width="33%" style="padding:14px 4px;">
                    ${icon("recap-trophy.png", "", 20)}
                    <p style="margin:6px 0 0;font-family:${FONT};font-size:12px;color:#d4d4d8;">Reach Your Goals</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 8px 0;font-family:${FONT};">
              <p style="margin:0;font-size:14px;line-height:1.5;color:#d4d4d8;">Questions? <a href="${escapeEmailHtml(supportMailto())}" style="color:${SMOAC_COLOR.indigo};text-decoration:underline;">${escapeEmailHtml(SUPPORT_EMAIL)}</a></p>
              <p style="margin:16px 0 0;">
                <span style="display:inline-block;padding:0 8px;vertical-align:middle;">${icon("icon-instagram.png", "Instagram", 22)}</span>
                <span style="display:inline-block;padding:0 8px;vertical-align:middle;">${icon("icon-tiktok.png", "TikTok", 22)}</span>
              </p>
              <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#71717a;">© ${year} ${BRAND_NAME}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
