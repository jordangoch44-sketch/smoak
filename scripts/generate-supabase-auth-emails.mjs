/**
 * Generates branded Supabase Auth email HTML (Go templates).
 * Run: node scripts/generate-supabase-auth-emails.mjs
 *
 * Paste the output files into Supabase → Authentication → Emails.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/email-templates/supabase-auth");

const COLORS = {
  page: "#050506",
  card: "#0c0c0e",
  cardBorder: "#2c2c2e",
  title: "#f5f5f7",
  body: "#c7c7cc",
  muted: "#8e8e93",
  accent: "#a855f7",
  accentSoft: "#c4b5fd",
  ctaText: "#ffffff",
};

function wrap({ eyebrow, title, paragraphs, ctaLabel, extrasHtml = "" }) {
  const paras = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.body};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${p}</p>`
    )
    .join("\n              ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${title}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:0 0 22px;">
              <a href="{{ .SiteURL }}" style="text-decoration:none;">
                <img src="{{ .SiteURL }}/smoac-mark.png" width="44" height="44" alt="SMOAC" style="display:block;border:0;border-radius:12px;"/>
              </a>
              <p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.18em;color:${COLORS.title};">SMOAC</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 24px;border-radius:18px;background:${COLORS.card};border:1px solid ${COLORS.cardBorder};box-shadow:0 18px 48px rgba(0,0,0,0.45);">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.accentSoft};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${eyebrow}</p>
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:500;color:${COLORS.title};">${title}</h1>
              ${paras}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;border-collapse:collapse;">
                <tr>
                  <td style="border-radius:999px;background:${COLORS.accent};">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:0.02em;color:${COLORS.ctaText};text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
              ${extrasHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${COLORS.muted};">Luxury wellness marketplace · Find specialists near you.</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.muted};">
                <a href="{{ .SiteURL }}" style="color:${COLORS.accentSoft};text-decoration:none;">SMOAC</a>
                · If you didn’t request this, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function otpBlock(label) {
  return `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${COLORS.muted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${label}</p>
              <p style="margin:8px 0 0;font-size:22px;letter-spacing:0.28em;font-weight:600;color:${COLORS.title};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">{{ .Token }}</p>`;
}

const templates = [
  {
    id: "confirm-signup",
    supabaseName: "Confirm signup",
    subject: "Confirm your SMOAC email",
    html: wrap({
      eyebrow: "Account verification",
      title: "Confirm your email",
      paragraphs: [
        "Welcome to SMOAC.",
        "Confirm this email address to finish creating your account and start exploring specialists near you.",
      ],
      ctaLabel: "Confirm email",
      extrasHtml: otpBlock("Or enter this code if the button doesn’t work:"),
    }),
  },
  {
    id: "magic-link",
    supabaseName: "Magic Link",
    subject: "Your SMOAC sign-in link",
    html: wrap({
      eyebrow: "Secure sign-in",
      title: "Sign in to SMOAC",
      paragraphs: [
        "Use the button below to sign in. This link expires shortly and can only be used once.",
      ],
      ctaLabel: "Sign in to SMOAC",
      extrasHtml: otpBlock("Or enter this one-time code:"),
    }),
  },
  {
    id: "reset-password",
    supabaseName: "Reset password",
    subject: "Reset your SMOAC password",
    html: wrap({
      eyebrow: "Password reset",
      title: "Choose a new password",
      paragraphs: [
        "We received a request to reset your SMOAC password.",
        "Use the button below to choose a new one. If you didn’t request this, you can safely ignore this email.",
      ],
      ctaLabel: "Reset password",
      extrasHtml: otpBlock("Or enter this code:"),
    }),
  },
  {
    id: "change-email",
    supabaseName: "Change email address",
    subject: "Confirm your new SMOAC email",
    html: wrap({
      eyebrow: "Email update",
      title: "Confirm your new email",
      paragraphs: [
        "You asked to update the email on your SMOAC account.",
        "Confirm <strong style=\"color:#f5f5f7;\">{{ .NewEmail }}</strong> to finish the change.",
      ],
      ctaLabel: "Confirm new email",
      extrasHtml: otpBlock("Or enter this code:"),
    }),
  },
  {
    id: "invite",
    supabaseName: "Invite user",
    subject: "You’re invited to SMOAC",
    html: wrap({
      eyebrow: "Invitation",
      title: "Join SMOAC",
      paragraphs: [
        "You’ve been invited to create a SMOAC account.",
        "Accept the invitation below to get started.",
      ],
      ctaLabel: "Accept invitation",
      extrasHtml: "",
    }),
  },
];

mkdirSync(OUT, { recursive: true });

const indexLines = [
  "# Supabase Auth email templates (SMOAC)",
  "",
  "These match the dark graphite / silver / lavender transactional shell used by Resend emails.",
  "",
  "## Install in Supabase (required)",
  "",
  "1. Open **Supabase Dashboard → Authentication → Emails** (or **Email Templates**).",
  "2. For each template below, set the **Subject** and paste the full **Body** HTML from the matching `.html` file.",
  "3. Save.",
  "4. Confirm **Authentication → URL Configuration → Site URL** is `https://smoac.com` in production (logo + links use `{{ .SiteURL }}`).",
  "",
  "Optional but recommended for production: **Project Settings → Auth → SMTP** and send Auth mail through Resend so From is `SMOAC <noreply@yourdomain.com>` instead of the default Supabase sender.",
  "",
  "## Templates",
  "",
  "| Supabase template | Subject | File |",
  "|-------------------|---------|------|",
];

for (const t of templates) {
  writeFileSync(join(OUT, `${t.id}.html`), t.html, "utf8");
  writeFileSync(join(OUT, `${t.id}.subject.txt`), `${t.subject}\n`, "utf8");
  indexLines.push(
    `| ${t.supabaseName} | \`${t.subject}\` | [\`${t.id}.html\`](./${t.id}.html) |`
  );
}

indexLines.push(
  "",
  "## Regenerate",
  "",
  "```bash",
  "node scripts/generate-supabase-auth-emails.mjs",
  "```",
  "",
  "## Notes",
  "",
  "- CTAs use `{{ .ConfirmationURL }}` (Supabase-hosted verify → redirect to your app).",
  "- OTP fallback uses `{{ .Token }}` for clients that prefetch links.",
  "- Logo: `{{ .SiteURL }}/smoac-mark.png` — ensure the mark is publicly reachable.",
  ""
);

writeFileSync(join(OUT, "README.md"), `${indexLines.join("\n")}\n`, "utf8");

console.log(`Wrote ${templates.length} Supabase Auth templates → ${OUT}`);
