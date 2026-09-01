"use client";

import { useMemo, useState } from "react";
import type { AdminPlatformPulse } from "@/types/admin-platform-pulse";
import { generateAiExecutiveBriefing } from "@/lib/admin-ai-summary";
import { AdminAiCopilotModal } from "@/components/admin/AdminAiCopilotModal";
import { cn } from "@/lib/utils";

interface AdminAiExecutiveSummaryProps {
  pulse: AdminPlatformPulse | null;
  className?: string;
  defaultExpanded?: boolean;
}

export function AdminAiExecutiveSummary({
  pulse,
  className,
  defaultExpanded = true,
}: AdminAiExecutiveSummaryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState<string | undefined>(undefined);

  const briefing = useMemo(
    () => generateAiExecutiveBriefing(pulse),
    [pulse]
  );

  const { headline, traffic, conversion, rosterAndRevenue, actionItems } = briefing;

  function handleOpenCopilot(prompt?: string) {
    setCopilotPrompt(prompt);
    setCopilotOpen(true);
  }

  return (
    <>
      <section
        className={cn("admin-ai-briefing", className)}
        aria-label="Executive Briefing"
      >
        {/* Top Header & Controls */}
        <header className="admin-ai-briefing__header">
          <div className="admin-ai-briefing__brand-group">
            <div className="admin-ai-briefing__badge-row">
              <span className="admin-ai-briefing__sparkle-badge">
                Executive Briefing
              </span>
              <span className="admin-ai-briefing__live-pill">
                <span className="admin-ai-briefing__pulse-dot" />
                Live Telemetry
              </span>
            </div>
            <h2 className="admin-ai-briefing__title">Marketplace Summary</h2>
            <p className="admin-ai-briefing__subtitle">
              Generated from real-time platform activity ·{" "}
              <span className="admin-ai-briefing__timestamp">{briefing.generatedAt}</span>
            </p>
          </div>

          <div className="admin-ai-briefing__controls">
            <button
              type="button"
              className="admin-ai-briefing__copilot-btn"
              onClick={() => handleOpenCopilot()}
              title="Open Jarvis conversation"
            >
              <span>Ask Jarvis</span>
            </button>

            <button
              type="button"
              className="admin-ai-briefing__toggle-btn"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-controls="admin-ai-briefing-content"
            >
              <span>{expanded ? "Collapse Briefing" : "Expand Full Briefing"}</span>
              <svg
                className={cn(
                  "admin-ai-briefing__chevron",
                  expanded && "admin-ai-briefing__chevron--rotated"
                )}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Collapsed Compact State */}
        {!expanded ? (
          <div className="admin-ai-briefing__collapsed-bar">
            <div className="admin-ai-briefing__collapsed-headline">
              <p className="admin-ai-briefing__collapsed-text">{headline.text}</p>
            </div>
            <div className="admin-ai-briefing__collapsed-pills">
              <span className="admin-ai-briefing__collapsed-pill">
                {traffic.visitorCountLabel}
              </span>
              <span className="admin-ai-briefing__collapsed-pill">
                {conversion.viewToInquiryRate} View→Inquiry
              </span>
              <span className="admin-ai-briefing__collapsed-pill">
                {rosterAndRevenue.mrrFormatted} MRR
              </span>
              {rosterAndRevenue.hasPending ? (
                <span className="admin-ai-briefing__collapsed-pill admin-ai-briefing__collapsed-pill--alert">
                  {rosterAndRevenue.pendingCountLabel}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          /* Expanded Rich Briefing Content */
          <div id="admin-ai-briefing-content" className="admin-ai-briefing__body">
            {/* Section 1: The Headline */}
            <div
              className={cn(
                "admin-ai-briefing__headline-card",
                headline.sentiment === "positive" && "admin-ai-briefing__headline-card--positive",
                headline.sentiment === "attention" && "admin-ai-briefing__headline-card--attention"
              )}
            >
              <div className="admin-ai-briefing__headline-header">
                <span className="admin-ai-briefing__section-tag">Executive Headline</span>
                <span
                  className={cn(
                    "admin-ai-briefing__sentiment-badge",
                    headline.sentiment === "positive" &&
                      "admin-ai-briefing__sentiment-badge--positive",
                    headline.sentiment === "attention" &&
                      "admin-ai-briefing__sentiment-badge--attention"
                  )}
                >
                  {headline.sentimentLabel}
                </span>
              </div>
              <p className="admin-ai-briefing__headline-text">{headline.text}</p>
            </div>

            {/* Section 2: 3-Pillar Breakdown Grid */}
            <div className="admin-ai-briefing__grid">
              {/* Who's Visiting */}
              <article
                className="admin-ai-briefing__pillar-card cursor-pointer"
                onClick={() => handleOpenCopilot("Where is visitor traffic coming from?")}
                title="Ask Jarvis about traffic & audience"
              >
                <div className="admin-ai-briefing__pillar-header">
                  <h3 className="admin-ai-briefing__pillar-title">{traffic.title}</h3>
                  <span className="admin-ai-briefing__pillar-badge">
                    {traffic.visitorCountLabel}
                  </span>
                </div>

                <p className="admin-ai-briefing__pillar-text">{traffic.summaryText}</p>

                <div className="admin-ai-briefing__chips">
                  <span className="admin-ai-briefing__chip">
                    <strong className="admin-ai-briefing__chip-label">Top Source:</strong>{" "}
                    {traffic.topSourceLabel} ({traffic.topSourceShare})
                  </span>
                  <span className="admin-ai-briefing__chip">
                    <strong className="admin-ai-briefing__chip-label">Devices:</strong>{" "}
                    {traffic.mobileShareLabel}
                  </span>
                  <span className="admin-ai-briefing__chip">
                    <strong className="admin-ai-briefing__chip-label">Audience:</strong>{" "}
                    {traffic.newVsReturningLabel}
                  </span>
                </div>
              </article>

              {/* How People Are Converting */}
              <article
                className="admin-ai-briefing__pillar-card cursor-pointer"
                onClick={() => handleOpenCopilot("Why are visitors dropping off before inquiring?")}
                title="Ask Jarvis about conversion & drop-offs"
              >
                <div className="admin-ai-briefing__pillar-header">
                  <h3 className="admin-ai-briefing__pillar-title">{conversion.title}</h3>
                  <span className="admin-ai-briefing__pillar-badge admin-ai-briefing__pillar-badge--purple">
                    {conversion.viewToInquiryRate} View→Inquiry
                  </span>
                </div>

                {conversion.ratioHeadline ? (
                  <div className="admin-ai-briefing__ratio-banner">
                    <span className="admin-ai-briefing__ratio-text">
                      {conversion.ratioHeadline}
                    </span>
                  </div>
                ) : null}

                <p className="admin-ai-briefing__pillar-text">{conversion.summaryText}</p>

                {conversion.bottleneckSummary ? (
                  <div className="admin-ai-briefing__callout">
                    <p className="admin-ai-briefing__callout-text">
                      {conversion.bottleneckSummary}
                    </p>
                  </div>
                ) : null}

                {conversion.topPerformerNote ? (
                  <div className="admin-ai-briefing__top-performer">
                    <span className="admin-ai-briefing__top-performer-text">
                      {conversion.topPerformerNote}
                    </span>
                  </div>
                ) : null}
              </article>

              {/* Specialists & Revenue */}
              <article
                className="admin-ai-briefing__pillar-card cursor-pointer"
                onClick={() => handleOpenCopilot("What is the current monthly revenue breakdown?")}
                title="Ask Jarvis about revenue & subscriptions"
              >
                <div className="admin-ai-briefing__pillar-header">
                  <h3 className="admin-ai-briefing__pillar-title">
                    {rosterAndRevenue.title}
                  </h3>
                  <span className="admin-ai-briefing__pillar-badge admin-ai-briefing__pillar-badge--gold">
                    {rosterAndRevenue.mrrFormatted} MRR
                  </span>
                </div>

                <p className="admin-ai-briefing__pillar-text">
                  {rosterAndRevenue.summaryText}
                </p>

                <div className="admin-ai-briefing__chips">
                  <span className="admin-ai-briefing__chip">
                    <strong className="admin-ai-briefing__chip-label">Active Roster:</strong>{" "}
                    {rosterAndRevenue.rosterCountLabel}
                  </span>
                  <span
                    className={cn(
                      "admin-ai-briefing__chip",
                      rosterAndRevenue.hasPending && "admin-ai-briefing__chip--alert"
                    )}
                  >
                    <strong className="admin-ai-briefing__chip-label">Queue:</strong>{" "}
                    {rosterAndRevenue.pendingCountLabel}
                  </span>
                  <span className="admin-ai-briefing__chip">
                    <strong className="admin-ai-briefing__chip-label">Stripe MRR:</strong>{" "}
                    {rosterAndRevenue.mrrFormatted} ({rosterAndRevenue.payingCountLabel})
                  </span>
                  {rosterAndRevenue.adBoostFormatted !== "$0" ? (
                    <span className="admin-ai-briefing__chip">
                      <strong className="admin-ai-briefing__chip-label">Ad Boosts:</strong>{" "}
                      {rosterAndRevenue.adBoostFormatted}
                    </span>
                  ) : null}
                </div>
              </article>
            </div>

            {/* Section 3: Action Items */}
            <div className="admin-ai-briefing__actions-section">
              <div className="admin-ai-briefing__actions-header">
                <h3 className="admin-ai-briefing__actions-title">
                  Recommended Next Steps
                </h3>
              </div>

              <div className="admin-ai-briefing__actions-grid">
                {actionItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      "admin-ai-briefing__action-card cursor-pointer",
                      item.priority === "high" && "admin-ai-briefing__action-card--high",
                      item.priority === "medium" && "admin-ai-briefing__action-card--medium"
                    )}
                    onClick={() => handleOpenCopilot(`Tell me more about: ${item.title}`)}
                    title="Ask Jarvis for a breakdown on this action"
                  >
                    <div className="admin-ai-briefing__action-top">
                      <span
                        className={cn(
                          "admin-ai-briefing__priority-tag",
                          item.priority === "high" && "admin-ai-briefing__priority-tag--high",
                          item.priority === "medium" && "admin-ai-briefing__priority-tag--medium"
                        )}
                      >
                        Step {idx + 1} · {item.priorityLabel}
                      </span>
                    </div>
                    <h4 className="admin-ai-briefing__action-title">{item.title}</h4>
                    <p className="admin-ai-briefing__action-desc">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Floating Jarvis Launcher Button */}
      <button
        type="button"
        className="admin-copilot-fab"
        onClick={() => handleOpenCopilot()}
        title="Open Jarvis"
        aria-label="Open Jarvis"
      >
        <span>Jarvis</span>
      </button>

      {/* Copilot Modal */}
      <AdminAiCopilotModal
        open={copilotOpen}
        onClose={() => {
          setCopilotOpen(false);
          setCopilotPrompt(undefined);
        }}
        pulse={pulse}
        initialPrompt={copilotPrompt}
      />
    </>
  );
}
