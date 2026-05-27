"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { listAdminClients } from "@/lib/admin-clients-service";
import { ensureAdminApplicationSeeds } from "@/lib/admin-applications-seed";
import {
  activateSpecialistFromApplication,
  approveSpecialistApplicationWithEdits,
  listApplicationsByStatus,
  rejectSpecialistApplicationWithEdits,
  saveSpecialistApplicationEdits,
} from "@/lib/admin-applications-service";
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
  getHiddenTrainersSnapshot,
  getHiddenTrainersServerSnapshot,
  subscribeHiddenTrainers,
} from "@/lib/hidden-trainers-store";
import {
  getSpecialistApplicationsServerSnapshot,
  getSpecialistApplicationsSnapshot,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";
import type { AdminApplicationStatusLabel } from "@/types/admin";

export function useAdminDashboard() {
  const { isReady, session } = useRequireAdmin();
  const { session: authSession } = useAuthSession();

  useEffect(() => {
    if (!isReady) return;
    ensureAdminApplicationSeeds();
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

  const clients = useMemo(
    () => listAdminClients(authSession),
    [authSession, applications]
  );

  const stats = useMemo(
    () => computeAdminOverviewStats(clients),
    [clients, applications, specialistMeta, hiddenIds]
  );

  const specialists = useMemo(
    () => listAdminSpecialists(),
    [applications, clients, specialistMeta, hiddenIds]
  );

  const refreshKey = applications.length;

  const getApplications = useCallback(
    (filter: AdminApplicationStatusLabel | "all") =>
      listApplicationsByStatus(filter),
    [refreshKey]
  );

  return {
    isReady,
    session,
    stats,
    specialists,
    clients,
    applications,
    getApplications,
    approveApplication: approveSpecialistApplicationWithEdits,
    rejectApplication: rejectSpecialistApplicationWithEdits,
    activateFromApplication: activateSpecialistFromApplication,
    saveApplicationEdits: saveSpecialistApplicationEdits,
    setSpecialistVisibility: setAdminSpecialistVisibility,
    setSpecialistFlag: setAdminSpecialistFlag,
    updateSpecialistBasics: updateAdminSpecialistBasics,
  };
}

export type { AdminSpecialistRow };
