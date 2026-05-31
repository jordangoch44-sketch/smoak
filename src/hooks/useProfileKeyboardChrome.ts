"use client";

import { useEffect } from "react";

const KEYBOARD_OPEN_CLASS = "profile-edit-keyboard-open";

function isEditableField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}

/** Hide bottom nav and add scroll room while profile fields are focused on mobile. */
export function useProfileKeyboardChrome(): void {
  useEffect(() => {
    function handleFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!isEditableField(target)) return;

      document.body.classList.add(KEYBOARD_OPEN_CLASS);
      window.setTimeout(() => {
        target.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }, 280);
    }

    function handleFocusOut() {
      window.requestAnimationFrame(() => {
        if (isEditableField(document.activeElement)) return;
        document.body.classList.remove(KEYBOARD_OPEN_CLASS);
      });
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      document.body.classList.remove(KEYBOARD_OPEN_CLASS);
    };
  }, []);
}
