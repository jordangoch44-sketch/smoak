"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ReviewAccountGate } from "@/components/profile/ReviewAccountGate";
import { HeaderChromeLink } from "@/components/layout/HeaderChromeLink";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import { CLIENT_DASHBOARD_PATH } from "@/lib/auth-routes";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import { sendClientWelcomeEmail } from "@/lib/email/confirmation-email-service";
import { submitSpecialistReview } from "@/lib/reviews/specialist-reviews-client";
import {
  REVIEW_TEXT_MAX,
  REVIEW_TEXT_MIN,
  submitReviewErrorMessage,
  type SpecialistReview,
  type SubmitSpecialistReviewErrorCode,
} from "@/lib/reviews/specialist-review-types";
import { cn } from "@/lib/utils";

const FINISH_ACCOUNT_SETUP_HREF = `${CLIENT_DASHBOARD_PATH}?editProfile=1`;

interface WriteSpecialistReviewModalProps {
  open: boolean;
  onClose: () => void;
  specialistId: string;
  specialistName: string;
  onSubmitted: (review: SpecialistReview) => void;
}

function dismissReviewKeyboard() {
  const field = document.getElementById("smoac-review-text");
  if (field instanceof HTMLElement) field.blur();
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

function ReviewModalForm({
  specialistId,
  specialistName,
  onClose,
  onSubmitted,
}: Omit<WriteSpecialistReviewModalProps, "open">) {
  const titleId = useId();
  const { session, isReady, refreshSession } = useAuthSession();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [submitError, setSubmitError] =
    useState<SubmitSpecialistReviewErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingAccount, setAwaitingAccount] = useState(false);
  const [accountGate, setAccountGate] = useState<null | "signup" | "signin">(
    null
  );
  const [submitted, setSubmitted] = useState(false);
  const [offerSetup, setOfferSetup] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const submittingRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const backdropDismiss = useOwnPointerDismiss(() => {
    if (submittingRef.current) return;
    onClose();
  });

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

  const openAccountGate = useCallback((mode: "signup" | "signin") => {
    dismissReviewKeyboard();
    setAwaitingAccount(true);
    setAccountGate(mode);
  }, []);

  const publishReview = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const result = await submitSpecialistReview({
      specialistId,
      specialistName,
      rating,
      reviewText: text,
    });

    submittingRef.current = false;
    setSubmitting(false);

    if (!result.ok) {
      if (
        result.error === "not_authenticated" ||
        result.error === "not_client"
      ) {
        openAccountGate("signup");
        return;
      }
      setSubmitError(result.error);
      return;
    }

    onSubmitted(result.review);
    setSubmitted(true);
  }, [
    onSubmitted,
    openAccountGate,
    rating,
    specialistId,
    specialistName,
    text,
  ]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || !canSubmit || submitted) return;
    setSubmitError(null);

    if (isReady && session?.role !== "client") {
      openAccountGate("signup");
      return;
    }

    await refreshSession();
    const current = getAuthSessionSnapshot();
    if (!current || current.role !== "client") {
      openAccountGate("signup");
      return;
    }

    await publishReview();
  }, [
    canSubmit,
    isReady,
    openAccountGate,
    publishReview,
    refreshSession,
    session?.role,
    submitted,
  ]);

  const handleAuthenticated = useCallback(
    async (result: {
      created: boolean;
      email: string;
      firstName?: string;
    }) => {
      setAccountGate(null);
      setAwaitingAccount(false);
      setSubmitError(null);
      setOfferSetup(true);
      if (result.created) {
        setWelcomeSent(true);
        void sendClientWelcomeEmail({
          to: result.email,
          firstName: result.firstName,
        });
      }
      await publishReview();
    },
    [publishReview]
  );

  const promptAccount = awaitingAccount && session?.role !== "client";
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
      onPointerDown={backdropDismiss.onPointerDown}
      onPointerUp={backdropDismiss.onPointerUp}
      onClick={backdropDismiss.onClick}
    >
      <FastActivateButton
        className="review-modal__backdrop smoac-control"
        aria-label="Close review"
        disabled={submitting}
        onActivate={onClose}
      />
      <div
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxHeight: sheetMaxHeight }}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="review-modal__header">
          <h2 id={titleId} className="review-modal__title">
            {submitted ? "Review submitted" : `Leave a review for ${specialistName}`}
          </h2>
          <FastActivateButton
            className="smoac-control review-modal__close"
            aria-label="Close review"
            disabled={submitting}
            onActivate={onClose}
          >
            <CloseIcon className="h-5 w-5" />
          </FastActivateButton>
        </header>

        <div className="review-modal__body">
          {submitted ? (
            <p className="review-modal__success">
              {offerSetup
                ? welcomeSent
                  ? "You’re signed in to your SMOAC account. A welcome email is on its way. Finish setting up your profile whenever you’re ready."
                  : "You’re signed in to your SMOAC account. Finish setting up your profile whenever you’re ready."
                : "Your review is on this specialist’s profile."}
            </p>
          ) : (
            <>
          <div
            className="review-modal__stars"
            role="radiogroup"
            aria-label="Star rating"
          >
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= displayStars;
              return (
                <FastActivateButton
                  key={value}
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
                  onActivate={() => setRating(value)}
                >
                  ★
                </FastActivateButton>
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
            </p>
          ) : null}
            </>
          )}
        </div>

        <footer className="review-modal__footer">
          {submitted ? (
            <>
              <FastActivateButton
                className="smoac-control review-modal__submit"
                onActivate={onClose}
              >
                Review submitted
              </FastActivateButton>
              {offerSetup ? (
                <HeaderChromeLink
                  href={FINISH_ACCOUNT_SETUP_HREF}
                  className="smoac-control review-modal__cancel"
                  onActivate={onClose}
                >
                  Finish setting up
                </HeaderChromeLink>
              ) : null}
            </>
          ) : promptAccount ? (
            <>
              <FastActivateButton
                className="smoac-control review-modal__submit"
                disabled={submitting}
                onActivate={() => openAccountGate("signup")}
              >
                Create an account
              </FastActivateButton>
              <FastActivateButton
                className="smoac-control review-modal__or-login"
                disabled={submitting}
                onActivate={() => openAccountGate("signin")}
              >
                or log in
              </FastActivateButton>
            </>
          ) : (
            <FastActivateButton
              className="smoac-control review-modal__submit"
              disabled={!canSubmit}
              onActivate={() => void handleSubmit()}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </FastActivateButton>
          )}
          <FastActivateButton
            className="smoac-control review-modal__cancel"
            disabled={submitting}
            onActivate={onClose}
          >
            Cancel
          </FastActivateButton>
        </footer>
      </div>
      {accountGate ? (
        <ReviewAccountGate
          initialMode={accountGate}
          onClose={() => setAccountGate(null)}
          onAuthenticated={(result) => void handleAuthenticated(result)}
        />
      ) : null}
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
