"use client";

import { useEffect, useState } from "react";
import { PageWaitState } from "@/components/brand/PageWaitState";
import { DashboardSection } from "@/components/dashboard";

interface TrustReportRow {
  id: string;
  surface: string;
  reason: string;
  details: string;
  specialist_id: string | null;
  status: string;
  created_at: string;
  reporterName: string;
  targetName: string;
}

export function AdminReportsPanel() {
  const [reports, setReports] = useState<TrustReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/trust-reports", { credentials: "include" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | { ok?: boolean; message?: string; reports?: TrustReportRow[] }
          | null;
        if (cancelled) return;
        if (!res.ok || !body?.ok || !body.reports) {
          setError(body?.message ?? "Could not load reports.");
          return;
        }
        setReports(body.reports);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load reports.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(id: string, status: "reviewed" | "dismissed") {
    const response = await fetch("/api/admin/trust-reports", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!response.ok) return;
    setReports((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status } : row))
    );
  }

  return (
    <DashboardSection
      title="Reports"
      description="Profile and inquiry reports from signed-in accounts."
    >
      {loading ? <PageWaitState label="Loading reports" compact /> : null}
      {error ? <p className="admin-status-error">{error}</p> : null}
      {!loading && !error && reports.length === 0 ? (
        <p className="admin-status-error">No reports yet.</p>
      ) : null}
      <ul className="admin-report-list">
        {reports.map((report) => (
          <li key={report.id} className="admin-report-list__item">
            <p className="admin-report-list__title">
              {report.reason}
              <span> · {report.surface}</span>
              <span> · {report.status}</span>
            </p>
            <p className="admin-report-list__meta">
              {report.reporterName}
              {report.targetName ? ` reported ${report.targetName}` : ""}
              {report.specialist_id ? ` · ${report.specialist_id}` : ""}
            </p>
            {report.details ? (
              <p className="admin-report-list__details">{report.details}</p>
            ) : null}
            {report.status === "open" ? (
              <div className="admin-report-list__actions">
                <button type="button" onClick={() => void setStatus(report.id, "reviewed")}>
                  Mark reviewed
                </button>
                <button type="button" onClick={() => void setStatus(report.id, "dismissed")}>
                  Dismiss
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}
