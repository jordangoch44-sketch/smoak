"use client";

import { useCallback, useEffect, useState } from "react";
import { OutreachDialog } from "@/components/admin/outreach/OutreachDialog";
import { formatOutreachDate, outreachStatusLabel } from "@/lib/outreach/catalog";
import type {
  OutreachCampaignGroup,
  OutreachCampaignReportData,
} from "@/lib/outreach/campaign-report";

function CopyEmailsButton({ group }: { group: OutreachCampaignGroup }) {
  const [copied, setCopied] = useState(false);
  if (group.emails.length === 0) return null;
  return (
    <button
      type="button"
      className="admin-btn admin-btn--compact admin-btn--ghost"
      onClick={() => {
        void navigator.clipboard?.writeText(group.emails.join(", ")).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        });
      }}
    >
      {copied ? "Copied" : `Copy ${group.emails.length} email${group.emails.length === 1 ? "" : "s"}`}
    </button>
  );
}

export function OutreachCampaignReport({
  campaignId,
  onClose,
}: {
  campaignId: string;
  onClose: () => void;
}) {
  const [report, setReport] = useState<OutreachCampaignReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/outreach/campaigns/${campaignId}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      report?: OutreachCampaignReportData;
    } | null;
    if (!res.ok || !data?.ok || !data.report) {
      return {
        error: typeof data?.message === "string" ? data.message : "Could not load these results.",
      };
    }
    return { report: data.report };
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    void load().then((result) => {
      if (cancelled) return;
      if ("error" in result) setError(result.error ?? null);
      else setReport(result.report);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    const result = await load();
    setRefreshing(false);
    if ("error" in result) {
      setError(result.error ?? null);
      return;
    }
    setError(null);
    setReport(result.report);
  }

  const when = report
    ? report.completedAt
      ? `Finished ${formatOutreachDate(report.completedAt)}`
      : report.startedAt
        ? `Started ${formatOutreachDate(report.startedAt)}`
        : report.scheduledAt
          ? `Scheduled ${formatOutreachDate(report.scheduledAt)}`
          : `Created ${formatOutreachDate(report.createdAt)}`
    : "";
  const subtitle = report
    ? `${report.templateName || "Template removed"} · ${report.statusLabel} · ${
        report.deliveryMode === "live" ? "Live" : "Test mode"
      } · ${when}`
    : "Results for this campaign";
  const funnelMax = Math.max(report?.funnel[0]?.count ?? 0, 1);
  const timingMax = Math.max(
    1,
    ...(report?.timing?.buckets.flatMap((bucket) => [bucket.opens, bucket.responses]) ?? [])
  );

  return (
    <OutreachDialog
      title={report?.name ?? "Campaign results"}
      subtitle={subtitle}
      sheet
      onClose={onClose}
    >
      {error ? <p className="admin-outreach-crm__error">{error}</p> : null}
      {!report && !error ? <p className="admin-outreach-crm__muted">Loading results…</p> : null}
      {report ? (
        <div className="admin-outreach-report">
          <div className="admin-outreach-report__summary">
            <p className="admin-outreach-report__read">{report.read}</p>
            <button
              type="button"
              className="admin-btn admin-btn--compact"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="admin-outreach-report__tiles">
            {report.tiles.map((tile) => (
              <div
                key={tile.label}
                className={`admin-outreach-report__tile${
                  tile.tone ? ` admin-outreach-report__tile--${tile.tone}` : ""
                }`}
              >
                <span>{tile.label}</span>
                <strong>{tile.rate != null ? `${tile.rate}%` : tile.value}</strong>
                <small>{tile.caption}</small>
              </div>
            ))}
          </div>
          <p className="admin-outreach-report__note">{report.trackingNote}</p>

          <section className="admin-outreach-report__section">
            <h3>How it moved</h3>
            <div className="admin-outreach-report__funnel">
              {report.funnel.map((step) => (
                <div key={step.label} className="admin-outreach-report__step">
                  <div className="admin-outreach-report__step-top">
                    <span>{step.label}</span>
                    <strong>{step.count}</strong>
                  </div>
                  <div className="admin-outreach-report__track" aria-hidden="true">
                    <span style={{ width: `${(step.count / funnelMax) * 100}%` }} />
                  </div>
                  <p>{step.hint}</p>
                </div>
              ))}
            </div>
          </section>

          {report.segments.map((segment) => (
            <section key={segment.key} className="admin-outreach-report__section">
              <h3>{segment.title}</h3>
              <div className="admin-outreach-report__table-wrap">
                <table className="admin-outreach-report__table">
                  <thead>
                    <tr>
                      <th scope="col">{segment.key === "category" ? "Category" : "Source"}</th>
                      <th scope="col">Emailed</th>
                      <th scope="col">Opened</th>
                      <th scope="col">Clicked</th>
                      <th scope="col">Responded</th>
                      <th scope="col">Signed up</th>
                      <th scope="col">Response rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segment.rows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <td>{row.emailed}</td>
                        <td>{row.opened}</td>
                        <td>{row.clicked}</td>
                        <td>{row.responded}</td>
                        <td>{row.signedUp}</td>
                        <td>
                          <strong>{row.responseRate != null ? `${row.responseRate}%` : "—"}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          {report.timing ? (
            <section className="admin-outreach-report__section">
              <h3>When people responded</h3>
              <div className="admin-outreach-report__timing-stats">
                <div>
                  <span>Typical time to open</span>
                  <strong>{report.timing.medianOpen ?? "—"}</strong>
                </div>
                <div>
                  <span>Typical time to respond</span>
                  <strong>{report.timing.medianResponse ?? "—"}</strong>
                </div>
              </div>
              <div className="admin-outreach-report__timing">
                {report.timing.buckets.map((bucket) => (
                  <div key={bucket.label} className="admin-outreach-report__timing-row">
                    <span>{bucket.label}</span>
                    <div className="admin-outreach-report__timing-bars" aria-hidden="true">
                      <span
                        className="admin-outreach-report__bar admin-outreach-report__bar--open"
                        style={{ width: `${(bucket.opens / timingMax) * 100}%` }}
                      />
                      <span
                        className="admin-outreach-report__bar admin-outreach-report__bar--response"
                        style={{ width: `${(bucket.responses / timingMax) * 100}%` }}
                      />
                    </div>
                    <small>
                      {bucket.opens} opened · {bucket.responses} responded
                    </small>
                  </div>
                ))}
              </div>
              <p className="admin-outreach-report__note">
                Counted from when each email was sent. Use it to time the follow-up.
              </p>
            </section>
          ) : null}

          {report.links.length > 0 ? (
            <section className="admin-outreach-report__section">
              <h3>Links people clicked</h3>
              <ul className="admin-outreach-report__links">
                {report.links.map((link) => (
                  <li key={link.url}>
                    <span title={link.url}>{link.label}</span>
                    <strong>
                      {link.people} {link.people === 1 ? "person" : "people"}
                    </strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="admin-outreach-report__section">
            <h3>For the next campaign</h3>
            <div className="admin-outreach-report__groups">
              {report.groups.map((group) => (
                <article key={group.key} className="admin-outreach-report__group">
                  <header>
                    <h4>
                      {group.title}
                      <span>{group.total}</span>
                    </h4>
                    <p>{group.detail}</p>
                    <CopyEmailsButton group={group} />
                  </header>
                  {group.total === 0 ? (
                    <p className="admin-outreach-crm__muted">None on this campaign.</p>
                  ) : (
                    <ul className="admin-outreach-report__people">
                      {group.people.map((person) => (
                        <li key={person.id}>
                          <div className="admin-outreach-report__person-top">
                            <strong>{person.name}</strong>
                            <span className="admin-outreach-report__person-tags">
                              {person.engagement ? (
                                <span
                                  className={`admin-outreach-report__engaged admin-outreach-report__engaged--${person.engagement}`}
                                >
                                  {person.engagement === "clicked" ? "Clicked" : "Opened"}
                                </span>
                              ) : null}
                              <span
                                className={`admin-badge admin-outreach-status admin-outreach-status--${person.status}`}
                              >
                                {outreachStatusLabel(person.status)}
                              </span>
                            </span>
                          </div>
                          <p>
                            {person.business ? `${person.business} · ` : ""}
                            {person.email || "No email"}
                          </p>
                          {person.note ? <p className="admin-outreach-report__person-note">{person.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {group.total > group.people.length ? (
                    <p className="admin-outreach-crm__muted">
                      Showing {group.people.length} of {group.total}.
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          {report.health.length > 0 ? (
            <section className="admin-outreach-report__section">
              <h3>Send detail</h3>
              <dl className="admin-outreach-crm__stats">
                {report.health.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.count}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      ) : null}
    </OutreachDialog>
  );
}
