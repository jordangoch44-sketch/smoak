/** Auth logging — never logs passwords. Server signup always logs; client logs in dev. */
export function logAuth(
  event: string,
  detail?: Record<string, unknown>
): void {
  const onServer = typeof window === "undefined";
  if (!onServer && process.env.NODE_ENV === "production") {
    return;
  }
  console.info("[SMOAC auth]", event, detail ?? "");
}
