"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { loadSpecialistInquiryLeads } from "@/lib/inquiry/inquiry-inbox";
import { subscribeInquiryInbox } from "@/lib/inquiry/inquiry-inbox-state";
import { listHiddenInquiryIds } from "@/lib/inquiry/inquiry-hidden-store";
import { isInquiryFlaggedUnread } from "@/lib/inquiry/inquiry-unread-flag-store";
import { resolveManagedSpecialistId } from "@/lib/managed-specialist-profile";
import { subscribeSpecialistApplications } from "@/lib/specialist-application-storage";
import { getUserRole } from "@/lib/specialist-saves";

const noopSubscribe = () => () => {};

/**
 * Unread inquiries for the specialist Inquiries tab.
 * Zero while that tab is open.
 */
export function useSpecialistInquiryNavCount(viewingInquiries: boolean): number {
  const { session } = useAuthSession();
  const isSpecialist = getUserRole(session) === "specialist";
  const email = session?.email;
  const userId = session?.userId;
  const specialistId = useSyncExternalStore(
    isSpecialist ? subscribeSpecialistApplications : noopSubscribe,
    () => (isSpecialist ? resolveManagedSpecialistId(email, userId) : null),
    () => null
  );
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!specialistId) {
      setCount(0);
      return;
    }

    let cancelled = false;

    function load() {
      const id = specialistId;
      if (!id) return;
      void loadSpecialistInquiryLeads(id).then((leads) => {
        if (cancelled) return;
        const hidden = new Set(listHiddenInquiryIds(id));
        setCount(
          leads.filter((lead) => {
            if (hidden.has(lead.id)) return false;
            return lead.unread || isInquiryFlaggedUnread(id, lead.id);
          }).length
        );
      });
    }

    load();
    window.addEventListener("smoac:inquiry-updated", load);
    window.addEventListener("smoac:specialist-inquiry-notifications", load);
    window.addEventListener("focus", load);
    const unsubscribe = subscribeInquiryInbox({
      column: "specialist_id",
      value: specialistId,
    });

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("smoac:inquiry-updated", load);
      window.removeEventListener("smoac:specialist-inquiry-notifications", load);
      window.removeEventListener("focus", load);
    };
  }, [specialistId]);

  if (viewingInquiries) return 0;
  return count;
}
