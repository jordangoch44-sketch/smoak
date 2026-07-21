"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useRequireInternalAuth } from "@/hooks/useRequireInternalAuth";
import { listAdminClients } from "@/lib/admin-clients-service";
import { ensureAdminApplicationSeeds } from "@/lib/admin-applications-seed";
import {
  activateSpecialistApplicationWithEditsAsync,
  activateSpecialistFromApplicationAsync,
  approveSpecialistApplicationWithEditsAsync,
  archiveSpecialistApplicationAsync,
  listApplicationsByStatus,
  rejectSpecialistApplicationWithEditsAsync,
  saveSpecialistApplicationEditsAsync,
} from "@/lib/admin-applications-service";
import {
  approveClientApplication,
  archiveClientApplication,
  rejectClientApplication,
  saveClientApplicationEdits,
} from "@/lib/client-applications-service";
import { computeAdminOverviewStats } from "@/lib/admin-stats";
import {
  getAdminSpecialistMetaSnapshot,
  getAdminSpecialistMetaServerSnapshot,
  subscribeAdminSpecialistMeta,
} from "@/lib/admin-specialist-meta-store";
import {
  listAdminSpecialists,
  setAdminSpecialistAccountKind,
  setAdminSpecialistFlagAsync,
  setAdminSpecialistProtected,
  setAdminSpecialistVisibilityAsync,
  updateAdminSpecialistBasics,
  type AdminSpecialistRow,
} from "@/lib/admin-specialists-service";
import {
  getClientApplicationsServerSnapshot,
  getClientApplicationsSnapshot,
  refreshClientApplicationsFromRemote,
  subscribeClientApplications,
} from "@/lib/client-application-storage";
import {
  getHiddenTrainersSnapshot,
  getHiddenTrainersServerSnapshot,
  subscribeHiddenTrainers,
} from "@/lib/hidden-trainers-store";
import {
  getSpecialistApplicationsServerSnapshot,
  getSpecialistApplicationsSnapshot,
  refreshSpecialistApplicationsFromRemote,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";
import {
  getApprovedSpecialistProfilesServerSnapshot,
  getApprovedSpecialistProfilesSnapshot,
  refreshApprovedSpecialistProfilesFromRemote,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import type { AdminApplicationStatusLabel } from "@/types/admin";

export function useAdminDashboard() {
  const { isReady, session } = useRequireInternalAuth();

  useEffect(() => {
    if (!isReady) return;
    ensureAdminApplicationSeeds();
    refreshClientApplicationsFromRemote();
    refreshSpecialistApplicationsFromRemote();
    refreshApprovedSpecialistProfilesFromRemote();
  }, [isReady]);

  const specialistMeta = useSyncExternalStore(
    subscribeAdminSpecialistMeta,
    getAdminSpecialistMetaSnapshot,
    getAdminSpecialistMetaServerSnapshot
  );
  const hiddenIds = useSyncExternalStore(
    subscribeHiddenTrainers,
    getHiddenTrainersSnapshot,
    getHiddenTrainersServerSnapshot
  );
  const applications = useSyncExternalStore(
    subscribeSpecialistApplications,
    getSpecialistApplicationsSnapshot,
    getSpecialistApplicationsServerSnapshot
  );
  const clientApplications = useSyncExternalStore(
    subscribeClientApplications,
    getClientApplicationsSnapshot,
    getClientApplicationsServerSnapshot
  );
  /* Durable featured/sponsored flags come from the remote catalog store */
  const approvedProfiles = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesSnapshot,
    getApprovedSpecialistProfilesServerSnapshot
  );

  const clients = useMemo(
    () => listAdminClients(null, clientApplications),
    [clientApplications]
  );

  const stats = useMemo(
    () => computeAdminOverviewStats(clients, applications, clientApplications),
    [clients, applications, clientApplications]
  );

  const specialists = useMemo(
    () => listAdminSpecialists(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store-driven list
    [applications, hiddenIds, specialistMeta, approvedProfiles]
  );

  const refreshKey = applications.length + clientApplications.length;

  const getApplications = useCallback(
    (filter: AdminApplicationStatusLabel | "all") =>
      listApplicationsByStatus(filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when application list length changes
    [refreshKey]
  );

  return {
    isReady,
    session,
    stats,
    specialists,
    clients,
    applications,
    clientApplications,
    getApplications,
    approveApplication: approveSpecialistApplicationWithEditsAsync,
    rejectApplication: rejectSpecialistApplicationWithEditsAsync,
    archiveApplication: archiveSpecialistApplicationAsync,
    activateFromApplication: activateSpecialistFromApplicationAsync,
    activateApplicationWithEdits: activateSpecialistApplicationWithEditsAsync,
    saveApplicationEdits: saveSpecialistApplicationEditsAsync,
    approveClientApplication,
    rejectClientApplication,
    archiveClientApplication,
    saveClientApplicationEdits,
    setSpecialistVisibility: setAdminSpecialistVisibilityAsync,
    setSpecialistFlag: setAdminSpecialistFlagAsync,
    setSpecialistProtected: setAdminSpecialistProtected,
    setSpecialistAccountKind: setAdminSpecialistAccountKind,
    updateSpecialistBasics: updateAdminSpecialistBasics,
  };
}

export type { AdminSpecialistRow };
