"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Trainer } from "@/types";
import {
  type ExploreMapCluster,
  getClusterHeaderInfo,
} from "@/lib/explore-map-clusters";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  formatSessionPricePlain,
  formatTrainerRating,
  getInitials,
  cn,
} from "@/lib/utils";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import { VerifiedBadgeMark } from "@/components/ui/VerifiedBadgeMark";
import { SaveTrainerButton } from "@/components/trainers/SaveTrainerButton";
import { isTrainerSponsored, isTrainerVerified } from "@/lib/trainer-sponsorship";
import { useExplicitUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";

export interface ExploreMapBottomCardProps {
  cluster: ExploreMapCluster | null;
  onClose: () => void;
  className?: string;
}

const DISMISS_DRAG_PX = 80;

export function ExploreMapBottomCard({
  cluster,
  onClose,
  className,
}: ExploreMapBottomCardProps) {
  const router = useRouter();
  const userCoords = useExplicitUserCoordinates();
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevClusterId, setPrevClusterId] = useState(cluster?.id);
  if (cluster?.id !== prevClusterId) {
    setPrevClusterId(cluster?.id);
    setActiveIndex(0);
  }

  const [dragOffset, setDragOffset] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startY: number;
    lastY: number;
    active: boolean;
  } | null>(null);

  // Scroll to active index on mount or slide change
  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
    const container = carouselRef.current;
    if (!container) return;
    const cardEl = container.children[index] as HTMLElement | undefined;
    if (cardEl) {
      container.scrollTo({
        left: cardEl.offsetLeft,
        behavior: "smooth",
      });
    }
  }, []);

  // Sync body class so mobile "See X results" dock hides while card is open
  useEffect(() => {
    if (cluster) {
      document.body.classList.add("explore-hub-open");
    } else {
      document.body.classList.remove("explore-hub-open");
    }
    return () => {
      document.body.classList.remove("explore-hub-open");
    };
  }, [cluster]);

  // Handle escape key
  useEffect(() => {
    if (!cluster) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (cluster.isMulti) {
        if (e.key === "ArrowRight") {
          goToSlide(Math.min(cluster.trainers.length - 1, activeIndex + 1));
        } else if (e.key === "ArrowLeft") {
          goToSlide(Math.max(0, activeIndex - 1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cluster, onClose, activeIndex, goToSlide]);

  const handleScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container || !cluster || !cluster.isMulti) return;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth;
    if (cardWidth <= 0) return;
    const newIndex = Math.round(scrollLeft / cardWidth);
    if (
      newIndex >= 0 &&
      newIndex < cluster.trainers.length &&
      newIndex !== activeIndex
    ) {
      setActiveIndex(newIndex);
    }
  }, [cluster, activeIndex]);

  const handleTrainerClick = useCallback(
    (trainer: Trainer) => {
      // Don't navigate if user was swiping horizontally
      if (isSwipingRef.current) return;
      warmTrainerProfileNavigation(trainer, router);
      router.push(`/trainers/${encodeURIComponent(trainer.id)}`, {
        scroll: false,
      });
    },
    [router]
  );

  const isSwipingRef = useRef(false);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startY: e.clientY,
      lastY: e.clientY,
      active: true,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !drag.active) return;
    const delta = Math.max(0, e.clientY - drag.startY);
    setDragOffset(delta);
  }, []);

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || !drag.active) return;
      const delta = Math.max(0, e.clientY - drag.startY);
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (delta >= DISMISS_DRAG_PX) {
        setDragOffset(0);
        onClose();
      } else {
        setDragOffset(0);
      }
    },
    [onClose]
  );

  if (!cluster) return null;

  const isMulti = cluster.isMulti && cluster.trainers.length > 1;
  const headerInfo = getClusterHeaderInfo(cluster);

  return (
    <aside
      className={cn(
        "explore-bottom-card-dock",
        cluster && "explore-bottom-card-dock--open",
        dragOffset > 0 && "explore-bottom-card-dock--dragging",
        className
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={
        dragOffset > 0
          ? { transform: `translate(-50%, ${dragOffset}px)` }
          : undefined
      }
      aria-label={
        isMulti
          ? `Multi-specialist hub with ${cluster.count} specialists`
          : `Specialist preview for ${cluster.primaryTrainer.name}`
      }
    >
      {/* Sleek top drag handle for mobile touch swipe-down dismiss gesture */}
      <div
        className="explore-bottom-card__drag-handle-hit"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-hidden="true"
      >
        <span className="explore-bottom-card__drag-handle" />
      </div>

      {/* Multi-specialist Hub Header */}
      {isMulti ? (
        <div className="explore-bottom-card__header">
          <div className="explore-bottom-card__header-left">
            <div className="explore-bottom-card__hub-pill">
              <span className="explore-bottom-card__pulse-dot" aria-hidden="true" />
              <span className="explore-bottom-card__hub-label">
                {headerInfo.title}
              </span>
            </div>
          </div>

          <div className="explore-bottom-card__header-right">
            {/* Pagination badge e.g. "1 of 3" */}
            <span className="explore-bottom-card__counter-pill">
              {activeIndex + 1} of {cluster.trainers.length}
            </span>

            {/* Pagination dot indicators */}
            <div
              className="explore-bottom-card__dots"
              role="tablist"
              aria-label="Specialist slides"
            >
              {cluster.trainers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Go to specialist ${i + 1}`}
                  className={cn(
                    "explore-bottom-card__dot",
                    i === activeIndex && "explore-bottom-card__dot--active"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(i);
                  }}
                />
              ))}
            </div>

            {/* Desktop Prev / Next navigation buttons */}
            <div className="explore-bottom-card__nav-arrows">
              <button
                type="button"
                className="smoac-control explore-bottom-card__nav-arrow"
                disabled={activeIndex === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(Math.max(0, activeIndex - 1));
                }}
                aria-label="Previous specialist"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="smoac-control explore-bottom-card__nav-arrow"
                disabled={activeIndex === cluster.trainers.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(
                    Math.min(cluster.trainers.length - 1, activeIndex + 1)
                  );
                }}
                aria-label="Next specialist"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Close button */}
            <button
              type="button"
              className="smoac-control explore-bottom-card__close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close preview"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {/* Card(s) Container */}
      <div
        ref={carouselRef}
        className={cn(
          "explore-bottom-card__carousel",
          !isMulti && "explore-bottom-card__carousel--single"
        )}
        onScroll={isMulti ? handleScroll : undefined}
      >
        {cluster.trainers.map((trainer) => {
          const profession =
            resolveTrainerProfessionCategory(trainer) ||
            trainer.profession ||
            "Specialist";
          const priceLabel = formatSessionPricePlain(trainer.pricePerSession);
          const verified = isTrainerVerified(trainer);
          const sponsored = isTrainerSponsored(trainer);
          const specialties = (trainer.specialty || []).slice(0, 3);
          const ratingValue = trainer.rating;
          // Calculate distance from explicit user location if available
          let distanceStr: string | null = null;
          if (userCoords) {
            const miles = getTrainerDistanceMiles(trainer, userCoords);
            if (miles !== null) {
              distanceStr =
                miles < 20
                  ? `${miles.toFixed(1)} mi away`
                  : `${Math.round(miles)} mi away`;
            }
          }

          // Display format:
          // 1. Title = trainer.name ("Lili Carrillo")
          // 2. Profession / Category in smoke color ("Personal Trainer")
          // 3. Location = Neighborhood / City without raw ZIP ("Bay Park") + distance
          const displayName = trainer.name;

          const locationClean =
            trainer.neighborhood?.trim() ||
            trainer.city?.trim() ||
            cluster.locationLabel ||
            "San Diego";

          return (
            <article
              key={trainer.id}
              className="explore-bottom-card"
              onClick={() => handleTrainerClick(trainer)}
              onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTrainerClick(trainer);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`View ${displayName}'s profile, ${profession}, ${priceLabel}`}
            >
              {/* Left Photo Hero */}
              <div className="explore-bottom-card__photo-col">
                <div
                  className={cn(
                    "explore-bottom-card__photo-wrap",
                    sponsored && "smoac-sponsored-ring"
                  )}
                >
                  {trainer.image ? (
                    <Image
                      src={trainer.image}
                      alt={displayName}
                      width={160}
                      height={160}
                      className="explore-bottom-card__photo"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <div
                      className="explore-bottom-card__photo-fallback"
                      aria-hidden="true"
                    >
                      {getInitials(displayName)}
                    </div>
                  )}

                  {/* Top tags on image */}
                  <div className="explore-bottom-card__photo-badges">
                    {verified ? (
                      <VerifiedBadgeMark
                        className="explore-bottom-card__verified-badge"
                        title="Verified Specialist"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right Content Column */}
              <div className="explore-bottom-card__info-col">
                {/* Save Heart Button Slot (Top-Right) */}
                <div
                  className="explore-bottom-card__save-slot"
                  data-save-control
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <SaveTrainerButton
                    trainerId={trainer.id}
                    trainerName={displayName}
                    overlay={false}
                  />
                </div>

                {/* Name / Business Name */}
                <div className="explore-bottom-card__title-row">
                  <h3 className="explore-bottom-card__trainer-name">
                    {displayName}
                  </h3>
                </div>

                {/* Category / Profession */}
                <p className="explore-bottom-card__profession">{profession}</p>

                {/* Distance / Location */}
                <div className="explore-bottom-card__meta-row">
                  {ratingValue ? (
                    <span className="explore-bottom-card__rating">
                      ★ {formatTrainerRating(ratingValue)}
                    </span>
                  ) : null}
                  {ratingValue && (locationClean || distanceStr) ? (
                    <span className="explore-bottom-card__meta-dot" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <span className="explore-bottom-card__location">
                    {locationClean}
                    {distanceStr ? ` · ${distanceStr}` : ""}
                  </span>
                </div>

                {/* Price tag */}
                <div className="explore-bottom-card__price-row">
                  <span className="explore-bottom-card__price-val">
                    {priceLabel}
                  </span>
                </div>

                {/* Specialties chips */}
                {specialties.length > 0 ? (
                  <div className="explore-bottom-card__specialties-row">
                    {specialties.map((spec) => (
                      <span
                        key={spec}
                        className="explore-bottom-card__specialty-pill"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
