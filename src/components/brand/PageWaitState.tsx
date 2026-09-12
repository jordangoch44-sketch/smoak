"use client";

import { useEffect, useState } from "react";

import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";

import { SmoacSavingMark } from "./SmoacSavingMark";

const DEFAULT_STALL_MS = 8_000;

interface PageWaitStateProps {
  label: string;
  className?: string;
  /** Tighter padding for panels and modals — still uses the full ring. */
  compact?: boolean;
  /** 0 disables Retry. Full-page waits default to 8s; compact defaults off. */
  stallMs?: number;
}

/**
 * Branded wait with motion. Use for any hydrate / fetch that would otherwise
 * sit on static copy. After a stall, offer reload so a hung request cannot
 * look frozen forever.
 */
export function PageWaitState({
  label,
  className,
  compact = false,
  stallMs,
}: PageWaitStateProps) {
  const timeout = stallMs ?? (compact ? 0 : DEFAULT_STALL_MS);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (timeout <= 0) return;
    const timeoutId = window.setTimeout(() => setStalled(true), timeout);
    return () => window.clearTimeout(timeoutId);
  }, [timeout]);

  return (
    <div
      className={cn(
        "page-wait-state",
        compact && "page-wait-state--compact",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <SmoacSavingMark label={label} />
      {stalled ? (
        <FastActivateButton
          className="smoac-control page-wait-state__retry"
          onActivate={() => window.location.reload()}
        >
          Retry
        </FastActivateButton>
      ) : null}
    </div>
  );
}
