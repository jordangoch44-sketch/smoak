"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { AlertTriangleIcon } from "@/components/ui/icons";
import {
  SPECIALIST_TOUR_STEPS,
  type SpecialistTourStep,
} from "@/lib/specialist-first-tour";
import {
  PROFILE_WELCOME_REMAINING_PREVIEW,
  profileWelcomeRemainingLabel,
  splitProfileWelcomeTasks,
  type ProfileWelcomeTask,
} from "@/lib/specialist-profile-welcome";
import { cn } from "@/lib/utils";

interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

interface CardFrame {
  top: number;
  maxHeight: number;
}

interface Pointer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface SpecialistFirstTourProps {
  open: boolean;
  stepIndex: number;
  tasks: ProfileWelcomeTask[];
  trialNote?: string | null;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onBrowse: () => void;
  onFinish: (sectionId: string) => void;
}

function pointersClose(a: Pointer | null, b: Pointer | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.x1 - b.x1) < 1 &&
    Math.abs(a.y1 - b.y1) < 1 &&
    Math.abs(a.x2 - b.x2) < 1 &&
    Math.abs(a.y2 - b.y2) < 1
  );
}

function pointerBetween(
  nextHole: Hole,
  cardTop: number,
  cardWidth: number,
  cardHeight: number
): Pointer | null {
  const cardLeft = (window.innerWidth - cardWidth) / 2;
  const hx = nextHole.left + nextHole.width / 2;
  const clampX = (value: number) =>
    Math.min(cardLeft + cardWidth - 28, Math.max(cardLeft + 28, value));
  const holeBottom = nextHole.top + nextHole.height;
  const cardBottom = cardTop + cardHeight;
  const gap = 4;

  if (cardTop >= holeBottom - 4) {
    const y1 = cardTop - 1;
    const y2 = holeBottom + gap;
    if (y1 - y2 < 12) return null;
    return { x1: clampX(hx), y1, x2: hx, y2 };
  }
  if (cardBottom <= nextHole.top + 4) {
    const y1 = cardBottom + 1;
    const y2 = nextHole.top - gap;
    if (y2 - y1 < 12) return null;
    return { x1: clampX(hx), y1, x2: hx, y2 };
  }
  return null;
}

function arrowHead(pointer: Pointer): string {
  const angle = Math.atan2(pointer.y2 - pointer.y1, pointer.x2 - pointer.x1);
  const size = 11;
  const spread = 0.62;
  const tipX = pointer.x2;
  const tipY = pointer.y2;
  const baseX = tipX - Math.cos(angle) * size;
  const baseY = tipY - Math.sin(angle) * size;
  const leftX = tipX - Math.cos(angle - spread) * size * 1.45;
  const leftY = tipY - Math.sin(angle - spread) * size * 1.45;
  const rightX = tipX - Math.cos(angle + spread) * size * 1.45;
  const rightY = tipY - Math.sin(angle + spread) * size * 1.45;
  return `${tipX},${tipY} ${leftX},${leftY} ${baseX},${baseY} ${rightX},${rightY}`;
}

function arrowLineEnd(pointer: Pointer): { x: number; y: number } {
  const angle = Math.atan2(pointer.y2 - pointer.y1, pointer.x2 - pointer.x1);
  return {
    x: pointer.x2 - Math.cos(angle) * 8,
    y: pointer.y2 - Math.sin(angle) * 8,
  };
}

function framesClose(a: Hole | null, b: Hole | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

function unionOf(nodes: Element[]): DOMRect | null {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let any = false;
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    any = true;
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (!any) return null;
  return new DOMRect(left, top, right - left, bottom - top);
}

function isOnScreen(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return false;
  if (rect.bottom <= 4 || rect.top >= window.innerHeight - 4) return false;
  if (rect.right <= 4 || rect.left >= window.innerWidth - 4) return false;
  const style = getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) === 0) return false;
  return true;
}

function findTourNode(name: string): HTMLElement | null {
  for (const node of document.querySelectorAll(`[data-tour="${name}"]`)) {
    if (node instanceof HTMLElement && isOnScreen(node)) return node;
  }
  return null;
}

/** Toolbar steps spotlight the bottom-nav switch when that bar is on screen. */
function resolveTourTarget(step: SpecialistTourStep): HTMLElement | null {
  if (step.id === "clients") {
    return findTourNode("clients-tab") ?? findTourNode(step.target);
  }
  if (step.id === "overview") {
    return findTourNode("overview-tab") ?? findTourNode(step.target);
  }
  return findTourNode(step.target);
}

function scrollStepTarget(step: SpecialistTourStep) {
  const target = resolveTourTarget(step);
  const name = target?.getAttribute("data-tour");
  if (
    step.id === "live" ||
    step.id === "edit" ||
    step.id === "inquiries" ||
    name === "clients-tab" ||
    name === "overview-tab"
  ) {
    return;
  }
  if (step.id === "client-view") {
    const price = document.querySelector(
      '[data-tour="client-view"] .profile-hero__meta'
    );
    const scroller = document.querySelector(".specialist-live-page__body");
    if (price && scroller instanceof HTMLElement) {
      const priceRect = price.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      const desired = box.top + box.height * 0.62;
      scroller.scrollTop += priceRect.top - desired;
      return;
    }
  }
  if (target) {
    target.scrollIntoView({ block: "center", inline: "nearest" });
  }
}

function measureHole(step: SpecialistTourStep): Hole | null {
  const root = resolveTourTarget(step);
  if (!(root instanceof HTMLElement)) return null;
  const spotlightTab = root.getAttribute("data-tour")?.endsWith("-tab") ?? false;

  let rect = root.getBoundingClientRect();
  let radius = 14;

  if (step.id === "client-view") {
    const identity = root.querySelector(".profile-hero__identity");
    const meta = root.querySelector(".profile-hero__meta");
    const base =
      unionOf([identity, meta].filter((node): node is Element => Boolean(node))) ??
      rect;
    const maxHeight = Math.min(window.innerHeight * 0.58, 520);
    let top = Math.min(base.top - 88, base.bottom - maxHeight);
    const chrome = document.querySelector(".specialist-live-chrome");
    const minTop =
      chrome instanceof HTMLElement
        ? chrome.getBoundingClientRect().bottom + 8
        : 12;
    top = Math.max(minTop, top);
    if (top > base.top) top = Math.max(minTop, base.top - 8);
    const bottom = Math.max(base.bottom, top + 48);
    rect = new DOMRect(base.left, top, base.width, bottom - top);
    radius = 18;
  } else if (
    spotlightTab ||
    step.id === "live" ||
    step.id === "edit" ||
    step.id === "inquiries"
  ) {
    radius = 9999;
  }

  const pad = spotlightTab
    ? 4
    : step.id === "overview" || step.id === "clients" || step.id === "client-view"
      ? 8
      : 6;
  const edge = spotlightTab ? 2 : 8;
  const left = Math.max(edge, rect.left - pad);
  const right = Math.min(window.innerWidth - edge, rect.right + pad);
  const top = Math.max(edge, rect.top - pad);
  const bottom = Math.min(window.innerHeight - edge, rect.bottom + pad);
  const width = right - left;
  const height = bottom - top;
  if (width < 16 || height < 16) return null;
  return { top, left, width, height, radius };
}

function bottomReserve(): number {
  if (typeof window === "undefined") return 24;
  if (window.innerWidth >= 1024) return 24;
  return 108;
}

export function SpecialistFirstTour({
  open,
  stepIndex,
  tasks,
  trialNote = null,
  onBack,
  onNext,
  onSkip,
  onBrowse,
  onFinish,
}: SpecialistFirstTourProps) {
  const titleId = useId();
  const bodyId = useId();
  const arrowGradId = `tour-arrow-${useId().replace(/:/g, "")}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [hole, setHole] = useState<Hole | null>(null);
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const [card, setCard] = useState<CardFrame>({ top: 96, maxHeight: 420 });
  const step = SPECIALIST_TOUR_STEPS[stepIndex] ?? SPECIALIST_TOUR_STEPS[0];
  const last = stepIndex >= SPECIALIST_TOUR_STEPS.length - 1;
  const { nextStep, remaining } = splitProfileWelcomeTasks(tasks);
  const remainingPreview = remaining.slice(0, PROFILE_WELCOME_REMAINING_PREVIEW);
  const hiddenTaskCount =
    tasks.length - (nextStep ? 1 : 0) - remainingPreview.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    let scrolled = false;

    function place() {
      const nextHole = measureHole(step);
      setHole((current) => (framesClose(current, nextHole) ? current : nextHole));
      const cardHeight = cardRef.current?.offsetHeight ?? 240;
      const reserve = bottomReserve();
      const maxHeight = Math.max(180, window.innerHeight - reserve - 24);
      let top = Math.max(16, (window.innerHeight - Math.min(cardHeight, maxHeight)) / 2);
      if (nextHole) {
        const below = nextHole.top + nextHole.height + 36;
        const spaceBelow = window.innerHeight - reserve - below;
        const aboveTop = nextHole.top - 36 - cardHeight;
        if (spaceBelow >= Math.min(cardHeight, 168)) {
          top = below;
        } else if (aboveTop >= 16) {
          top = aboveTop;
        } else {
          top = Math.max(
            16,
            window.innerHeight - reserve - Math.min(cardHeight, maxHeight)
          );
        }
      }
      const nextCard = {
        top,
        maxHeight: Math.max(160, window.innerHeight - reserve - top),
      };
      setCard((current) =>
        Math.abs(current.top - nextCard.top) < 1 &&
        Math.abs(current.maxHeight - nextCard.maxHeight) < 1
          ? current
          : nextCard
      );
      const cardWidth =
        cardRef.current?.offsetWidth ?? Math.min(384, window.innerWidth - 24);
      const measuredHeight = cardRef.current?.offsetHeight ?? 0;
      const nextPointer =
        nextHole && measuredHeight > 0
          ? pointerBetween(nextHole, top, cardWidth, measuredHeight)
          : null;
      setPointer((current) =>
        pointersClose(current, nextPointer) ? current : nextPointer
      );
    }

    function kick() {
      const target = resolveTourTarget(step);
      if (!scrolled && target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        if (rect.width > 2 && rect.height > 2) {
          scrollStepTarget(step);
          scrolled = true;
        }
      }
      place();
    }

    kick();
    const retry = window.setInterval(kick, 300);
    const observer = new MutationObserver(() => {
      if (!document.querySelector(".specialist-tour__hole")) kick();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.clearInterval(retry);
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
        return;
      }
      if (event.key === "ArrowRight" && !last) {
        event.preventDefault();
        onNext();
      }
      if (event.key === "ArrowLeft" && stepIndex > 0) {
        event.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, last, onBack, onNext, onSkip, stepIndex]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const finishId = tasks[0]?.id ?? "hero";
  const lineEnd = pointer ? arrowLineEnd(pointer) : null;

  return createPortal(
    <div
      className={cn("specialist-tour", hole ? "specialist-tour--anchored" : undefined)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      <div className="specialist-tour__shade" />
      {hole ? (
        <div
          className="specialist-tour__hole"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            borderRadius: hole.radius,
          }}
        />
      ) : null}
      {pointer ? (
        <svg className="specialist-tour__pointer" aria-hidden>
          <defs>
            <linearGradient
              id={arrowGradId}
              gradientUnits="userSpaceOnUse"
              x1={pointer.x1}
              y1={pointer.y1}
              x2={pointer.x2}
              y2={pointer.y2}
            >
              <stop offset="0%" stopColor="#ff6b4a" />
              <stop offset="28%" stopColor="#f472b6" />
              <stop offset="52%" stopColor="#a855f7" />
              <stop offset="78%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
          </defs>
          <line
            x1={pointer.x1}
            y1={pointer.y1}
            x2={lineEnd?.x}
            y2={lineEnd?.y}
            stroke={`url(#${arrowGradId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <polygon points={arrowHead(pointer)} fill={`url(#${arrowGradId})`} />
        </svg>
      ) : null}
      <div
        ref={cardRef}
        className="specialist-tour__card"
        style={{ top: card.top, maxHeight: card.maxHeight }}
      >
        <div className="specialist-tour__bar">
          <p className="specialist-tour__count">
            {stepIndex + 1} of {SPECIALIST_TOUR_STEPS.length}
          </p>
          <FastActivateButton
            className="specialist-tour__skip"
            onActivate={onSkip}
          >
            Skip
          </FastActivateButton>
        </div>
        <div className="specialist-tour__dots" aria-hidden>
          {SPECIALIST_TOUR_STEPS.map((item, index) => (
            <span
              key={item.id}
              className={cn(
                "specialist-tour__dot",
                index === stepIndex && "specialist-tour__dot--current",
                index < stepIndex && "specialist-tour__dot--done"
              )}
            />
          ))}
        </div>
        <h2 id={titleId} className="specialist-tour__title">
          {step.title}
        </h2>
        <p id={bodyId} className="specialist-tour__body">
          {step.body}
        </p>
        {last && trialNote ? (
          <p className="specialist-tour__trial">{trialNote}</p>
        ) : null}
        {last && tasks.length > 0 ? (
          <div className="specialist-tour__tasks">
            <p className="specialist-tour__tasks-label">
              {profileWelcomeRemainingLabel(tasks.length)}
            </p>
            <ul className="specialist-tour__task-list">
              {nextStep ? (
                <li className="specialist-tour__task">
                  <AlertTriangleIcon className="specialist-tour__task-icon" />
                  {nextStep.label}
                </li>
              ) : null}
              {remainingPreview.map((task) => (
                <li key={task.id} className="specialist-tour__task">
                  <AlertTriangleIcon className="specialist-tour__task-icon" />
                  {task.label}
                </li>
              ))}
            </ul>
            {hiddenTaskCount > 0 ? (
              <p className="specialist-tour__more">
                + {hiddenTaskCount} more
              </p>
            ) : null}
          </div>
        ) : null}
        {last && tasks.length === 0 ? (
          <p className="specialist-tour__trial">Your profile looks complete.</p>
        ) : null}
        <div className="specialist-tour__actions">
          {stepIndex > 0 ? (
            <FastActivateButton
              className="specialist-tour__back"
              onActivate={onBack}
            >
              Back
            </FastActivateButton>
          ) : null}
          {last ? (
            tasks.length > 0 ? (
              <FastActivateButton
                ref={primaryRef}
                className="specialist-tour__next"
                onActivate={() => onFinish(finishId)}
              >
                Finish your profile
              </FastActivateButton>
            ) : (
              <FastActivateButton
                ref={primaryRef}
                className="specialist-tour__next"
                onActivate={onBrowse}
              >
                I’ll look around
              </FastActivateButton>
            )
          ) : (
            <FastActivateButton
              ref={primaryRef}
              className="specialist-tour__next"
              onActivate={onNext}
            >
              Next
            </FastActivateButton>
          )}
        </div>
        {last && tasks.length > 0 ? (
          <FastActivateButton
            className="specialist-tour__browse"
            onActivate={onBrowse}
          >
            I’ll look around
          </FastActivateButton>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
