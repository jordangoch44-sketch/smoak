#!/usr/bin/env node
/**
 * Run auth/session LAN verify scripts with .env.local loaded.
 * Usage: npm run verify:auth
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env-local.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));

loadEnvLocal();

const scripts = [
  "verify-auth-session-stability.mjs",
  "verify-magic-link-redirect.mjs",
];

function runScript(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(scriptDir, name)], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code ?? 1}`));
    });
  });
}

console.log("");
console.log("SMOAC auth verify");
console.log("─────────────────");

for (const script of scripts) {
  console.log(`\n▶ ${script}\n`);
  await runScript(script);
}

console.log("\nAll auth verify checks passed.\n");
