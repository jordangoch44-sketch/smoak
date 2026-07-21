/**
 * Optional service catalog — prefer direct imports: `@/lib/admin-applications-service`.
 */

export {
  applicationStatusLabel,
  approveSpecialistApplication,
  approveSpecialistApplicationWithEdits,
  approveSpecialistApplicationWithEditsAsync,
  activateSpecialistFromApplication,
  activateSpecialistFromApplicationAsync,
  activateSpecialistApplicationWithEditsAsync,
  archiveSpecialistApplication,
  archiveSpecialistApplicationAsync,
  countPendingApplications,
  listApplicationsByStatus,
  rejectSpecialistApplication,
  rejectSpecialistApplicationWithEdits,
  rejectSpecialistApplicationWithEditsAsync,
  saveSpecialistApplicationEdits,
  saveSpecialistApplicationEditsAsync,
  updateApplicationStatus,
  updateApplicationStatusAsync,
} from "@/lib/admin-applications-service";
export type { AdminApplicationMutationResult } from "@/lib/admin-applications-service";

export { applicationToProfileOverrides } from "@/lib/application-to-trainer";
export { ensureAdminApplicationSeeds } from "@/lib/admin-applications-seed";
export { isAdminSession } from "@/lib/admin-auth";
export { listAdminClients } from "@/lib/admin-clients-service";
export {
  computeAdminSectionBadgeCounts,
  countSpecialistsNeedingAttention,
  toAdminNavBadgeCounts,
} from "@/lib/admin-notification-counts";
export {
  clearDismissedAdminNotifications,
  dismissAdminNotificationIssue,
  getDismissedAdminNotificationsSnapshot,
  subscribeDismissedAdminNotifications,
} from "@/lib/admin-notification-issues-store";
export {
  formatFinancialCents,
  getAdminOwnerPnlSnapshot,
} from "@/lib/admin-owner-financials-service";
export { computeAdminOverviewCharts } from "@/lib/admin-overview-charts";
export {
  canAccessAdminSection,
  getAdminRoleLabel,
  getDefaultAdminSection,
  getPermissionsForAdminRole,
  resolveAdminRoleFromSession,
} from "@/lib/admin-permissions";
export {
  buildInternalLoginHref,
  INTERNAL_DASHBOARD_PATH,
  INTERNAL_LOGIN_PATH,
} from "@/lib/internal-routes";
export {
  formatBillingCents,
  formatTierPrice,
  getAdminOwnerRevenueDashboard,
  listSpecialistBillingFromRows,
} from "@/lib/admin-specialist-billing-service";
export {
  countSpecialistsByTierCategory,
  filterSpecialistsByTierCategory,
  SPECIALIST_TIER_CATEGORIES,
} from "@/lib/admin-specialist-tier-groups";
export {
  getAdminSpecialistMeta,
  patchAdminSpecialistMeta,
} from "@/lib/admin-specialist-meta-store";
export {
  listAdminSpecialists,
  setAdminSpecialistAccountKind,
  setAdminSpecialistFlag,
  setAdminSpecialistFlagAsync,
  setAdminSpecialistProtected,
  setAdminSpecialistVisibility,
  setAdminSpecialistVisibilityAsync,
  updateAdminSpecialistBasics,
} from "@/lib/admin-specialists-service";
export { computeAdminOverviewStats } from "@/lib/admin-stats";
export {
  formatRevenueCents,
  getAdminRevenueDashboard,
} from "@/lib/admin-revenue-service";
export { getAdminExecutiveRevenueSnapshot } from "@/lib/admin-executive-revenue-service";
export { ADMIN_SECTIONS } from "@/lib/admin-sections";
