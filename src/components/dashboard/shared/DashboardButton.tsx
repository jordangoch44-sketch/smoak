import type { ReactNode } from "react";
import Link from "next/link";
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
  Omit<React.ComponentPropsWithoutRef<"button">, keyof DashboardButtonBaseProps> & {
    href?: undefined;
  };

type DashboardButtonAsLink = DashboardButtonBaseProps &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, keyof DashboardButtonBaseProps> & {
    href: string;
  };

export type DashboardButtonProps = DashboardButtonAsButton | DashboardButtonAsLink;

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
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = props as DashboardButtonAsButton;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
