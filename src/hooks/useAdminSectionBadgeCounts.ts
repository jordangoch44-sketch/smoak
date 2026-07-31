"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  computeAdminSectionBadgeCounts,
  filterBadgeCountsBySeen,
  listAdminSectionAttentionItemIds,
  toAdminNavBadgeCounts,
} from "@/lib/admin-notification-counts";
import {
  getAdminSectionBadgeSeenServerSnapshot,
  getAdminSectionBadgeSeenSnapshot,
  subscribeAdminSectionBadgeSeen,
} from "@/lib/admin-section-badge-seen-store";
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
  const seenSnapshot = useSyncExternalStore(
    subscribeAdminSectionBadgeSeen,
    getAdminSectionBadgeSeenSnapshot,
    getAdminSectionBadgeSeenServerSnapshot
  );

  return useMemo(() => {
    const countInput = {
      applications: input.applications,
      clientApplications: input.clientApplications,
      specialists: input.specialists,
      billingById: input.billingById,
      isOwnerAdmin: input.isOwnerAdmin,
    };
    const raw = computeAdminSectionBadgeCounts(countInput);
    const itemIds = listAdminSectionAttentionItemIds(countInput);
    const seenBySection: Partial<
      Record<AdminNotifiableSectionId, ReadonlySet<string>>
    > = {
      applications: new Set(seenSnapshot.applications ?? []),
      specialists: new Set(seenSnapshot.specialists ?? []),
      clients: new Set(seenSnapshot.clients ?? []),
      revenue: new Set(seenSnapshot.revenue ?? []),
    };
    return toAdminNavBadgeCounts(
      filterBadgeCountsBySeen(raw, itemIds, seenBySection)
    );
  }, [
    input.applications,
    input.clientApplications,
    input.specialists,
    input.billingById,
    input.isOwnerAdmin,
    seenSnapshot,
  ]);
}

export function useAdminSectionAttentionItemIds(input: {
  applications: readonly SpecialistApplication[];
  clientApplications?: readonly ClientApplication[];
  specialists: readonly AdminSpecialistRow[];
  billingById?: ReadonlyMap<string, SpecialistBillingRecord>;
  isOwnerAdmin: boolean;
}): Record<AdminNotifiableSectionId, string[]> {
  return useMemo(
    () =>
      listAdminSectionAttentionItemIds({
        applications: input.applications,
        clientApplications: input.clientApplications,
        specialists: input.specialists,
        billingById: input.billingById,
        isOwnerAdmin: input.isOwnerAdmin,
      }),
    [
      input.applications,
      input.clientApplications,
      input.specialists,
      input.billingById,
      input.isOwnerAdmin,
    ]
  );
}
