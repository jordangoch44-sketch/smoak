"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}

const variants = {
  primary: "bg-white text-black hover:opacity-90",
  secondary: "bg-graphite-700 text-white hover:bg-graphite-600",
  outline:
    "border border-white/20 text-white hover:border-white/40 hover:bg-white/5",
};

export function Button({
  children,
  href,
  variant = "primary",
  className,
  onClick,
  type = "button",
}: ButtonProps) {
  const classes = cn(
    "smoac-control smoac-tap inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3 text-sm font-medium tracking-wide transition-all active:scale-[0.98]",
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
