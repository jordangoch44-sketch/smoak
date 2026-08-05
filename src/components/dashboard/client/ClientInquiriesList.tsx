"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClientInquiryListItem } from "@/lib/inquiry/inquiry-inbox";
import { buildLeaveReviewHref } from "@/lib/reviews/leave-review-href";
import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard/shared";

interface ClientInquiriesListProps {
  inquiries: ClientInquiryListItem[];
}

export function ClientInquiriesList({ inquiries }: ClientInquiriesListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (inquiries.length === 0) {
    return (
      <DashboardEmptyState
        message="Inquiries you send to specialists appear here. They’ll reply by email."
        actionHref="/explore"
        actionLabel="Find a specialist"
      />
    );
  }

  return (
    <DashboardSection
      title="Your inquiries"
      description="Specialists reply by email — this is your sent history in SMOAC."
    >
      <ul className="dashboard-list specialist-inquiry-list client-dash-inquiries">
        {inquiries.map((inquiry) => {
          const expanded = openId === inquiry.id;
          const profileHref = inquiry.specialistId
            ? `/trainers/${inquiry.specialistId}`
            : null;
          const reviewHref = inquiry.specialistId
            ? buildLeaveReviewHref(inquiry.specialistId)
            : null;

          return (
            <li key={inquiry.id}>
              <div
                className={
                  inquiry.unread
                    ? "specialist-inquiry-item specialist-inquiry-item--unread"
                    : "specialist-inquiry-item"
                }
              >
                <button
                  type="button"
                  className="smoac-control specialist-inquiry-item__toggle"
                  aria-expanded={expanded}
                  onClick={() => setOpenId(expanded ? null : inquiry.id)}
                >
                  <span className="specialist-inquiry-item__main">
                    <span className="specialist-inquiry-item__title">
                      {inquiry.specialist}
                    </span>
                    <span className="specialist-inquiry-item__subtitle">
                      {inquiry.actionLabel}
                      {inquiry.messagePreview
                        ? ` · ${inquiry.messagePreview}`
                        : ""}
                    </span>
                  </span>
                  <span className="specialist-inquiry-item__meta">
                    {inquiry.unread ? (
                      <span className="dashboard-badge">New</span>
                    ) : null}
                    <span>{inquiry.time}</span>
                  </span>
                </button>

                {expanded ? (
                  <div className="specialist-inquiry-item__detail">
                    <dl className="specialist-inquiry-item__fields">
                      <div>
                        <dt>Inquiry</dt>
                        <dd>{inquiry.actionLabel}</dd>
                      </div>
                      {inquiry.topicLabels.length > 0 ? (
                        <div>
                          <dt>Topics</dt>
                          <dd>{inquiry.topicLabels.join(", ")}</dd>
                        </div>
                      ) : null}
                    </dl>

                    {inquiry.messageBody ? (
                      <pre className="specialist-inquiry-item__body">
                        {inquiry.messageBody}
                      </pre>
                    ) : null}

                    <p className="client-dash-inquiries__hint">
                      Replies come by email from the specialist — not in-app chat.
                    </p>

                    <div className="client-dash-inquiries__actions">
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          className="smoac-control specialist-inquiry-item__reply"
                        >
                          View profile
                        </Link>
                      ) : null}
                      {reviewHref ? (
                        <Link
                          href={reviewHref}
                          className="smoac-control client-dash-inquiries__secondary"
                        >
                          Leave a review after you connect
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardSection>
  );
}
