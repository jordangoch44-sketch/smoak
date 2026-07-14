"use client";

import { createContext, useContext } from "react";

/** When set, profile close controls should call this (animated sheet dismiss). */
const ProfileSheetDismissContext = createContext<(() => void) | null>(null);

export function ProfileSheetDismissProvider({
  dismiss,
  children,
}: {
  dismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <ProfileSheetDismissContext.Provider value={dismiss}>
      {children}
    </ProfileSheetDismissContext.Provider>
  );
}

export function useProfileSheetDismiss(): (() => void) | null {
  return useContext(ProfileSheetDismissContext);
}
