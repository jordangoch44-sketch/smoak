import { ADMIN_SPECIALIST_BILLING_SEED } from "@/data/admin-specialist-billing-seed";
import { ADMIN_NOTIFICATION_ISSUES_SEED } from "@/data/admin-notification-issues-seed";
import { applicationStatusLabel } from "@/lib/admin-applications-service";
import { clientApplicationStatusLabel } from "@/lib/client-applications-service";
import type { ClientApplication } from "@/types/client-application";
import type { AdminSpecialistRow } from "@/lib/admin-specialists-service";
import type {
  AdminNotifiableSectionId,
  AdminSectionBadgeCounts,
} from "@/types/admin-notifications";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";
import type { SpecialistApplication } from "@/types/specialist-application";

export interface AdminNotificationCountInput {
  applications: readonly SpecialistApplication[];
  clientApplications?: readonly ClientApplication[];
  specialists: readonly AdminSpecialistRow[];
  billingById?: ReadonlyMap<string, SpecialistBillingRecord>;
  dismissedIssueIds?: ReadonlySet<string>;
  /** Owner sees billing/client/revenue mock alerts; staff gets reduced counts */
  isOwnerAdmin?: boolean;
}

function applicationsById(
  applications: readonly SpecialistApplication[]
): Map<string, SpecialistApplication> {
  return new Map(applications.map((app) => [app.id, app]));
}

function isIncompleteSpecialistProfile(
  row: AdminSpecialistRow,
  app: SpecialistApplication | undefined
): boolean {
  if (row.inSeedCatalog) return false;
  const nameOk = row.name.trim().length > 0;
  const professionOk = row.profession.trim().length > 0;
  const cityOk = row.city.trim().length > 0;
  const bioOk = (app?.bio.trim().length ?? 0) > 0;
  return !(nameOk && professionOk && cityOk && bioOk);
}

function isFailedApprovalConversion(
  row: AdminSpecialistRow,
  app: SpecialistApplication | undefined
): boolean {
  return app?.profileStatus === "APPROVED" && row.visibility !== "active";
}

function isMissingTierPaymentData(
  row: AdminSpecialistRow,
  app: SpecialistApplication | undefined,
  billing: SpecialistBillingRecord | undefined,
  isOwnerAdmin: boolean
): boolean {
  if (!isOwnerAdmin || row.inSeedCatalog) return false;
  if (!app || app.profileStatus !== "APPROVED") return false;
  if (!ADMIN_SPECIALIST_BILLING_SEED[row.id] && row.isPremium && !billing) {
    return true;
  }
  if (billing && billing.tier === "free" && row.isPremium) return true;
  return false;
}

function specialistNeedsAttention(
  row: AdminSpecialistRow,
  app: SpecialistApplication | undefined,
  billing: SpecialistBillingRecord | undefined,
  isOwnerAdmin: boolean
): boolean {
  if (row.visibility === "pending") return true;
  if (row.visibility === "hidden") return true;
  if (isFailedApprovalConversion(row, app)) return true;
  if (isIncompleteSpecialistProfile(row, app)) return true;
  if (isMissingTierPaymentData(row, app, billing, isOwnerAdmin)) return true;
  return false;
}

export function countSpecialistsNeedingAttention(
  specialists: readonly AdminSpecialistRow[],
  applications: readonly SpecialistApplication[],
  billingById: ReadonlyMap<string, SpecialistBillingRecord> | undefined,
  isOwnerAdmin: boolean
): number {
  const appMap = applicationsById(applications);
  let count = 0;
  for (const row of specialists) {
    const app = appMap.get(row.id);
    const billing = billingById?.get(row.id);
    if (specialistNeedsAttention(row, app, billing, isOwnerAdmin)) {
      count += 1;
    }
  }
  return count;
}

function countStaffSpecialistsNeedingAttention(
  specialists: readonly AdminSpecialistRow[],
  applications: readonly SpecialistApplication[]
): number {
  const appMap = applicationsById(applications);
  let count = 0;
  for (const row of specialists) {
    const app = appMap.get(row.id);
    if (row.visibility === "pending") count += 1;
    else if (isFailedApprovalConversion(row, app)) count += 1;
  }
  return count;
}

function countOpenMockIssues(
  section: "clients" | "revenue",
  dismissedIssueIds: ReadonlySet<string>
): number {
  return ADMIN_NOTIFICATION_ISSUES_SEED.filter(
    (issue) => issue.section === section && !dismissedIssueIds.has(issue.id)
  ).length;
}

/** Compute nav badge counts — replace with Supabase RPC later */
export function computeAdminSectionBadgeCounts(
  input: AdminNotificationCountInput
): AdminSectionBadgeCounts {
  const dismissed = input.dismissedIssueIds ?? new Set<string>();
  const isOwner = input.isOwnerAdmin ?? false;

  const pendingSpecialists = input.applications.filter(
    (app) => applicationStatusLabel(app.profileStatus) === "pending"
  ).length;
  const pendingClients = (input.clientApplications ?? []).filter(
    (app) => clientApplicationStatusLabel(app.status) === "pending"
  ).length;
  const pendingApplications = pendingSpecialists + pendingClients;

  const specialists = isOwner
    ? countSpecialistsNeedingAttention(
        input.specialists,
        input.applications,
        input.billingById,
        true
      )
    : countStaffSpecialistsNeedingAttention(
        input.specialists,
        input.applications
      );

  const clients = isOwner ? countOpenMockIssues("clients", dismissed) : 0;
  const revenue = isOwner ? countOpenMockIssues("revenue", dismissed) : 0;

  return {
    applications: pendingApplications,
    specialists,
    clients,
    revenue,
  };
}

export function toAdminNavBadgeCounts(
  counts: AdminSectionBadgeCounts
): Partial<Record<AdminNotifiableSectionId, number>> {
  const result: Partial<Record<AdminNotifiableSectionId, number>> = {};
  (Object.keys(counts) as AdminNotifiableSectionId[]).forEach((key) => {
    const value = counts[key];
    if (value > 0) result[key] = value;
  });
  return result;
}
