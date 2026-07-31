/**
 * Smoke-test Resend / console email transport with branded HTML.
 * Usage:
 *   npm run test:email -- you@example.com
 *
 * With RESEND_API_KEY: sends a real email (Resend test from must match rules).
 * Without: prints success via console transport.
 */
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const to = process.argv[2]?.trim();
if (!to || !to.includes("@")) {
  console.error("Usage: npm run test:email -- you@example.com");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY?.trim();
const from =
  process.env.EMAIL_FROM?.trim() || "SMOAC <onboarding@resend.dev>";
const site =
  process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "") ||
  "https://smoac.com";

function buildSmokeHtml() {
  const logo = `${site}/smoac-mark.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>SMOAC email test</title>
</head>
<body style="margin:0;padding:0;background:#050506;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050506;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:0 0 22px;">
              <img src="${logo}" width="44" height="44" alt="SMOAC" style="display:block;border:0;border-radius:12px;"/>
              <p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.18em;color:#f5f5f7;">SMOAC</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;border-radius:18px;background:#0c0c0e;border:1px solid #2c2c2e;">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#c4b5fd;">Email system</p>
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:500;color:#f5f5f7;">Transactional email is live</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#c7c7cc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                This is a SMOAC Resend smoke test. If you received this message, branded HTML email delivery is working.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;border-collapse:collapse;">
                <tr>
                  <td style="border-radius:999px;background:#a855f7;">
                    <a href="${site}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Visit SMOAC</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 12px 0;font-size:12px;line-height:1.5;color:#8e8e93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              Luxury wellness marketplace · ${site.replace(/^https?:\/\//, "")}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function main() {
  console.log("SMOAC email smoke test\n");
  console.log(`  To:   ${to}`);
  console.log(`  From: ${from}`);
  console.log(`  Mode: ${apiKey ? "resend" : "console (no RESEND_API_KEY)"}\n`);

  if (!apiKey) {
    console.log("  ✓ Console mode OK — add RESEND_API_KEY to .env.local to send for real.");
    console.log("  See docs/EMAIL_RESEND.md");
    return;
  }

  const text =
    "This is a SMOAC Resend smoke test. If you got this, branded transactional email is live.";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to.toLowerCase()],
      subject: "SMOAC email test",
      text,
      html: buildSmokeHtml(),
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`  ✗ Resend failed (${response.status}): ${body.slice(0, 400)}`);
    process.exit(1);
  }

  console.log("  ✓ Resend accepted the message (HTML + text)");
  console.log(`  Response: ${body.slice(0, 200)}`);
  console.log("\nCheck your inbox (and spam).");
}

main().catch((error) => {
  console.error("\nFAILED:", error.message ?? error);
  process.exit(1);
});
