interface SpecialistPendingApprovalNoticeProps {
  variant: "pending" | "rejected";
  /** First landing after submit from onboarding */
  justSubmitted?: boolean;
}

export function SpecialistPendingApprovalNotice({
  variant,
  justSubmitted = false,
}: SpecialistPendingApprovalNoticeProps) {
  const isRejected = variant === "rejected";

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
          : justSubmitted
            ? "Application submitted"
            : "Pending verification"}
      </h2>
      <p className="specialist-dash-notice__text">
        {isRejected
          ? "Your application needs a few updates before it can go live. Edit your submitted profile below and resubmit when ready."
          : "Every application is individually reviewed and typically verified within 24 hours. You’ll receive an email when your account is verified — then your profile can go live on SMOAC."}
      </p>
    </section>
  );
}
