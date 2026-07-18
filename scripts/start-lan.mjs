#!/usr/bin/env node
/**
 * Production server on LAN — much faster on iPhone than `next dev` (no HMR / turbopack).
 * Run `npm run build` first if .next is missing or stale.
 *
 * Listens on 0.0.0.0 so devices can connect, but NEVER puts 0.0.0.0 into
 * NEXT_PUBLIC_SITE_URL / auth redirects. Auth origin must be the LAN IP.
 */
import { spawn } from "node:child_process";
import os from "node:os";

const PORT = process.env.PORT ?? "3000";

function getLanIpv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

function isUnusableSiteUrl(value) {
  if (!value) return true;
  try {
    const { hostname } = new URL(value.includes("://") ? value : `http://${value}`);
    return (
      hostname === "0.0.0.0" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::]" ||
      hostname === "::" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return true;
  }
}

const lanIp = getLanIpv4();
const lanOrigin = lanIp ? `http://${lanIp}:${PORT}` : null;

const existingSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
const env = { ...process.env };

if (lanOrigin && isUnusableSiteUrl(existingSiteUrl)) {
  env.NEXT_PUBLIC_SITE_URL = lanOrigin;
} else if (existingSiteUrl) {
  env.NEXT_PUBLIC_SITE_URL = existingSiteUrl;
} else if (lanOrigin) {
  env.NEXT_PUBLIC_SITE_URL = lanOrigin;
}

const authOrigin = (env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

console.log("");
console.log("SMOAC production (LAN) — use this for iPhone perf testing");
console.log("────────────────────────────────────────────────────────");
if (lanIp) {
  console.log(`  Listen (bind):    0.0.0.0:${PORT}  (not for browsers / auth)`);
  console.log(`  iPhone / device:  http://${lanIp}:${PORT}`);
  console.log(`  Auth redirect:    ${authOrigin}/auth/callback`);
  console.log("");
  console.log("  Supabase → Authentication → URL Configuration → Site URL + Redirect:");
  console.log(`    ${lanOrigin}`);
  console.log(`    ${lanOrigin}/auth/callback`);
  console.log(`    ${lanOrigin}/login/reset-password`);
  console.log("  Do NOT set Site URL to http://0.0.0.0:3000");
} else {
  console.log(`  Bind: 0.0.0.0:${PORT} (could not detect LAN IP)`);
}
if (isUnusableSiteUrl(authOrigin)) {
  console.error("");
  console.error("  ERROR: NEXT_PUBLIC_SITE_URL is missing or unusable for auth.");
  console.error("  Set NEXT_PUBLIC_SITE_URL=http://<lan-ip>:3000 and rebuild.");
  process.exit(1);
}
console.log("  Run `npm run build` when code changes (SITE_URL is baked into the client).");
console.log("");

const child = spawn("npx", ["next", "start", "-p", PORT, "-H", "0.0.0.0"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => process.exit(code ?? 0));
