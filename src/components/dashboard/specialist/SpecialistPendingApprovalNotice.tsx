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
          : justSubmitted
            ? "Thanks — we have your application. Typical review is within 24 hours. You’ll get an email when you’re approved. You can edit your submitted details below anytime while you wait."
            : "Every application is reviewed individually — typically within 24 hours. You’ll get an email at the address you signed up with when you’re approved. Then log back in and finish your full in-depth profile (pricing, availability, media, and more) from Edit profile."}
      </p>
    </section>
  );
}
