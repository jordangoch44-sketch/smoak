"use client";

import { useCallback, useEffect, useState } from "react";
import { OutreachDialog } from "@/components/admin/outreach/OutreachDialog";
import type { AdminOutreachTemplate } from "@/lib/admin-outreach";
import {
  formatOutreachDate,
  prospectCanReceiveEmail,
} from "@/lib/outreach/catalog";
import type {
  OutreachCampaignSummary,
  OutreachRecipientPreview,
} from "@/lib/outreach/campaigns";
import type { OutreachProspect } from "@/lib/outreach/prospects";

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

const STAT_LABELS: Array<[keyof OutreachCampaignSummary["stats"], string]> = [
  ["recipients", "Recipients"],
  ["sent", "Sent"],
  ["delivered", "Delivered"],
  ["bounced", "Bounced"],
  ["unsubscribed", "Unsubscribed"],
  ["replies", "Replies"],
  ["signups", "Smoac signups"],
];

export function OutreachCampaignsTab({
  seedIds,
  onSeedConsumed,
  onLiveSends,
}: {
  seedIds: string[];
  onSeedConsumed: () => void;
  onLiveSends: (live: boolean) => void;
}) {
  const [campaigns, setCampaigns] = useState<OutreachCampaignSummary[]>([]);
  const [templates, setTemplates] = useState<AdminOutreachTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pickerRows, setPickerRows] = useState<OutreachProspect[]>([]);
  const [pickerQ, setPickerQ] = useState("");
  const [preview, setPreview] = useState<OutreachRecipientPreview | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [liveSends, setLiveSends] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [progress, setProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [campaignRes, templateRes] = await Promise.all([
      fetch("/api/admin/outreach/campaigns", { credentials: "include" }),
      fetch("/api/admin/outreach", { credentials: "include" }),
    ]);
    const campaignData = await readJson(campaignRes);
    const templateData = await readJson(templateRes);
    if (!campaignRes.ok || !campaignData?.ok) {
      setError(
        typeof campaignData?.message === "string"
          ? campaignData.message
          : "Could not load campaigns."
      );
      setLoading(false);
      return;
    }
    setCampaigns((campaignData.campaigns as OutreachCampaignSummary[]) ?? []);
    setLiveSends(campaignData.liveSends === true);
    onLiveSends(campaignData.liveSends === true);
    setTemplates((templateData?.templates as AdminOutreachTemplate[]) ?? []);
    setLoading(false);
  }, [onLiveSends]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (seedIds.length === 0) return;
    setPicked(new Set(seedIds));
    setWizard(true);
    setPreview(null);
    onSeedConsumed();
  }, [onSeedConsumed, seedIds]);

  async function loadPicker(query: string) {
    const params = new URLSearchParams({
      q: query,
      page: "1",
      pageSize: "100",
      sort: "name",
      dir: "asc",
    });
    const res = await fetch(`/api/admin/outreach/prospects?${params}`, {
      credentials: "include",
    });
    const data = await readJson(res);
    if (res.ok && data?.ok) {
      setPickerRows((data.prospects as OutreachProspect[]) ?? []);
    }
  }

  useEffect(() => {
    if (!wizard) return;
    void loadPicker(pickerQ);
  }, [pickerQ, wizard]);

  function resetWizard() {
    setWizard(false);
    setConfirming(false);
    setAcknowledged(false);
    setName("");
    setTemplateId("");
    setScheduledAt("");
    setPicked(new Set());
    setPreview(null);
    setPreviewHtml("");
    setProgress(null);
    setTestTo("");
  }

  async function loadPreview() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/outreach/campaigns/preview", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, prospectIds: [...picked] }),
    });
    const data = await readJson(res);
    setBusy(false);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not preview that email.");
      return;
    }
    setPreview(data.preview as OutreachRecipientPreview);
    setPreviewHtml(typeof data.html === "string" ? data.html : "");
    setPreviewSubject(typeof data.subject === "string" ? data.subject : "");
    setLiveSends(data.liveSends === true);
  }

  async function sendTest() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/outreach/test", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        toEmail: testTo,
        name: pickerRows.find((row) => picked.has(row.id))?.name ?? "",
        business: pickerRows.find((row) => picked.has(row.id))?.business ?? "",
        confirm: true,
      }),
    });
    const data = await readJson(res);
    setBusy(false);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Test send failed.");
      return;
    }
    setNotice(typeof data.message === "string" ? data.message : "Test recorded.");
  }

  async function drain(campaignId: string) {
    let guard = 0;
    while (guard < 80) {
      guard += 1;
      const res = await fetch("/api/admin/outreach/campaigns/process", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await readJson(res);
      if (!res.ok || !data?.ok) {
        setError(typeof data?.message === "string" ? data.message : "Sending paused.");
        break;
      }
      const remaining = typeof data.remaining === "number" ? data.remaining : 0;
      const processed = typeof data.processed === "number" ? data.processed : 0;
      setProgress(
        data.status === "paused"
          ? "Sending paused."
          : remaining > 0
            ? `Sending… ${remaining} still queued.`
            : "Campaign finished."
      );
      if (data.paused || data.status === "sent" || data.status === "scheduled" || remaining === 0) {
        break;
      }
      if (processed === 0) break;
    }
  }

  async function confirmSend() {
    if (!acknowledged || !preview) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/outreach/campaigns", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateId,
        prospectIds: [...picked],
        scheduledAt: scheduledAt || null,
        confirm: true,
      }),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setBusy(false);
      setError(typeof data?.message === "string" ? data.message : "Could not start that campaign.");
      return;
    }
    const campaign = data.campaign as OutreachCampaignSummary;
    setConfirming(false);
    if (campaign.deliveryMode === "live" && campaign.status === "sending") {
      setProgress("Starting the first batch…");
      await drain(campaign.id);
      setNotice("Send pass finished. Remaining people stay queued until you continue or the schedule runs.");
    } else if (campaign.status === "scheduled") {
      setNotice(`Scheduled. Nothing sends until ${formatOutreachDate(campaign.scheduledAt)}.`);
    } else {
      setNotice(
        "Campaign recorded in test mode. No emails were delivered. Set OUTREACH_LIVE_SENDS=true to send for real."
      );
    }
    setBusy(false);
    resetWizard();
    await load();
  }

  async function stopCampaign(id: string) {
    await fetch("/api/admin/outreach/campaigns/cancel", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id }),
    });
    await load();
  }

  async function resumeCampaign(id: string) {
    const res = await fetch("/api/admin/outreach/campaigns/resume", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id }),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not resume.");
      return;
    }
    setProgress("Resuming…");
    await drain(id);
    setProgress(null);
    await load();
  }

  const recipientCount = preview?.recipients ?? 0;

  return (
    <div className="admin-outreach-crm__panel">
      <div className="admin-outreach-crm__toolbar">
        <div>
          <h2>Campaigns</h2>
          <p>Sends leave in small batches, about one second apart.</p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={() => {
            setWizard(true);
            setPreview(null);
          }}
        >
          New campaign
        </button>
      </div>
      {error ? <p className="admin-outreach-crm__error">{error}</p> : null}
      {notice ? <p className="admin-outreach-crm__notice">{notice}</p> : null}
      {progress ? <p className="admin-outreach-crm__notice">{progress}</p> : null}
      <p className="admin-outreach-crm__muted">
        Replies are counted when a prospect is marked Replied. Delivered and bounced update after a Resend webhook is connected. Instagram-only contacts are never included.
      </p>
      {loading ? <p className="admin-outreach-crm__muted">Loading campaigns…</p> : null}
      {!loading && !error && campaigns.length === 0 ? (
        <p className="admin-outreach-crm__muted">No campaigns yet.</p>
      ) : null}
      <ul className="admin-outreach-crm__campaigns">
        {campaigns.map((campaign) => (
          <li key={campaign.id} className="admin-entity-card">
            <div className="admin-entity-card__head">
              <div>
                <h3 className="admin-entity-card__title">{campaign.name}</h3>
                <p className="admin-entity-card__sub">
                  {campaign.templateName || "Template removed"} · {campaign.status}
                  {campaign.deliveryMode === "dry_run" ? " · test mode" : ""}
                  {campaign.scheduledAt
                    ? ` · ${formatOutreachDate(campaign.scheduledAt)}`
                    : ""}
                </p>
              </div>
              {campaign.status === "sending" || campaign.status === "paused" ? (
                <div className="admin-actions">
                  {campaign.status === "paused" ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn--compact"
                      onClick={() => void resumeCampaign(campaign.id)}
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-btn admin-btn--compact"
                      onClick={() => void drain(campaign.id)}
                    >
                      Continue
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-btn admin-btn--compact admin-btn--danger"
                    onClick={() => void stopCampaign(campaign.id)}
                  >
                    Stop
                  </button>
                </div>
              ) : null}
            </div>
            <dl className="admin-outreach-crm__stats">
              {STAT_LABELS.map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{campaign.stats[key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {wizard ? (
        <OutreachDialog
          title="New campaign"
          subtitle={
            liveSends
              ? "Live sending is on. You will confirm before anyone is emailed."
              : "Live sending is off. This campaign will be recorded and not delivered."
          }
          wide
          onClose={resetWizard}
        >
          <div className="admin-outreach-crm__form">
            <label className="admin-field-label">
              Campaign name
              <input className="admin-field" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="admin-field-label">
              Template
              <select
                className="admin-field admin-field--select"
                value={templateId}
                onChange={(event) => {
                  setTemplateId(event.target.value);
                  setPreview(null);
                }}
              >
                <option value="">Choose a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field-label">
              Schedule
              <input
                className="admin-field"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <p className="admin-outreach-crm__muted">
              Leave the schedule empty to send after confirmation. Otherwise it waits until that time.
            </p>
            <label className="admin-field-label">
              Prospects
              <input
                className="admin-field"
                value={pickerQ}
                placeholder="Search prospects"
                onChange={(event) => setPickerQ(event.target.value)}
              />
            </label>
            <p className="admin-outreach-crm__muted">{picked.size} selected</p>
            <ul className="admin-outreach-crm__picker">
              {pickerRows.map((row) => {
                const allowed = prospectCanReceiveEmail(row);
                return (
                  <li key={row.id}>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!allowed}
                        checked={picked.has(row.id)}
                        onChange={() => {
                          setPicked((current) => {
                            const next = new Set(current);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          });
                          setPreview(null);
                        }}
                      />
                      <span>
                        {row.name || row.email || "Unnamed"}
                        <small>
                          {allowed ? row.email : "Not emailed"}
                        </small>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn"
                disabled={!templateId || picked.size === 0 || busy}
                onClick={() => void loadPreview()}
              >
                {busy ? "Working…" : "Preview"}
              </button>
            </div>
            {preview ? (
              <>
                <p>
                  <strong>{recipientCount}</strong> recipient{recipientCount === 1 ? "" : "s"}.
                  {preview.skipped.unsubscribed > 0
                    ? ` ${preview.skipped.unsubscribed} unsubscribed skipped.`
                    : ""}
                  {preview.skipped.instagramOnly > 0
                    ? ` ${preview.skipped.instagramOnly} Instagram-only skipped.`
                    : ""}
                  {preview.skipped.noEmail > 0 ? ` ${preview.skipped.noEmail} missing emails skipped.` : ""}
                </p>
                <p className="admin-outreach-crm__muted">Subject: {previewSubject}</p>
                <iframe
                  className="admin-outreach-crm__frame"
                  title="Email preview"
                  sandbox=""
                  srcDoc={previewHtml}
                />
                <div className="admin-outreach-crm__test">
                  <input
                    className="admin-field"
                    type="email"
                    placeholder="Test email address"
                    value={testTo}
                    onChange={(event) => setTestTo(event.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={busy || !testTo.includes("@")}
                    onClick={() => void sendTest()}
                  >
                    Send test
                  </button>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  disabled={recipientCount === 0 || !name.trim()}
                  onClick={() => {
                    setAcknowledged(false);
                    setConfirming(true);
                  }}
                >
                  {scheduledAt ? "Schedule campaign" : "Send campaign"}
                </button>
              </>
            ) : null}
          </div>
        </OutreachDialog>
      ) : null}

      {confirming && preview ? (
        <OutreachDialog
          title={liveSends ? "Confirm send" : "Confirm test campaign"}
          onClose={() => setConfirming(false)}
        >
          <div className="admin-outreach-crm__form">
            <p className="admin-outreach-crm__confirm">
              {liveSends
                ? `You are about to email ${recipientCount} prospect${recipientCount === 1 ? "" : "s"}.`
                : `Live sending is off. This records ${recipientCount} prospect${recipientCount === 1 ? "" : "s"} and does not deliver email.`}
            </p>
            <label className="admin-outreach-crm__check">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              I confirm this campaign.
            </label>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={!acknowledged || busy}
              onClick={() => void confirmSend()}
            >
              {busy ? "Working…" : liveSends ? "Email these prospects" : "Record campaign"}
            </button>
          </div>
        </OutreachDialog>
      ) : null}
    </div>
  );
}
