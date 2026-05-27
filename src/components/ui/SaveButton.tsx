"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

const HEART_OUTLINE_PATH =
  "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z";

const HEART_FILLED_PATH =
  "M11.997 20.908l-.844-.468C6.33 16.588 3 13.328 3 9.75 3 6.364 5.364 4 8.75 4c1.77 0 3.465.92 4.247 2.388l.003.006.003-.006C13.785 4.92 15.48 4 17.25 4 20.636 4 23 6.364 23 9.75c0 3.578-3.33 6.838-8.153 10.69l-.844.468-.006.003-.006-.003z";

export interface SaveButtonProps {
  saved: boolean;
  onToggle: () => void;
  className?: string;
  overlay?: boolean;
  ariaLabel?: string;
}

export function SaveButton({
  saved,
  onToggle,
  className,
  overlay = false,
  ariaLabel,
}: SaveButtonProps) {
  const [burst, setBurst] = useState(false);
  const prevSavedRef = useRef(saved);

  useEffect(() => {
    if (saved && !prevSavedRef.current) {
      setBurst(true);
      const timer = window.setTimeout(() => setBurst(false), 720);
      prevSavedRef.current = saved;
      return () => window.clearTimeout(timer);
    }
    prevSavedRef.current = saved;
  }, [saved]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onToggle();
  }

  return (
    <button
      type="button"
      data-save-control
      className={cn(
        "smoac-control smoac-tap save-button inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
        saved ? "save-button--saved" : "save-button--unsaved",
        burst && "save-button--burst",
        overlay && "save-button--overlay",
        className
      )}
      data-saved={saved ? "true" : "false"}
      aria-label={
        ariaLabel ?? (saved ? "Remove from saved specialists" : "Save specialist")
      }
      aria-pressed={saved}
      onClick={handleClick}
    >
      <span className="save-button__icons" aria-hidden>
        <svg
          className="save-button__icon save-button__icon--outline"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={HEART_OUTLINE_PATH}
          />
        </svg>
        <svg
          className="save-button__icon save-button__icon--filled"
          viewBox="0 0 24 24"
        >
          <path d={HEART_FILLED_PATH} />
        </svg>
      </span>
    </button>
  );
}
