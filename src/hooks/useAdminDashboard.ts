"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useRequireInternalAuth } from "@/hooks/useRequireInternalAuth";
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
import {
  getAdminSpecialistMetaSnapshot,
  getAdminSpecialistMetaServerSnapshot,
  subscribeAdminSpecialistMeta,
} from "@/lib/admin-specialist-meta-store";
import {
  getAdminSpecialistDirectoryServerSnapshot,
  getAdminSpecialistDirectorySnapshot,
  listAdminSpecialists,
  refreshAdminSpecialistDirectoryFromRemote,
  setAdminSpecialistAccountKindAsync,
  setAdminSpecialistFlagAsync,
  setAdminSpecialistProtectedAsync,
  setAdminSpecialistVisibilityAsync,
  subscribeAdminSpecialistDirectory,
  updateAdminSpecialistBasicsAsync,
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
    void refreshAdminSpecialistDirectoryFromRemote();
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
  const adminDirectory = useSyncExternalStore(
    subscribeAdminSpecialistDirectory,
    getAdminSpecialistDirectorySnapshot,
    getAdminSpecialistDirectoryServerSnapshot
  );

  const specialists = useMemo(
    () => listAdminSpecialists(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store-driven list
    [applications, hiddenIds, specialistMeta, approvedProfiles, adminDirectory]
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
    specialists,
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
    setSpecialistProtected: setAdminSpecialistProtectedAsync,
    setSpecialistAccountKind: setAdminSpecialistAccountKindAsync,
    updateSpecialistBasics: updateAdminSpecialistBasicsAsync,
  };
}

export type { AdminSpecialistRow };
