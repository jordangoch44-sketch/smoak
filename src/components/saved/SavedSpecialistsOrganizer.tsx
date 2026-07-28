"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import { useActiveUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { formatProviderLocation } from "@/lib/provider-location";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";
import "@/styles/saved-organizer.css";

interface SavedSpecialistsOrganizerProps {
  userId: string;
  trainers: Trainer[];
  impressionSurface?: "saved" | "client_dashboard";
}

interface ComparePair {
  dragged: Trainer;
  target: Trainer;
}

const HOLD_TO_DRAG_MS = 380;
const ORDER_STORAGE_PREFIX = "smoac_saved_specialist_order_v1";

function moveItem(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function formatPrice(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDistance(miles: number | null): string {
  if (miles == null) return "Not available";
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

export function SavedSpecialistsOrganizer({
  userId,
  trainers,
  impressionSurface = "saved",
}: SavedSpecialistsOrganizerProps) {
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    trainers.map((trainer) => trainer.id)
  );
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);
  const [comparePair, setComparePair] = useState<ComparePair | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dragStartedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const activeShellRef = useRef<HTMLElement | null>(null);
  const holdOriginRef = useRef<{ x: number; y: number } | null>(null);
  const coords = useActiveUserCoordinates();
  const storageKey = `${ORDER_STORAGE_PREFIX}:${userId}`;

  const trainersById = useMemo(
    () => new Map(trainers.map((trainer) => [trainer.id, trainer])),
    [trainers]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return;
      const safeParsed = parsed.filter((id) => trainersById.has(id));
      const missing = trainers
        .map((trainer) => trainer.id)
        .filter((id) => !safeParsed.includes(id));
      setOrderedIds([...safeParsed, ...missing]);
    } catch {
      /* ignore local storage parse failures */
    }
    // intentionally run once per user switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    setOrderedIds((current) => {
      const safeCurrent = current.filter((id) => trainersById.has(id));
      const missing = trainers
        .map((trainer) => trainer.id)
        .filter((id) => !safeCurrent.includes(id));
      return [...safeCurrent, ...missing];
    });
  }, [trainers, trainersById]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(orderedIds));
    } catch {
      /* ignore storage failures */
    }
  }, [orderedIds, storageKey]);

  const orderedTrainers = useMemo(
    () => orderedIds.map((id) => trainersById.get(id)).filter(Boolean) as Trainer[],
    [orderedIds, trainersById]
  );

  function clearHoldTimer() {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function resetDragState() {
    draggingIdRef.current = null;
    dragStartedRef.current = false;
    activeShellRef.current = null;
    setDraggingId(null);
    setHoverId(null);
    setCompareTargetId(null);
  }

  function beginDrag(
    trainerId: string,
    shell: HTMLElement,
    pointerId: number
  ) {
    dragStartedRef.current = true;
    draggingIdRef.current = trainerId;
    activeShellRef.current = shell;
    setEditMode(true);
    setDraggingId(trainerId);
    setHoverId(trainerId);
    setCompareTargetId(null);
    suppressClickRef.current = true;
    try {
      shell.setPointerCapture(pointerId);
    } catch {
      /* pointer capture may fail in some browsers */
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(12);
    }
  }

  function cardIdFromPoint(clientX: number, clientY: number): string | null {
    const element = document.elementFromPoint(clientX, clientY);
    const card = element?.closest("[data-saved-draggable-card]") as
      | HTMLElement
      | null;
    return card?.dataset.savedDraggableCardId ?? null;
  }

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
    trainerId: string
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-save-control]")) return;

    clearHoldTimer();
    dragStartedRef.current = false;
    draggingIdRef.current = null;
    activeShellRef.current = event.currentTarget;
    holdOriginRef.current = { x: event.clientX, y: event.clientY };

    if (editMode) {
      beginDrag(trainerId, event.currentTarget, event.pointerId);
      return;
    }

    holdTimerRef.current = window.setTimeout(() => {
      beginDrag(trainerId, event.currentTarget, event.pointerId);
    }, HOLD_TO_DRAG_MS);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStartedRef.current) {
      if (holdTimerRef.current && holdOriginRef.current) {
        const dx = event.clientX - holdOriginRef.current.x;
        const dy = event.clientY - holdOriginRef.current.y;
        if (dx * dx + dy * dy > 100) {
          clearHoldTimer();
        }
      }
      return;
    }

    if (!draggingIdRef.current) return;
    event.preventDefault();

    const targetId = cardIdFromPoint(event.clientX, event.clientY);
    if (!targetId || targetId === draggingIdRef.current) return;

    setHoverId(targetId);
    setCompareTargetId(targetId);
    setOrderedIds((current) =>
      moveItem(current, draggingIdRef.current!, targetId)
    );
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    clearHoldTimer();
    holdOriginRef.current = null;

    if (!dragStartedRef.current || !draggingIdRef.current) {
      resetDragState();
      return;
    }

    event.preventDefault();
    const dragging = draggingIdRef.current;
    const dropId = cardIdFromPoint(event.clientX, event.clientY);

    if (dropId && dropId !== dragging) {
      const dragged = trainersById.get(dragging);
      const target = trainersById.get(dropId);
      if (dragged && target) {
        setComparePair({ dragged, target });
      }
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    suppressClickRef.current = true;
    resetDragState();
  }

  function handleClickCapture(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-save-control]")) return;
    if (suppressClickRef.current || editMode || draggingId) {
      event.preventDefault();
      event.stopPropagation();
    }
    suppressClickRef.current = false;
  }

  const rows = comparePair
    ? [
        {
          label: "Price",
          left: formatPrice(comparePair.dragged.pricePerSession),
          right: formatPrice(comparePair.target.pricePerSession),
        },
        {
          label: "Location",
          left: formatProviderLocation(comparePair.dragged),
          right: formatProviderLocation(comparePair.target),
        },
        {
          label: "Distance from you",
          left: formatDistance(getTrainerDistanceMiles(comparePair.dragged, coords)),
          right: formatDistance(getTrainerDistanceMiles(comparePair.target, coords)),
        },
        {
          label: "Reviews",
          left: `${comparePair.dragged.reviewCount} (${comparePair.dragged.rating.toFixed(1)}★)`,
          right: `${comparePair.target.reviewCount} (${comparePair.target.rating.toFixed(1)}★)`,
        },
      ]
    : [];

  return (
    <>
      <div className="saved-organizer-instructions">
        <p className="saved-organizer-instructions__copy">
          Drag specialist card to edit or compare
        </p>
        {orderedTrainers.length > 1 ? (
          <button
            type="button"
            className="saved-organizer-instructions__toggle smoac-control"
            onClick={() => {
              setEditMode((value) => !value);
              resetDragState();
            }}
          >
            {editMode ? "Done arranging" : "Reorder mode"}
          </button>
        ) : null}
      </div>

      <div
        className={[
          "trainer-card-list saved-organizer-list",
          editMode ? "saved-organizer-list--edit-mode" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {orderedTrainers.map((trainer, index) => {
          const isDragging = draggingId === trainer.id;
          const isHover = hoverId === trainer.id && draggingId !== trainer.id;
          const isCompareTarget = compareTargetId === trainer.id;
          return (
            <div
              key={trainer.id}
              className={[
                "saved-organizer-card",
                editMode ? "saved-organizer-card--editable" : "",
                isDragging ? "saved-organizer-card--dragging" : "",
                isHover ? "saved-organizer-card--hover" : "",
                isCompareTarget ? "saved-organizer-card--compare-target" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-saved-draggable-card
              data-saved-draggable-card-id={trainer.id}
              onPointerDown={(event) => handlePointerDown(event, trainer.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onClickCapture={handleClickCapture}
            >
              {isCompareTarget ? (
                <div className="saved-organizer-card__compare-badge">
                  Release to compare
                </div>
              ) : null}
              <TrainerCard
                trainer={trainer}
                priority={index < 4}
                compactLayout="default"
                impressionSurface={impressionSurface}
                linkDisabled={editMode || isDragging}
              />
            </div>
          );
        })}
      </div>

      {comparePair ? (
        <div
          className="saved-compare-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-compare-title"
          onClick={() => setComparePair(null)}
        >
          <div
            className="saved-compare-modal__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="saved-compare-modal__close smoac-control"
              onClick={() => setComparePair(null)}
              aria-label="Close comparison"
            >
              ×
            </button>
            <p className="saved-compare-modal__eyebrow">Specialist compare</p>
            <h2 id="saved-compare-title" className="saved-compare-modal__title">
              Quick side-by-side
            </h2>
            <div className="saved-compare-modal__grid">
              <p className="saved-compare-modal__name">{comparePair.dragged.name}</p>
              <p className="saved-compare-modal__name">{comparePair.target.name}</p>
              {rows.map((row) => (
                <div key={row.label} className="saved-compare-modal__row">
                  <p className="saved-compare-modal__label">{row.label}</p>
                  <p className="saved-compare-modal__value">{row.left}</p>
                  <p className="saved-compare-modal__value">{row.right}</p>
                </div>
              ))}
            </div>
            <div className="saved-compare-modal__actions">
              <Link
                href={`/trainers/${comparePair.dragged.id}`}
                className="saved-compare-modal__primary"
              >
                View {comparePair.dragged.name.split(" ")[0]}
              </Link>
              <Link
                href={`/trainers/${comparePair.target.id}`}
                className="saved-compare-modal__secondary"
              >
                View {comparePair.target.name.split(" ")[0]}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
