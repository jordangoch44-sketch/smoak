"use client";

import type { ComponentPropsWithoutRef, MouseEventHandler, ReactNode } from "react";
import { HeaderChromeLink } from "@/components/layout/HeaderChromeLink";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";

const VARIANT_CLASS = {
  primary: "dashboard-primary-btn",
  secondary: "dashboard-secondary-btn",
  ghost: "dashboard-signout",
  link: "dashboard-inline-cta",
} as const;

type DashboardButtonVariant = keyof typeof VARIANT_CLASS;

interface DashboardButtonBaseProps {
  variant?: DashboardButtonVariant;
  inline?: boolean;
  className?: string;
  children: ReactNode;
}

type DashboardButtonAsButton = DashboardButtonBaseProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof DashboardButtonBaseProps> & {
    href?: undefined;
  };

type DashboardButtonAsLink = DashboardButtonBaseProps &
  Omit<ComponentPropsWithoutRef<typeof HeaderChromeLink>, keyof DashboardButtonBaseProps> & {
    href: string;
  };

export type DashboardButtonProps = DashboardButtonAsButton | DashboardButtonAsLink;

function fireButtonClick(onClick: MouseEventHandler<HTMLButtonElement> | undefined) {
  if (!onClick) return;
  onClick({
    preventDefault() {},
    stopPropagation() {},
  } as Parameters<MouseEventHandler<HTMLButtonElement>>[0]);
}

export function DashboardButton({
  variant = "primary",
  inline = false,
  className,
  children,
  ...props
}: DashboardButtonProps) {
  const classes = cn(
    VARIANT_CLASS[variant],
    inline && "dashboard-primary-btn--inline",
    className
  );

  if ("href" in props && props.href) {
    const { href, onClick, onActivate, ...linkProps } = props;
    return (
      <HeaderChromeLink
        href={href}
        className={classes}
        onActivate={() => {
          onActivate?.();
          onClick?.({
            preventDefault() {},
            stopPropagation() {},
          } as never);
        }}
        {...linkProps}
      >
        {children}
      </HeaderChromeLink>
    );
  }

  const {
    type = "button",
    onClick,
    disabled,
    ...buttonProps
  } = props as DashboardButtonAsButton;

  if (type === "submit") {
    return (
      <button
        type="submit"
        className={classes}
        disabled={disabled}
        onClick={onClick}
        {...buttonProps}
      >
        {children}
      </button>
    );
  }

  return (
    <FastActivateButton
      type={type}
      className={classes}
      disabled={disabled}
      onActivate={() => fireButtonClick(onClick)}
      {...buttonProps}
    >
      {children}
    </FastActivateButton>
  );
}
