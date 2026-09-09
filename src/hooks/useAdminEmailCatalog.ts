"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { duplicateAdminEmailRecord } from "@/lib/admin-email-catalog";
import {
  getAdminEmailsServerSnapshot,
  getAdminEmailsSnapshot,
  removeAdminEmail,
  subscribeAdminEmails,
  upsertAdminEmail,
} from "@/lib/admin-email-store";
import type {
  AdminEmailDispatchResult,
  AdminEmailRecipient,
  AdminEmailStatus,
  AdminManagedEmail,
} from "@/types/admin-email";
import type { AdminEmailAnalyticsRange, AdminEmailAnalyticsSnapshot } from "@/types/admin-email";
import { emptyEmailAnalytics } from "@/lib/admin-email-catalog";

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useAdminEmailCatalog() {
  const [emails, setEmails] = useState<AdminManagedEmail[]>(
    getAdminEmailsServerSnapshot()
  );
  const [live, setLive] = useState(false);
  const [analytics, setAnalytics] = useState<AdminEmailAnalyticsSnapshot>(
    emptyEmailAnalytics("30d")
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/emails", { credentials: "include" });
    const body = await parseJson<{ ok?: boolean; emails?: AdminManagedEmail[] }>(
      res
    );
    if (res.ok && body?.ok && Array.isArray(body.emails)) {
      setLive(true);
      setEmails(body.emails);
      return;
    }
    setLive(false);
    setEmails(getAdminEmailsSnapshot());
  }, []);

  const refreshAnalytics = useCallback(async (range: AdminEmailAnalyticsRange) => {
    const res = await fetch(`/api/admin/emails/analytics?range=${range}`, {
      credentials: "include",
    });
    const body = await parseJson<{
      ok?: boolean;
      analytics?: AdminEmailAnalyticsSnapshot;
    }>(res);
    if (res.ok && body?.ok && body.analytics) {
      setAnalytics(body.analytics);
      return;
    }
    setAnalytics(emptyEmailAnalytics(range));
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeAdminEmails(() => {
      if (!live) setEmails(getAdminEmailsSnapshot());
    });
  }, [refresh, live]);

  const save = useCallback(
    async (email: AdminManagedEmail) => {
      const res = await fetch(
        emails.some((row) => row.id === email.id)
          ? `/api/admin/emails/${email.id}`
          : "/api/admin/emails",
        {
          method: emails.some((row) => row.id === email.id) ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      const body = await parseJson<{
        ok?: boolean;
        email?: AdminManagedEmail;
        message?: string;
      }>(res);
      if (res.ok && body?.ok && body.email) {
        setLive(true);
        setEmails((current) => {
          const index = current.findIndex((row) => row.id === body.email!.id);
          if (index >= 0) {
            return current.map((row, i) => (i === index ? body.email! : row));
          }
          return [body.email!, ...current];
        });
        return { ok: true as const, email: body.email };
      }
      upsertAdminEmail(email);
      return {
        ok: false as const,
        email,
        message: body?.message ?? "Saved locally. Live send needs an admin session.",
      };
    },
    [emails]
  );

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/emails/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setEmails((current) => current.filter((row) => row.id !== id));
      return;
    }
    removeAdminEmail(id);
    setEmails(getAdminEmailsSnapshot());
  }, []);

  const setStatus = useCallback(
    async (id: string, status: AdminEmailStatus) => {
      const current = emails.find((row) => row.id === id);
      if (!current) return null;
      const result = await save({ ...current, status });
      return result.email;
    },
    [emails, save]
  );

  const duplicate = useCallback(
    async (email: AdminManagedEmail) => {
      const copy = duplicateAdminEmailRecord(email);
      const result = await save(copy);
      return result.email;
    },
    [save]
  );

  const sendNow = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/emails/${id}/send`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson<{
      ok?: boolean;
      message?: string;
      result?: AdminEmailDispatchResult;
    }>(res);
    await refresh();
    return (
      body?.result ?? {
        ok: Boolean(res.ok && body?.ok),
        message: body?.message ?? "Send failed.",
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        queued: 0,
      }
    );
  }, [refresh]);

  const resendNonOpeners = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/emails/${id}/resend-non-openers`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson<{
      result?: AdminEmailDispatchResult;
      message?: string;
    }>(res);
    await refresh();
    return (
      body?.result ?? {
        ok: false,
        message: body?.message ?? "Resend failed.",
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        queued: 0,
      }
    );
  }, [refresh]);

  const loadRecipients = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/emails/${id}/recipients`, {
      credentials: "include",
    });
    const body = await parseJson<{
      ok?: boolean;
      recipients?: AdminEmailRecipient[];
    }>(res);
    return body?.recipients ?? [];
  }, []);

  const audienceCount = useCallback(async (ids: string[]) => {
    const res = await fetch(
      `/api/admin/emails/audience?ids=${encodeURIComponent(ids.join(","))}`,
      { credentials: "include" }
    );
    const body = await parseJson<{ ok?: boolean; count?: number }>(res);
    return typeof body?.count === "number" ? body.count : 0;
  }, []);

  return useMemo(
    () => ({
      emails,
      live,
      analytics,
      refresh,
      refreshAnalytics,
      save,
      remove,
      setStatus,
      duplicate,
      sendNow,
      resendNonOpeners,
      loadRecipients,
      audienceCount,
    }),
    [
      emails,
      live,
      analytics,
      refresh,
      refreshAnalytics,
      save,
      remove,
      setStatus,
      duplicate,
      sendNow,
      resendNonOpeners,
      loadRecipients,
      audienceCount,
    ]
  );
}
