"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  computeAdminSectionBadgeCounts,
  toAdminNavBadgeCounts,
} from "@/lib/admin-notification-counts";
import {
  getDismissedAdminNotificationsServerSnapshot,
  getDismissedAdminNotificationsSnapshot,
  subscribeDismissedAdminNotifications,
} from "@/lib/admin-notification-issues-store";
import type { AdminSpecialistRow } from "@/lib/admin-specialists-service";
import type { AdminNotifiableSectionId } from "@/types/admin-notifications";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";
import type { ClientApplication } from "@/types/client-application";
import type { SpecialistApplication } from "@/types/specialist-application";

export function useAdminSectionBadgeCounts(input: {
  applications: readonly SpecialistApplication[];
  clientApplications?: readonly ClientApplication[];
  specialists: readonly AdminSpecialistRow[];
  billingById?: ReadonlyMap<string, SpecialistBillingRecord>;
  isOwnerAdmin: boolean;
}): Partial<Record<AdminNotifiableSectionId, number>> {
  const dismissedIds = useSyncExternalStore(
    subscribeDismissedAdminNotifications,
    getDismissedAdminNotificationsSnapshot,
    getDismissedAdminNotificationsServerSnapshot
  );

  return useMemo(() => {
    const counts = computeAdminSectionBadgeCounts({
      applications: input.applications,
      clientApplications: input.clientApplications,
      specialists: input.specialists,
      billingById: input.billingById,
      dismissedIssueIds: new Set(dismissedIds),
      isOwnerAdmin: input.isOwnerAdmin,
    });
    return toAdminNavBadgeCounts(counts);
  }, [
    input.applications,
    input.clientApplications,
    input.specialists,
    input.billingById,
    input.isOwnerAdmin,
    dismissedIds,
  ]);
}
