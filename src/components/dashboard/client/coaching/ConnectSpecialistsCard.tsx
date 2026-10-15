"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { SearchIcon } from "@/components/ui/icons";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import {
  searchSpecialistsToConnect,
  type SpecialistConnectMatch,
} from "@/lib/coaching/coaching-service";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import type { CoachingRelationship } from "@/types/coaching";
import "@/styles/coaching.css";

function cardTitle(match: SpecialistConnectMatch): { title: string; person: string } {
  const business = match.businessName.trim();
  const person = match.fullName.trim();
  const same = business.toLowerCase() === person.toLowerCase();
  return {
    title: business || person || "Specialist",
    person: business && person && !same ? person : "",
  };
}

function cardMeta(match: SpecialistConnectMatch): string {
  const place = [match.neighborhood, match.city].filter(Boolean).join(", ");
  return [match.profession, place].filter(Boolean).join(" · ");
}

/** Profile box: search a specialist by name and request to connect. */
export function ConnectSpecialistsCard({ userId }: { userId: string }) {
  const { coaches, relationshipForSpecialist, requestConnection, respond, leave } =
    useClientCoaching(userId);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpecialistConnectMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [settledQuery, setSettledQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<CoachingRelationship | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const disconnectingRef = useRef(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSettledQuery("");
      setSearchError(null);
      return;
    }
    const supabase = getMarketplaceAuthClient();
    if (!supabase) {
      setSearchError("Sign in to search specialists.");
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchSpecialistsToConnect(supabase, q).then((result) => {
        if (cancelled) return;
        setSearching(false);
        setSettledQuery(q);
        if (!result.ok) {
          setSearchError(result.message);
          setResults([]);
          return;
        }
        setSearchError(null);
        setResults(result.data);
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  async function send(specialistId: string) {
    setBusyId(specialistId);
    setActionError(null);
    const result = await requestConnection(specialistId);
    setBusyId(null);
    if (!result.ok) setActionError({ id: specialistId, message: result.message });
  }

  async function acceptInvite(relationship: CoachingRelationship) {
    setBusyId(relationship.specialistId);
    setActionError(null);
    const ok = await respond(relationship.id, true);
    setBusyId(null);
    if (!ok) {
      setActionError({ id: relationship.specialistId, message: "Couldn’t accept the invite." });
    }
  }

  const closeDisconnect = useCallback(() => {
    if (disconnectingRef.current) return;
    setDisconnectTarget(null);
    setDisconnectError(null);
  }, []);

  async function confirmDisconnect() {
    if (!disconnectTarget || disconnectingRef.current) return;
    disconnectingRef.current = true;
    setDisconnecting(true);
    setDisconnectError(null);
    const ok = await leave(disconnectTarget.id);
    disconnectingRef.current = false;
    setDisconnecting(false);
    if (!ok) {
      setDisconnectError("Couldn’t disconnect. Try again.");
      return;
    }
    setDisconnectTarget(null);
  }

  async function cancelRequest(relationship: CoachingRelationship) {
    setBusyId(relationship.specialistId);
    setActionError(null);
    const ok = await leave(relationship.id);
    setBusyId(null);
    if (!ok) {
      setActionError({ id: relationship.specialistId, message: "Couldn’t cancel the request." });
    }
  }

  return (
    <section className="client-profile-home__card connect-specialists" aria-labelledby="client-profile-connect">
      <h2 id="client-profile-connect" className="client-profile-home__eyebrow">
        Connect my specialists
      </h2>
      <p className="connect-specialists__copy">
        Search by name or business and send a request.
      </p>

      {coaches.length > 0 ? (
        <ul className="connect-specialists__chips">
          {coaches.map((relationship) => {
            const name = relationship.specialistName.trim() || "Specialist";
            return (
              <li key={relationship.id}>
                <FastActivateButton
                  className="connect-specialists__chip"
                  aria-label={`Connected to ${name}. Disconnect options`}
                  onActivate={() => setDisconnectTarget(relationship)}
                >
                  {name}
                </FastActivateButton>
              </li>
            );
          })}
        </ul>
      ) : null}

      <label className="connect-specialists__search">
        <SearchIcon className="connect-specialists__search-icon" />
        <input
          type="search"
          value={query}
          placeholder="Full name or business"
          aria-label="Search specialists by full name or business name"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {searchError ? <p className="coaching-error">{searchError}</p> : null}
      {searching ? <p className="connect-specialists__status">Searching…</p> : null}
      {!searching &&
      query.trim().length >= 2 &&
      settledQuery === query.trim() &&
      results.length === 0 &&
      !searchError ? (
        <p className="connect-specialists__status">No specialists match that name.</p>
      ) : null}

      {results.length > 0 ? (
        <ul className="connect-specialists__results">
          {results.map((match) => (
            <ResultCard
              key={match.id}
              match={match}
              relationship={relationshipForSpecialist(match.id)}
              busy={busyId === match.id}
              error={actionError?.id === match.id ? actionError.message : null}
              onRequest={() => void send(match.id)}
              onAccept={(relationship) => void acceptInvite(relationship)}
              onCancel={(relationship) => void cancelRequest(relationship)}
              onConnected={(relationship) => setDisconnectTarget(relationship)}
            />
          ))}
        </ul>
      ) : null}
      {disconnectTarget ? (
        <DisconnectDialog
          name={disconnectTarget.specialistName.trim() || "this specialist"}
          busy={disconnecting}
          error={disconnectError}
          onClose={closeDisconnect}
          onConfirm={() => void confirmDisconnect()}
        />
      ) : null}
    </section>
  );
}

function ResultCard({
  match,
  relationship,
  busy,
  error,
  onRequest,
  onAccept,
  onCancel,
  onConnected,
}: {
  match: SpecialistConnectMatch;
  relationship: CoachingRelationship | null;
  busy: boolean;
  error: string | null;
  onRequest: () => void;
  onAccept: (relationship: CoachingRelationship) => void;
  onCancel: (relationship: CoachingRelationship) => void;
  onConnected: (relationship: CoachingRelationship) => void;
}) {
  const { title, person } = cardTitle(match);
  const meta = cardMeta(match);
  const href = trainerProfilePath({ id: match.id, slug: match.slug || undefined });
  const status = relationship?.status;

  return (
    <li className="connect-specialists__card">
      <div className="connect-specialists__card-main">
        <TrainerThumbnail src={match.imageUrl} name={title} size="compact" className="connect-specialists__photo" />
        <div className="connect-specialists__card-copy">
          <p className="connect-specialists__card-title">{title}</p>
          {person ? <p className="connect-specialists__card-person">{person}</p> : null}
          {meta ? <p className="connect-specialists__card-meta">{meta}</p> : null}
        </div>
      </div>
      {error ? <p className="coaching-error">{error}</p> : null}
      <div className="connect-specialists__actions">
        <Link className="coaching-btn" href={href}>
          View profile
        </Link>
        {status === "active" && relationship ? (
          <FastActivateButton
            className="coaching-btn coaching-btn--primary connect-specialists__state"
            disabled={busy}
            aria-label={`Connected to ${title}. Disconnect options`}
            onActivate={() => onConnected(relationship)}
          >
            Connected
          </FastActivateButton>
        ) : status === "requested" && relationship ? (
          <FastActivateButton className="coaching-btn" disabled={busy} onActivate={() => onCancel(relationship)}>
            {busy ? "Canceling…" : "Cancel request"}
          </FastActivateButton>
        ) : status === "invited" && relationship ? (
          <FastActivateButton
            className="coaching-btn coaching-btn--primary"
            disabled={busy}
            onActivate={() => onAccept(relationship)}
          >
            {busy ? "Accepting…" : "Accept invite"}
          </FastActivateButton>
        ) : (
          <FastActivateButton
            className="coaching-btn coaching-btn--primary"
            disabled={busy}
            onActivate={onRequest}
          >
            {busy ? "Sending…" : "Send request"}
          </FastActivateButton>
        )}
      </div>
      {status === "requested" ? <p className="connect-specialists__status">Request sent</p> : null}
    </li>
  );
}

function DisconnectDialog({
  name,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  name: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const backdropDismiss = useOwnPointerDismiss(onClose);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="connect-disconnect" role="presentation">
      <button
        type="button"
        className="connect-disconnect__backdrop"
        aria-label="Close"
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
      />
      <div
        className="connect-disconnect__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-disconnect-title"
      >
        <p id="connect-disconnect-title" className="connect-disconnect__copy">
          Disconnect from {name}?
        </p>
        {error ? <p className="coaching-error">{error}</p> : null}
        <div className="connect-disconnect__actions">
          <FastActivateButton className="coaching-btn" disabled={busy} onActivate={onClose}>
            Cancel
          </FastActivateButton>
          <FastActivateButton
            className="coaching-btn coaching-btn--primary"
            disabled={busy}
            onActivate={onConfirm}
          >
            {busy ? "Disconnecting…" : "Disconnect"}
          </FastActivateButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
