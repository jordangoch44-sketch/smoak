import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { isModifiedNavActivation } from "@/lib/mobile-bottom-nav-transition";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import type { Trainer } from "@/types/trainer";

export const EXPLORE_MAP_PROFILE_LINK_SELECTOR =
  "a.explore-map-popup__link, a.explore-map-cluster-card__link";

const TAP_SLOP_PX = 12;

/**
 * Map popup HTML anchors are not React links. Open the profile sheet on
 * pointer-up (touch) so a busy main thread cannot drop the later click.
 */
export function bindExploreMapPopupProfileNav(
  root: HTMLElement,
  getTrainers: () => readonly Trainer[],
  router: Pick<AppRouterInstance, "push" | "prefetch">,
  onNavigate?: () => void
): () => void {
  let press: { x: number; y: number; href: string } | null = null;
  let openedByPointer = false;

  function resolve(link: HTMLAnchorElement): {
    trainer: Trainer | undefined;
    href: string;
  } | null {
    const trainerId =
      link.getAttribute("data-trainer-id")?.trim() ||
      link.pathname.split("/trainers/")[1]?.split(/[/?#]/)[0]?.trim() ||
      "";
    if (!trainerId) return null;
    const decodedId = decodeURIComponent(trainerId);
    const trainer = getTrainers().find((item) => item.id === decodedId);
    const href = trainer
      ? trainerProfilePath(trainer)
      : `/trainers/${encodeURIComponent(decodedId)}`;
    return { trainer, href };
  }

  function open(trainer: Trainer | undefined, href: string) {
    if (trainer) {
      warmTrainerProfileNavigation(trainer, router);
    }
    onNavigate?.();
    router.push(href, { scroll: false });
  }

  function onPointerDown(event: PointerEvent) {
    if (isModifiedNavActivation(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest(EXPLORE_MAP_PROFILE_LINK_SELECTOR);
    if (!(link instanceof HTMLAnchorElement)) return;
    const resolved = resolve(link);
    if (!resolved) return;
    openedByPointer = false;
    press = { x: event.clientX, y: event.clientY, href: resolved.href };
    if (resolved.trainer) {
      warmTrainerProfileNavigation(resolved.trainer, router);
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerType === "mouse") return;
    if (isModifiedNavActivation(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest(EXPLORE_MAP_PROFILE_LINK_SELECTOR);
    if (!(link instanceof HTMLAnchorElement)) return;
    const resolved = resolve(link);
    if (!resolved || !press || press.href !== resolved.href) {
      press = null;
      return;
    }
    const dragged =
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > TAP_SLOP_PX;
    press = null;
    if (dragged) return;
    event.preventDefault();
    event.stopPropagation();
    openedByPointer = true;
    open(resolved.trainer, resolved.href);
  }

  function onClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest(EXPLORE_MAP_PROFILE_LINK_SELECTOR);
    if (!(link instanceof HTMLAnchorElement)) return;
    const resolved = resolve(link);
    if (!resolved) return;

    if (openedByPointer) {
      event.preventDefault();
      event.stopPropagation();
      openedByPointer = false;
      return;
    }

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      if (resolved.trainer) {
        warmTrainerProfileNavigation(resolved.trainer, router);
      }
      return;
    }
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    open(resolved.trainer, resolved.href);
  }

  root.addEventListener("pointerdown", onPointerDown, true);
  root.addEventListener("pointerup", onPointerUp, true);
  root.addEventListener("click", onClick, true);
  return () => {
    root.removeEventListener("pointerdown", onPointerDown, true);
    root.removeEventListener("pointerup", onPointerUp, true);
    root.removeEventListener("click", onClick, true);
  };
}
