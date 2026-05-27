"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";

/** Guard /admin — redirects non-admin sessions to their dashboard or dev admin login */
export function useRequireAdmin() {
  return useRequireAuth("admin");
}
