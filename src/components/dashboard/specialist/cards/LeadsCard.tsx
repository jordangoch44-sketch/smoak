"use client";

import { useState } from "react";
import type { SpecialistLead } from "@/types/specialist-dashboard";
import {
  DashboardCollapsibleSection,
  DashboardEmptyState,
  DashboardSectionIcon,
} from "@/components/dashboard/shared";

interface LeadsCardProps {
  leads: SpecialistLead[];
  onOpenLead?: (lead: SpecialistLead) => void;
  defaultOpen?: boolean;
}

function mailtoHref(lead: SpecialistLead): string | null {
  const email = lead.clientEmail.trim();
  if (!email || !email.includes("@")) return null;
  const subject = encodeURIComponent(`Re: your SMOAC inquiry`);
  const body = encodeURIComponent(
    `Hi ${lead.name},\n\nThanks for reaching out on SMOAC.\n\n`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function LeadsCard({
  leads,
  onOpenLead,
  defaultOpen = true,
}: LeadsCardProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const unreadCount = leads.filter((lead) => lead.unread).length;

  return (
    <div id="specialist-inquiries">
      <DashboardCollapsibleSection
        title="Inquiries"
        icon={<DashboardSectionIcon id="inquiries" />}
        description={
          unreadCount > 0
            ? `${unreadCount} waiting for your email reply`
            : "Client inquiries — reply by email"
        }
        summary={
          leads.length === 0
            ? "None yet"
            : unreadCount > 0
              ? `${unreadCount} new · ${leads.length} total`
              : `${leads.length} total`
        }
        defaultOpen={defaultOpen}
        span="full"
      >
        {leads.length === 0 ? (
          <DashboardEmptyState message="No inquiries yet. When a client contacts you, their details show here and you’ll get an email." />
        ) : (
          <ul className="dashboard-list specialist-inquiry-list">
            {leads.map((lead) => {
              const expanded = openId === lead.id;
              const mail = mailtoHref(lead);

              return (
                <li key={lead.id}>
                  <div
                    className={
                      lead.unread
                        ? "specialist-inquiry-item specialist-inquiry-item--unread"
                        : "specialist-inquiry-item"
                    }
                  >
                    <button
                      type="button"
                      className="smoac-control specialist-inquiry-item__toggle"
                      aria-expanded={expanded}
                      onClick={() => {
                        const next = expanded ? null : lead.id;
                        setOpenId(next);
                        if (next) onOpenLead?.(lead);
                      }}
                    >
                      <span className="specialist-inquiry-item__main">
                        <span className="specialist-inquiry-item__title">
                          {lead.name}
                        </span>
                        <span className="specialist-inquiry-item__subtitle">
                          {lead.intent}
                          {lead.messagePreview
                            ? ` · ${lead.messagePreview}`
                            : ""}
                        </span>
                      </span>
                      <span className="specialist-inquiry-item__meta">
                        {lead.unread ? (
                          <span className="dashboard-badge">New</span>
                        ) : null}
                        <span>{lead.receivedAt}</span>
                      </span>
                    </button>

                    {expanded ? (
                      <div className="specialist-inquiry-item__detail">
                        <dl className="specialist-inquiry-item__fields">
                          <div>
                            <dt>Inquiry</dt>
                            <dd>{lead.actionLabel}</dd>
                          </div>
                          {lead.topicLabels.length > 0 ? (
                            <div>
                              <dt>Topics</dt>
                              <dd>{lead.topicLabels.join(", ")}</dd>
                            </div>
                          ) : null}
                          {lead.clientEmail ? (
                            <div>
                              <dt>Client email</dt>
                              <dd>
                                <a
                                  className="smoac-control specialist-inquiry-item__email"
                                  href={`mailto:${lead.clientEmail}`}
                                >
                                  {lead.clientEmail}
                                </a>
                              </dd>
                            </div>
                          ) : null}
                        </dl>

                        {lead.messageBody ? (
                          <pre className="specialist-inquiry-item__body">
                            {lead.messageBody}
                          </pre>
                        ) : null}

                        {mail ? (
                          <a
                            className="smoac-control specialist-inquiry-item__reply"
                            href={mail}
                          >
                            Reply by email
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DashboardCollapsibleSection>
    </div>
  );
}
