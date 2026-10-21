let cachedInset: number | null = null;

export function isNativeAppDocument(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("native-app")
  );
}

/**
 * Top inset for screens that pin under the status bar.
 * Uses the clock inset published by the iPhone shell, or the WebView inset
 * when that is the larger value. Does not cache 0 — the shell may publish
 * the inset after the first read.
 */
export function nativeStatusBarInset(): number {
  if (!isNativeAppDocument()) return 0;
  if (cachedInset != null) return cachedInset;

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-top:max(env(safe-area-inset-top,0px),var(--native-safe-top,0px))";
  document.body.appendChild(probe);
  const measured = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();

  if (measured > 0) cachedInset = measured;
  return measured;
}
