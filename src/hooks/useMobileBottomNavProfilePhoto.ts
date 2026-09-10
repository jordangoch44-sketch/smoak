"use client";

import { useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";
import { getUserRole } from "@/lib/specialist-saves";

function readSpecialistPhotoUrl(
  email?: string,
  userId?: string
): string | null {
  if (userId?.trim()) {
    const url = findSpecialistApplicationByUserId(userId.trim())
      ?.media.profilePhotoUrl?.trim();
    if (url) return url;
  }
  if (email?.trim()) {
    const url = findSpecialistApplicationByEmail(email.trim())
      ?.media.profilePhotoUrl?.trim();
    if (url) return url;
  }
  return null;
}

/**
 * Avatar URL for the Profile tab only. Does not hydrate applications or
 * subscribe to the public catalog — those re-renders made toolbar taps lag.
 */
export function useMobileBottomNavProfilePhoto(): string | null {
  const { session } = useAuthSession();
  const email = session?.email;
  const userId = session?.userId;
  const isSpecialist = getUserRole(session) === "specialist";

  return useSyncExternalStore(
    subscribeSpecialistApplications,
    () => (isSpecialist ? readSpecialistPhotoUrl(email, userId) : null),
    () => null
  );
}
