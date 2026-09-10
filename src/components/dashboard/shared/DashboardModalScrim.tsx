"use client";

import type { ReactNode, SyntheticEvent } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { cn } from "@/lib/utils";

/** Keep dialog taps from arming the scrim’s dismiss. */
export function stopDashboardDialogPointer(event: SyntheticEvent) {
  event.stopPropagation();
}

export const DASHBOARD_MODAL_DIALOG_POINTER_PROPS = {
  onPointerDown: stopDashboardDialogPointer,
  onPointerUp: stopDashboardDialogPointer,
  onClick: stopDashboardDialogPointer,
};

export function DashboardModalScrim({
  className,
  onDismiss,
  children,
}: {
  className?: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const dismiss = useOwnPointerDismiss(onDismiss);

  return (
    <div
      className={cn("dashboard-modal", className)}
      role="presentation"
      onPointerDown={dismiss.onPointerDown}
      onPointerUp={dismiss.onPointerUp}
      onClick={dismiss.onClick}
    >
      {children}
    </div>
  );
}

export function DashboardModalCloseButton({
  onClose,
  disabled,
  className,
}: {
  onClose: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <FastActivateButton
      className={cn("dashboard-modal__close", className)}
      aria-label="Close"
      disabled={disabled}
      onActivate={onClose}
    >
      <CloseIcon className="h-4 w-4" />
    </FastActivateButton>
  );
}
