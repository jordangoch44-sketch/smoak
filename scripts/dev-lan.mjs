#!/usr/bin/env node
/**
 * Start Next dev for iPhone/LAN testing and print the URL to open on device.
 * Requires allowedDevOrigins in next.config.ts (LAN IPs are blocked by default in Next 16).
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
console.log("SMOAC dev (LAN)");
console.log("───────────────");
if (lanIp) {
  console.log(`  iPhone / device:  http://${lanIp}:${PORT}`);
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
