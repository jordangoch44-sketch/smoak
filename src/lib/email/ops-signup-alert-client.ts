export type OpsSignupAlertKind = "client" | "specialist";

/**
 * Ask the server to email support about this signed-in signup.
 * Safe to call more than once — the server sends at most one alert per account.
 */
export function requestOpsSignupAlert(kind: OpsSignupAlertKind): void {
  if (typeof window === "undefined") return;
  void fetch("/api/ops/signup-alert", {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  }).catch(() => {
    /* Phone alert is best-effort and must not block signup. */
  });
}
