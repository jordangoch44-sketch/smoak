/** Run work after first paint / idle — keeps homepage interactive on slow devices */
export function scheduleAfterFirstPaint(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let cancelled = false;
  const run = () => {
    if (!cancelled) callback();
  };

  const maxWait = window.setTimeout(run, 2200);

  const schedule = () => {
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(run, { timeout: 900 });
      return () => {
        cancelled = true;
        window.clearTimeout(maxWait);
        window.cancelIdleCallback(idleId);
      };
    }
    const delayId = setTimeout(run, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(maxWait);
      clearTimeout(delayId);
    };
  };

  if (document.readyState === "complete") {
    return schedule();
  }

  const onLoad = () => schedule();
  window.addEventListener("load", onLoad, { once: true });
  return () => {
    cancelled = true;
    window.clearTimeout(maxWait);
    window.removeEventListener("load", onLoad);
  };
}
