"use client";

import { useEffect, useState } from "react";

const EMPTY = new Map<string, string>();

/** Profile photos for roster clients, keyed by client user id. */
export function useRosterClientAvatars(specialistId: string | null) {
  const [state, setState] = useState<{ key: string | null; avatars: Map<string, string> }>({
    key: null,
    avatars: EMPTY,
  });

  useEffect(() => {
    if (!specialistId) return;
    let cancelled = false;
    const load = () => {
      void fetch(`/api/coaching/avatars?specialistId=${encodeURIComponent(specialistId)}`, {
        credentials: "same-origin",
      })
        .then(async (response) => {
          if (!response.ok) return EMPTY;
          const body = (await response.json()) as {
            avatars?: Array<{ clientUserId?: string; avatarUrl?: string }>;
          };
          const avatars = new Map<string, string>();
          for (const item of body.avatars ?? []) {
            const clientUserId = item.clientUserId?.trim() ?? "";
            const avatarUrl = item.avatarUrl?.trim() ?? "";
            if (clientUserId && avatarUrl) avatars.set(clientUserId, avatarUrl);
          }
          return avatars;
        })
        .then((avatars) => {
          if (!cancelled) setState({ key: specialistId, avatars });
        })
        .catch(() => {
          if (!cancelled) setState({ key: specialistId, avatars: EMPTY });
        });
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [specialistId]);

  return state.key === specialistId ? state.avatars : EMPTY;
}
