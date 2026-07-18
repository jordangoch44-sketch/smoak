"use client";

import { createContext, useContext, type RefObject } from "react";

/** Mount node inside the animated profile sheet for floating chrome (X / actions). */
const ProfileSheetToolbarHostContext =
  createContext<RefObject<HTMLElement | null> | null>(null);

export function ProfileSheetToolbarHostProvider({
  hostRef,
  children,
}: {
  hostRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <ProfileSheetToolbarHostContext.Provider value={hostRef}>
      {children}
    </ProfileSheetToolbarHostContext.Provider>
  );
}

export function useProfileSheetToolbarHost(): RefObject<HTMLElement | null> | null {
  return useContext(ProfileSheetToolbarHostContext);
}
