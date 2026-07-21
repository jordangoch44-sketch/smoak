/** Client wrapper for the admin users API (real accounts, service-role backed). */
import type {
  AdminManagedUsersResult,
  AdminUserMutationResult,
} from "@/types/admin-managed-user";

async function parseJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return { ok: false, message: fallbackMessage } as T;
  }
}

export async function fetchAdminManagedUsers(): Promise<AdminManagedUsersResult> {
  try {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    return await parseJson<AdminManagedUsersResult>(
      response,
      "Could not load users."
    );
  } catch {
    return { ok: false, message: "Network error loading users." };
  }
}

async function mutateUser(
  method: "PATCH" | "DELETE",
  body: Record<string, unknown>
): Promise<AdminUserMutationResult> {
  try {
    const response = await fetch("/api/admin/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await parseJson<AdminUserMutationResult>(
      response,
      "Request failed."
    );
  } catch {
    return { ok: false, message: "Network error." };
  }
}

export function updateAdminManagedUserName(
  userId: string,
  firstName: string,
  lastName: string
): Promise<AdminUserMutationResult> {
  return mutateUser("PATCH", { userId, action: "update", firstName, lastName });
}

export function setAdminManagedUserActive(
  userId: string,
  active: boolean
): Promise<AdminUserMutationResult> {
  return mutateUser("PATCH", {
    userId,
    action: active ? "reactivate" : "deactivate",
  });
}

export function deleteAdminManagedUser(
  userId: string
): Promise<AdminUserMutationResult> {
  return mutateUser("DELETE", { userId });
}
