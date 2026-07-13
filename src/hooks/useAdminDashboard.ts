"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useRequireInternalAuth } from "@/hooks/useRequireInternalAuth";
import { listAdminClients } from "@/lib/admin-clients-service";
import { ensureAdminApplicationSeeds } from "@/lib/admin-applications-seed";
import {
  activateSpecialistFromApplication,
  approveSpecialistApplicationWithEdits,
  archiveSpecialistApplication,
  listApplicationsByStatus,
  rejectSpecialistApplicationWithEdits,
  saveSpecialistApplicationEdits,
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
  setAdminSpecialistFlag,
  setAdminSpecialistVisibility,
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
import type { AdminApplicationStatusLabel } from "@/types/admin";
import type { ClientApplication } from "@/types/client-application";

export function useAdminDashboard() {
  const { isReady, session } = useRequireInternalAuth();

  useEffect(() => {
    if (!isReady) return;
    ensureAdminApplicationSeeds();
    refreshClientApplicationsFromRemote();
    refreshSpecialistApplicationsFromRemote();
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
    [applications, hiddenIds, specialistMeta]
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
    approveApplication: approveSpecialistApplicationWithEdits,
    rejectApplication: rejectSpecialistApplicationWithEdits,
    archiveApplication: archiveSpecialistApplication,
    activateFromApplication: activateSpecialistFromApplication,
    saveApplicationEdits: saveSpecialistApplicationEdits,
    approveClientApplication,
    rejectClientApplication,
    archiveClientApplication,
    saveClientApplicationEdits,
    setSpecialistVisibility: setAdminSpecialistVisibility,
    setSpecialistFlag: setAdminSpecialistFlag,
    updateSpecialistBasics: updateAdminSpecialistBasics,
  };
}

export type { AdminSpecialistRow };
