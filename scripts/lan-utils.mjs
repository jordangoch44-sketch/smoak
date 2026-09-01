import os from "node:os";

/** Default Next dev/prod port (`PORT` env or 3000). */
export function getDefaultPort() {
  return process.env.PORT ?? "3000";
}

/**
 * First non-internal IPv4 from network interfaces (typical LAN IP for iPhone testing).
 */
export function getLanIpv4() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** `http://<lan-ip>:<port>` when a LAN IP is available. */
export function buildLanOrigin(lanIp, port = getDefaultPort()) {
  return lanIp ? `http://${lanIp}:${port}` : null;
}

/**
 * Hostnames that must not be used for NEXT_PUBLIC_SITE_URL / auth redirects.
 */
export function isUnusableSiteUrl(value) {
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

/** True when a URL string contains localhost or bind-all hosts. */
export function isBadAuthHost(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}
