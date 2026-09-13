"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import { useToast } from "@/components/ui/toast";
import { GoogleMark } from "@/components/brand/GoogleMark";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { buildLeaveReviewHref } from "@/lib/reviews/leave-review-href";
import { copyTrainerProfileLink, copyTextToClipboard } from "@/lib/profile-share";
import { cn } from "@/lib/utils";

const LANDING_SETUP_STEPS = [
  {
    n: 1,
    word: "one",
    text: "Create a free Google Business listing.",
  },
  {
    n: 2,
    word: "two",
    text: "Copy this profile link and paste it as your website.",
  },
  {
    n: 3,
    word: "three",
    text: "Don’t pay for a website — use the professional dashboard and be 3× as likely to be found by clients.",
  },
] as const;

const GOOGLE_BUSINESS_CREATE_URL = "https://business.google.com/create";
const COPY_FLASH_MS = 2500;

interface SpecialistLinkInBioCardProps {
  trainerId: string;
  trainerName?: string;
  slug?: string | null;
  className?: string;
}

export function SpecialistLinkInBioCard({
  trainerId,
  slug,
  className,
}: SpecialistLinkInBioCardProps) {
  const setupPanelId = useId();
  const [copiedBio, setCopiedBio] = useState(false);
  const [copiedReview, setCopiedReview] = useState(false);
  const [copiedWebsite, setCopiedWebsite] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const bioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const websiteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      if (bioTimerRef.current) clearTimeout(bioTimerRef.current);
      if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
      if (websiteTimerRef.current) clearTimeout(websiteTimerRef.current);
    };
  }, []);

  const flashCopied = useCallback(
    (
      setter: (value: boolean) => void,
      timerRef: { current: ReturnType<typeof setTimeout> | null }
    ) => {
      setter(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setter(false), COPY_FLASH_MS);
    },
    []
  );

  const handleCopyBio = useCallback(async () => {
    try {
      await copyTrainerProfileLink({ id: trainerId, slug });
      flashCopied(setCopiedBio, bioTimerRef);
      showToast({
        type: "success",
        message: "Instagram bio link copied to clipboard.",
      });
    } catch {
      showToast({
        type: "info",
        message: "Could not copy link to clipboard.",
      });
    }
  }, [trainerId, slug, showToast, flashCopied]);

  const handleCopyReview = useCallback(async () => {
    try {
      if (typeof window === "undefined") {
        throw new Error("Clipboard unavailable");
      }
      const origin = window.location.origin;
      const reviewUrl = `${origin}${buildLeaveReviewHref(trainerId)}`;
      await copyTextToClipboard(reviewUrl);

      flashCopied(setCopiedReview, reviewTimerRef);
      showToast({
        type: "success",
        message: "Review link copied. Send to clients to collect reviews!",
      });
    } catch {
      showToast({
        type: "info",
        message: "Could not copy link to clipboard.",
      });
    }
  }, [trainerId, showToast, flashCopied]);

  const handleCopyWebsite = useCallback(async () => {
    try {
      await copyTrainerProfileLink({ id: trainerId, slug });
      flashCopied(setCopiedWebsite, websiteTimerRef);
      showToast({
        type: "success",
        message: "Copied. Set this link as your website on Google Business.",
      });
    } catch {
      showToast({
        type: "info",
        message: "Could not copy link to clipboard.",
      });
    }
  }, [trainerId, slug, showToast, flashCopied]);

  return (
    <div className={cn("specialist-bio-link-card", className)}>
      <div className="specialist-bio-link-card__glow-aura" aria-hidden="true" />

      <div className="specialist-bio-link-card__top">
        <div className="specialist-bio-link-card__header">
          <div className="specialist-bio-link-card__title-row">
            <svg
              className="specialist-bio-link-card__ig-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="ig-link-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fdf497" />
                  <stop offset="15%" stopColor="#fd5949" />
                  <stop offset="50%" stopColor="#d6249f" />
                  <stop offset="100%" stopColor="#285AEB" />
                </linearGradient>
              </defs>
              <path
                fill="url(#ig-link-grad)"
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
              />
            </svg>
            <h3 className="specialist-bio-link-card__title">
              Add this to your Instagram bio
            </h3>
          </div>
          <p className="specialist-bio-link-card__subtitle">
            Share your booking page or collect verified client reviews.
          </p>
        </div>

        <div className="specialist-bio-link-card__actions">
          <button
            type="button"
            onClick={handleCopyBio}
            className={cn(
              "specialist-bio-link-card__btn specialist-bio-link-card__btn--primary smoac-control",
              copiedBio && "specialist-bio-link-card__btn--copied"
            )}
            aria-label={copiedBio ? "Instagram bio link copied" : "Copy Instagram bio link"}
          >
            {copiedBio ? (
              <>
                <CheckIcon />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy bio link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyReview}
            className={cn(
              "specialist-bio-link-card__btn specialist-bio-link-card__btn--secondary smoac-control",
              copiedReview && "specialist-bio-link-card__btn--copied"
            )}
            aria-label={copiedReview ? "Review link copied" : "Get more reviews"}
          >
            {copiedReview ? (
              <>
                <CheckIcon />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <StarIcon />
                <span>Get more reviews</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="specialist-bio-link-card__landing">
        <div className="specialist-bio-link-card__landing-heading">
          <GoogleMark className="specialist-bio-link-card__google-mark" />
          <h4 className="specialist-bio-link-card__landing-title">
            Make SMOAC your landing page
          </h4>
        </div>

        <FastActivateButton
          className={cn(
            "specialist-bio-link-card__btn specialist-bio-link-card__btn--secondary specialist-bio-link-card__btn--copy-link smoac-control",
            copiedWebsite && "specialist-bio-link-card__btn--copied"
          )}
          aria-label={
            copiedWebsite
              ? "Profile link copied"
              : "Copy this profile link"
          }
          onActivate={() => {
            void handleCopyWebsite();
          }}
        >
          {copiedWebsite ? (
            <>
              <CheckIcon />
              <span>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon />
              <span>Copy this link</span>
            </>
          )}
        </FastActivateButton>

        <FastActivateButton
          className={cn(
            "smoac-control specialist-bio-link-card__setup-toggle",
            setupOpen && "specialist-bio-link-card__setup-toggle--open"
          )}
          aria-expanded={setupOpen}
          aria-controls={setupPanelId}
          onActivate={() => setSetupOpen((open) => !open)}
        >
          <span>How to set this up</span>
          <span
            className={cn(
              "specialist-bio-link-card__setup-chevron",
              setupOpen && "specialist-bio-link-card__setup-chevron--open"
            )}
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </FastActivateButton>

        <div
          id={setupPanelId}
          className={cn(
            "specialist-bio-link-card__setup-panel",
            setupOpen && "specialist-bio-link-card__setup-panel--open"
          )}
          hidden={!setupOpen}
        >
          <ol className="specialist-bio-link-card__setup-steps">
            {LANDING_SETUP_STEPS.map((step) => (
              <li key={step.n} className="specialist-bio-link-card__setup-step">
                <span className="specialist-bio-link-card__setup-num" aria-hidden>
                  {step.n}
                </span>
                <span className="specialist-bio-link-card__setup-body">
                  <span className="specialist-bio-link-card__setup-kicker">
                    Step {step.word}
                  </span>
                  <span className="specialist-bio-link-card__setup-copy">
                    {step.text}
                  </span>
                  {step.n === 1 ? (
                    <a
                      href={GOOGLE_BUSINESS_CREATE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="specialist-bio-link-card__setup-link smoac-control"
                    >
                      Create a Google Business
                      <ExternalIcon />
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      className="specialist-bio-link-card__btn-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="specialist-bio-link-card__btn-icon specialist-bio-link-card__btn-icon--check"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="specialist-bio-link-card__btn-icon specialist-bio-link-card__btn-icon--star"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      className="specialist-bio-link-card__btn-icon specialist-bio-link-card__btn-icon--external"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
