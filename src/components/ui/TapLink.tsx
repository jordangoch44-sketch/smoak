"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Plain Next.js link — direct onClick, no press-feedback or pointer-events tricks */
export function TapLink({ className, onClick, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={cn("smoac-control", className)} onClick={onClick}>
      {children}
    </Link>
  );
}
