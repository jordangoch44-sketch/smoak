#!/usr/bin/env node
/**
 * Production server on LAN — much faster on iPhone than `next dev` (no HMR / turbopack).
 * Run `npm run build` first if .next is missing or stale.
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

const lanIp = getLanIpv4();

console.log("");
console.log("SMOAC production (LAN) — use this for iPhone perf testing");
console.log("────────────────────────────────────────────────────────");
if (lanIp) {
  console.log(`  iPhone / device:  http://${lanIp}:${PORT}`);
} else {
  console.log(`  Bind: 0.0.0.0:${PORT}`);
}
console.log("  Run `npm run build` when code changes.");
console.log("");

const child = spawn("npx", ["next", "start", "-p", PORT, "-H", "0.0.0.0"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
