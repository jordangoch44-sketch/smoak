import { createSign } from "node:crypto";
import http2 from "node:http2";

const BUNDLE_ID = "com.smoac.app";
const JWT_TTL_MS = 50 * 60 * 1000;

export type ApnsEnvironment = "sandbox" | "production";

export interface ApnsAlert {
  title: string;
  body: string;
  path: string;
  collapseId?: string;
}

interface ApnsResult {
  ok: boolean;
  status: number;
  reason: string;
  dropToken: boolean;
}

let cachedJwt: { token: string; expiresAt: number } | null = null;
let missingCredentialsWarned = false;

function privateKeyPem(): string {
  const raw = process.env.APNS_PRIVATE_KEY?.trim() ?? "";
  return raw.replace(/\\n/g, "\n");
}

export function apnsConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID?.trim() &&
      process.env.APNS_TEAM_ID?.trim() &&
      privateKeyPem().includes("BEGIN PRIVATE KEY")
  );
}

function warnMissingCredentials(): void {
  if (missingCredentialsWarned) return;
  missingCredentialsWarned = true;
  console.warn(
    "[SMOAC PUSH] APNs is not configured. Set APNS_KEY_ID, APNS_TEAM_ID, and APNS_PRIVATE_KEY."
  );
}

function apnsJwt(): string | null {
  const keyId = process.env.APNS_KEY_ID?.trim() ?? "";
  const teamId = process.env.APNS_TEAM_ID?.trim() ?? "";
  const pem = privateKeyPem();
  if (!keyId || !teamId || !pem.includes("BEGIN PRIVATE KEY")) {
    warnMissingCredentials();
    return null;
  }

  const now = Date.now();
  if (cachedJwt && cachedJwt.expiresAt > now) return cachedJwt.token;

  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })).toString(
    "base64url"
  );
  const claims = Buffer.from(
    JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) })
  ).toString("base64url");
  const unsigned = `${header}.${claims}`;
  const signer = createSign("SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign({ key: pem, dsaEncoding: "ieee-p1363" });
  const token = `${unsigned}.${signature.toString("base64url")}`;
  cachedJwt = { token, expiresAt: now + JWT_TTL_MS };
  return token;
}

function apnsHost(environment: ApnsEnvironment): string {
  return environment === "sandbox"
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";
}

function sendOnClient(
  client: http2.ClientHttp2Session,
  deviceToken: string,
  jwt: string,
  alert: ApnsAlert
): Promise<ApnsResult> {
  const payload = JSON.stringify({
    aps: {
      alert: { title: alert.title, body: alert.body },
      sound: "default",
    },
    path: alert.path,
  });

  const headers: http2.OutgoingHttpHeaders = {
    ":method": "POST",
    ":path": `/3/device/${deviceToken}`,
    authorization: `bearer ${jwt}`,
    "apns-topic": BUNDLE_ID,
    "apns-push-type": "alert",
    "apns-priority": "10",
  };
  const collapseId = alert.collapseId?.trim();
  if (collapseId) headers["apns-collapse-id"] = collapseId.slice(0, 64);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result: ApnsResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const req = client.request(headers);
    req.setTimeout(8000, () => {
      req.close();
      fail(new Error("APNs timed out"));
    });
    const chunks: Buffer[] = [];
    req.on("response", (responseHeaders) => {
      const status = Number(responseHeaders[":status"] ?? 0);
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let reason = "";
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { reason?: string };
            reason = parsed.reason ?? "";
          } catch {
            reason = raw.slice(0, 180);
          }
        }
        const dropToken =
          status === 410 || reason === "BadDeviceToken" || reason === "Unregistered";
        finish({ ok: status === 200, status, reason, dropToken });
      });
    });
    req.on("error", fail);
    req.end(payload);
  });
}

/** Send one alert to every token on a single APNs host. */
export async function sendApnsAlerts(
  environment: ApnsEnvironment,
  deviceTokens: string[],
  alert: ApnsAlert
): Promise<ApnsResult[]> {
  const jwt = apnsJwt();
  if (!jwt || deviceTokens.length === 0) return [];

  const client = http2.connect(`https://${apnsHost(environment)}`);
  try {
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", reject);
    });
    return await Promise.all(
      deviceTokens.map((deviceToken) =>
        sendOnClient(client, deviceToken, jwt, alert)
      )
    );
  } finally {
    client.close();
  }
}
