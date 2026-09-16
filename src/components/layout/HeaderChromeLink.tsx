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
 * Header logo / nav / Sign up — touch navigates on pointerup; mouse uses
 * native Link so toolbar clicks reuse the prefetch cache instead of a
 * fresh router.push.
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
    if (isModifiedNavActivation(event)) return;
    event.preventDefault();
    if (isSameDestination()) {
      onActivate?.();
      openedByPointerRef.current = true;
      return;
    }
    try {
      router.push(href);
    } catch {
      /* navigation is best-effort */
    }
    queueMicrotask(() => onActivate?.());
    openedByPointerRef.current = true;
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (openedByPointerRef.current) {
      event.preventDefault();
      openedByPointerRef.current = false;
      return;
    }
    if (isModifiedNavActivation(event)) return;
    if (isSameDestination()) {
      event.preventDefault();
      onActivate?.();
      return;
    }
    queueMicrotask(() => onActivate?.());
  }

  return (
    <Link
      href={href}
      prefetch
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
