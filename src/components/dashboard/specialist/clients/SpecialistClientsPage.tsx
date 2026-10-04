"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CalendarIcon,
  ChartIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DumbbellIcon,
  MessageBubbleIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useCoachingRoster } from "@/hooks/useCoachingRoster";
import { useRosterClientAvatars } from "@/hooks/useRosterClientAvatars";
import { useSpecialistInquiryContacts } from "@/hooks/useSpecialistInquiryContacts";
import {
  summarizeRosterClient,
  type RosterClientState,
  type RosterClientSummary,
} from "@/lib/coaching/coach-workout";
import { cn } from "@/lib/utils";
import { toLocalDateKey } from "@/lib/workouts/client-workout";
import type { CoachingRelationship } from "@/types/coaching";
import { AddClientSheet } from "./AddClientSheet";
import { ClientPlanSheet } from "./ClientPlanSheet";
import { RosterAvatar } from "./RosterAvatar";
import { SendWorkoutSheet } from "./SendWorkoutSheet";
import "@/styles/coaching.css";

const noopSubscribe = () => () => {};

type RosterFilter = "all" | "active" | "inactive" | "invited";

const FILTERS: ReadonlyArray<{ id: RosterFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "invited", label: "Invited" },
];

const STATE_LABEL: Record<RosterClientState, string> = {
  invited: "Invited",
  new: "New",
  active: "Active",
  inactive: "Inactive",
};

function matchesFilter(state: RosterClientState, filter: RosterFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return state === "active" || state === "new";
  return state === filter;
}

/** Placeholder card shown before the first client, so the empty tab previews what's coming. */
function SampleClientCard() {
  return (
    <li className="roster-card roster-card--sample" aria-hidden>
      <div className="roster-card__main">
        <span className="roster-avatar roster-avatar--sample">
          <span className="roster-avatar__face">
            <span className="roster-avatar__initials">
              <UserIcon className="roster-avatar__silhouette" />
            </span>
          </span>
        </span>
        <span className="roster-card__copy">
          <span className="roster-card__title">
            <span className="roster-card__name">Your first client</span>
            <span className="roster-card__badge">Example</span>
          </span>
          <span className="roster-card__last">Last workout —</span>
          <span className="roster-card__meta">
            <span>
              <CalendarIcon className="roster-card__meta-icon" />
              0/wk
            </span>
            <span>
              <ChartIcon className="roster-card__meta-icon" />
              0 weeks
            </span>
            <span>
              <CheckCircleIcon className="roster-card__meta-icon" />0 done
            </span>
          </span>
        </span>
        <ChevronRightIcon className="roster-card__chevron" />
      </div>
      <div className="roster-card__actions">
        <span className="roster-card__action">
          <MessageBubbleIcon className="roster-card__action-icon" />
          Message
        </span>
        <span className="roster-card__action roster-card__action--send">
          <DumbbellIcon className="roster-card__action-icon" />
          Send Workout
        </span>
        <span className="roster-card__action">
          <CalendarIcon className="roster-card__action-icon" />
          View Calendar
        </span>
      </div>
    </li>
  );
}

type OpenSheet =
  | { kind: "add" }
  | { kind: "send"; relationshipId: string }
  | { kind: "plan"; relationshipId: string }
  | null;

/** Clients tab (center of the bottom nav): the specialist’s roster. Pro only; Free sees a pitch. */
export function SpecialistClientsPage({
  specialistId,
  specialistName,
  isPremium,
  onUpgrade,
  onOpenConversation,
}: {
  specialistId: string;
  /** Shown to the invitee on the join page. */
  specialistName: string;
  isPremium: boolean;
  onUpgrade?: () => void;
  onOpenConversation: (conversationId: string) => void;
}) {
  const rosterId = isPremium ? specialistId : null;
  const {
    loaded,
    roster,
    workoutsFor,
    invite,
    createInviteLink,
    sendWorkout,
    removeWorkout,
    removeClient,
  } = useCoachingRoster(rosterId);
  const inquiries = useSpecialistInquiryContacts(rosterId);
  // Activity depends on today’s date; build only in the browser.
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  const profileAvatars = useRosterClientAvatars(rosterId);
  const avatarByClient = useMemo(() => {
    const map = new Map(profileAvatars);
    for (const contact of inquiries.contacts) {
      if (contact.avatarUrl && !map.has(contact.clientUserId)) {
        map.set(contact.clientUserId, contact.avatarUrl);
      }
    }
    return map;
  }, [profileAvatars, inquiries.contacts]);

  const rows = useMemo(() => {
    if (!inBrowser) return [];
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    return roster.map((relationship) => ({
      relationship,
      summary: summarizeRosterClient(relationship, workoutsFor(relationship.id), now, todayKey),
    }));
  }, [inBrowser, roster, workoutsFor]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        matchesFilter(row.summary.state, filter) &&
        (!needle || row.relationship.clientFirstName.toLowerCase().includes(needle))
    );
  }, [rows, query, filter]);

  const sheetRelationship =
    sheet && sheet.kind !== "add"
      ? roster.find((item) => item.id === sheet.relationshipId) ?? null
      : null;

  async function handleRemoveClient(relationship: CoachingRelationship) {
    const name = relationship.clientFirstName || "this client";
    const question =
      relationship.status === "invited"
        ? `Cancel the invite for ${name}?`
        : `Remove ${name} from your roster? Workouts you sent stay in their calendar.`;
    if (!window.confirm(question)) return;
    const ok = await removeClient(relationship.id);
    if (ok) setSheet(null);
  }

  function renderCard(relationship: CoachingRelationship, summary: RosterClientSummary) {
    const name = relationship.clientFirstName.trim() || "Client";
    const invited = summary.state === "invited";
    return (
      <li key={relationship.id} className="roster-card">
        <FastActivateButton
          className="roster-card__main"
          aria-label={`${name}, ${STATE_LABEL[summary.state]}. View workouts`}
          onActivate={() => setSheet({ kind: "plan", relationshipId: relationship.id })}
        >
          <RosterAvatar
            name={name}
            avatarUrl={avatarByClient.get(relationship.clientUserId) ?? ""}
            activity={invited ? undefined : summary.activity}
          />
          <span className="roster-card__copy">
            <span className="roster-card__title">
              <span className="roster-card__name">{name}</span>
              <span className={cn("roster-card__badge", `roster-card__badge--${summary.state}`)}>
                {STATE_LABEL[summary.state]}
              </span>
            </span>
            <span className="roster-card__last">{summary.lastLine}</span>
            {invited ? (
              <span className="roster-card__meta">
                <span>Waiting for them to accept</span>
              </span>
            ) : (
              <span className="roster-card__meta">
                <span>
                  <CalendarIcon className="roster-card__meta-icon" />
                  {summary.perWeekLabel}
                </span>
                <span>
                  <ChartIcon className="roster-card__meta-icon" />
                  {summary.weeksLabel}
                </span>
                <span>
                  <CheckCircleIcon className="roster-card__meta-icon" />
                  {summary.completedCount} done
                </span>
              </span>
            )}
          </span>
          <ChevronRightIcon className="roster-card__chevron" />
        </FastActivateButton>

        <div className="roster-card__actions">
          <FastActivateButton
            className="roster-card__action"
            disabled={!relationship.conversationId}
            onActivate={() => {
              if (relationship.conversationId) onOpenConversation(relationship.conversationId);
            }}
          >
            <MessageBubbleIcon className="roster-card__action-icon" />
            Message
          </FastActivateButton>
          {invited ? (
            <FastActivateButton
              className="roster-card__action roster-card__action--wide"
              onActivate={() => void handleRemoveClient(relationship)}
            >
              Cancel invite
            </FastActivateButton>
          ) : (
            <>
              <FastActivateButton
                className="roster-card__action roster-card__action--send"
                onActivate={() => setSheet({ kind: "send", relationshipId: relationship.id })}
              >
                <DumbbellIcon className="roster-card__action-icon" />
                Send Workout
              </FastActivateButton>
              <FastActivateButton
                className="roster-card__action"
                onActivate={() => setSheet({ kind: "plan", relationshipId: relationship.id })}
              >
                <CalendarIcon className="roster-card__action-icon" />
                View Calendar
              </FastActivateButton>
            </>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="roster-page">
      <header className="roster-page__head" data-tour="clients">
        <div className="roster-page__intro">
          <h1 className="roster-page__title">Clients</h1>
          <p className="roster-page__subtitle">
            Invite clients, send workouts, and see when they finish.
          </p>
        </div>
        <FastActivateButton
          className="roster-page__add"
          onActivate={() => (isPremium ? setSheet({ kind: "add" }) : onUpgrade?.())}
        >
          <PlusIcon className="h-4 w-4" />
          Add client
        </FastActivateButton>
      </header>

      {!isPremium ? (
        <>
          <ul className="roster-page__list">
            <SampleClientCard />
          </ul>
          <div className="coaching-card">
            <p className="coaching-card__eyebrow">SMOAC Pro</p>
            <p className="coaching-card__title">Coach your clients here</p>
            <p className="coaching-card__copy">
              Add clients from your inquiries, send them workouts, and see when they finish and
              what weights they logged.
            </p>
            <div className="coaching-card__actions">
              <FastActivateButton
                className="coaching-btn coaching-btn--primary"
                onActivate={() => onUpgrade?.()}
              >
                Upgrade to Pro
              </FastActivateButton>
            </div>
          </div>
        </>
      ) : !loaded || !inBrowser ? (
        <p className="roster-page__status">Loading your clients…</p>
      ) : roster.length === 0 ? (
        <>
          <ul className="roster-page__list">
            <SampleClientCard />
          </ul>
          <div className="roster-page__empty">
            <p className="roster-page__empty-title">No clients yet</p>
            <p className="roster-page__empty-copy">
              Invite someone who has messaged you. Once they accept, their card shows up here.
            </p>
            <FastActivateButton
              className="coaching-btn coaching-btn--primary roster-page__empty-action"
              onActivate={() => setSheet({ kind: "add" })}
            >
              <PlusIcon className="h-4 w-4" />
              Add your first client
            </FastActivateButton>
          </div>
        </>
      ) : (
        <>
          <label className="roster-page__search">
            <SearchIcon className="roster-page__search-icon" />
            <input
              type="search"
              value={query}
              placeholder="Search clients..."
              aria-label="Search clients"
              enterKeyHint="search"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="roster-page__filters" role="tablist" aria-label="Filter clients">
            {FILTERS.map((option) => (
              <FastActivateButton
                key={option.id}
                role="tab"
                aria-selected={filter === option.id}
                className={cn(
                  "roster-page__filter",
                  filter === option.id && "roster-page__filter--active"
                )}
                onActivate={() => setFilter(option.id)}
              >
                {option.label}
              </FastActivateButton>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="roster-page__status">
              {query.trim() ? `No clients match “${query.trim()}”.` : "No clients here yet."}
            </p>
          ) : (
            <ul className="roster-page__list">
              {visible.map((row) => renderCard(row.relationship, row.summary))}
            </ul>
          )}
        </>
      )}

      {sheet?.kind === "add" ? (
        <AddClientSheet
          contacts={inquiries.contacts}
          loaded={inquiries.loaded}
          roster={roster}
          specialistName={specialistName}
          onInvite={invite}
          onCreateLink={createInviteLink}
          onClose={closeSheet}
        />
      ) : null}
      {sheet?.kind === "send" && sheetRelationship ? (
        <SendWorkoutSheet
          relationship={sheetRelationship}
          workouts={workoutsFor(sheetRelationship.id)}
          onSend={sendWorkout}
          onClose={closeSheet}
        />
      ) : null}
      {sheet?.kind === "plan" && sheetRelationship ? (
        <ClientPlanSheet
          relationship={sheetRelationship}
          workouts={workoutsFor(sheetRelationship.id)}
          onSendWorkout={() => setSheet({ kind: "send", relationshipId: sheetRelationship.id })}
          onRemoveWorkout={removeWorkout}
          onRemoveClient={() => void handleRemoveClient(sheetRelationship)}
          onClose={closeSheet}
        />
      ) : null}
    </div>
  );
}
