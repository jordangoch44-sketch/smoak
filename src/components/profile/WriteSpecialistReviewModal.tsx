"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import { submitSpecialistReview } from "@/lib/reviews/specialist-reviews-client";
import {
  REVIEW_TEXT_MAX,
  REVIEW_TEXT_MIN,
  submitReviewErrorMessage,
  type SpecialistReview,
} from "@/lib/reviews/specialist-review-types";
import { cn } from "@/lib/utils";

interface WriteSpecialistReviewModalProps {
  open: boolean;
  onClose: () => void;
  specialistId: string;
  specialistName: string;
  onSubmitted: (review: SpecialistReview) => void;
}

function ReviewModalForm({
  specialistId,
  specialistName,
  onClose,
  onSubmitted,
}: Omit<WriteSpecialistReviewModalProps, "open">) {
  const titleId = useId();
  const { refreshSession } = useAuthSession();
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [viewportLayout, setViewportLayout] = useState<{
    height: number;
    offsetTop: number;
  } | null>(null);

  useEffect(() => {
    const previous = document.body.classList.contains("review-modal-open");
    document.body.classList.add("review-modal-open");
    return () => {
      if (!previous) {
        document.body.classList.remove("review-modal-open");
      }
    };
  }, []);

  useEffect(() => {
    function syncViewport() {
      const viewport = window.visualViewport;
      setViewportLayout({
        height: viewport?.height ?? window.innerHeight,
        offsetTop: viewport?.offsetTop ?? 0,
      });
    }

    syncViewport();
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const scrollActionsIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      actionsRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (rating < 1) return;
    scrollActionsIntoView();
  }, [rating, scrollActionsIntoView]);

  const trimmedLength = text.trim().length;
  const canSubmit =
    rating >= 1 &&
    rating <= 5 &&
    trimmedLength >= REVIEW_TEXT_MIN &&
    trimmedLength <= REVIEW_TEXT_MAX &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || !canSubmit) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    await refreshSession();

    const result = await submitSpecialistReview({
      specialistId,
      specialistName,
      rating,
      reviewText: text,
    });

    if (!result.ok) {
      setError(submitReviewErrorMessage(result));
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    onSubmitted(result.review);
    showToast({
      message: "Your review has been submitted.",
      type: "success",
    });
    onClose();
    submittingRef.current = false;
    setSubmitting(false);
  }, [
    canSubmit,
    onClose,
    onSubmitted,
    rating,
    refreshSession,
    showToast,
    specialistId,
    text,
    specialistName,
  ]);

  const displayStars = hovered || rating;
  const submitHint =
    rating < 1
      ? "Select a star rating to continue."
      : trimmedLength < REVIEW_TEXT_MIN
        ? `Write at least ${REVIEW_TEXT_MIN} characters to submit.`
        : null;

  return (
    <div
      className="review-modal-root"
      role="presentation"
      style={
        viewportLayout
          ? {
              top: `${viewportLayout.offsetTop}px`,
              height: `${viewportLayout.height}px`,
            }
          : undefined
      }
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="review-modal__backdrop" aria-hidden />
      <div
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={
          viewportLayout
            ? { maxHeight: `${Math.min(viewportLayout.height * 0.94, 640)}px` }
            : undefined
        }
      >
        <header className="review-modal__header">
          <h2 id={titleId} className="review-modal__title">
            Leave a review for {specialistName}
          </h2>
          <button
            type="button"
            className="smoac-control review-modal__close"
            aria-label="Close review"
            disabled={submitting}
            onClick={onClose}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="review-modal__body">
          <div
            className="review-modal__stars"
            role="radiogroup"
            aria-label="Star rating"
          >
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= displayStars;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  className={cn(
                    "smoac-control review-modal__star",
                    active && "review-modal__star--active"
                  )}
                  disabled={submitting}
                  onMouseEnter={() => setHovered(value)}
                  onMouseLeave={() => setHovered(0)}
                  onFocus={() => setHovered(value)}
                  onBlur={() => setHovered(0)}
                  onClick={() => setRating(value)}
                >
                  ★
                </button>
              );
            })}
          </div>

          <label className="review-modal__label" htmlFor="smoac-review-text">
            Your review
          </label>
          <textarea
            id="smoac-review-text"
            className="review-modal__textarea"
            placeholder="Share a short description of your experience…"
            value={text}
            maxLength={REVIEW_TEXT_MAX}
            disabled={submitting}
            rows={4}
            enterKeyHint="send"
            onFocus={scrollActionsIntoView}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="review-modal__count-row">
            <span className="review-modal__hint">
              SMOAC Client Review · Submitted by a signed-in SMOAC client
            </span>
            <span
              className={cn(
                "review-modal__count",
                trimmedLength > 0 &&
                  trimmedLength < REVIEW_TEXT_MIN &&
                  "review-modal__count--warn"
              )}
            >
              {trimmedLength}/{REVIEW_TEXT_MAX}
            </span>
          </div>

          {error ? <p className="review-modal__error">{error}</p> : null}

          <div className="review-modal__actions" ref={actionsRef}>
            <button
              type="button"
              className="smoac-control review-modal__cancel"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="smoac-control review-modal__submit"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
          {submitHint ? (
            <p className="review-modal__submit-hint">{submitHint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function WriteSpecialistReviewModal({
  open,
  onClose,
  specialistId,
  specialistName,
  onSubmitted,
}: WriteSpecialistReviewModalProps) {
  const hydrated = useHydrated();
  if (!hydrated || !open) return null;

  return createPortal(
    <ReviewModalForm
      key={`${specialistId}-${specialistName}`}
      specialistId={specialistId}
      specialistName={specialistName}
      onClose={onClose}
      onSubmitted={onSubmitted}
    />,
    document.body
  );
}
