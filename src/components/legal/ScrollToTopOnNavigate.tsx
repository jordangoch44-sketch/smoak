"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Ensure informational pages open at the top after client navigations. */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
