"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useRef,
  type ComponentProps,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { isModifiedNavActivation } from "@/lib/mobile-bottom-nav-transition";
import { cn } from "@/lib/utils";

type HeaderChromeLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  /** Extra work before navigation (close header panels). */
  onActivate?: () => void;
};

/**
 * Header logo / Sign up — touch navigates on pointerup; mouse keeps click.
 * Same-path taps only run onActivate (no wasted route load).
 */
export function HeaderChromeLink({
  href,
  onActivate,
  className,
  onPointerDown,
  onPointerUp,
  onClick,
  children,
  ...props
}: HeaderChromeLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const openedByPointerRef = useRef(false);

  function destinationPath(): string {
    return href.split("?")[0] || href;
  }

  function isSameDestination(): boolean {
    return pathname === destinationPath();
  }

  function navigate(
    event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>
  ): boolean {
    if (isModifiedNavActivation(event)) return false;
    event.preventDefault();
    if (isSameDestination()) {
      onActivate?.();
      return true;
    }
    try {
      router.push(href);
    } catch {
      /* navigation is best-effort */
    }
    /* Defer overlay close so unmounting this link cannot cancel the push. */
    queueMicrotask(() => onActivate?.());
    return true;
  }

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    try {
      router.prefetch(href);
    } catch {
      /* best-effort */
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLAnchorElement>) {
    onPointerUp?.(event);
    if (event.pointerType === "mouse") return;
    if (navigate(event)) {
      openedByPointerRef.current = true;
    }
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (openedByPointerRef.current) {
      event.preventDefault();
      openedByPointerRef.current = false;
      return;
    }
    navigate(event);
  }

  return (
    <Link
      href={href}
      className={cn("smoac-control", className)}
      {...props}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
