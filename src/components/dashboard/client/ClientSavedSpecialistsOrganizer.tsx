"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import { useActiveUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { formatProviderLocation } from "@/lib/provider-location";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";

interface ClientSavedSpecialistsOrganizerProps {
  userId: string;
  trainers: Trainer[];
}

interface ComparePair {
  dragged: Trainer;
  target: Trainer;
}

const HOLD_TO_DRAG_MS = 340;
const HOLD_TO_COMPARE_MS = 540;
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

export function ClientSavedSpecialistsOrganizer({
  userId,
  trainers,
}: ClientSavedSpecialistsOrganizerProps) {
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    trainers.map((trainer) => trainer.id)
  );
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);
  const [comparePair, setComparePair] = useState<ComparePair | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const compareTimerRef = useRef<number | null>(null);
  const dragStartedRef = useRef(false);
  const suppressClickRef = useRef(false);
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

  function clearTimers() {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (compareTimerRef.current != null) {
      window.clearTimeout(compareTimerRef.current);
      compareTimerRef.current = null;
    }
  }

  function beginDrag(id: string) {
    setEditMode(true);
    setDraggingId(id);
    setHoverId(id);
    setCompareTargetId(null);
    dragStartedRef.current = true;
    suppressClickRef.current = true;
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    trainerId: string
  ) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-save-control]")) return;
    dragStartedRef.current = false;
    holdTimerRef.current = window.setTimeout(() => {
      beginDrag(trainerId);
    }, HOLD_TO_DRAG_MS);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartedRef.current || !draggingId) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const card = element?.closest("[data-saved-draggable-card]") as
      | HTMLElement
      | null;
    const targetId = card?.dataset.savedDraggableCardId ?? null;
    if (!targetId || targetId === hoverId) return;
    setHoverId(targetId);
    setCompareTargetId(null);
    if (compareTimerRef.current != null) {
      window.clearTimeout(compareTimerRef.current);
      compareTimerRef.current = null;
    }
    if (targetId !== draggingId) {
      compareTimerRef.current = window.setTimeout(() => {
        setCompareTargetId(targetId);
      }, HOLD_TO_COMPARE_MS);
    }
  }

  function handlePointerEnd() {
    clearTimers();
    if (!draggingId || !dragStartedRef.current) return;
    if (hoverId && hoverId !== draggingId) {
      if (compareTargetId === hoverId) {
        const dragged = trainersById.get(draggingId);
        const target = trainersById.get(hoverId);
        if (dragged && target) {
          setComparePair({ dragged, target });
        }
      } else {
        setOrderedIds((current) => moveItem(current, draggingId, hoverId));
      }
    }
    setDraggingId(null);
    setHoverId(null);
    setCompareTargetId(null);
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const inSaveControl = Boolean(target.closest("[data-save-control]"));
    if (inSaveControl) return;
    if (suppressClickRef.current || editMode) {
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
      <div className="client-saved-instructions">
        <p className="client-saved-instructions__copy">
          Drag specialist card to edit or compare
        </p>
        {orderedTrainers.length > 1 ? (
          <button
            type="button"
            className="client-saved-instructions__toggle smoac-control"
            onClick={() => {
              setEditMode((v) => !v);
              setDraggingId(null);
              setHoverId(null);
              setCompareTargetId(null);
            }}
          >
            {editMode ? "Done arranging" : "Reorder mode"}
          </button>
        ) : null}
      </div>

      <div className="trainer-card-list flex min-w-0 w-full max-w-full flex-col gap-2 md:grid md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {orderedTrainers.map((trainer, index) => {
          const isDragging = draggingId === trainer.id;
          const isHover = hoverId === trainer.id && draggingId !== trainer.id;
          const isCompareTarget = compareTargetId === trainer.id;
          return (
            <div
              key={trainer.id}
              className={[
                "client-saved-card-shell",
                editMode ? "client-saved-card-shell--editable" : "",
                isDragging ? "client-saved-card-shell--dragging" : "",
                isHover ? "client-saved-card-shell--hover" : "",
                isCompareTarget ? "client-saved-card-shell--compare-target" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-saved-draggable-card
              data-saved-draggable-card-id={trainer.id}
              onPointerDown={(event) => handlePointerDown(event, trainer.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onClickCapture={handleClickCapture}
            >
              {isCompareTarget ? (
                <div className="client-saved-card-shell__compare-badge">Release to compare</div>
              ) : null}
              <TrainerCard
                trainer={trainer}
                priority={index < 4}
                compactLayout="default"
                impressionSurface="client_dashboard"
              />
            </div>
          );
        })}
      </div>

      {comparePair ? (
        <div className="dashboard-modal client-compare-modal" role="dialog" aria-modal="true">
          <div className="dashboard-modal__dialog client-compare-modal__dialog">
            <button
              type="button"
              className="dashboard-modal__close"
              onClick={() => setComparePair(null)}
              aria-label="Close comparison"
            >
              ×
            </button>
            <div className="dashboard-modal__content">
              <p className="dashboard-modal__eyebrow">Specialist compare</p>
              <h2 className="dashboard-modal__title">Quick side-by-side</h2>
              <div className="client-compare-modal__grid">
                <p className="client-compare-modal__name">{comparePair.dragged.name}</p>
                <p className="client-compare-modal__name">{comparePair.target.name}</p>
                {rows.map((row) => (
                  <div key={row.label} className="client-compare-modal__row">
                    <p className="client-compare-modal__label">{row.label}</p>
                    <p className="client-compare-modal__value">{row.left}</p>
                    <p className="client-compare-modal__value">{row.right}</p>
                  </div>
                ))}
              </div>
              <div className="client-compare-modal__actions">
                <Link href={`/trainers/${comparePair.dragged.id}`} className="dashboard-primary-btn">
                  View {comparePair.dragged.name.split(" ")[0]}
                </Link>
                <Link href={`/trainers/${comparePair.target.id}`} className="dashboard-secondary-btn">
                  View {comparePair.target.name.split(" ")[0]}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
