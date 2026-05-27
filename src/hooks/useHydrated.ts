"use client";

import { useEffect, useState } from "react";

/** True after mount — use to gate client-only UI and avoid hydration mismatches. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
