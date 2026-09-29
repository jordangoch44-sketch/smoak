"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "@/components/ui/icons";

const BODY_CLASS = "seo-browse-open";

interface SeoBrowseDialogProps {
  triggerLabel: string;
  title: string;
  /** Links stay in the server HTML (closed `<dialog>`), so crawlers still follow them. */
  children: ReactNode;
}

export function SeoBrowseDialog({ triggerLabel, title, children }: SeoBrowseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const setLocked = useCallback((locked: boolean) => {
    document.body.classList.toggle(BODY_CLASS, locked);
    document.documentElement.classList.toggle(BODY_CLASS, locked);
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setLocked(true);
  }, [setLocked]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setLocked(false);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
      setLocked(false);
    };
  }, [setLocked]);

  return (
    <>
      <button type="button" className="seo-browse__trigger" onClick={open}>
        <span>{triggerLabel}</span>
        <span className="seo-browse__trigger-chevron" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        className="seo-browse__dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target === event.currentTarget || target.closest("a")) close();
        }}
      >
        <div className="seo-browse__panel">
          <div className="seo-browse__header">
            <h2 id={titleId} className="seo-browse__title">
              {title}
            </h2>
            <button
              type="button"
              className="seo-browse__close"
              aria-label="Close"
              onClick={close}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="seo-browse__body">{children}</div>
        </div>
      </dialog>
    </>
  );
}
