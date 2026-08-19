interface SpecialistPendingApprovalNoticeProps {
  variant: "pending" | "rejected" | "missing";
  /** First landing after submit from onboarding */
  justSubmitted?: boolean;
  /** Admin note when rejected */
  rejectionReason?: string;
  /** Specialist requests another review after fixing a rejection */
  onRequestReview?: () => void | Promise<void>;
  requestReviewBusy?: boolean;
  requestReviewError?: string | null;
}

export function SpecialistPendingApprovalNotice({
  variant,
  justSubmitted = false,
  rejectionReason,
  onRequestReview,
  requestReviewBusy = false,
  requestReviewError = null,
}: SpecialistPendingApprovalNoticeProps) {
  const isRejected = variant === "rejected";
  const isMissing = variant === "missing";
  const reason = rejectionReason?.trim() ?? "";

  return (
    <section
      className={`specialist-dash-notice ${
        isRejected
          ? "specialist-dash-notice--rejected"
          : "specialist-dash-notice--pending"
      }`}
      aria-labelledby="specialist-dash-notice-title"
    >
      {!isRejected ? (
        <div className="specialist-dash-notice__icon" aria-hidden>
          <span className="specialist-dash-notice__icon-mark" />
        </div>
      ) : null}
      <h2 id="specialist-dash-notice-title" className="specialist-dash-notice__title">
        {isRejected
          ? "Needs changes"
          : isMissing
            ? "Finish submitting your application"
            : justSubmitted
              ? "Application submitted"
              : "Pending verification"}
      </h2>
      <p className="specialist-dash-notice__text">
        {isRejected
          ? "Your application needs a few updates before it can go live. Edit your submitted profile, then request another review."
          : isMissing
            ? "Your specialist account exists, but SMOAC admin hasn’t received your application yet. Sign out and back in, or contact support if this keeps happening."
            : justSubmitted
              ? "Thanks — we have your application. Typical review is within 24 hours. You’ll get an email when you’re approved."
              : "Every application is reviewed individually — typically within 24 hours. You’ll get an email at the address you signed up with when you’re approved. Once approved, your profile goes live on Marketplace."}
      </p>
      {isRejected && reason ? (
        <p className="specialist-dash-notice__reason">
          <span className="specialist-dash-notice__reason-label">What to fix:</span>{" "}
          {reason}
        </p>
      ) : null}
      {isRejected && onRequestReview ? (
        <div className="specialist-dash-notice__actions">
          <button
            type="button"
            className="smoac-control specialist-dash-notice__resubmit"
            disabled={requestReviewBusy}
            onClick={() => void onRequestReview()}
          >
            {requestReviewBusy ? "Sending…" : "Request review"}
          </button>
          {requestReviewError ? (
            <p className="specialist-dash-notice__error" role="alert">
              {requestReviewError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
