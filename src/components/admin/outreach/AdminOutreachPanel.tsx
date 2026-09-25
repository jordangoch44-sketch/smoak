"use client";

import { useCallback, useState } from "react";
import { OutreachCampaignsTab } from "@/components/admin/outreach/OutreachCampaignsTab";
import { OutreachProspectsTab } from "@/components/admin/outreach/OutreachProspectsTab";
import { OutreachTemplatesTab } from "@/components/admin/outreach/OutreachTemplatesTab";

type OutreachTab = "prospects" | "campaigns" | "templates";

const TABS: Array<{ id: OutreachTab; label: string }> = [
  { id: "prospects", label: "Contacts" },
  { id: "campaigns", label: "Campaigns" },
  { id: "templates", label: "Templates" },
];

export function AdminOutreachPanel() {
  const [tab, setTab] = useState<OutreachTab>("prospects");
  const [seedIds, setSeedIds] = useState<string[]>([]);
  const [liveSends, setLiveSends] = useState<boolean | null>(null);
  const onLiveSends = useCallback((live: boolean) => setLiveSends(live), []);
  const onSeedConsumed = useCallback(() => setSeedIds([]), []);

  return (
    <section className="admin-outreach-crm" aria-label="Outreach">
      <header className="admin-outreach-crm__head">
        <p className="admin-email-hero__eyebrow">Outreach</p>
        <h2>Cold outreach</h2>
        <p>
          One contact list for email and Instagram. Campaigns send email in small batches.
          Instagram stays manual: filter those handles, then mark each message and any reply.
        </p>
      </header>
      {liveSends === false ? (
        <p className="admin-outreach-crm__banner admin-outreach-crm__banner--safe">
          Development mode. Campaigns are recorded and not delivered. Set OUTREACH_LIVE_SENDS=true on the server when you are ready to email people.
        </p>
      ) : null}
      {liveSends === true ? (
        <p className="admin-outreach-crm__banner admin-outreach-crm__banner--live">
          Live sending is on. Campaigns require a confirmation before anyone is emailed.
        </p>
      ) : null}
      <div className="admin-outreach-crm__tabs" role="tablist" aria-label="Outreach sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={
              tab === item.id
                ? "admin-outreach-crm__tab admin-outreach-crm__tab--active"
                : "admin-outreach-crm__tab"
            }
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "prospects" ? (
        <OutreachProspectsTab
          onLiveSends={onLiveSends}
          onStartCampaign={(ids) => {
            setSeedIds(ids);
            setTab("campaigns");
          }}
        />
      ) : null}
      {tab === "campaigns" ? (
        <OutreachCampaignsTab
          seedIds={seedIds}
          onSeedConsumed={onSeedConsumed}
          onLiveSends={onLiveSends}
        />
      ) : null}
      {tab === "templates" ? <OutreachTemplatesTab onLiveSends={onLiveSends} /> : null}
    </section>
  );
}
