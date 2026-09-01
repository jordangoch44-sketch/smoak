"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { submitSpecialistReview } from "@/lib/reviews/specialist-reviews-client";
import {
  REVIEW_TEXT_MAX,
  REVIEW_TEXT_MIN,
  submitReviewErrorMessage,
  type SpecialistReview,
  type SubmitSpecialistReviewErrorCode,
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
  const [submitError, setSubmitError] =
    useState<SubmitSpecialistReviewErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const previous = document.body.classList.contains("review-modal-open");
    document.body.classList.add("review-modal-open");
    document.documentElement.classList.add("review-modal-open");
    return () => {
      if (!previous) {
        document.body.classList.remove("review-modal-open");
        document.documentElement.classList.remove("review-modal-open");
      }
    };
  }, []);

  useEffect(() => {
    function syncKeyboardInset() {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardHeight(0);
        return;
      }
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop
      );
      setKeyboardHeight(inset > 80 ? inset : 0);
    }

    syncKeyboardInset();
    window.visualViewport?.addEventListener("resize", syncKeyboardInset);
    window.visualViewport?.addEventListener("scroll", syncKeyboardInset);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", syncKeyboardInset);
    };
  }, []);

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
    setSubmitError(null);

    await refreshSession();

    const result = await submitSpecialistReview({
      specialistId,
      specialistName,
      rating,
      reviewText: text,
    });

    if (!result.ok) {
      setSubmitError(result.error);
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

  const sheetMaxHeight =
    keyboardHeight > 0
      ? `calc(100dvh - ${keyboardHeight + 12}px)`
      : "min(92dvh, 40rem)";

  return (
    <div
      className="review-modal-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="review-modal__backdrop smoac-control"
        aria-label="Close review"
        disabled={submitting}
        onClick={onClose}
      />
      <div
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxHeight: sheetMaxHeight }}
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

          {submitHint ? (
            <p className="review-modal__submit-hint">{submitHint}</p>
          ) : null}

          {submitError ? (
            <p className="review-modal__error" role="alert">
              {submitReviewErrorMessage({ ok: false, error: submitError })}
              {submitError === "not_authenticated" ? (
                <>
                  {" "}
                  <Link
                    href={LOGIN_PATH}
                    className="review-modal__error-link"
                    onClick={onClose}
                  >
                    Log in
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <footer className="review-modal__footer">
          <button
            type="button"
            className="smoac-control review-modal__submit"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
          <button
            type="button"
            className="smoac-control review-modal__cancel"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
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
