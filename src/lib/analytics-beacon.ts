/**
 * First-party analytics POST helper — same-origin, no credentials.
 * Keeps anonymous capture intact while avoiding browser→*.supabase.co inserts.
 */
export function postAnalyticsBeacon(
  path: "/api/analytics/site-visit" | "/api/analytics/engagement",
  body: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  const send = () => {
    try {
      void fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "omit",
        mode: "same-origin",
        keepalive: true,
      }).catch(() => {
        /* never block UI */
      });
    } catch {
      /* never block UI */
    }
  };

  /* Defer past first paint / interaction so Safari privacy work is quieter. */
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => send(), { timeout: 2500 });
    return;
  }
  window.setTimeout(send, 0);
}
