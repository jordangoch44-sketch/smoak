/** Status-bar height when the iPhone shell does not report a safe-area inset. */
const NATIVE_STATUS_FALLBACK_PX = 54;

let cachedInset: number | null = null;

export function isNativeAppDocument(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("native-app")
  );
}

/**
 * Top inset for screens that pin under the site header.
 * In the iPhone app that header is hidden, so the pin must clear the clock.
 */
export function nativeStatusBarInset(): number {
  if (!isNativeAppDocument()) return 0;
  if (cachedInset != null) return cachedInset;

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)";
  document.body.appendChild(probe);
  const measured = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();

  cachedInset = Math.max(measured, NATIVE_STATUS_FALLBACK_PX);
  return cachedInset;
}
