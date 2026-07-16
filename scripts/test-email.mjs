/**
 * Smoke-test Resend / console email transport.
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
      text: "This is a SMOAC Resend smoke test. If you got this, transactional email is live.",
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`  ✗ Resend failed (${response.status}): ${body.slice(0, 400)}`);
    process.exit(1);
  }

  console.log("  ✓ Resend accepted the message");
  console.log(`  Response: ${body.slice(0, 200)}`);
  console.log("\nCheck your inbox (and spam).");
}

main().catch((error) => {
  console.error("\nFAILED:", error.message ?? error);
  process.exit(1);
});
