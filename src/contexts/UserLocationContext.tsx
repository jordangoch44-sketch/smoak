"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { LocationSelectorDropdown } from "@/components/location/LocationSelectorDropdown";

interface UserLocationContextValue {
  isPanelOpen: boolean;
  panelAnchorRef: RefObject<HTMLButtonElement | null>;
  toggleLocationPanel: (anchor?: HTMLButtonElement | null) => void;
  openLocationPanel: (anchor?: HTMLButtonElement | null) => void;
  closeLocationPanel: () => void;
  /** @deprecated Use openLocationPanel */
  openLocationEditor: () => void;
  /** @deprecated Use isPanelOpen */
  isEditorOpen: boolean;
}

const UserLocationContext = createContext<UserLocationContextValue | null>(
  null
);

const PRIMARY_PILL_SELECTOR = "[data-location-pill-primary]";

function resolveAnchor(
  explicit: HTMLButtonElement | null | undefined,
  fallbackRef: HTMLButtonElement | null
): HTMLButtonElement | null {
  if (explicit) return explicit;
  if (fallbackRef) return fallbackRef;
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLButtonElement>(PRIMARY_PILL_SELECTOR);
}

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const panelAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const closeLocationPanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  useEffect(() => {
    setIsPanelOpen(false);
  }, [pathname]);

  const openLocationPanel = useCallback(
    (anchor?: HTMLButtonElement | null) => {
      const resolved = resolveAnchor(anchor, panelAnchorRef.current);
      if (resolved) panelAnchorRef.current = resolved;
      setIsPanelOpen(true);
    },
    []
  );

  const toggleLocationPanel = useCallback(
    (anchor?: HTMLButtonElement | null) => {
      if (isPanelOpen) {
        closeLocationPanel();
        return;
      }
      openLocationPanel(anchor);
    },
    [isPanelOpen, closeLocationPanel, openLocationPanel]
  );

  const value = useMemo(
    (): UserLocationContextValue => ({
      isPanelOpen,
      panelAnchorRef,
      toggleLocationPanel,
      openLocationPanel,
      closeLocationPanel,
      openLocationEditor: () => openLocationPanel(),
      isEditorOpen: isPanelOpen,
    }),
    [
      isPanelOpen,
      toggleLocationPanel,
      openLocationPanel,
      closeLocationPanel,
    ]
  );

  return (
    <UserLocationContext.Provider value={value}>
      {children}
      <LocationSelectorDropdown
        open={isPanelOpen}
        anchorRef={panelAnchorRef}
        onClose={closeLocationPanel}
      />
    </UserLocationContext.Provider>
  );
}

export function useUserLocationEditor(): UserLocationContextValue {
  const ctx = useContext(UserLocationContext);
  if (!ctx) {
    throw new Error(
      "useUserLocationEditor must be used within UserLocationProvider"
    );
  }
  return ctx;
}
