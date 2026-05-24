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
import { cn } from "@/lib/utils";

const DISMISS_MS = 2600;
const EXIT_MS = 320;

export interface SaveToastOptions {
  title: string;
  linkHref?: string;
  linkLabel?: string;
}

interface SaveToastContextValue {
  showToast: (options: SaveToastOptions) => void;
  showSavedToast: () => void;
}

const SaveToastContext = createContext<SaveToastContextValue | null>(null);

const DEFAULT_SAVED_TOAST: SaveToastOptions = {
  title: "Added to your saved specialists.",
  linkHref: "/saved",
  linkLabel: "View saved specialists →",
};

export function SaveToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [toast, setToast] = useState<SaveToastOptions>(DEFAULT_SAVED_TOAST);
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
      setToast(options);
      setExiting(false);
      setVisible(true);
      dismissTimerRef.current = setTimeout(dismiss, DISMISS_MS);
    },
    [clearTimers, dismiss]
  );

  const showSavedToast = useCallback(() => {
    showToast(DEFAULT_SAVED_TOAST);
  }, [showToast]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <SaveToastContext.Provider value={{ showToast, showSavedToast }}>
      {children}
      {visible && (
        <div
          className={cn("save-toast", exiting && "save-toast--exit")}
          role="status"
          aria-live="polite"
        >
          <p className="save-toast__title">{toast.title}</p>
          {toast.linkHref && toast.linkLabel ? (
            <Link href={toast.linkHref} className="save-toast__link">
              {toast.linkLabel}
            </Link>
          ) : null}
        </div>
      )}
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
