"use client";

import { useEffect } from "react";

/** Dev only — unregister any service workers and clear caches */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    async function cleanup() {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    }

    cleanup().catch((err) => {
      console.warn("[SMOAC dev] SW/cache cleanup failed", err);
    });
  }, []);

  return null;
}
