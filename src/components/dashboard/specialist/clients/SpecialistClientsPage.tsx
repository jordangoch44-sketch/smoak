"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  ChartIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  MessageBubbleIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useCoachingRoster } from "@/hooks/useCoachingRoster";
import { useRosterClientAvatars } from "@/hooks/useRosterClientAvatars";
import { useSpecialistInquiryContacts } from "@/hooks/useSpecialistInquiryContacts";
import { forgetHiddenInquiryIds } from "@/lib/inquiry/inquiry-hidden-store";
import { showToast } from "@/lib/toast-store";
import {
  summarizeRosterClient,
  VIEW_FINISHED_WORKOUT_EVENT,
  type RosterClientState,
  type RosterClientSummary,
} from "@/lib/coaching/coach-workout";
import {
  SPECIALIST_DASHBOARD_PATH,
  SPECIALIST_FINISHED_WORKOUT_PARAM,
} from "@/lib/auth-routes";
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
          <span className="roster-card__last">No workouts yet</span>
        </span>
        <ChevronDownIcon className="roster-card__chevron" />
      </div>
    </li>
  );
}

type OpenSheet =
  | { kind: "add" }
  | { kind: "send"; relationshipId: string }
  | { kind: "plan"; relationshipId: string; workoutId?: string }
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
    workouts,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const ignoreFinishedId = useRef<string | null>(null);
  const openedFinishedId = useRef<string | null>(null);
  const inquiries = useSpecialistInquiryContacts(isPremium ? specialistId : null);
  // Activity depends on today’s date; build only in the browser.
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ id: string; message: string } | null>(null);
  const [messageBusyId, setMessageBusyId] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<{ id: string; message: string } | null>(null);
  const closeSheet = useCallback(() => {
    setSheet(null);
    const workoutId = searchParams.get(SPECIALIST_FINISHED_WORKOUT_PARAM);
    if (!workoutId) return;
    ignoreFinishedId.current = workoutId;
    openedFinishedId.current = workoutId;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(SPECIALIST_FINISHED_WORKOUT_PARAM);
    const qs = params.toString();
    router.replace(qs ? `${SPECIALIST_DASHBOARD_PATH}?${qs}` : SPECIALIST_DASHBOARD_PATH, {
      scroll: false,
    });
  }, [router, searchParams]);

  const openFinishedWorkout = useCallback(
    (workoutId: string) => {
      const workout = workouts.find((item) => item.id === workoutId);
      if (!workout) return false;
      setSheet({
        kind: "plan",
        relationshipId: workout.relationshipId,
        workoutId: workout.id,
      });
      return true;
    },
    [workouts]
  );

  useEffect(() => {
    function onViewFinished(event: Event) {
      const workoutId = (event as CustomEvent<string>).detail;
      if (typeof workoutId !== "string" || !workoutId) return;
      ignoreFinishedId.current = null;
      if (openFinishedWorkout(workoutId)) openedFinishedId.current = workoutId;
    }
    window.addEventListener(VIEW_FINISHED_WORKOUT_EVENT, onViewFinished);
    return () => window.removeEventListener(VIEW_FINISHED_WORKOUT_EVENT, onViewFinished);
  }, [openFinishedWorkout]);

  useEffect(() => {
    const workoutId = searchParams.get(SPECIALIST_FINISHED_WORKOUT_PARAM);
    if (!workoutId) {
      ignoreFinishedId.current = null;
      openedFinishedId.current = null;
      return;
    }
    if (
      !loaded ||
      ignoreFinishedId.current === workoutId ||
      openedFinishedId.current === workoutId
    ) {
      return;
    }
    if (openFinishedWorkout(workoutId)) openedFinishedId.current = workoutId;
  }, [loaded, openFinishedWorkout, searchParams]);

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
    if (ok) closeSheet();
  }

  function revealThread(conversationId: string) {
    const id = conversationId.trim();
    if (!id) return;
    forgetHiddenInquiryIds(specialistId, [id]);
    window.dispatchEvent(new Event("smoac:inquiry-updated"));
    onOpenConversation(id);
  }

  async function handleMessage(relationship: CoachingRelationship) {
    if (messageBusyId) return;
    const known = relationship.conversationId?.trim() || "";
    // Continue a thread that already exists without waiting on the network.
    if (known) {
      revealThread(known);
      void openThread(relationship.id).then((result) => {
        if (!result.ok) return;
        const id = result.data.conversationId?.trim() || "";
        if (!id || id === known) {
          if (id) {
            forgetHiddenInquiryIds(specialistId, [id]);
            window.dispatchEvent(new Event("smoac:inquiry-updated"));
          }
          return;
        }
        revealThread(id);
      });
      return;
    }

    setMessageBusyId(relationship.id);
    setMessageError(null);
    try {
      const result = await openThread(relationship.id);
      if (!result.ok) {
        setMessageError({ id: relationship.id, message: result.message });
        showToast({ type: "info", message: result.message });
        return;
      }
      const id = result.data.conversationId?.trim() || "";
      if (!id) {
        const message = "Could not open the conversation.";
        setMessageError({ id: relationship.id, message });
        showToast({ type: "info", message });
        return;
      }
      revealThread(id);
    } catch {
      const message = "Could not open the conversation.";
      setMessageError({ id: relationship.id, message });
      showToast({ type: "info", message });
    } finally {
      setMessageBusyId(null);
    }
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
    const open = expandedId === relationship.id;
    const panelId = `roster-card-${relationship.id}`;
    const latest = summary.latest;
    return (
      <li key={relationship.id} className={cn("roster-card", open && "roster-card--open")}>
        <FastActivateButton
          className="roster-card__main"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${name}, ${STATE_LABEL[summary.state]}. ${open ? "Hide actions" : "Show actions"}`}
          onActivate={() => setExpandedId(open ? null : relationship.id)}
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
          </span>
          <ChevronDownIcon className="roster-card__chevron" />
        </FastActivateButton>

        {open ? (
          <div className="roster-card__panel" id={panelId}>
            {latest ? (
              <div className="roster-card__latest">
                <div className="roster-card__latest-head">
                  <p className="roster-card__latest-label">Latest workout</p>
                  <span
                    className={cn(
                      "roster-card__status",
                      latest.status === "completed" && "roster-card__status--done"
                    )}
                  >
                    {latest.status === "completed" ? (
                      <CheckCircleIcon className="roster-card__status-icon" />
                    ) : null}
                    {latest.status === "completed"
                      ? "Completed"
                      : latest.status === "started"
                        ? "In progress"
                        : "Sent"}
                  </span>
                </div>
                <p className="roster-card__latest-title">{latest.title}</p>
                <p className="roster-card__latest-meta">
                  {latest.longWhen}
                  {latest.minutes != null ? ` · ~${latest.minutes} min` : ""}
                </p>
              </div>
            ) : null}
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
                    <SendIcon className="roster-card__action-icon" />
                    Send Workout
                  </FastActivateButton>
                  <FastActivateButton
                    className="roster-card__action"
                    onActivate={() => setSheet({ kind: "plan", relationshipId: relationship.id })}
                  >
                    <ChartIcon className="roster-card__action-icon" />
                    Results
                  </FastActivateButton>
                </>
              )}
            </div>
            {invited ? null : (
              <p className="roster-card__hint">
                Tap Results to view full workout details and past workouts.
              </p>
            )}
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <div className="roster-page">
      <header className="roster-page__head" data-tour="clients">
        <div className="roster-page__intro">
          <h1 className="roster-page__title">Clients</h1>
          <p className="roster-page__subtitle">
            Manage your clients, send workouts, message, and view their progress.
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
          key={sheet.workoutId ? `finished-${sheet.workoutId}` : sheetRelationship.id}
          relationship={sheetRelationship}
          workouts={workoutsFor(sheetRelationship.id)}
          initialWorkoutId={sheet.workoutId ?? null}
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
