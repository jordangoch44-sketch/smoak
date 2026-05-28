"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/hooks/useHydrated";
import {
  SAVE_TOAST_ADDED,
  SAVE_TOAST_REMOVED,
  type SaveToastOptions,
  type SaveToastVariant,
} from "@/lib/saved-ui";
import { cn } from "@/lib/utils";

export type { SaveToastOptions, SaveToastVariant };
export { SAVE_TOAST_ADDED, SAVE_TOAST_REMOVED } from "@/lib/saved-ui";

const DISMISS_MS = 2800;
const EXIT_MS = 360;

interface SaveToastContextValue {
  showToast: (options: SaveToastOptions) => void;
  showSavedToast: () => void;
  showRemovedToast: () => void;
}

const SaveToastContext = createContext<SaveToastContextValue | null>(null);

function SaveToastHeart({ variant }: { variant: SaveToastVariant }) {
  return (
    <span
      className={cn(
        "save-toast__heart",
        variant === "added" && "save-toast__heart--added",
        variant === "removed" && "save-toast__heart--removed",
        variant === "neutral" && "save-toast__heart--neutral"
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="save-toast__heart-svg">
        <path d="M11.997 20.908l-.844-.468C6.33 16.588 3 13.328 3 9.75 3 6.364 5.364 4 8.75 4c1.77 0 3.465.92 4.247 2.388l.003.006.003-.006C13.785 4.92 15.48 4 17.25 4 20.636 4 23 6.364 23 9.75c0 3.578-3.33 6.838-8.153 10.69l-.844.468-.006.003-.006-.003z" />
      </svg>
    </span>
  );
}

function SaveToastLayer({
  toast,
  exiting,
}: {
  toast: SaveToastOptions;
  exiting: boolean;
}) {
  const variant = toast.variant ?? "neutral";

  return (
    <div className="save-toast-host" role="presentation">
      <div
        className={cn(
          "save-toast",
          `save-toast--${variant}`,
          exiting && "save-toast--exit"
        )}
        role="status"
        aria-live="polite"
      >
        <SaveToastHeart variant={variant} />
        <div className="save-toast__content">
          <p className="save-toast__title">{toast.title}</p>
          {toast.linkHref && toast.linkLabel ? (
            <Link href={toast.linkHref} className="save-toast__link">
              {toast.linkLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SaveToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [toast, setToast] = useState<SaveToastOptions>(SAVE_TOAST_ADDED);
  const mounted = useHydrated();
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, EXIT_MS);
  }, []);

  const showToast = useCallback(
    (options: SaveToastOptions) => {
      clearTimers();
      setToast({ variant: "neutral", ...options });
      setExiting(false);
      setVisible(true);
      dismissTimerRef.current = setTimeout(dismiss, DISMISS_MS);
    },
    [clearTimers, dismiss]
  );

  const showSavedToast = useCallback(() => {
    showToast(SAVE_TOAST_ADDED);
  }, [showToast]);

  const showRemovedToast = useCallback(() => {
    showToast(SAVE_TOAST_REMOVED);
  }, [showToast]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <SaveToastContext.Provider
      value={{ showToast, showSavedToast, showRemovedToast }}
    >
      {children}
      {mounted && visible && typeof document !== "undefined"
        ? createPortal(
            <SaveToastLayer toast={toast} exiting={exiting} />,
            document.body
          )
        : null}
    </SaveToastContext.Provider>
  );
}

export function useSaveToast(): SaveToastContextValue {
  const ctx = useContext(SaveToastContext);
  if (!ctx) {
    throw new Error("useSaveToast must be used within SaveToastProvider");
  }
  return ctx;
}
