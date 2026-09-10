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
    onPointerDown,
    ...props
  },
  ref
) {
  const { onPointerUp, onClick } = useFastActivate(
    () => {
      if (disabled) return;
      onActivate();
    },
    { stopPropagation }
  );

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      {...props}
      onPointerDown={(event) => {
        if (stopPropagation) event.stopPropagation();
        onPointerDown?.(event);
      }}
      onPointerUp={onPointerUp}
      onClick={onClick}
    />
  );
});
