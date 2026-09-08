"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRef,
  type ComponentProps,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/utils";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import type { Trainer } from "@/types";

/** Finger jitter vs a real carousel / page swipe. */
const TAP_SLOP_PX = 16;
/** Longer than this is a long-press (context menu), not a tap. */
const TAP_MAX_MS = 420;

function isSaveControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element && Boolean(target.closest("[data-save-control]"))
  );
}

type ProfileSheetLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "scroll"
> & {
  trainer: Trainer;
  href?: string;
};

/**
 * Marketplace / listing link into the profile intercept sheet.
 * Warms on pointerdown, skips page scroll, and recovers taps that iOS
 * cancels after a 1–2px carousel pan.
 */
export function ProfileSheetLink({
  trainer,
  href,
  replace = false,
  prefetch,
  className,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onClick,
  children,
  ...props
}: ProfileSheetLinkProps) {
  const router = useRouter();
  const dest = href ?? `/trainers/${trainer.id}`;
  const pressRef = useRef<{
    x: number;
    y: number;
    t: number;
    pointerId: number;
  } | null>(null);
  const openedRef = useRef(false);
  const ignoreClickRef = useRef(false);
  const shouldPrefetch = prefetch !== false && !replace;

  function warm() {
    warmTrainerProfileNavigation(trainer, router, {
      prefetch: shouldPrefetch ? undefined : false,
    });
  }

  function openSheet() {
    if (openedRef.current) return;
    openedRef.current = true;
    warm();
    if (replace) {
      router.replace(dest, { scroll: false });
    } else {
      router.push(dest, { scroll: false });
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (isSaveControl(event.target)) return;
    openedRef.current = false;
    ignoreClickRef.current = false;
    pressRef.current = {
      x: event.clientX,
      y: event.clientY,
      t: performance.now(),
      pointerId: event.pointerId,
    };
    warm();
  }

  function handlePointerUp(event: PointerEvent<HTMLAnchorElement>) {
    onPointerUp?.(event);
    const press = pressRef.current;
    pressRef.current = null;
    if (!press || event.pointerId !== press.pointerId || event.button !== 0) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (isSaveControl(event.target)) return;
    if (performance.now() - press.t > TAP_MAX_MS) return;
    if (
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > TAP_SLOP_PX
    ) {
      ignoreClickRef.current = true;
      return;
    }
    event.preventDefault();
    openSheet();
  }

  function handlePointerCancel(event: PointerEvent<HTMLAnchorElement>) {
    onPointerCancel?.(event);
    pressRef.current = null;
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      warm();
      return;
    }
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      event.preventDefault();
      return;
    }
    event.preventDefault();
    openSheet();
  }

  return (
    <Link
      href={dest}
      replace={replace}
      prefetch={prefetch}
      scroll={false}
      draggable={false}
      className={cn("smoac-control", className)}
      {...props}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
