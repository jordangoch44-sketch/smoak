"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";

export function OutreachDialog({
  title,
  subtitle,
  wide,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useBlockingModalOpen(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="admin-outreach-dialog" role="presentation">
      <button
        type="button"
        className="admin-outreach-dialog__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outreach-dialog-title"
        className={
          wide
            ? "admin-outreach-dialog__panel admin-outreach-dialog__panel--wide"
            : "admin-outreach-dialog__panel"
        }
      >
        <header className="admin-outreach-dialog__header">
          <div>
            <h2 id="outreach-dialog-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--compact" onClick={onClose}>
            Close
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body
  );
}
