/**
 * Shared SMOAC transactional email chrome — dark graphite, silver type,
 * lavender accent CTA. Table-based for email client compatibility.
 */
import { BRAND_NAME, LOGO_SRC } from "@/lib/brand";
import { getSiteUrlForStripe } from "@/lib/stripe/config";

const COLORS = {
  page: "#050506",
  card: "#0c0c0e",
  cardBorder: "#2c2c2e",
  hairline: "#3a3a3c",
  title: "#f5f5f7",
  body: "#c7c7cc",
  muted: "#8e8e93",
  accent: "#a855f7",
  accentSoft: "#c4b5fd",
  ctaText: "#ffffff",
  quoteBg: "#141416",
} as const;

export interface EmailCta {
  label: string;
  href: string;
}

export interface EmailDetailRow {
  label: string;
  value: string;
}

export function emailSiteOrigin(): string {
  return getSiteUrlForStripe();
}

export function emailAbsoluteUrl(pathOrUrl: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return emailSiteOrigin();
  if (/^(https?:|mailto:)/i.test(raw)) return raw;
  const origin = emailSiteOrigin();
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Turn plain paragraphs into escaped HTML blocks. */
export function renderEmailParagraphs(paragraphs: string[]): string {
  return paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.body};">${escapeEmailHtml(p).replace(/\n/g, "<br/>")}</p>`
    )
    .join("");
}

export function renderEmailDetailRows(rows: EmailDetailRow[]): string {
  const filtered = rows.filter((row) => row.value.trim());
  if (filtered.length === 0) return "";

  const cells = filtered
    .map((row) => {
      const label = escapeEmailHtml(row.label);
      const value = escapeEmailHtml(row.value).replace(/\n/g, "<br/>");
      return `<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${COLORS.hairline};vertical-align:top;width:34%;">
    <span style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.muted};">${label}</span>
  </td>
  <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${COLORS.hairline};vertical-align:top;">
    <span style="font-size:15px;line-height:1.5;color:${COLORS.title};">${value}</span>
  </td>
</tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-collapse:collapse;">${cells}</table>`;
}

export function renderEmailQuote(label: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
  <tr>
    <td style="padding:14px 16px;border-radius:12px;background:${COLORS.quoteBg};border:1px solid ${COLORS.hairline};">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.muted};">${escapeEmailHtml(label)}</p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${COLORS.body};">${escapeEmailHtml(trimmed).replace(/\n/g, "<br/>")}</p>
    </td>
  </tr>
</table>`;
}

export function renderEmailCta(cta: EmailCta): string {
  const href = escapeEmailHtml(emailAbsoluteUrl(cta.href));
  const label = escapeEmailHtml(cta.label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;border-collapse:collapse;">
  <tr>
    <td style="border-radius:999px;background:${COLORS.accent};">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:0.02em;color:${COLORS.ctaText};text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`;
}

export function renderEmailTextLink(label: string, href: string): string {
  const safeHref = escapeEmailHtml(emailAbsoluteUrl(href));
  const safeLabel = escapeEmailHtml(label);
  return `<p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:${COLORS.muted};">
  <a href="${safeHref}" style="color:${COLORS.accentSoft};text-decoration:underline;">${safeLabel}</a>
</p>`;
}

export interface WrapTransactionalEmailOptions {
  /** Inbox preview text */
  preheader?: string;
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  cta?: EmailCta;
  secondaryLink?: EmailCta;
  footerNote?: string;
}

/**
 * Full HTML document for transactional mail — brand-first dark shell.
 */
export function wrapTransactionalEmailHtml(
  options: WrapTransactionalEmailOptions
): string {
  const origin = emailSiteOrigin();
  const logoUrl = emailAbsoluteUrl(LOGO_SRC);
  const preheader = escapeEmailHtml(options.preheader ?? options.title);
  const eyebrow = options.eyebrow
    ? escapeEmailHtml(options.eyebrow)
    : BRAND_NAME;
  const title = escapeEmailHtml(options.title);
  const footerNote = escapeEmailHtml(
    options.footerNote ??
      "Luxury wellness marketplace · Find specialists near you."
  );
  const year = new Date().getFullYear();

  const ctaHtml = options.cta ? renderEmailCta(options.cta) : "";
  const secondaryHtml = options.secondaryLink
    ? renderEmailTextLink(
        options.secondaryLink.label,
        options.secondaryLink.href
      )
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:0 0 22px;">
              <a href="${escapeEmailHtml(origin)}" style="text-decoration:none;">
                <img src="${escapeEmailHtml(logoUrl)}" width="44" height="44" alt="${BRAND_NAME}" style="display:block;border:0;border-radius:12px;"/>
              </a>
              <p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.18em;color:${COLORS.title};">${BRAND_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 24px;border-radius:18px;background:${COLORS.card};border:1px solid ${COLORS.cardBorder};box-shadow:0 18px 48px rgba(0,0,0,0.45);">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.accentSoft};">${eyebrow}</p>
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:500;color:${COLORS.title};">${title}</h1>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                ${options.bodyHtml}
                ${ctaHtml}
                ${secondaryHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${COLORS.muted};">${footerNote}</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.muted};">
                <a href="${escapeEmailHtml(origin)}" style="color:${COLORS.accentSoft};text-decoration:none;">${escapeEmailHtml(origin.replace(/^https?:\/\//, ""))}</a>
                · © ${year} ${BRAND_NAME}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
