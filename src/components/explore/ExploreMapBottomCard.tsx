"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ProfileSheetLink } from "@/components/trainers/ProfileSheetLink";
import { type ExploreMapCardSlide } from "@/lib/explore-map-clusters";
import {
  exploreMapCardPhotos,
  safeExploreMapImageSrc,
} from "@/lib/explore-map-popup";
import { nextSpecialistIndex } from "@/lib/explore-map-visible";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  formatTrainerRating,
  getInitials,
  cn,
} from "@/lib/utils";
import { formatTrainerSessionPrice } from "@/lib/session-price";
import { warmExploreMapCluster } from "@/lib/warm-trainer-profile-navigation";
import { VerifiedBadgeMark } from "@/components/ui/VerifiedBadgeMark";
import { SaveTrainerButton } from "@/components/trainers/SaveTrainerButton";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { isTrainerSponsored, isTrainerVerified } from "@/lib/trainer-sponsorship";
import { getHomepageFeaturedSpecialties } from "@/lib/specialty-display";
import { useProfileSheetOpen } from "@/hooks/useProfileSheetOpen";

function SpecialtyChipRow({ specialties }: { specialties: readonly string[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pressRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const specialtyKey = specialties.join("\0");

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      setOverflow(row.scrollWidth > row.clientWidth + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [specialtyKey]);

  if (specialties.length === 0) return null;

  return (
    <div
      ref={rowRef}
      className={cn(
        "explore-bottom-card__specialties-row",
        overflow && "explore-bottom-card__specialties-row--more",
        scrolled && "explore-bottom-card__specialties-row--scrolled"
      )}
      onPointerDown={(event) => {
        pressRef.current = {
          x: event.clientX,
          y: event.clientY,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const press = pressRef.current;
        if (!press || press.moved) return;
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
          press.moved = true;
        }
      }}
      onClickCapture={(event) => {
        if (!pressRef.current?.moved) return;
        pressRef.current = null;
        event.preventDefault();
        event.stopPropagation();
      }}
      onScroll={(event) => {
        const next = event.currentTarget.scrollLeft > 4;
        setScrolled((current) => (current === next ? current : next));
      }}
    >
      {specialties.map((spec) => (
        <span key={spec} className="explore-bottom-card__specialty-pill">
          {spec}
        </span>
      ))}
    </div>
  );
}

function CardPhotos({
  trainerId,
  displayName,
  photos,
}: {
  trainerId: string;
  displayName: string;
  photos: string[];
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const pressRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const scrollable = photos.length > 1;

  if (photos.length === 0) {
    return (
      <div className="explore-bottom-card__photo-fallback" aria-hidden="true">
        {getInitials(displayName)}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "explore-bottom-card__photo-strip",
          scrollable && "explore-bottom-card__photo-strip--scroll"
        )}
        onPointerDown={(event) => {
          pressRef.current = {
            x: event.clientX,
            y: event.clientY,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || press.moved) return;
          if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
            press.moved = true;
          }
        }}
        onClickCapture={(event) => {
          if (!pressRef.current?.moved) return;
          pressRef.current = null;
          event.preventDefault();
          event.stopPropagation();
        }}
        onScroll={
          scrollable
            ? (event) => {
                const width = event.currentTarget.clientWidth;
                if (width <= 0) return;
                const next = Math.round(event.currentTarget.scrollLeft / width);
                setPhotoIndex((current) => (current === next ? current : next));
              }
            : undefined
        }
      >
        {photos.map((src, index) => (
          <img
            key={`${trainerId}-${index}`}
            src={src}
            alt={
              photos.length > 1
                ? `${displayName}, photo ${index + 1} of ${photos.length}`
                : displayName
            }
            width={240}
            height={320}
            className="explore-bottom-card__photo"
            decoding="async"
            fetchPriority={index === 0 ? "high" : "low"}
            draggable={false}
          />
        ))}
      </div>
      {scrollable ? (
        <div className="explore-bottom-card__photo-dots" aria-hidden="true">
          {photos.map((src, index) => (
            <span
              key={`${src}-${index}`}
              className={cn(
                "explore-bottom-card__photo-dot",
                index === photoIndex && "explore-bottom-card__photo-dot--active"
              )}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

export interface ExploreMapBottomCardProps {
  /** Specialists whose pins are inside the current map viewport, nearest center first. */
  visibleSlides: ExploreMapCardSlide[];
  selectedTrainerId: string | null;
  /** Selected specialist, including after their pin has left the viewport. */
  selectedSlide: ExploreMapCardSlide | null;
  onSelectTrainer: (trainerId: string) => void;
  onClose: () => void;
  className?: string;
}

const DISMISS_DRAG_PX = 80;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ExploreMapBottomCard({
  visibleSlides,
  selectedTrainerId,
  selectedSlide,
  onSelectTrainer,
  onClose,
  className,
}: ExploreMapBottomCardProps) {
  const router = useRouter();
  const profileSheetOpen = useProfileSheetOpen();
  const visibleKey = visibleSlides.map((slide) => slide.trainer.id).join("\0");
  const selectedIndex = selectedTrainerId
    ? visibleSlides.findIndex((slide) => slide.trainer.id === selectedTrainerId)
    : -1;
  const offscreen = selectedIndex < 0 && selectedSlide != null;
  const track =
    !selectedTrainerId
      ? []
      : offscreen
        ? [selectedSlide, ...visibleSlides]
        : selectedIndex >= 0
          ? visibleSlides
          : [];

  const [displayIndex, setDisplayIndex] = useState(0);
  const [live, setLive] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const filmRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef(track);
  trackRef.current = track;
  const offscreenRef = useRef(offscreen);
  offscreenRef.current = offscreen;
  const displayIndexRef = useRef(displayIndex);
  displayIndexRef.current = displayIndex;
  const shownTrainerIdRef = useRef<string | null>(null);
  const gestureRef = useRef(false);
  const onSelectTrainerRef = useRef(onSelectTrainer);
  onSelectTrainerRef.current = onSelectTrainer;
  const suppressCardClickRef = useRef(false);
  const rowPanRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startT: number;
    startIndex: number;
    dragging: boolean;
    points: { x: number; t: number }[];
  } | null>(null);
  const dragRef = useRef<{
    startY: number;
    lastY: number;
    active: boolean;
    pointerId: number;
    target: HTMLDivElement;
  } | null>(null);

  const shown = Boolean(selectedTrainerId) && track.length > 0 && !profileSheetOpen;

  useEffect(() => {
    if (!shown) {
      setLive(false);
      return;
    }
    const timer = window.setTimeout(() => setLive(true), 260);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const offsetRef = useRef(0);
  const settleEndRef = useRef<((event: TransitionEvent) => void) | null>(null);
  const settleTimerRef = useRef(0);

  const clearSettle = useCallback(() => {
    window.clearTimeout(settleTimerRef.current);
    const film = filmRef.current;
    const onEnd = settleEndRef.current;
    if (film && onEnd) film.removeEventListener("transitionend", onEnd);
    settleEndRef.current = null;
  }, []);

  const cardStride = useCallback(() => {
    const film = filmRef.current;
    const first = film?.children[0] as HTMLElement | undefined;
    const second = film?.children[1] as HTMLElement | undefined;
    if (first && second) {
      const stride = Math.abs(second.offsetLeft - first.offsetLeft);
      if (stride > 0) return stride;
    }
    return first?.offsetWidth || film?.parentElement?.clientWidth || 1;
  }, []);

  const setOffset = useCallback((px: number, animate: boolean) => {
    offsetRef.current = px;
    const film = filmRef.current;
    if (!film) return;
    film.style.willChange = "transform";
    film.style.transition = animate
      ? "transform 340ms cubic-bezier(0.32, 0.72, 0, 1)"
      : "none";
    film.style.transform = `translate3d(${px}px, 0, 0)`;
  }, []);

  const scrollInstant = useCallback(
    (index: number) => {
      const film = filmRef.current;
      if (!film || trackRef.current.length < 2) return true;
      const stride = cardStride();
      const first = film.children[0] as HTMLElement | undefined;
      if (!first || first.offsetWidth === 0 || stride <= 1) return false;
      const px = -index * stride;
      film.style.transition = "none";
      film.style.willChange = "";
      film.style.transform = `translate3d(${px}px, 0, 0)`;
      offsetRef.current = px;
      return true;
    },
    [cardStride]
  );

  useLayoutEffect(() => {
    if (!selectedTrainerId) {
      shownTrainerIdRef.current = null;
      return;
    }
    if (gestureRef.current && shownTrainerIdRef.current === selectedTrainerId) return;
    const index = offscreen ? 0 : selectedIndex;
    if (index < 0) return;
    shownTrainerIdRef.current = selectedTrainerId;
    setDisplayIndex((current) => (current === index ? current : index));
    if (scrollInstant(index)) return;
    const frame = window.requestAnimationFrame(() => {
      if (!gestureRef.current) scrollInstant(index);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [offscreen, scrollInstant, selectedIndex, selectedTrainerId, visibleKey]);

  const activeSlide = track[displayIndex] ?? track[0];

  useEffect(() => {
    const current = trackRef.current[displayIndex];
    if (!current) return;
    const neighbors = [
      trackRef.current[displayIndex - 1],
      current,
      trackRef.current[displayIndex + 1],
    ].filter((slide): slide is ExploreMapCardSlide => Boolean(slide));
    warmExploreMapCluster(
      { trainers: neighbors.map((slide) => slide.trainer) },
      router
    );
  }, [displayIndex, router, selectedTrainerId, visibleKey]);

  useEffect(() => {
    return () => {
      gestureRef.current = false;
      clearSettle();
    };
  }, [clearSettle]);

  useEffect(() => {
    return () => {
      const drag = dragRef.current;
      if (!drag) return;
      try {
        drag.target.releasePointerCapture(drag.pointerId);
      } catch {
        /* already released */
      }
      dragRef.current = null;
    };
  }, [selectedTrainerId]);

  const settleTo = useCallback(
    (index: number) => {
      const slidesNow = trackRef.current;
      if (slidesNow.length === 0) return;
      const clamped = Math.max(0, Math.min(slidesNow.length - 1, index));
      const slide = slidesNow[clamped];
      if (!slide) return;
      const changed = slide.trainer.id !== shownTrainerIdRef.current;
      const leavingOffscreen = offscreenRef.current && clamped > 0;
      const target = -clamped * cardStride();
      clearSettle();
      gestureRef.current = true;
      const film = filmRef.current;
      if (film) {
        film.style.transition = "none";
        film.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
        void film.offsetWidth;
      }
      setDisplayIndex(clamped);
      shownTrainerIdRef.current = slide.trainer.id;
      if (changed && !leavingOffscreen) {
        onSelectTrainerRef.current(slide.trainer.id);
      }

      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearSettle();
        if (film) {
          film.style.transition = "none";
          film.style.willChange = "";
          film.style.transform = `translate3d(${target}px, 0, 0)`;
        }
        offsetRef.current = target;
        gestureRef.current = false;
        if (changed && leavingOffscreen) {
          onSelectTrainerRef.current(slide.trainer.id);
        }
      };

      if (
        !film ||
        prefersReducedMotion() ||
        Math.abs(target - offsetRef.current) < 1
      ) {
        done();
        return;
      }

      const onEnd = (event: TransitionEvent) => {
        if (event.propertyName !== "transform") return;
        done();
      };
      settleEndRef.current = onEnd;
      film.addEventListener("transitionend", onEnd);
      settleTimerRef.current = window.setTimeout(done, 420);
      setOffset(target, true);
    },
    [cardStride, clearSettle, setOffset]
  );

  useEffect(() => {
    if (selectedTrainerId) {
      document.body.classList.add("explore-hub-open");
    } else {
      document.body.classList.remove("explore-hub-open");
    }
    return () => {
      document.body.classList.remove("explore-hub-open");
    };
  }, [selectedTrainerId]);

  useEffect(() => {
    if (!selectedTrainerId) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (trackRef.current.length < 2) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const min =
        offscreenRef.current && displayIndexRef.current > 0 ? 1 : 0;
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = Math.max(
        min,
        Math.min(trackRef.current.length - 1, displayIndexRef.current + delta)
      );
      settleTo(next);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectedTrainerId, settleTo]);

  const handleRowPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || trackRef.current.length < 2) return;
      if (!filmRef.current) return;
      const index = displayIndexRef.current;
      const slide = trackRef.current[index];
      const wasSettling = gestureRef.current;
      clearSettle();
      if (
        wasSettling &&
        slide &&
        slide.trainer.id !== selectedTrainerId
      ) {
        onSelectTrainerRef.current(slide.trainer.id);
      }
      gestureRef.current = false;
      scrollInstant(index);
      rowPanRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startT: performance.now(),
        startIndex: displayIndexRef.current,
        dragging: false,
        points: [{ x: event.clientX, t: performance.now() }],
      };
    },
    [clearSettle, scrollInstant, selectedTrainerId]
  );

  const handleRowPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pan = rowPanRef.current;
      if (!pan || event.pointerId !== pan.pointerId) return;
      const dx = event.clientX - pan.startX;
      const dy = event.clientY - pan.startY;
      pan.points.push({ x: event.clientX, t: performance.now() });
      if (pan.points.length > 8) pan.points.shift();
      if (!pan.dragging) {
        if (Math.hypot(dx, dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          rowPanRef.current = null;
          return;
        }
        pan.dragging = true;
        gestureRef.current = true;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* pointer already gone */
        }
      }
      const stride = cardStride();
      const atStart =
        pan.startIndex <= (offscreenRef.current && pan.startIndex > 0 ? 1 : 0);
      const atEnd = pan.startIndex >= trackRef.current.length - 1;
      let visual = dx;
      if ((visual > 0 && atStart) || (visual < 0 && atEnd)) {
        visual *= 0.34;
      } else if (visual > stride) {
        visual = stride + (visual - stride) * 0.22;
      } else if (visual < -stride) {
        visual = -stride + (visual + stride) * 0.22;
      }
      setOffset(-pan.startIndex * stride + visual, false);
    },
    [cardStride, setOffset]
  );

  const finishRowPan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pan = rowPanRef.current;
      if (!pan || event.pointerId !== pan.pointerId) return;
      const dragged = pan.dragging;
      rowPanRef.current = null;
      if (!dragged) {
        gestureRef.current = false;
        return;
      }
      suppressCardClickRef.current = true;
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      pan.points.push({ x: event.clientX, t: performance.now() });
      const last = pan.points[pan.points.length - 1];
      const cutoff = (last?.t ?? performance.now()) - 90;
      let first = pan.points[0];
      for (const point of pan.points) {
        if (point.t >= cutoff) {
          first = point;
          break;
        }
      }
      const dx = event.clientX - pan.startX;
      const dt = Math.max((last?.t ?? 0) - (first?.t ?? 0), 8);
      const velocity =
        last && first ? (last.x - first.x) / dt : dx / Math.max(performance.now() - pan.startT, 16);
      const minIndex = offscreenRef.current && pan.startIndex > 0 ? 1 : 0;
      const next = nextSpecialistIndex({
        startIndex: pan.startIndex,
        count: trackRef.current.length,
        dx,
        velocity,
        width: cardStride(),
        minIndex,
      });
      settleTo(next);
      window.setTimeout(() => {
        suppressCardClickRef.current = false;
      }, 400);
    },
    [cardStride, settleTo]
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      startY: event.clientY,
      lastY: event.clientY,
      active: true,
      pointerId: event.pointerId,
      target: event.currentTarget,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !drag.active) return;
    const delta = Math.max(0, event.clientY - drag.startY);
    setDragOffset(delta);
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || !drag.active) return;
      const delta = Math.max(0, event.clientY - drag.startY);
      dragRef.current = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
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

  if (!shown || !activeSlide) return null;

  const isRow = track.length > 1;
  const activeTrainer = activeSlide.trainer;
  const activeSponsored = isTrainerSponsored(activeTrainer);

  return (
    <aside
      className={cn(
        "explore-bottom-card-dock",
        "explore-bottom-card-dock--open",
        !isRow && "explore-bottom-card-dock--solo",
        isRow && "explore-bottom-card-dock--row",
        live && "explore-bottom-card-dock--live",
        dragOffset > 0 && "explore-bottom-card-dock--dragging",
        !isRow && activeSponsored && "smoac-sponsored-ring",
        className
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onClickCapture={(event) => {
        if (!suppressCardClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onTouchStart={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      style={
        dragOffset > 0
          ? {
              transform: isRow
                ? `translateY(${dragOffset}px)`
                : `translate(-50%, ${dragOffset}px)`,
            }
          : undefined
      }
      aria-label={
        isRow
          ? `Specialist cards, ${activeTrainer.name} selected`
          : `Specialist preview for ${activeTrainer.name}`
      }
    >
      {isRow ? null : (
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
      )}

      <div
        className={cn(
          "explore-bottom-card__carousel",
          !isRow && "explore-bottom-card__carousel--single"
        )}
      >
        <div ref={filmRef} className="explore-bottom-card__film">
        {track.map(({ trainer }) => {
          const profession =
            resolveTrainerProfessionCategory(trainer) ||
            trainer.profession ||
            "Specialist";
          const priceLabel = formatTrainerSessionPrice(trainer);
          const verified = isTrainerVerified(trainer);
          const specialties = getHomepageFeaturedSpecialties(trainer);
          const ratingValue = trainer.rating;
          const displayName = trainer.name;
          const locationClean =
            trainer.neighborhood?.trim() ||
            trainer.city?.trim() ||
            "San Diego";
          const cardPhotos = exploreMapCardPhotos(trainer);
          const fallbackPhoto = safeExploreMapImageSrc(trainer.image);
          const photos =
            cardPhotos.length > 0
              ? cardPhotos
              : fallbackPhoto
                ? [fallbackPhoto]
                : [];

          return (
            <div
              key={trainer.id}
              className={cn(
                "explore-bottom-card-slide",
                isRow && isTrainerSponsored(trainer) && "smoac-sponsored-ring"
              )}
            >
              {isRow ? (
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
              ) : null}
              <ProfileSheetLink
                trainer={trainer}
                className="explore-bottom-card"
                aria-label={`View ${displayName}'s profile, ${profession}, ${priceLabel}`}
              >
                <div className="explore-bottom-card__photo-col">
                  <div className="explore-bottom-card__photo-wrap">
                    <CardPhotos
                      trainerId={trainer.id}
                      displayName={displayName}
                      photos={photos}
                    />
                    <div className="explore-bottom-card__photo-badges">
                      {verified ? (
                        <VerifiedBadgeMark
                          className="explore-bottom-card__verified-badge"
                          title="SMOAC Pro"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="explore-bottom-card__info-col">
                  <div
                    className="explore-bottom-card__swipe-zone"
                    data-specialist-swipe
                    onPointerDown={isRow ? handleRowPointerDown : undefined}
                    onPointerMove={isRow ? handleRowPointerMove : undefined}
                    onPointerUp={isRow ? finishRowPan : undefined}
                    onPointerCancel={isRow ? finishRowPan : undefined}
                    onClickCapture={
                      isRow
                        ? (event) => {
                            if (!suppressCardClickRef.current) return;
                            event.preventDefault();
                            event.stopPropagation();
                          }
                        : undefined
                    }
                  >
                    <div className="explore-bottom-card__title-row">
                      <h3 className="explore-bottom-card__trainer-name">
                        {displayName}
                      </h3>
                    </div>
                    <p className="explore-bottom-card__profession">{profession}</p>
                    <div className="explore-bottom-card__meta-row">
                      {ratingValue ? (
                        <span className="explore-bottom-card__rating">
                          ★ {formatTrainerRating(ratingValue)}
                        </span>
                      ) : null}
                      {ratingValue && locationClean ? (
                        <span className="explore-bottom-card__meta-dot" aria-hidden>
                          ·
                        </span>
                      ) : null}
                      {locationClean ? (
                        <span className="explore-bottom-card__location">
                          {locationClean}
                        </span>
                      ) : null}
                      <TrainerDistanceLabel
                        trainer={trainer}
                        className="explore-bottom-card__distance"
                      />
                    </div>
                    <div className="explore-bottom-card__price-row">
                      <span className="explore-bottom-card__price-val">
                        {priceLabel}
                      </span>
                    </div>
                  </div>
                  <SpecialtyChipRow specialties={specialties} />
                </div>
              </ProfileSheetLink>
              <div
                className="explore-bottom-card__save-slot"
                data-save-control
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <SaveTrainerButton
                  trainerId={trainer.id}
                  trainerName={displayName}
                  overlay={false}
                />
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </aside>
  );
}
