import { DEV_CLIENT_CREDENTIALS } from "@/lib/dev-auth";
import { loadCreateAccountProfile } from "@/lib/create-account-profile-storage";
import { listClientApplications } from "@/lib/client-application-storage";
import type { ClientApplication } from "@/types/client-application";
import { loadSavedTrainerIdsForUser } from "@/lib/saved-trainers-storage";
import {
  getActiveClientUserId,
  getClientUserId,
} from "@/lib/saved-trainers-user";
import type { AuthSession } from "@/types/auth";
import type { AdminClientRecord } from "@/types/admin";

/** DEV mock clients until Supabase accounts exist */
const MOCK_CLIENTS: AdminClientRecord[] = [
  {
    id: "mock-client-002",
    email: "jordan@example.com",
    displayName: "Jordan M.",
    status: "active",
    savedSpecialistsCount: 4,
    source: "mock",
  },
  {
    id: "mock-client-003",
    email: "alex@example.com",
    displayName: "Alex R.",
    status: "inactive",
    savedSpecialistsCount: 0,
    source: "mock",
  },
];

function clientApplicationRecords(
  applications: readonly ClientApplication[]
): AdminClientRecord[] {
  return applications.map((app) => ({
    id: app.id,
    email: app.email,
    displayName: app.fullName,
    status: app.status === "ACTIVE" ? "active" : "inactive",
    savedSpecialistsCount: 0,
    source: "signup-draft" as const,
  }));
}

function devClientRecord(session: AuthSession | null): AdminClientRecord | null {
  if (!session || session.role !== "client") return null;
  const userId = getActiveClientUserId(session);
  const savedCount = userId
    ? loadSavedTrainerIdsForUser(userId).length
    : 0;
  return {
    id: userId ?? "dev-client",
    email: session.email,
    displayName: session.displayName ?? session.email.split("@")[0] ?? "Client",
    status: "active",
    savedSpecialistsCount: savedCount,
    source: "dev-account",
  };
}

export function listAdminClients(
  activeSession: AuthSession | null,
  clientApplications: readonly ClientApplication[] = listClientApplications()
): AdminClientRecord[] {
  const records: AdminClientRecord[] = [...MOCK_CLIENTS];

  const devClient = devClientRecord(activeSession);
  if (devClient) {
    const idx = records.findIndex(
      (r) => r.email.toLowerCase() === devClient.email.toLowerCase()
    );
    if (idx >= 0) records[idx] = devClient;
    else records.unshift(devClient);
  } else {
    records.unshift({
      id: "dev-client-account",
      email: DEV_CLIENT_CREDENTIALS.email,
      displayName: "Dev Client",
      status: "active",
      savedSpecialistsCount: loadSavedTrainerIdsForUser(
        getClientUserId({
          userId: "dev-client",
          role: "client",
          email: DEV_CLIENT_CREDENTIALS.email,
          signedInAt: "",
        })
      ).length,
      source: "dev-account",
    });
  }

  for (const appRecord of clientApplicationRecords(clientApplications)) {
    const idx = records.findIndex(
      (r) => r.email.toLowerCase() === appRecord.email.toLowerCase()
    );
    if (idx >= 0) records[idx] = appRecord;
    else records.push(appRecord);
  }

  const signupDraft = loadCreateAccountProfile();
  if (signupDraft?.accountType === "client" && signupDraft.email?.trim()) {
    const email = signupDraft.email.trim();
    if (!records.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      records.push({
        id: `signup-${email}`,
        email,
        displayName:
          [signupDraft.firstName, signupDraft.lastName]
            .map((s) => s?.trim())
            .filter(Boolean)
            .join(" ") ||
          email.split("@")[0] ||
          "Client",
        status: "active",
        savedSpecialistsCount: 0,
        source: "signup-draft",
      });
    }
  }

  return records;
}
