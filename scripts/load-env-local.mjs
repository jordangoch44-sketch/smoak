import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads .env.local into process.env (does not override existing env vars).
 * Used by Node scripts; Next.js loads .env.local automatically for dev/build.
 */
export function loadEnvLocal(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(
      "Missing .env.local — copy .env.example and add your Supabase keys."
    );
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
