"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRef,
  type ComponentProps,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { isModifiedNavActivation } from "@/lib/mobile-bottom-nav-transition";
import { cn } from "@/lib/utils";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import type { Trainer } from "@/types";

/** Carousel / page pan vs a tap with finger jitter. */
const SWIPE_PX = 22;

function isSaveControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element && Boolean(target.closest("[data-save-control]"))
  );
}

function isSwipe(dx: number, dy: number): boolean {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < SWIPE_PX && ay < SWIPE_PX) return false;
  return ax >= SWIPE_PX || ay >= SWIPE_PX;
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
 * Touch opens on pointerup (before click) so a busy main thread cannot
 * drop the tap. Mouse keeps click so drag-off still cancels.
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
  const dest = href ?? trainerProfilePath(trainer);
  const pressRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
  } | null>(null);
  const swipeRef = useRef(false);
  const openedByPointerRef = useRef(false);
  const shouldPrefetch = prefetch !== false && !replace;

  function warm() {
    warmTrainerProfileNavigation(trainer, router, {
      prefetch: shouldPrefetch ? undefined : false,
    });
  }

  function openSheet() {
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
    swipeRef.current = false;
    openedByPointerRef.current = false;
    pressRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
    warm();
  }

  function handlePointerUp(event: PointerEvent<HTMLAnchorElement>) {
    onPointerUp?.(event);
    const press = pressRef.current;
    pressRef.current = null;
    if (!press || event.pointerId !== press.pointerId) return;
    if (isModifiedNavActivation(event)) return;
    if (isSaveControl(event.target)) return;
    const swiped = isSwipe(event.clientX - press.x, event.clientY - press.y);
    swipeRef.current = swiped;
    if (swiped) return;
    /* Mouse keeps click-to-go so drag-off still cancels. */
    if (event.pointerType === "mouse") return;
    openedByPointerRef.current = true;
    openSheet();
  }

  function handlePointerCancel(event: PointerEvent<HTMLAnchorElement>) {
    onPointerCancel?.(event);
    pressRef.current = null;
    openedByPointerRef.current = false;
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (openedByPointerRef.current) {
      event.preventDefault();
      openedByPointerRef.current = false;
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      warm();
      return;
    }
    if (swipeRef.current) {
      swipeRef.current = false;
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
