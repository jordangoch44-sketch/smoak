interface SpecialistPendingApprovalNoticeProps {
  variant: "pending" | "rejected";
}

export function SpecialistPendingApprovalNotice({
  variant,
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
      <h2 id="specialist-dash-notice-title" className="specialist-dash-notice__title">
        {isRejected ? "Needs changes" : "Pending approval"}
      </h2>
      <p className="specialist-dash-notice__text">
        {isRejected
          ? "Your application needs a few updates before it can go live. Edit your submitted profile below and resubmit when ready."
          : "Usual approval time is 24–72 hours. You'll receive an email once approved, and your profile will go live immediately after approval."}
      </p>
    </section>
  );
}
