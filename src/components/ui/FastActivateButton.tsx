"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { useFastActivate } from "@/hooks/useFastActivate";

type FastActivateButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "onPointerUp"
> & {
  onActivate: () => void;
};

/** Button that commits on touch pointerup; mouse still uses click. */
export const FastActivateButton = forwardRef<
  HTMLButtonElement,
  FastActivateButtonProps
>(function FastActivateButton(
  { onActivate, type = "button", disabled, ...props },
  ref
) {
  const { onPointerUp, onClick } = useFastActivate(() => {
    if (disabled) return;
    onActivate();
  });

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      {...props}
      onPointerUp={onPointerUp}
      onClick={onClick}
    />
  );
});
