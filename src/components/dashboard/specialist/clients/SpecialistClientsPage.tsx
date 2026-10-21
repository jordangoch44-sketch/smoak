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
import { forgetHiddenInquiryIds } from "@/lib/inquiry/inquiry-hidden-store";
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
  | { kind: "edit"; relationshipId: string; workoutId: string }
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
  const {
    loaded,
    roster,
    workoutsFor,
    openThread,
    invite,
    createInviteLink,
    sendWorkout,
    updateWorkout,
    removeWorkout,
    removeClient,
    respondToRequest,
  } = useCoachingRoster(specialistId);
  const inquiries = useSpecialistInquiryContacts(isPremium ? specialistId : null);
  // Activity depends on today’s date; build only in the browser.
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ id: string; message: string } | null>(null);
  const [messageBusyId, setMessageBusyId] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<{ id: string; message: string } | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  const profileAvatars = useRosterClientAvatars(specialistId);
  const avatarByClient = useMemo(() => {
    const map = new Map(profileAvatars);
    for (const contact of inquiries.contacts) {
      if (contact.avatarUrl && !map.has(contact.clientUserId)) {
        map.set(contact.clientUserId, contact.avatarUrl);
      }
    }
    return map;
  }, [profileAvatars, inquiries.contacts]);

  const requests = useMemo(
    () => roster.filter((relationship) => relationship.status === "requested"),
    [roster]
  );
  const clients = useMemo(
    () => roster.filter((relationship) => relationship.status !== "requested"),
    [roster]
  );

  const rows = useMemo(() => {
    if (!inBrowser) return [];
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    return clients.map((relationship) => ({
      relationship,
      summary: summarizeRosterClient(relationship, workoutsFor(relationship.id), now, todayKey),
    }));
  }, [inBrowser, clients, workoutsFor]);

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
  const editingWorkout =
    sheet?.kind === "edit" && sheetRelationship
      ? (workoutsFor(sheetRelationship.id).find((workout) => workout.id === sheet.workoutId) ?? null)
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

  async function handleMessage(relationship: CoachingRelationship) {
    if (messageBusyId) return;
    setMessageBusyId(relationship.id);
    setMessageError(null);
    const result = await openThread(relationship.id);
    setMessageBusyId(null);
    if (!result.ok) {
      setMessageError({ id: relationship.id, message: result.message });
      return;
    }
    forgetHiddenInquiryIds(specialistId, [result.data.conversationId]);
    window.dispatchEvent(new Event("smoac:inquiry-updated"));
    onOpenConversation(result.data.conversationId);
  }

  async function handleRequest(relationship: CoachingRelationship, accept: boolean) {
    if (accept && !isPremium) {
      onUpgrade?.();
      return;
    }
    setRequestBusyId(relationship.id);
    setRequestError(null);
    const result = await respondToRequest(relationship.id, accept);
    setRequestBusyId(null);
    if (!result.ok) setRequestError({ id: relationship.id, message: result.message });
  }

  function renderRequests() {
    if (requests.length === 0) return null;
    return (
      <section className="roster-page__requests" aria-label="Connection requests">
        <h2 className="roster-page__requests-title">Connection requests</h2>
        <ul className="roster-page__list">
          {requests.map((relationship) => {
            const name = relationship.clientFirstName.trim() || "Client";
            const busy = requestBusyId === relationship.id;
            return (
              <li key={relationship.id} className="roster-card">
                <div className="roster-card__main roster-card__main--static">
                  <RosterAvatar
                    name={name}
                    avatarUrl={avatarByClient.get(relationship.clientUserId) ?? ""}
                  />
                  <span className="roster-card__copy">
                    <span className="roster-card__title">
                      <span className="roster-card__name">{name}</span>
                      <span className="roster-card__badge roster-card__badge--requested">Request</span>
                    </span>
                    <span className="roster-card__last">Wants to connect</span>
                    <span className="roster-card__meta">
                      <span>They asked to add you as their specialist</span>
                    </span>
                  </span>
                </div>
                {requestError?.id === relationship.id ? (
                  <p className="coaching-error">{requestError.message}</p>
                ) : null}
                <div className="roster-card__actions">
                  <FastActivateButton
                    className="roster-card__action roster-card__action--send"
                    disabled={busy}
                    onActivate={() => void handleRequest(relationship, true)}
                  >
                    {busy ? "Saving…" : isPremium ? "Accept" : "Accept · Pro"}
                  </FastActivateButton>
                  <FastActivateButton
                    className="roster-card__action"
                    disabled={busy}
                    onActivate={() => void handleRequest(relationship, false)}
                  >
                    Decline
                  </FastActivateButton>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
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

        {messageError?.id === relationship.id ? (
          <p className="coaching-error">{messageError.message}</p>
        ) : null}
        <div className="roster-card__actions">
          <FastActivateButton
            className="roster-card__action"
            disabled={messageBusyId === relationship.id}
            onActivate={() => void handleMessage(relationship)}
          >
            <MessageBubbleIcon className="roster-card__action-icon" />
            {messageBusyId === relationship.id ? "Opening…" : "Message"}
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
            Invite clients, accept connection requests, and see when workouts are finished.
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
          {loaded ? renderRequests() : null}
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
      ) : clients.length === 0 ? (
        <>
          {renderRequests()}
          {requests.length === 0 ? (
            <ul className="roster-page__list">
              <SampleClientCard />
            </ul>
          ) : null}
          <div className="roster-page__empty">
            <p className="roster-page__empty-title">
              {requests.length > 0 ? "No other clients yet" : "No clients yet"}
            </p>
            <p className="roster-page__empty-copy">
              {requests.length > 0
                ? "Accept a request above, or invite someone who has messaged you."
                : "Invite someone who has messaged you, or wait for a client to request you. Once they’re connected, their card shows up here."}
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
          {renderRequests()}
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
      {sheet?.kind === "edit" && sheetRelationship && editingWorkout ? (
        <SendWorkoutSheet
          relationship={sheetRelationship}
          workouts={workoutsFor(sheetRelationship.id)}
          editing={editingWorkout}
          onUpdate={updateWorkout}
          onClose={() => setSheet({ kind: "plan", relationshipId: sheetRelationship.id })}
        />
      ) : null}
      {sheet?.kind === "plan" && sheetRelationship ? (
        <ClientPlanSheet
          relationship={sheetRelationship}
          workouts={workoutsFor(sheetRelationship.id)}
          onSendWorkout={() => setSheet({ kind: "send", relationshipId: sheetRelationship.id })}
          onEditWorkout={(workout) =>
            setSheet({ kind: "edit", relationshipId: sheetRelationship.id, workoutId: workout.id })
          }
          onRemoveWorkout={removeWorkout}
          onRemoveClient={() => void handleRemoveClient(sheetRelationship)}
          onClose={closeSheet}
        />
      ) : null}
    </div>
  );
}
