"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { useFastActivate } from "@/hooks/useFastActivate";

type FastActivateButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "onPointerUp"
> & {
  onActivate: () => void;
  /** Hearts on cards — keep the parent link from seeing the tap. */
  stopPropagation?: boolean;
  /** Finger travel that still counts as a tap. Defaults to TAP_SLOP_PX. */
  slopPx?: number;
};

/** Button that commits on touch pointerup; mouse still uses click. */
export const FastActivateButton = forwardRef<
  HTMLButtonElement,
  FastActivateButtonProps
>(function FastActivateButton(
  {
    onActivate,
    type = "button",
    disabled,
    stopPropagation = false,
    slopPx,
    onPointerDown,
    onPointerCancel,
    ...props
  },
  ref
) {
  const {
    onPointerDown: activatePointerDown,
    onPointerCancel: activatePointerCancel,
    onPointerUp,
    onClick,
  } = useFastActivate(
    () => {
      if (disabled) return;
      onActivate();
    },
    { stopPropagation, slopPx }
  );

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      {...props}
      onPointerDown={(event) => {
        activatePointerDown(event);
        onPointerDown?.(event);
      }}
      onPointerCancel={(event) => {
        activatePointerCancel();
        onPointerCancel?.(event);
      }}
      onPointerUp={onPointerUp}
      onClick={onClick}
    />
  );
});
