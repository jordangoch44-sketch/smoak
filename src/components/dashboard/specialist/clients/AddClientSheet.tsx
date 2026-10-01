"use client";

import { useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CheckIcon, ChevronLeftIcon, MessageBubbleIcon, SendIcon } from "@/components/ui/icons";
import {
  coachingInvitePath,
  type CoachingResult,
  type SpecialistInquiryContact,
} from "@/lib/coaching/coaching-service";
import type { CoachingRelationship } from "@/types/coaching";
import { RosterAvatar } from "./RosterAvatar";
import { RosterSheet } from "./RosterSheet";

type View = "choose" | "messages" | "link";

/** Two paths: invite someone who has messaged you, or share a sign-up link. */
export function AddClientSheet({
  contacts,
  loaded,
  roster,
  specialistName,
  onInvite,
  onCreateLink,
  onClose,
}: {
  contacts: readonly SpecialistInquiryContact[];
  loaded: boolean;
  roster: readonly CoachingRelationship[];
  specialistName: string;
  onInvite: (conversationId: string) => Promise<CoachingResult<CoachingRelationship>>;
  onCreateLink: (
    specialistName: string,
    clientFirstName: string
  ) => Promise<CoachingResult<{ token: string }>>;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("choose");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function shareUrl(link: string) {
    const coach = specialistName.trim() || "your coach";
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Train with me on SMOAC",
          text: `Join me on SMOAC so I can send you workouts. — ${coach}`,
          url: link,
        });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }
    await copyUrl(link);
  }

  async function copyUrl(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn’t copy. Press and hold the link to copy it.");
    }
  }

  async function startLink() {
    setError(null);
    setView("link");
    if (url) {
      void shareUrl(url);
      return;
    }
    setBusy(true);
    const result = await onCreateLink(specialistName, "");
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const link = `${window.location.origin}${coachingInvitePath(result.data.token)}`;
    setUrl(link);
    void shareUrl(link);
  }

  const back = (
    <FastActivateButton
      className="coaching-btn coaching-btn--quiet roster-add__back"
      onActivate={() => {
        setError(null);
        setView("choose");
      }}
    >
      <ChevronLeftIcon className="h-4 w-4" />
      Back
    </FastActivateButton>
  );

  return (
    <RosterSheet title="Add client" onClose={onClose}>
      {view === "choose" ? (
        <div className="roster-add">
          <FastActivateButton
            className="coaching-btn roster-add__choice"
            onActivate={() => setView("messages")}
          >
            <MessageBubbleIcon className="h-5 w-5" />
            Add from messages
          </FastActivateButton>
          <FastActivateButton
            className="coaching-btn coaching-btn--primary roster-add__choice"
            onActivate={() => void startLink()}
          >
            <SendIcon className="h-5 w-5" />
            Share link
          </FastActivateButton>
        </div>
      ) : view === "messages" ? (
        <>
          {back}
          <MessagesList
            contacts={contacts}
            loaded={loaded}
            roster={roster}
            onInvite={onInvite}
            onError={setError}
          />
        </>
      ) : (
        <>
          {back}
          {busy || !url ? (
            <p className="roster-sheet__empty">{busy ? "Creating link…" : null}</p>
          ) : (
            <>
              <p className="roster-link__url">{url}</p>
              <div className="coaching-card__actions">
                <FastActivateButton
                  className="coaching-btn coaching-btn--primary"
                  onActivate={() => void shareUrl(url)}
                >
                  <SendIcon className="h-4 w-4" />
                  Share
                </FastActivateButton>
                <FastActivateButton className="coaching-btn" onActivate={() => void copyUrl(url)}>
                  {copied ? <CheckIcon className="h-4 w-4" /> : null}
                  {copied ? "Copied" : "Copy"}
                </FastActivateButton>
              </div>
            </>
          )}
        </>
      )}
      {error ? <p className="client-workouts-error">{error}</p> : null}
    </RosterSheet>
  );
}

function MessagesList({
  contacts,
  loaded,
  roster,
  onInvite,
  onError,
}: {
  contacts: readonly SpecialistInquiryContact[];
  loaded: boolean;
  roster: readonly CoachingRelationship[];
  onInvite: (conversationId: string) => Promise<CoachingResult<CoachingRelationship>>;
  onError: (message: string | null) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const onRoster = new Set(roster.map((item) => item.clientUserId));
  const seen = new Set<string>();
  const candidates = contacts.filter((contact) => {
    if (onRoster.has(contact.clientUserId) || seen.has(contact.clientUserId)) return false;
    seen.add(contact.clientUserId);
    return true;
  });

  async function invite(contact: SpecialistInquiryContact) {
    setBusyId(contact.conversationId);
    onError(null);
    const result = await onInvite(contact.conversationId);
    setBusyId(null);
    if (!result.ok) onError(result.message);
  }

  if (!loaded) return <p className="roster-sheet__empty">Loading…</p>;
  if (candidates.length === 0) {
    return (
      <p className="roster-sheet__empty">
        {contacts.length === 0 ? "No messages yet." : "Everyone’s already on your roster."}
      </p>
    );
  }

  return (
    <ul className="roster-sheet__list">
      {candidates.map((contact) => (
        <li key={contact.conversationId} className="roster-sheet__row">
          <RosterAvatar name={contact.firstName} avatarUrl={contact.avatarUrl} size="sm" />
          <span className="roster-sheet__row-name">{contact.firstName}</span>
          <FastActivateButton
            className="coaching-btn coaching-btn--primary roster-sheet__row-action"
            disabled={busyId !== null}
            onActivate={() => void invite(contact)}
          >
            {busyId === contact.conversationId ? "Sending…" : "Invite"}
          </FastActivateButton>
        </li>
      ))}
    </ul>
  );
}
