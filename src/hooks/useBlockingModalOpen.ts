"use client";

import { useEffect } from "react";
import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";

/** Locks page scroll and toggles global modal-open chrome while a blocking modal is visible. */
export function useBlockingModalOpen(open: boolean): void {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const { body } = document;
    const html = document.documentElement;

    body.classList.add(MODAL_OPEN_BODY_CLASS);
    html.classList.add(MODAL_OPEN_BODY_CLASS);
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";

    return () => {
      body.classList.remove(MODAL_OPEN_BODY_CLASS);
      html.classList.remove(MODAL_OPEN_BODY_CLASS);
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);
}
