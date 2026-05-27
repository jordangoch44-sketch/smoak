"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useCarousel } from "@/hooks/useCarousel";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";
import type { ProfileGalleryMedia } from "@/types/profile-gallery";
import { cn } from "@/lib/utils";

const EXIT_MS = 220;
const PROTECTED_SELECTOR = "[data-gallery-protected]";
const CLOSE_SELECTOR = "[data-gallery-close]";

interface ProfileGalleryModalProps {
  open: boolean;
  media: ProfileGalleryMedia[];
  initialIndex?: number;
  trainerName: string;
  onClose: () => void;
}

export function ProfileGalleryModal({
  open,
  media,
  initialIndex = 0,
  trainerName,
  onClose,
}: ProfileGalleryModalProps) {
  const { index, goTo, count } = useCarousel(media.length);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(open);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseVideo = useCallback(() => {
    setVideoPlaying(false);
    const video = videoRef.current;
    if (!video) return;
    try {
      video.pause();
      video.currentTime = 0;
    } catch {
      // Playback may already be stopped or unsupported
    }
  }, []);

  const goToSlide = useCallback(
    (next: number) => {
      pauseVideo();
      goTo(next);
    },
    [goTo, pauseVideo]
  );

  const { onTouchStart, onTouchEnd } = useHorizontalSwipe({
    enabled: mounted && !exiting && count > 1,
    onSwipeLeft: () => goToSlide(index + 1),
    onSwipeRight: () => goToSlide(index - 1),
  });

  const requestClose = useCallback(() => {
    if (exiting) return;
    pauseVideo();
    setExiting(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      setExiting(false);
      setMounted(false);
      onClose();
      exitTimerRef.current = null;
    }, EXIT_MS);
  }, [exiting, onClose, pauseVideo]);

  const handleDismissPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (exiting) return;
      const target = event.target as HTMLElement;
      if (target.closest(CLOSE_SELECTOR)) return;
      if (target.closest(PROTECTED_SELECTOR)) return;
      requestClose();
    },
    [exiting, requestClose]
  );

  const handleCloseClick = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    },
    [requestClose]
  );

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      goTo(initialIndex);
    }
  }, [open, initialIndex, goTo]);

  useEffect(() => {
    if (!mounted || exiting) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("gallery-modal-open");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
      if (event.key === "ArrowLeft") goToSlide(index - 1);
      if (event.key === "ArrowRight") goToSlide(index + 1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("gallery-modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted, exiting, requestClose, goToSlide, index]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      document.body.classList.remove("gallery-modal-open");
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!mounted || !thumbsRef.current) return;
    const active = thumbsRef.current.querySelector<HTMLElement>(
      `[data-thumb-index="${index}"]`
    );
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index, mounted]);

  const handlePlayVideo = useCallback(async () => {
    const current = media[index];
    if (!current || current.type !== "video") return;

    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setVideoPlaying(true);
    } catch (error) {
      console.warn("Gallery video playback failed:", error);
      setVideoPlaying(false);
    }
  }, [index, media]);

  if (!mounted || typeof document === "undefined" || count === 0) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "profile-gallery-modal",
          exiting && "profile-gallery-modal--exit"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`${trainerName} gallery`}
        onPointerUp={handleDismissPointerUp}
      >
        <div className="profile-gallery-modal__backdrop" aria-hidden />

        <div className="profile-gallery-modal__content">
        <div
          className="profile-gallery-modal__main"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="profile-gallery-modal__stage" data-gallery-protected>
            {media.map((item, slideIndex) => (
              <div
                key={item.id}
                className={cn(
                  "profile-gallery-modal__frame",
                  slideIndex === index && "profile-gallery-modal__frame--active"
                )}
                aria-hidden={slideIndex !== index}
              >
                {item.type === "image" ? (
                  <Image
                    src={item.url}
                    alt={item.alt ?? `${trainerName} gallery`}
                    fill
                    sizes="100vw"
                    className="profile-gallery-modal__media object-contain"
                    priority={slideIndex === 0}
                    draggable={false}
                  />
                ) : slideIndex === index ? (
                  <>
                    <video
                      ref={videoRef}
                      className="profile-gallery-modal__video"
                      src={item.url}
                      poster={item.thumbnail}
                      playsInline
                      muted
                      controls={videoPlaying}
                      preload="metadata"
                      onEnded={() => setVideoPlaying(false)}
                      onPause={() => setVideoPlaying(false)}
                    />
                    {!videoPlaying ? (
                      <button
                        type="button"
                        className="profile-gallery-modal__play"
                        data-gallery-protected
                        onClick={handlePlayVideo}
                        aria-label={`Play ${item.alt ?? "video"}`}
                      >
                        <span className="profile-gallery-modal__play-icon" aria-hidden>
                          ▶
                        </span>
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            ))}
          </div>

          {count > 1 ? (
            <>
              <button
                type="button"
                className="profile-gallery-modal__nav profile-gallery-modal__nav--prev"
                data-gallery-protected
                aria-label="Previous"
                onClick={() => goToSlide(index - 1)}
              >
                ‹
              </button>
              <button
                type="button"
                className="profile-gallery-modal__nav profile-gallery-modal__nav--next"
                data-gallery-protected
                aria-label="Next"
                onClick={() => goToSlide(index + 1)}
              >
                ›
              </button>
            </>
          ) : null}
        </div>

        <footer className="profile-gallery-modal__footer">
          <div
            ref={thumbsRef}
            className="profile-gallery-modal__thumbs"
            data-gallery-protected
            role="tablist"
            aria-label="Gallery thumbnails"
          >
            {media.map((item, thumbIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                data-thumb-index={thumbIndex}
                aria-selected={thumbIndex === index}
                aria-label={item.alt ?? `Media ${thumbIndex + 1}`}
                className={cn(
                  "profile-gallery-modal__thumb",
                  thumbIndex === index && "profile-gallery-modal__thumb--active"
                )}
                onClick={() => goToSlide(thumbIndex)}
              >
                <Image
                  src={item.thumbnail ?? item.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  draggable={false}
                />
                {item.type === "video" ? (
                  <span className="profile-gallery-modal__thumb-badge" aria-hidden>
                    ▶
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </footer>
        </div>
      </div>

      <button
        type="button"
        className="profile-gallery-modal__close"
        data-gallery-close
        aria-label="Close gallery"
        onClick={handleCloseClick}
        onPointerUp={handleCloseClick}
      >
        <span className="profile-gallery-modal__close-glyph" aria-hidden>
          ×
        </span>
      </button>
    </>,
    document.body
  );
}
