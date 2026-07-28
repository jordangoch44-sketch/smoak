/** Client wrapper for permanent specialist marketplace purge. */

export interface AdminSpecialistPurgeResult {
  ok: boolean;
  message?: string;
  specialistId?: string;
  authDeleted?: boolean;
  cleanupErrors?: string[];
}

export async function purgeAdminSpecialist(
  specialistId: string,
  options?: { deleteAuthUser?: boolean }
): Promise<AdminSpecialistPurgeResult> {
  try {
    const response = await fetch("/api/admin/specialists", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        specialistId,
        deleteAuthUser: options?.deleteAuthUser !== false,
      }),
    });
    try {
      return (await response.json()) as AdminSpecialistPurgeResult;
    } catch {
      return { ok: false, message: "Could not parse delete response." };
    }
  } catch {
    return { ok: false, message: "Network error deleting specialist." };
  }
}
