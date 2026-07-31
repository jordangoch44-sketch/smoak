/**
 * Apply branded Auth email templates (and optional Resend SMTP) via
 * Supabase Management API.
 *
 * One-time setup:
 *   1. Create a Personal Access Token:
 *      https://supabase.com/dashboard/account/tokens
 *   2. Add to .env.local:
 *      SUPABASE_ACCESS_TOKEN=sbp_...
 *      SUPABASE_PROJECT_REF=tzwpjpndohwclhikwtgf   # optional if URL is set
 *   3. Run:
 *      npm run apply:auth-emails
 *
 * SMTP (optional, recommended):
 *      APPLY_AUTH_SMTP=1
 *   Uses RESEND_API_KEY + EMAIL_FROM from .env.local
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(ROOT, "docs/email-templates/supabase-auth");

function requireToken() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    console.error(`
Missing SUPABASE_ACCESS_TOKEN.

Create one (30 seconds):
  https://supabase.com/dashboard/account/tokens

Then add to .env.local:
  SUPABASE_ACCESS_TOKEN=sbp_your_token_here

Re-run: npm run apply:auth-emails
`);
    process.exit(1);
  }
  return token;
}

function projectRef() {
  const fromEnv = process.env.SUPABASE_PROJECT_REF?.trim();
  if (fromEnv) return fromEnv;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PROJECT_REF");
    process.exit(1);
  }
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    console.error("Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }
}

function readTemplate(id) {
  const htmlPath = join(TEMPLATES, `${id}.html`);
  const subjectPath = join(TEMPLATES, `${id}.subject.txt`);
  if (!existsSync(htmlPath) || !existsSync(subjectPath)) {
    throw new Error(`Missing template files for ${id}`);
  }
  return {
    html: readFileSync(htmlPath, "utf8").trim(),
    subject: readFileSync(subjectPath, "utf8").trim(),
  };
}

function parseEmailFrom(raw) {
  // "SMOAC <noreply@smoac.com>" or "noreply@smoac.com"
  const trimmed = (raw || "").trim();
  const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      senderName: match[1].trim() || "SMOAC",
      adminEmail: match[2].trim(),
    };
  }
  if (trimmed.includes("@")) {
    return { senderName: "SMOAC", adminEmail: trimmed };
  }
  return null;
}

async function main() {
  const token = requireToken();
  const ref = projectRef();

  const confirm = readTemplate("confirm-signup");
  const magic = readTemplate("magic-link");
  const recovery = readTemplate("reset-password");
  const emailChange = readTemplate("change-email");
  const invite = readTemplate("invite");

  /** @type {Record<string, string | number | boolean>} */
  const body = {
    mailer_subjects_confirmation: confirm.subject,
    mailer_templates_confirmation_content: confirm.html,
    mailer_subjects_magic_link: magic.subject,
    mailer_templates_magic_link_content: magic.html,
    mailer_subjects_recovery: recovery.subject,
    mailer_templates_recovery_content: recovery.html,
    mailer_subjects_email_change: emailChange.subject,
    mailer_templates_email_change_content: emailChange.html,
    mailer_subjects_invite: invite.subject,
    mailer_templates_invite_content: invite.html,
  };

  const applySmtp = process.env.APPLY_AUTH_SMTP === "1";
  if (applySmtp) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = parseEmailFrom(process.env.EMAIL_FROM);
    if (!apiKey || !from) {
      console.error(
        "APPLY_AUTH_SMTP=1 requires RESEND_API_KEY and EMAIL_FROM in .env.local"
      );
      process.exit(1);
    }
    Object.assign(body, {
      smtp_host: "smtp.resend.com",
      smtp_port: "465",
      smtp_user: "resend",
      smtp_pass: apiKey,
      smtp_admin_email: from.adminEmail,
      smtp_sender_name: from.senderName,
    });
  }

  console.log(`Applying Auth email templates to project ${ref}…`);
  if (applySmtp) console.log("Also configuring Resend SMTP…");

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const text = await response.text();
  if (!response.ok) {
    console.error(`Failed (${response.status}): ${text.slice(0, 600)}`);
    process.exit(1);
  }

  console.log("✓ Auth email templates updated.");
  if (applySmtp) console.log("✓ Custom SMTP (Resend) configured.");
  console.log(
    "\nTest: request a password reset or magic link on https://smoac.com"
  );
}

main().catch((error) => {
  console.error("FAILED:", error.message ?? error);
  process.exit(1);
});
