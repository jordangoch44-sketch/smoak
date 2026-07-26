"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type RefCallback,
} from "react";

interface ProfileSheetToolbarHostValue {
  hostEl: HTMLElement | null;
  hostRef: RefCallback<HTMLElement | null>;
}

/** Mount node inside the animated profile sheet for floating chrome (X / actions). */
const ProfileSheetToolbarHostContext =
  createContext<ProfileSheetToolbarHostValue | null>(null);

export function ProfileSheetToolbarHostProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [hostEl, setHostEl] = useState<HTMLElement | null>(null);
  const hostRef = useCallback<RefCallback<HTMLElement | null>>((node) => {
    setHostEl(node);
  }, []);

  const value = useMemo(
    () => ({
      hostEl,
      hostRef,
    }),
    [hostEl, hostRef]
  );

  return (
    <ProfileSheetToolbarHostContext.Provider value={value}>
      {children}
    </ProfileSheetToolbarHostContext.Provider>
  );
}

export function useProfileSheetToolbarHost(): ProfileSheetToolbarHostValue | null {
  return useContext(ProfileSheetToolbarHostContext);
}
