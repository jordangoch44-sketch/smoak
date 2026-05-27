"use client";

import { createPortal } from "react-dom";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import {
  getToastServerSnapshot,
  getToastSnapshot,
  showToast as showToastGlobal,
  subscribeToast,
  type ShowToastOptions,
  type ToastType,
} from "@/lib/toast-store";

export type { ShowToastOptions, ToastType };

const TOAST_ROOT_ID = "smoac-toast-root";

function getToastPortalRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let root = document.getElementById(TOAST_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = TOAST_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

function ToastCheckIcon() {
  return (
    <svg
      className="smoac-toast__icon-svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ToastLogoutIcon() {
  return (
    <svg
      className="smoac-toast__icon-svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  return (
    <span className="smoac-toast__icon" aria-hidden>
      {type === "success" ? <ToastCheckIcon /> : <ToastLogoutIcon />}
    </span>
  );
}

/** Global toast host — portaled to #smoac-toast-root on document.body */
export function ToastContainer() {
  const { visible, exiting, toast } = useSyncExternalStore(
    subscribeToast,
    getToastSnapshot,
    getToastServerSnapshot
  );

  if (!visible || !toast || typeof document === "undefined") {
    return null;
  }

  const portalRoot = getToastPortalRoot();
  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div className="smoac-toast-container" role="region" aria-label="Notifications">
      <div
        className={cn(
          "smoac-toast-card",
          `smoac-toast-card--${toast.type}`,
          exiting && "smoac-toast-card--exit"
        )}
        role="status"
        aria-live="polite"
      >
        <ToastIcon type={toast.type} />
        <p className="smoac-toast__message">{toast.message}</p>
      </div>
    </div>,
    portalRoot
  );
}

declare global {
  interface Window {
    smoacShowToast?: typeof showToastGlobal;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    window.smoacShowToast = showToastGlobal;
    return () => {
      delete window.smoacShowToast;
    };
  }, []);

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}

export function useToast() {
  return { showToast: showToastGlobal };
}
