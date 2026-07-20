#!/usr/bin/env node
/**
 * Start Next dev for iPhone/LAN testing and print the URL to open on device.
 * Requires allowedDevOrigins in next.config.ts (LAN IPs are blocked by default in Next 16).
 */
import { spawn } from "node:child_process";
import { buildLanOrigin, getDefaultPort, getLanIpv4 } from "./lan-utils.mjs";

const PORT = getDefaultPort();
const lanIp = getLanIpv4();
const lanOrigin = buildLanOrigin(lanIp, PORT);

console.log("");
console.log("SMOAC dev (LAN)");
console.log("───────────────");
if (lanIp) {
  console.log(`  iPhone / device:  ${lanOrigin}`);
  console.log(`  This machine:     http://127.0.0.1:${PORT}`);
} else {
  console.log(`  Bind: 0.0.0.0:${PORT} (could not detect LAN IP — check System Settings → Network)`);
}
console.log("");
console.log("  Tap test:         /tap-test  (Hydration must show YES)");
console.log("  iPhone feels slow? npm run build && npm run start:lan");
console.log("  Restart required after next.config.ts changes.");
console.log("");

const child = spawn(
  "npx",
  ["next", "dev", "-p", PORT, "-H", "0.0.0.0"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      ...(lanIp ? { SMOAC_LAN_HOST: lanIp } : {}),
    },
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
