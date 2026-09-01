"use client";

import Link from "next/link";
import { useMemo, useState, type MouseEvent } from "react";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import { useExplicitUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { formatProviderLocation } from "@/lib/provider-location";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";
import "@/styles/saved-organizer.css";

interface SavedSpecialistsOrganizerProps {
  trainers: Trainer[];
  impressionSurface?: "saved" | "client_dashboard";
}

interface ComparePair {
  dragged: Trainer;
  target: Trainer;
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

type CompareWinner = "left" | "right" | null;

function winnerLower(left: number | null, right: number | null): CompareWinner {
  if (left == null || right == null) return null;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if (left === right) return null;
  return left < right ? "left" : "right";
}

function winnerHigher(left: number | null, right: number | null): CompareWinner {
  if (left == null || right == null) return null;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if (left === right) return null;
  return left > right ? "left" : "right";
}

function winnerReviews(
  leftRating: number,
  leftCount: number,
  rightRating: number,
  rightCount: number
): CompareWinner {
  const leftScore = leftRating * 1000 + leftCount;
  const rightScore = rightRating * 1000 + rightCount;
  if (leftScore === 0 && rightScore === 0) return null;
  return winnerHigher(leftScore, rightScore);
}

function CompareCheck() {
  return (
    <span className="saved-compare-modal__check" aria-label="Better">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12.5 9.5 17 19 7.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function SavedSpecialistsOrganizer({
  trainers,
  impressionSurface = "saved",
}: SavedSpecialistsOrganizerProps) {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparePair, setComparePair] = useState<ComparePair | null>(null);
  const coords = useExplicitUserCoordinates();

  const trainersById = useMemo(
    () => new Map(trainers.map((trainer) => [trainer.id, trainer])),
    [trainers]
  );
  const selectedCount = selectedIds.length;

  function handleCardClick(event: MouseEvent<HTMLDivElement>, trainerId: string) {
    if (!compareMode) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-save-control]")) return;
    event.preventDefault();
    event.stopPropagation();

    setSelectedIds((current) => {
      if (current.includes(trainerId)) {
        return current.filter((id) => id !== trainerId);
      }
      if (current.length >= 2) {
        return [current[1], trainerId];
      }
      return [...current, trainerId];
    });
  }

  function openCompareFromSelection() {
    if (selectedIds.length !== 2) return;
    const [firstId, secondId] = selectedIds;
    const dragged = trainersById.get(firstId);
    const target = trainersById.get(secondId);
    if (!dragged || !target) return;
    setComparePair({ dragged, target });
  }

  const rows = (() => {
    if (!comparePair) return [];
    const leftDistance = getTrainerDistanceMiles(comparePair.dragged, coords);
    const rightDistance = getTrainerDistanceMiles(comparePair.target, coords);
    return [
      {
        label: "Price",
        left: formatPrice(comparePair.dragged.pricePerSession),
        right: formatPrice(comparePair.target.pricePerSession),
        winner: winnerLower(
          comparePair.dragged.pricePerSession,
          comparePair.target.pricePerSession
        ),
      },
      {
        label: "Location",
        left: formatProviderLocation(comparePair.dragged),
        right: formatProviderLocation(comparePair.target),
        winner: null as CompareWinner,
      },
      {
        label: "Distance from you",
        left: formatDistance(leftDistance),
        right: formatDistance(rightDistance),
        winner: winnerLower(leftDistance, rightDistance),
      },
      {
        label: "Reviews",
        left: `${comparePair.dragged.reviewCount} (${comparePair.dragged.rating.toFixed(1)}★)`,
        right: `${comparePair.target.reviewCount} (${comparePair.target.rating.toFixed(1)}★)`,
        winner: winnerReviews(
          comparePair.dragged.rating,
          comparePair.dragged.reviewCount,
          comparePair.target.rating,
          comparePair.target.reviewCount
        ),
      },
    ];
  })();

  return (
    <>
      <div className="saved-organizer-instructions">
        <p className="saved-organizer-instructions__copy">
          Tap Compare, then select two specialists
        </p>
        {trainers.length > 1 ? (
          <button
            type="button"
            className="saved-organizer-instructions__toggle smoac-control"
            onClick={() => {
              setCompareMode((value) => !value);
              setSelectedIds([]);
            }}
          >
            {compareMode ? "Done" : "Compare"}
          </button>
        ) : null}
      </div>

      <div className="trainer-card-list saved-organizer-list">
        {trainers.map((trainer, index) => {
          const isSelected = selectedIds.includes(trainer.id);
          return (
            <div
              key={trainer.id}
              className={[
                "saved-organizer-card",
                compareMode ? "saved-organizer-card--compare-mode" : "",
                isSelected ? "saved-organizer-card--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClickCapture={(event) => handleCardClick(event, trainer.id)}
            >
              {compareMode ? (
                <div className="saved-organizer-card__compare-badge">
                  {isSelected ? "Selected" : "Tap to select"}
                </div>
              ) : null}
              <TrainerCard
                trainer={trainer}
                priority={index < 4}
                compactLayout="default"
                impressionSurface={impressionSurface}
                linkDisabled={compareMode}
              />
            </div>
          );
        })}
      </div>

      {compareMode ? (
        <div className="saved-organizer-compare-action">
          <button
            type="button"
            className="saved-organizer-compare-action__button smoac-control"
            onClick={openCompareFromSelection}
            disabled={selectedCount !== 2}
          >
            <span className="saved-organizer-compare-action__label">
              {selectedCount === 2
                ? "Compare selected specialists"
                : `Select 2 specialists (${selectedCount}/2)`}
            </span>
          </button>
        </div>
      ) : null}

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
            <div className="saved-compare-modal__board">
              <div className="saved-compare-modal__header">
                <div className="saved-compare-modal__col">
                  <p className="saved-compare-modal__name">{comparePair.dragged.name}</p>
                </div>
                <div className="saved-compare-modal__split" aria-hidden="true" />
                <div className="saved-compare-modal__col">
                  <p className="saved-compare-modal__name">{comparePair.target.name}</p>
                </div>
              </div>
              {rows.map((row) => (
                <div key={row.label} className="saved-compare-modal__row">
                  <p className="saved-compare-modal__label">{row.label}</p>
                  <div className="saved-compare-modal__pair">
                    <p
                      className={[
                        "saved-compare-modal__value",
                        row.winner === "left" ? "saved-compare-modal__value--win" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{row.left}</span>
                      {row.winner === "left" ? <CompareCheck /> : null}
                    </p>
                    <div className="saved-compare-modal__split" aria-hidden="true" />
                    <p
                      className={[
                        "saved-compare-modal__value",
                        row.winner === "right" ? "saved-compare-modal__value--win" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{row.right}</span>
                      {row.winner === "right" ? <CompareCheck /> : null}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="saved-compare-modal__actions">
              <Link
                href={`/trainers/${comparePair.dragged.id}`}
                className="saved-compare-modal__action"
              >
                View {comparePair.dragged.name.split(" ")[0]}
              </Link>
              <Link
                href={`/trainers/${comparePair.target.id}`}
                className="saved-compare-modal__action saved-compare-modal__action--alt"
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
